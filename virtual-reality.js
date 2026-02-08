// VR/AR mode handler
class VirtualRealityHandler {
  constructor() {
    this.init();
  }

  async init() {
    try {
      // Load A-Frame library and physics with updated versions
      await this.loadScript('https://aframe.io/releases/1.4.2/aframe.min.js');
      await this.loadScript('https://cdn.jsdelivr.net/gh/n5ro/aframe-physics-system@v4.0.1/dist/aframe-physics-system.min.js');
      await this.loadScript('https://unpkg.com/aframe-environment-component@1.3.2/dist/aframe-environment-component.min.js');
      await this.loadScript('https://unpkg.com/aframe-event-set-component@5.0.0/dist/aframe-event-set-component.min.js');

      // Register custom shape component that uses BufferGeometry instead of Geometry
      if (window.AFRAME) {
        AFRAME.registerComponent('custom-shape', {
          init: function() {
            // Create BufferGeometry instead of Geometry
            const geometry = new THREE.BufferGeometry();
            const vertices = new Float32Array([
              -1.0, -1.0,  1.0,
               1.0, -1.0,  1.0,
               1.0,  1.0,  1.0,
              -1.0,  1.0,  1.0,
            ]);
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            geometry.setIndex([0, 1, 2, 0, 2, 3]);
            
            const material = new THREE.MeshStandardMaterial({color: '#FFF'});
            this.mesh = new THREE.Mesh(geometry, material);
            this.el.setObject3D('mesh', this.mesh);
          },
          remove: function() {
            this.el.removeObject3D('mesh');
          }
        });

        // Patch the physics system to ensure all geometries are BufferGeometries
        if (AFRAME.systems.physics) {
          const originalGetShape = AFRAME.systems.physics.prototype.getShape;
          AFRAME.systems.physics.prototype.getShape = function(el) {
            try {
              return originalGetShape.call(this, el);
            } catch (error) {
              console.warn('Physics shape creation failed, creating fallback shape');
              return new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
            }
          };
        }
      }

      console.log('VR libraries loaded successfully');
    } catch (error) {
      console.error('Error loading VR libraries:', error);
    }
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async generateVRScene(prompt) {
    try {
      // Get scene description from AI
      const completion = await websim.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Generate an A-Frame VR scene based on this prompt: "${prompt}"
                     Include only valid A-Frame HTML code.
                     Important: 
                     1. Use ONLY BufferGeometry instead of Geometry which is deprecated
                     2. Avoid using any THREE.Geometry references
                     3. Use only standard a-frame primitives like a-box, a-sphere, a-cylinder
                     4. Avoid using any custom components that might cause compatibility issues
                     5. Make sure to use basic animation components that are compatible with A-Frame 1.4.2
                     
                     Use these components:
                     - a-scene with environment and physics="driver: local;"
                     - a-entity camera with position and look-controls
                     - Primitive shapes like a-box, a-sphere, a-cylinder
                     - Define lights with type="ambient" or type="directional"
                     - Add basic animations
                     Do not include explanations, just the a-frame code.
                     Use latest A-Frame syntax (1.4.2).`
          }
        ]
      });

      // Clean the code to ensure compatibility
      let cleanedContent = completion.content
        .replace(/THREE\.Geometry/g, 'THREE.BufferGeometry')
        .replace(/geometry="primitive: /g, 'primitive="')
        .replace(/physics="driver: ammo/g, 'physics="driver: local');

      // Basic scene wrapper to ensure proper setup and avoid THREE.Geometry errors
      const sceneCode = `
        <a-scene physics="driver: local;" renderer="antialias: true" vr-mode-ui="enabled: true">
          <a-assets>
            <!-- Asset preloading if needed -->
          </a-assets>
          
          <!-- Environment -->
          <a-entity environment="preset: default; groundColor: #445; grid: cross"></a-entity>
          
          <!-- Lights -->
          <a-entity light="type: ambient; color: #BBB; intensity: 0.5"></a-entity>
          <a-entity light="type: directional; color: #FFF; intensity: 1" position="-0.5 1 1"></a-entity>
          
          <!-- Camera -->
          <a-entity position="0 1.6 3">
            <a-entity camera look-controls wasd-controls></a-entity>
          </a-entity>

          <!-- Generated content - using only BufferGeometry compatible elements -->
          ${cleanedContent}
        </a-scene>`;

      return {
        type: 'vr-scene',
        content: sceneCode,
        title: prompt
      };
    } catch (error) {
      console.error('Error generating VR scene:', error);
      throw error;
    }
  }

  createVRPreview(sceneCode) {
    const preview = document.createElement('div');
    preview.classList.add('vr-preview-container');
    preview.innerHTML = `
      <div class="vr-preview-header">
        <span class="vr-preview-title">Vista previa de VR</span>
        <div class="vr-preview-actions">
          <button class="vr-action-btn enter-vr">
            <svg class="vr-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.8 18.4L14 10.67V6.5l1.35-1.69c.26-.33.03-.81-.39-.81H9.04c-.42 0-.65.48-.39.81L10 6.5v4.17L3.2 18.4c-.49.66-.02 1.6.8 1.6h16c.82 0 1.29-.94.8-1.6zM7.5 2h9v2h-9V2z"/>
            </svg>
            Entrar en VR
          </button>
          <button class="vr-action-btn download-vr">
            <svg class="vr-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            Descargar
          </button>
          <button class="vr-action-btn fullscreen-vr">
            <svg class="vr-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
            Pantalla Completa
          </button>
        </div>
      </div>
      <div class="vr-scene-container">
        ${sceneCode}
      </div>
    `;

    // Add event listeners
    preview.querySelector('.enter-vr').addEventListener('click', () => {
      this.enterVRMode(sceneCode);
    });

    preview.querySelector('.download-vr').addEventListener('click', () => {
      this.downloadVRScene(sceneCode);
    });

    preview.querySelector('.fullscreen-vr').addEventListener('click', () => {
      const sceneContainer = preview.querySelector('.vr-scene-container');
      if (sceneContainer.requestFullscreen) {
        sceneContainer.requestFullscreen();
      }
    });

    return preview;
  }

  enterVRMode(sceneCode) {
    const vrModal = document.createElement('div');
    vrModal.className = 'vr-modal';
    vrModal.innerHTML = `
      <div class="vr-modal-content">
        <button class="vr-close">&times;</button>
        <div class="vr-controls-help">
          <p>Controles:</p>
          <ul>
            <li>WASD / Flechas: Movimiento</li>
            <li>Mouse: Mirar alrededor</li>
            <li>Click: Interactuar</li>
            <li>Espacio: Saltar</li>
          </ul>
        </div>
        <div class="vr-scene-fullscreen">
          ${sceneCode}
        </div>
      </div>
    `;

    // Add event listeners
    vrModal.querySelector('.vr-close').onclick = () => {
      const scene = vrModal.querySelector('a-scene');
      if (scene) {
        scene.exitVR();
      }
      vrModal.remove();
    };

    // Handle VR entry/exit events
    const scene = vrModal.querySelector('a-scene');
    if (scene) {
      scene.addEventListener('enter-vr', () => {
        console.log('Entered VR mode');
      });
      
      scene.addEventListener('exit-vr', () => {
        console.log('Exited VR mode');
      });
    }

    document.body.appendChild(vrModal);
  }

  downloadVRScene(sceneCode) {
    const fullHTML = `
<!DOCTYPE html>
<html>
  <head>
    <title>VR Scene</title>
    <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/n5ro/aframe-physics-system@v4.0.1/dist/aframe-physics-system.min.js"></script>
    <script src="https://unpkg.com/aframe-environment-component@1.3.2/dist/aframe-environment-component.min.js"></script>
    <script src="https://unpkg.com/aframe-event-set-component@5.0.0/dist/aframe-event-set-component.min.js"></script>
    <style>
      body { margin: 0; }
      .vr-controls {
        position: fixed;
        bottom: 20px;
        left: 20px;
        color: white;
        background: rgba(0,0,0,0.5);
        padding: 10px;
        border-radius: 5px;
      }
    </style>
  </head>
  <body>
    <div class="vr-controls">
      <p>Controles:</p>
      <ul>
        <li>WASD / Flechas: Movimiento</li>
        <li>Mouse: Mirar alrededor</li>
        <li>Click: Interactuar</li>
        <li>Espacio: Saltar</li>
      </ul>
    </div>
    ${sceneCode}
  </body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vr-scene.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  makeWindowDraggable(windowElement) {
    const header = windowElement.querySelector('.window-header');
    let isDragging = false;
    let offsetX, offsetY;
    let transform = { x: 0, y: 0 };
    
    header.addEventListener('mousedown', (e) => {
      // Skip if clicking on controls
      if (e.target.closest('.window-controls')) return;
      
      isDragging = true;
      
      // Get the current transform values or default to 0
      const style = window.getComputedStyle(windowElement);
      const matrix = new DOMMatrix(style.transform);
      transform.x = matrix.m41;
      transform.y = matrix.m42;
      
      offsetX = e.clientX - transform.x;
      offsetY = e.clientY - transform.y;
      
      // Add temporary styles while dragging
      windowElement.style.opacity = '0.8';
      windowElement.style.transition = 'none';
      
      // Bring window to front
      windowElement.style.zIndex = '100';
      
      // Prevent default behaviors
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      // Calculate new position with transform instead of left/top for better performance
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      
      // Constrain to parent bounds
      const parent = windowElement.parentElement;
      const maxX = parent.clientWidth - windowElement.offsetWidth;
      const maxY = parent.clientHeight - windowElement.offsetHeight;
      
      transform.x = Math.max(0, Math.min(x, maxX));
      transform.y = Math.max(0, Math.min(y, maxY));
      
      // Apply transform
      windowElement.style.transform = `translate(${transform.x}px, ${transform.y}px)`;
      
      e.preventDefault();
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        // Restore styles
        windowElement.style.opacity = '1';
        windowElement.style.transition = 'opacity 0.2s ease';
      }
    });
    
    // Touch support for mobile
    header.addEventListener('touchstart', (e) => {
      if (e.target.closest('.window-controls')) return;
      
      isDragging = true;
      
      const style = window.getComputedStyle(windowElement);
      const matrix = new DOMMatrix(style.transform);
      transform.x = matrix.m41;
      transform.y = matrix.m42;
      
      offsetX = e.touches[0].clientX - transform.x;
      offsetY = e.touches[0].clientY - transform.y;
      
      windowElement.style.opacity = '0.8';
      windowElement.style.transition = 'none';
      windowElement.style.zIndex = '100';
      
      e.preventDefault();
    });
    
    document.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      const x = e.touches[0].clientX - offsetX;
      const y = e.touches[0].clientY - offsetY;
      
      const parent = windowElement.parentElement;
      const maxX = parent.clientWidth - windowElement.offsetWidth;
      const maxY = parent.clientHeight - windowElement.offsetHeight;
      
      transform.x = Math.max(0, Math.min(x, maxX));
      transform.y = Math.max(0, Math.min(y, maxY));
      
      windowElement.style.transform = `translate(${transform.x}px, ${transform.y}px)`;
      
      e.preventDefault();
    });
    
    document.addEventListener('touchend', () => {
      if (isDragging) {
        isDragging = false;
        windowElement.style.opacity = '1';
        windowElement.style.transition = 'opacity 0.2s ease';
      }
    });
  }
}

window.VirtualRealityHandler = VirtualRealityHandler;