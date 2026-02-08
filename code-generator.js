class CodeGenerator {
  constructor() {
    this.initMonacoEditor();
    this.supportedLanguages = {
      'html': 'HTML/CSS/JavaScript',
      'python': 'Python',
      'javascript': 'JavaScript', 
      'react': 'React',
      'vue': 'Vue.js',
      'node': 'Node.js',
      'php': 'PHP',
      'java': 'Java',
      'cpp': 'C++',
      'csharp': 'C#',
      'ruby': 'Ruby',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'go': 'Go'
    };
  }

  async initMonacoEditor() {
    try {
      // Load Monaco Editor
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs/loader.min.js');
      
      require.config({ 
        paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' }
      });
      
      // Preload Monaco to ensure it's ready when needed
      require(['vs/editor/editor.main'], () => {
        console.log('Monaco editor preloaded successfully');
      });
      
      console.log('Monaco editor loaded successfully');
    } catch (error) {
      console.error('Error loading Monaco editor:', error);
    }
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async generateCode(prompt) {
    try {
      // First get the intended language and framework from the prompt
      const metaCompletion = await websim.chat.completions.create({
        messages: [
          {
            role: "system", 
            content: `Analyze the prompt and determine the best programming language/framework to use.
                     Identify specific requirements, features or libraries needed.
                     Return as JSON: {
                       language: string, 
                       framework: string, 
                       description: string,
                       features: string[],
                       difficulty: string
                     }`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        json: true
      });

      const meta = JSON.parse(metaCompletion.content);

      // Now generate the actual code with more specific instructions
      const completion = await websim.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an expert ${meta.language}${meta.framework ? '/' + meta.framework : ''} developer.
                     Generate production-quality code based on this prompt: "${prompt}"
                     
                     Important requirements:
                     1. Include detailed comments explaining complex logic
                     2. Implement proper error handling and validation
                     3. Follow latest best practices for ${meta.language}
                     4. Ensure code is efficient and optimized
                     5. Make web code responsive and cross-browser compatible
                     6. Include necessary imports/dependencies (via CDN for web)
                     7. Structure code with clear organization (functions, classes, etc)
                     8. Add sample usage examples where helpful
                     
                     The code should be 100% functional and ready to run.
                     Do not include explanatory text outside of code comments.
                     Format code with proper indentation and organization.`
          },
          {
            role: "user",
            content: prompt
          }
        ]
      });

      // Process the response to extract code blocks properly
      let content = completion.content;
      
      // If the response has markdown code blocks, extract just the code
      const codeBlockRegex = /```(?:(\w+))?\s*([\s\S]+?)```/g;
      let matches = [...content.matchAll(codeBlockRegex)];
      
      if (matches.length > 0) {
        // If we found code blocks, use the first one with proper language detection
        const lang = matches[0][1] || meta.language;
        content = matches[0][2].trim();
        meta.language = lang.toLowerCase() || meta.language;
      }

      return {
        type: 'code',
        content: content,
        language: meta.language.toLowerCase(),
        framework: meta.framework?.toLowerCase(),
        description: meta.description,
        features: meta.features || [],
        difficulty: meta.difficulty || 'medium',
        title: prompt
      };
    } catch (error) {
      console.error('Error generating code:', error);
      throw error;
    }
  }

  createCodePreview(codeContent, language = 'javascript', title = '') {
    const preview = document.createElement('div');
    preview.classList.add('code-preview-container');
    
    // Extract code from markdown code blocks if present
    let extractedCode = codeContent;
    const codeBlockMatch = codeContent.match(/```(?:\w+)?\s*([\s\S]+?)```/);
    if (codeBlockMatch) {
      extractedCode = codeBlockMatch[1].trim();
    }
    
    preview.innerHTML = `
      <div class="code-preview-header">
        <div class="code-preview-info">
          <span class="code-preview-title">${title}</span>
          <span class="code-language-badge">${this.supportedLanguages[language] || language}</span>
        </div>
        <div class="code-preview-actions">
          <button class="code-action-btn edit-code">
            <svg class="code-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            Edit
          </button>
          <button class="code-action-btn copy-code">
            <svg class="code-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            Copy
          </button>
          <button class="code-action-btn download-code">
            <svg class="code-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            Download
          </button>
          <button class="code-action-btn run-code" ${language === 'html' ? '' : 'style="display:none"'}>
            <svg class="code-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Run
          </button>
        </div>
      </div>
      <div class="code-preview-content" id="code-content-${Date.now()}">
        <pre><code class="language-${language}">${this.escapeHtml(extractedCode)}</code></pre>
      </div>
    `;

    // Initialize syntax highlighting
    this.highlightCode(preview.querySelector('code'));

    preview.querySelector('.edit-code').addEventListener('click', () => {
      this.showEditDialog(extractedCode, language, title);
    });

    preview.querySelector('.copy-code').addEventListener('click', () => {
      navigator.clipboard.writeText(extractedCode);
      const btn = preview.querySelector('.copy-code');
      const originalText = btn.innerHTML;
      btn.innerHTML = `
        <svg class="code-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
        Copied!
      `;
      setTimeout(() => btn.innerHTML = originalText, 2000);
    });

    preview.querySelector('.download-code').addEventListener('click', () => {
      this.downloadCode(extractedCode, language);
    });
    
    // Add run code functionality for HTML
    if (language === 'html') {
      preview.querySelector('.run-code').addEventListener('click', () => {
        this.runCode(extractedCode, language);
      });
    }

    return preview;
  }

  runCode(code, language) {
    if (language === 'html') {
      const runModal = document.createElement('div');
      runModal.className = 'code-edit-modal';
      runModal.innerHTML = `
        <div class="code-edit-content">
          <div class="code-edit-header">
            <h3>Code Output</h3>
            <button class="code-action-btn close-edit">&times;</button>
          </div>
          <div class="code-edit-body">
            <iframe 
              id="code-runner-frame" 
              style="width: 100%; height: 100%; border: none;" 
              sandbox="allow-scripts allow-same-origin allow-popups allow-modals allow-forms"
            ></iframe>
          </div>
        </div>
      `;
      
      document.body.appendChild(runModal);
      
      const iframe = runModal.querySelector('#code-runner-frame');
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      // Write the HTML code to the iframe
      iframeDoc.open();
      iframeDoc.write(code);
      iframeDoc.close();
      
      // Add close button functionality
      runModal.querySelector('.close-edit').addEventListener('click', () => {
        runModal.remove();
      });
    }
  }

  async showEditDialog(codeContent, language, title) {
    const modal = document.createElement('div');
    modal.className = 'code-edit-modal';
    modal.innerHTML = `
      <div class="code-edit-content">
        <div class="code-edit-header">
          <input type="text" class="code-title-input" value="${title}" placeholder="Enter title">
          <select class="language-selector">
            ${Object.entries(this.supportedLanguages).map(([key, name]) =>
              `<option value="${key}" ${key === language ? 'selected' : ''}>${name}</option>`
            ).join('')}
          </select>
          <div class="code-edit-actions">
            <button class="code-action-btn preview-btn">
              <svg class="code-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
              </svg>
              Preview
            </button>
            <button class="code-action-btn show-3d-btn">
              <svg class="code-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7V3H2v18h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
              </svg>
              3D View
            </button>
            <button class="code-action-btn show-chart-btn">
              <svg class="code-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13h2v7H3zm4-7h2v14H7zm4-6h2v20h-2zm4 6h2v14h-2zm4 7h2v7h-2z"/>
              </svg>
              Charts
            </button>
            <button class="code-action-btn show-console-btn">
              <svg class="code-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.11 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
              </svg>
              Console
            </button>
            <button class="code-action-btn run-edit-btn" ${language === 'html' ? '' : 'style="display:none"'}>
              <svg class="code-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Run
            </button>
            <button class="code-action-btn save-btn">
              <svg class="code-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 3H5c-1.11 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
              </svg>
              Save
            </button>
            <button class="code-action-btn close-edit">&times;</button>
          </div>
        </div>
        <div class="code-edit-body">
          <div class="monaco-editor-container" style="height: 100%; width: 100%"></div>
          <div class="code-preview-pane"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Initialize Monaco Editor
    require(['vs/editor/editor.main'], () => {
      const editor = monaco.editor.create(modal.querySelector('.monaco-editor-container'), {
        value: codeContent,
        language: language,
        theme: 'vs-dark',
        minimap: { enabled: true },
        automaticLayout: true,
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        roundedSelection: false,
        contextmenu: true,
        lineHeight: 21
      });

      // Create floating windows for console, 3D, 2D, charts
      this.initFloatingWindows(modal, editor, language);

      // Handle language change
      modal.querySelector('.language-selector').addEventListener('change', (e) => {
        const newLang = e.target.value;
        monaco.editor.setModelLanguage(editor.getModel(), newLang);
        
        // Show/hide run button based on language
        const runBtn = modal.querySelector('.run-edit-btn');
        runBtn.style.display = newLang === 'html' ? '' : 'none';
      });

      // Handle events
      modal.querySelector('.preview-btn').addEventListener('click', () => {
        const code = editor.getValue();
        const lang = modal.querySelector('.language-selector').value;
        this.updatePreview(code, lang, modal.querySelector('.code-preview-pane'));
      });
      
      // Add run button functionality
      modal.querySelector('.run-edit-btn').addEventListener('click', () => {
        const code = editor.getValue();
        this.runCode(code, 'html');
      });

      modal.querySelector('.save-btn').addEventListener('click', () => {
        const code = editor.getValue();
        const lang = modal.querySelector('.language-selector').value;
        const newTitle = modal.querySelector('.code-title-input').value;
        this.downloadCode(code, lang);
        modal.remove();
      });

      modal.querySelector('.close-edit').addEventListener('click', () => {
        modal.remove();
      });

      // Show initial preview
      this.updatePreview(codeContent, language, modal.querySelector('.code-preview-pane'));
    });
  }
  
  initFloatingWindows(modal, editor, language) {
    const editBody = modal.querySelector('.code-edit-body');
    
    // Create and initialize Console window
    modal.querySelector('.show-console-btn').addEventListener('click', () => {
      if (!editBody.querySelector('.console-floating-window')) {
        const consoleWindow = this.createFloatingWindow('Console', '30%', '30%', 400, 300);
        consoleWindow.classList.add('console-floating-window');
        
        // Add console content
        const windowBody = consoleWindow.querySelector('.window-body');
        windowBody.innerHTML = `
          <div class="console-window" id="console-output"></div>
          <div class="console-input">
            <span class="console-prompt">&gt;</span>
            <input type="text" class="console-input-field" placeholder="Type JavaScript...">
          </div>
        `;
        
        // Add console functionality
        const consoleOutput = windowBody.querySelector('#console-output');
        const consoleInput = windowBody.querySelector('.console-input-field');
        
        // Create a virtual console
        const virtualConsole = {
          log: (...args) => {
            const message = document.createElement('div');
            message.className = 'console-message';
            message.textContent = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            consoleOutput.appendChild(message);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
          },
          error: (...args) => {
            const message = document.createElement('div');
            message.className = 'console-message console-error';
            message.textContent = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            consoleOutput.appendChild(message);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
          },
          warn: (...args) => {
            const message = document.createElement('div');
            message.className = 'console-message console-warning';
            message.textContent = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            consoleOutput.appendChild(message);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
          },
          info: (...args) => {
            const message = document.createElement('div');
            message.className = 'console-message console-info';
            message.textContent = args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            consoleOutput.appendChild(message);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
          },
          clear: () => {
            consoleOutput.innerHTML = '';
          }
        };
        
        // Console input execution
        consoleInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const command = consoleInput.value;
            
            // Show command
            const commandElement = document.createElement('div');
            commandElement.className = 'console-message';
            commandElement.innerHTML = `<span class="console-prompt">&gt;</span> ${command}`;
            consoleOutput.appendChild(commandElement);
            
            // Execute and show result
            try {
              // Create a function that accesses editor content
              const getEditorContent = () => editor.getValue();
              
              // Execute with access to editor and virtual console
              const result = eval(`
                (function() {
                  const editorContent = ${getEditorContent.toString()}();
                  ${command}
                })()
              `);
              
              if (result !== undefined) {
                virtualConsole.log(result);
              }
            } catch (error) {
              virtualConsole.error(error.message);
            }
            
            consoleInput.value = '';
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
          }
        });
        
        // Add console to editor body
        editBody.appendChild(consoleWindow);
        this.makeWindowDraggable(consoleWindow);
        this.makeWindowResizable(consoleWindow);
      } else {
        // Toggle visibility if already exists
        const consoleWindow = editBody.querySelector('.console-floating-window');
        consoleWindow.style.display = consoleWindow.style.display === 'none' ? 'flex' : 'none';
      }
    });
    
    // Create and initialize 3D Preview window
    modal.querySelector('.show-3d-btn').addEventListener('click', () => {
      if (!editBody.querySelector('.preview-3d-window')) {
        const previewWindow = this.createFloatingWindow('3D Preview', '50%', '10%', 500, 400);
        previewWindow.classList.add('preview-3d-window');
        
        // Add tabs for different 3D engines
        const windowBody = previewWindow.querySelector('.window-body');
        windowBody.innerHTML = `
          <div class="window-tabs">
            <button class="window-tab active" data-tab="three">Three.js</button>
            <button class="window-tab" data-tab="babylon">Babylon.js</button>
            <button class="window-tab" data-tab="aframe">A-Frame</button>
          </div>
          <div class="tab-content active" data-tab="three">
            <div class="preview-3d-container" id="three-container"></div>
          </div>
          <div class="tab-content" data-tab="babylon">
            <div class="preview-3d-container" id="babylon-container"></div>
          </div>
          <div class="tab-content" data-tab="aframe">
            <div class="preview-3d-container" id="aframe-container"></div>
          </div>
        `;
        
        // Add tab switching functionality
        const tabs = windowBody.querySelectorAll('.window-tab');
        tabs.forEach(tab => {
          tab.addEventListener('click', () => {
            // Deactivate all tabs
            tabs.forEach(t => t.classList.remove('active'));
            windowBody.querySelectorAll('.tab-content').forEach(content => {
              content.classList.remove('active');
            });
            
            // Activate clicked tab
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            windowBody.querySelector(`.tab-content[data-tab="${tabName}"]`).classList.add('active');
            
            // Initialize 3D engine based on active tab
            this.init3DPreview(tabName, windowBody.querySelector(`#${tabName}-container`), editor.getValue());
          });
        });
        
        // Initialize the default 3D preview (Three.js)
        this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
          .then(() => {
            this.init3DPreview('three', windowBody.querySelector('#three-container'), editor.getValue());
          });
        
        // Add preview to editor body
        editBody.appendChild(previewWindow);
        this.makeWindowDraggable(previewWindow);
        this.makeWindowResizable(previewWindow);
      } else {
        // Toggle visibility if already exists
        const previewWindow = editBody.querySelector('.preview-3d-window');
        previewWindow.style.display = previewWindow.style.display === 'none' ? 'flex' : 'none';
      }
    });
    
    // Create and initialize Chart window
    modal.querySelector('.show-chart-btn').addEventListener('click', () => {
      if (!editBody.querySelector('.chart-floating-window')) {
        const chartWindow = this.createFloatingWindow('Charts & Visualization', '10%', '50%', 450, 350);
        chartWindow.classList.add('chart-floating-window');
        
        // Add tabs for different chart types
        const windowBody = chartWindow.querySelector('.window-body');
        windowBody.innerHTML = `
          <div class="window-tabs">
            <button class="window-tab active" data-tab="chart">Charts</button>
            <button class="window-tab" data-tab="d3">D3.js</button>
            <button class="window-tab" data-tab="plotly">Plotly</button>
          </div>
          <div class="tab-content active" data-tab="chart">
            <div class="chart-container" id="chart-container"></div>
          </div>
          <div class="tab-content" data-tab="d3">
            <div class="chart-container" id="d3-container"></div>
          </div>
          <div class="tab-content" data-tab="plotly">
            <div class="chart-container" id="plotly-container"></div>
          </div>
        `;
        
        // Add tab switching functionality
        const tabs = windowBody.querySelectorAll('.window-tab');
        tabs.forEach(tab => {
          tab.addEventListener('click', () => {
            // Deactivate all tabs
            tabs.forEach(t => t.classList.remove('active'));
            windowBody.querySelectorAll('.tab-content').forEach(content => {
              content.classList.remove('active');
            });
            
            // Activate clicked tab
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            windowBody.querySelector(`.tab-content[data-tab="${tabName}"]`).classList.add('active');
            
            // Initialize chart based on active tab
            this.initChartPreview(tabName, windowBody.querySelector(`#${tabName}-container`), editor.getValue());
          });
        });
        
        // Initialize the default chart (Chart.js)
        this.loadScript('https://cdn.jsdelivr.net/npm/chart.js')
          .then(() => {
            this.initChartPreview('chart', windowBody.querySelector('#chart-container'), editor.getValue());
          });
        
        // Add chart window to editor body
        editBody.appendChild(chartWindow);
        this.makeWindowDraggable(chartWindow);
        this.makeWindowResizable(chartWindow);
      } else {
        // Toggle visibility if already exists
        const chartWindow = editBody.querySelector('.chart-floating-window');
        chartWindow.style.display = chartWindow.style.display === 'none' ? 'flex' : 'none';
      }
    });
  }
  
  createFloatingWindow(title, left, top, width, height) {
    const window = document.createElement('div');
    window.className = 'floating-window';
    window.style.left = left;
    window.style.top = top;
    window.style.width = `${width}px`;
    window.style.height = `${height}px`;
    window.style.display = 'flex'; // Ensure display is set
    
    window.innerHTML = `
      <div class="window-header">
        <div class="window-title">${title}</div>
        <div class="window-controls">
          <button class="window-control window-minimize">_</button>
          <button class="window-control window-maximize">□</button>
          <button class="window-control window-close">×</button>
        </div>
      </div>
      <div class="window-body"></div>
      <div class="resize-handle resize-handle-se"></div>
      <div class="resize-handle resize-handle-sw"></div>
      <div class="resize-handle resize-handle-ne"></div>
      <div class="resize-handle resize-handle-nw"></div>
    `;
    
    // Add event listeners for window controls
    window.querySelector('.window-close').addEventListener('click', () => {
      window.style.display = 'none';
    });
    
    window.querySelector('.window-minimize').addEventListener('click', () => {
      const windowBody = window.querySelector('.window-body');
      if (windowBody.style.display === 'none') {
        windowBody.style.display = 'block';
        window.style.height = window.dataset.previousHeight || `${height}px`;
      } else {
        window.dataset.previousHeight = window.style.height;
        windowBody.style.display = 'none';
        window.style.height = 'auto';
      }
    });
    
    window.querySelector('.window-maximize').addEventListener('click', () => {
      if (!window.dataset.isMaximized) {
        window.dataset.originalWidth = window.style.width;
        window.dataset.originalHeight = window.style.height;
        window.dataset.originalLeft = window.style.left;
        window.dataset.originalTop = window.style.top;
        
        const parent = window.parentElement;
        window.style.width = `${parent.clientWidth}px`;
        window.style.height = `${parent.clientHeight}px`;
        window.style.left = '0';
        window.style.top = '0';
        window.dataset.isMaximized = 'true';
      } else {
        window.style.width = window.dataset.originalWidth;
        window.style.height = window.dataset.originalHeight;
        window.style.left = window.dataset.originalLeft;
        window.style.top = window.dataset.originalTop;
        window.dataset.isMaximized = '';
      }
    });
    
    return window;
  }
  
  makeWindowDraggable(windowElement) {
    const header = windowElement.querySelector('.window-header');
    let isDragging = false;
    let offsetX, offsetY;
    
    header.addEventListener('mousedown', (e) => {
      // Skip if clicking on controls
      if (e.target.closest('.window-controls')) return;
      
      isDragging = true;
      offsetX = e.clientX - windowElement.getBoundingClientRect().left;
      offsetY = e.clientY - windowElement.getBoundingClientRect().top;
      
      // Add temporary styles while dragging
      windowElement.style.opacity = '0.8';
      windowElement.style.transition = 'none';
      
      // Prevent default behaviors
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      // Calculate new position with precision
      const parentRect = windowElement.parentElement.getBoundingClientRect();
      let newLeft = e.clientX - parentRect.left - offsetX;
      let newTop = e.clientY - parentRect.top - offsetY;
      
      // Constrain to parent bounds
      newLeft = Math.max(0, Math.min(newLeft, parentRect.width - windowElement.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, parentRect.height - windowElement.offsetHeight));
      
      // Update position with pixel precision
      windowElement.style.left = `${Math.round(newLeft)}px`;
      windowElement.style.top = `${Math.round(newTop)}px`;
      
      e.preventDefault();
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        // Restore styles
        windowElement.style.opacity = '1';
        windowElement.style.transition = '';
      }
    });
  }
  
  makeWindowResizable(windowElement) {
    const resizeHandles = windowElement.querySelectorAll('.resize-handle');
    
    resizeHandles.forEach(handle => {
      let isResizing = false;
      let startX, startY, startWidth, startHeight, startLeft, startTop;
      
      handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(windowElement.offsetWidth, 10);
        startHeight = parseInt(windowElement.offsetHeight, 10);
        startLeft = parseInt(windowElement.style.left, 10) || 0;
        startTop = parseInt(windowElement.style.top, 10) || 0;
        
        // Add temporary styles
        windowElement.style.transition = 'none';
        
        // Set cursor based on handle position
        const cursorStyle = handle.classList.contains('resize-handle-se') ? 'nwse-resize' : 
                           handle.classList.contains('resize-handle-sw') ? 'nesw-resize' :
                           handle.classList.contains('resize-handle-ne') ? 'nesw-resize' : 'nwse-resize';
        document.body.style.cursor = cursorStyle;
        
        e.preventDefault();
        e.stopPropagation();
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        // Calculate changes
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        // Minimum size constraints
        const minWidth = 200;
        const minHeight = 150;
        
        // Apply resize based on handle position
        if (handle.classList.contains('resize-handle-se')) {
          const newWidth = Math.max(minWidth, startWidth + dx);
          const newHeight = Math.max(minHeight, startHeight + dy);
          windowElement.style.width = `${newWidth}px`;
          windowElement.style.height = `${newHeight}px`;
        } else if (handle.classList.contains('resize-handle-sw')) {
          const newWidth = Math.max(minWidth, startWidth - dx);
          const newHeight = Math.max(minHeight, startHeight + dy);
          windowElement.style.width = `${newWidth}px`;
          windowElement.style.left = `${startLeft + (startWidth - newWidth)}px`;
          windowElement.style.height = `${newHeight}px`;
        } else if (handle.classList.contains('resize-handle-ne')) {
          const newWidth = Math.max(minWidth, startWidth + dx);
          const newHeight = Math.max(minHeight, startHeight - dy);
          windowElement.style.width = `${newWidth}px`;
          windowElement.style.height = `${newHeight}px`;
          windowElement.style.top = `${startTop + (startHeight - newHeight)}px`;
        } else if (handle.classList.contains('resize-handle-nw')) {
          const newWidth = Math.max(minWidth, startWidth - dx);
          const newHeight = Math.max(minHeight, startHeight - dy);
          windowElement.style.width = `${newWidth}px`;
          windowElement.style.left = `${startLeft + (startWidth - newWidth)}px`;
          windowElement.style.height = `${newHeight}px`;
          windowElement.style.top = `${startTop + (startHeight - newHeight)}px`;
        }
        
        e.preventDefault();
      });
      
      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          // Restore styles
          windowElement.style.transition = '';
          document.body.style.cursor = '';
        }
      });
    });
  }
  
  init3DPreview(type, container, code) {
    if (!container) return;
    
    switch (type) {
      case 'three':
        if (!window.THREE) return;
        
        // Create a basic Three.js scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a1a);
        
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 5;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        
        // Clear container and add renderer
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        
        // Add a cube
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshNormalMaterial();
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        
        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        
        // Animation loop
        function animate() {
          requestAnimationFrame(animate);
          
          cube.rotation.x += 0.01;
          cube.rotation.y += 0.01;
          
          renderer.render(scene, camera);
        }
        
        animate();
        break;
        
      case 'babylon':
        // Load Babylon.js if needed
        this.loadScript('https://cdn.babylonjs.com/babylon.js')
          .then(() => {
            if (!window.BABYLON) return;
            
            // Create a basic Babylon.js scene
            const canvas = document.createElement('canvas');
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            container.innerHTML = '';
            container.appendChild(canvas);
            
            const engine = new BABYLON.Engine(canvas, true);
            const scene = new BABYLON.Scene(engine);
            scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            
            const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 5, BABYLON.Vector3.Zero(), scene);
            camera.attachControl(canvas, true);
            
            const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
            light.intensity = 0.7;
            
            BABYLON.MeshBuilder.CreateBox("box", {size: 1}, scene);
            
            engine.runRenderLoop(() => {
              scene.render();
            });
            
            window.addEventListener('resize', () => {
              engine.resize();
            });
          });
        break;
        
      case 'aframe':
        // Load A-Frame if needed
        this.loadScript('https://aframe.io/releases/1.4.2/aframe.min.js')
          .then(() => {
            // Create a basic A-Frame scene
            container.innerHTML = `
              <a-scene embedded background="color: #222" renderer="antialias: true; colorManagement: true;">
                <a-box position="0 0.5 -3" rotation="0 45 0" color="#4CC3D9" shadow></a-box>
                <a-sphere position="-1 0.5 -3" radius="0.5" color="#EF2D5E" shadow></a-sphere>
                <a-cylinder position="1 0.75 -3" radius="0.5" height="1.5" color="#FFC65D" shadow></a-cylinder>
                <a-plane position="0 0 -4" rotation="-90 0 0" width="4" height="4" color="#7BC8A4" shadow></a-plane>
                <a-sky color="#222"></a-sky>
                <a-entity position="0 1.6 0">
                  <a-camera></a-camera>
                </a-entity>
              </a-scene>
            `;
          });
        break;
    }
  }
  
  initChartPreview(type, container, code) {
    if (!container) return;
    
    switch (type) {
      case 'chart':
        if (!window.Chart) return;
        
        // Create a basic Chart.js chart
        const canvas = document.createElement('canvas');
        container.innerHTML = '';
        container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
            datasets: [{
              label: 'Sample Data',
              data: [12, 19, 3, 5, 2, 3],
              backgroundColor: [
                'rgba(255, 99, 132, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(255, 206, 86, 0.5)',
                'rgba(75, 192, 192, 0.5)',
                'rgba(153, 102, 255, 0.5)',
                'rgba(255, 159, 64, 0.5)'
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
              ],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
        break;
        
      case 'd3':
        // Load D3.js if needed
        this.loadScript('https://d3js.org/d3.v7.min.js')
          .then(() => {
            if (!window.d3) return;
            
            // Create a basic D3.js visualization
            container.innerHTML = '<svg width="100%" height="100%"></svg>';
            const svg = d3.select(container.querySelector('svg'));
            
            const width = container.clientWidth;
            const height = container.clientHeight;
            const margin = { top: 20, right: 20, bottom: 30, left: 40 };
            
            const data = [
              { name: 'A', value: 5 },
              { name: 'B', value: 10 },
              { name: 'C', value: 15 },
              { name: 'D', value: 20 },
              { name: 'E', value: 25 }
            ];
            
            const x = d3.scaleBand()
              .domain(data.map(d => d.name))
              .range([margin.left, width - margin.right])
              .padding(0.1);
            
            const y = d3.scaleLinear()
              .domain([0, d3.max(data, d => d.value)]).nice()
              .range([height - margin.bottom, margin.top]);
            
            svg.append('g')
              .attr('fill', 'steelblue')
              .selectAll('rect')
              .data(data)
              .join('rect')
                .attr('x', d => x(d.name))
                .attr('y', d => y(d.value))
                .attr('height', d => y(0) - y(d.value))
                .attr('width', x.bandwidth());
            
            svg.append('g')
              .attr('transform', `translate(0,${height - margin.bottom})`)
              .call(d3.axisBottom(x));
            
            svg.append('g')
              .attr('transform', `translate(${margin.left},0)`)
              .call(d3.axisLeft(y));
          });
        break;
        
      case 'plotly':
        // Load Plotly.js if needed
        this.loadScript('https://cdn.plot.ly/plotly-2.12.1.min.js')
          .then(() => {
            if (!window.Plotly) return;
            
            // Create a basic Plotly chart
            container.innerHTML = '<div style="width:100%;height:100%;"></div>';
            const plotContainer = container.querySelector('div');
            
            const data = [{
              x: ['A', 'B', 'C', 'D', 'E'],
              y: [1, 2, 4, 8, 16],
              type: 'scatter',
              mode: 'lines+markers',
              marker: { color: 'rgba(99, 102, 241, 0.8)' }
            }, {
              x: ['A', 'B', 'C', 'D', 'E'],
              y: [16, 8, 4, 2, 1],
              type: 'bar',
              marker: { color: 'rgba(79, 70, 229, 0.6)' }
            }];
            
            const layout = {
              title: 'Interactive Chart',
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              font: { color: '#fff' },
              margin: { t: 50, r: 20, b: 40, l: 40 }
            };
            
            const config = { responsive: true };
            
            Plotly.newPlot(plotContainer, data, layout, config);
          });
        break;
    }
  }
  
  updatePreview(code, language, previewElement) {
    previewElement.innerHTML = '';
    
    if (language === 'html') {
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.sandbox = 'allow-scripts allow-same-origin';
      previewElement.appendChild(iframe);
      
      setTimeout(() => {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(code);
        iframeDoc.close();
      }, 100);
    } else {
      const codePreview = document.createElement('div');
      codePreview.className = 'code-preview-content';
      codePreview.innerHTML = `<pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>`;
      previewElement.appendChild(codePreview);
      this.highlightCode(codePreview.querySelector('code'));
    }
  }

  downloadCode(code, language) {
    const extensions = {
      'html': 'html',
      'python': 'py',
      'javascript': 'js',
      'react': 'jsx',
      'vue': 'vue',
      'node': 'js',
      'php': 'php',
      'java': 'java',
      'cpp': 'cpp',
      'csharp': 'cs',
      'ruby': 'rb',
      'swift': 'swift',
      'kotlin': 'kt',
      'go': 'go'
    };

    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${extensions[language]}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async highlightCode(codeElement) {
    if (!window.Prism) {
      await this.loadPrism();
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css';
      document.head.appendChild(link);
    }
    Prism.highlightElement(codeElement);
  }
  
  async loadPrism() {
    if (window.Prism) return;
    
    await Promise.all([
      this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js'),
      this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js'),
      this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js'),
      this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js'),
      this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-java.min.js'),
      this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-cpp.min.js'),
      this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js'),
      this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-jsx.min.js'),
      this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-php.min.js')
    ]);
  }
}

window.CodeGenerator = CodeGenerator;