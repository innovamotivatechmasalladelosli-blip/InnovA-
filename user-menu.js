/**
 * Sistema de Menú de Usuario
 */

class UserMenu {
  constructor() {
    this.menuBtn = document.getElementById('user-menu-btn');
    this.userMenu = document.getElementById('user-menu');
    this.init();
  }

  init() {
    if (this.menuBtn && this.userMenu) {
      this.menuBtn.addEventListener('click', () => this.toggleMenu());
      document.addEventListener('click', (e) => this.handleClickOutside(e));
      this.setupMenuItems();
    }
  }

  toggleMenu() {
    this.userMenu.classList.toggle('active');
  }

  closeMenu() {
    this.userMenu.classList.remove('active');
  }

  handleClickOutside(event) {
    if (!event.target.closest('.header-actions') && !event.target.closest('.user-menu')) {
      this.closeMenu();
    }
  }

  setupMenuItems() {
    const items = this.userMenu.querySelectorAll('.menu-item');
    items.forEach(item => {
      item.addEventListener('click', (e) => this.handleMenuItemClick(e));
    });
  }

  handleMenuItemClick(event) {
    const item = event.currentTarget;
    const action = item.dataset.action;

    switch (action) {
      case 'change-password':
        this.showChangePasswordModal();
        break;
      case 'session-info':
        this.showSessionInfo();
        break;
      case 'logout':
        this.handleLogout();
        break;
      case 'settings':
        this.showSettings();
        break;
      case 'help':
        this.showHelp();
        break;
      default:
        console.log('Acción:', action);
    }

    this.closeMenu();
  }

  showChangePasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Cambiar Contraseña</h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Contraseña Actual</label>
            <input type="password" id="current-password" class="form-input" placeholder="Tu contraseña actual">
          </div>
          <div class="form-group">
            <label>Nueva Contraseña</label>
            <input type="password" id="new-password" class="form-input" placeholder="Nueva contraseña">
          </div>
          <div class="form-group">
            <label>Confirmar Contraseña</label>
            <input type="password" id="confirm-password" class="form-input" placeholder="Confirma la contraseña">
          </div>
          <div class="password-requirements">
            <div class="requirement">
              <span>✓ Mínimo 8 caracteres</span>
            </div>
            <div class="requirement">
              <span>✓ Una mayúscula</span>
            </div>
            <div class="requirement">
              <span>✓ Una minúscula</span>
            </div>
            <div class="requirement">
              <span>✓ Un número</span>
            </div>
            <div class="requirement">
              <span>✓ Un carácter especial</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
          <button class="btn btn-primary" onclick="userMenu.changePassword()">Cambiar Contraseña</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      this.showNotification('Por favor completa todos los campos', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showNotification('Las contraseñas no coinciden', 'error');
      return;
    }

    if (!this.validatePassword(newPassword)) {
      this.showNotification('La contraseña no cumple los requisitos', 'error');
      return;
    }

    // Verificar contraseña actual
    const user = sessionManager.getCurrentUser();
    const users = JSON.parse(localStorage.getItem('innova_users') || '[]');
    const currentUser = users.find(u => u.email === user.email);

    if (!currentUser || currentUser.password !== currentPassword) {
      this.showNotification('La contraseña actual es incorrecta', 'error');
      return;
    }

    // Cambiar contraseña
    currentUser.password = newPassword;
    localStorage.setItem('innova_users', JSON.stringify(users));

    document.querySelector('.modal-overlay').remove();
    this.showNotification('Contraseña cambiada exitosamente', 'success');
  }

  validatePassword(password) {
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password) &&
           /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  }

  showSessionInfo() {
    const info = sessionManager.getSessionInfo();
    if (!info) {
      this.showNotification('No hay sesión activa', 'error');
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Información de Sesión</h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="session-info">
            <div class="info-item">
              <span class="info-label">Email:</span>
              <span class="info-value">${info.email}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Usuario:</span>
              <span class="info-value">${info.username}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Sesión Iniciada:</span>
              <span class="info-value">${info.createdAt}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Última Actividad:</span>
              <span class="info-value">${info.lastActivity}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tipo de Sesión:</span>
              <span class="info-value">${info.isPermanent ? 'Permanente' : 'Temporal (24h)'}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  handleLogout() {
    const confirmed = confirm('¿Estás seguro de que deseas cerrar sesión?');
    if (!confirmed) return;

    sessionManager.logout();
    this.showNotification('Sesión cerrada', 'success');
    
    setTimeout(() => {
      location.reload();
    }, 1000);
  }

  showSettings() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Configuración</h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="settings-group">
            <h3>Notificaciones</h3>
            <div class="setting-item">
              <label>
                <input type="checkbox" checked> Notificaciones de chat
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" checked> Sonidos
              </label>
            </div>
          </div>
          <div class="settings-group">
            <h3>Privacidad</h3>
            <div class="setting-item">
              <label>
                <input type="checkbox"> Guardar historial de conversaciones
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox"> Permitir análisis de uso
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Guardar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  showHelp() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Ayuda</h2>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="help-section">
            <h3>¿Cómo usar InnovA+?</h3>
            <p>InnovA+ es una interfaz de chat avanzada con inteligencia artificial. Puedes:</p>
            <ul>
              <li>Chatear con IA en tiempo real</li>
              <li>Generar código</li>
              <li>Crear documentos</li>
              <li>Generar imágenes</li>
              <li>Explorar escenas VR</li>
            </ul>
          </div>
          <div class="help-section">
            <h3>Soporte</h3>
            <p>Para más información, visita: <a href="#" target="_blank">innova.help</a></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Crear instancia global
let userMenu;

document.addEventListener('DOMContentLoaded', () => {
  userMenu = new UserMenu();
});
