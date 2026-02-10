/**
 * Integración del menú con la interfaz de chat
 */

class MenuIntegration {
  constructor() {
    this.header = document.getElementById('app-header');
    this.loginContainer = document.getElementById('login-container');
    this.chatContainer = document.getElementById('chat-container');
    this.userNameEl = document.getElementById('user-name');
    this.menuEmailEl = document.getElementById('menu-email');
    this.init();
  }

  init() {
    // Verificar si hay sesión activa
    if (sessionManager.isAuthenticated()) {
      this.showChatInterface();
    }

    // Escuchar cambios en el login
    this.setupLoginListeners();
  }

  setupLoginListeners() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSignup();
      });
    }
  }

  handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const result = AuthenticationHandlers.handleLogin(email, password);
      if (result) {
        this.showChatInterface();
      }
    } catch (error) {
      document.getElementById('password-error').textContent = error.message;
    }
  }

  handleSignup() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
      const result = AuthenticationHandlers.handleSignup(username, email, password);
      if (result) {
        // Auto-login después del registro
        AuthenticationHandlers.handleLogin(email, password);
        this.showChatInterface();
      }
    } catch (error) {
      document.getElementById('signup-email-error').textContent = error.message;
    }
  }

  showChatInterface() {
    const user = sessionManager.getCurrentUser();
    if (!user) return;

    // Actualizar información del menú
    this.userNameEl.textContent = user.username;
    this.menuEmailEl.textContent = user.email;

    // Mostrar header y chat
    this.header.classList.remove('hidden');
    this.loginContainer.classList.add('hidden');
    this.chatContainer.classList.remove('hidden');

    // Inicializar chat si existe
    if (typeof ChatInterface !== 'undefined') {
      window.chatInterface = new ChatInterface();
    }
  }

  hideChatInterface() {
    this.header.classList.add('hidden');
    this.loginContainer.classList.remove('hidden');
    this.chatContainer.classList.add('hidden');
  }
}

// Crear instancia global
let menuIntegration;

document.addEventListener('DOMContentLoaded', () => {
  menuIntegration = new MenuIntegration();
});
