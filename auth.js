class Auth {
  constructor() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.settings = {
      theme: localStorage.getItem('theme') || 'light',
      language: localStorage.getItem('language') || 'es',
      notifications: localStorage.getItem('notifications') === 'true',
      privacyMode: localStorage.getItem('privacyMode') || 'normal'
    };

    // Available languages 
    this.languages = {
      es: {
        name: 'Español',
        flag: '🇲🇽',
        translations: {
          settings: 'Configuración',
          profile: 'Perfil',
          theme: 'Cambiar tema',
          language: 'Idioma',
          notifications: 'Notificaciones', 
          privacy: 'Privacidad',
          logout: 'Cerrar sesión',
          editProfile: 'Editar perfil',
          darkMode: 'Modo oscuro',
          clear: 'Borrar historial',
          save: 'Guardar cambios',
          quickAccess: 'Acceso Rápido',
          quickAccessCode: 'Código de Acceso'
        }
      },
      en: {
        name: 'English',
        flag: '🇺🇸',
        translations: {
          settings: 'Settings',
          profile: 'Profile',
          theme: 'Theme',
          language: 'Language',
          notifications: 'Notifications',
          privacy: 'Privacy', 
          logout: 'Logout',
          editProfile: 'Edit profile',
          darkMode: 'Dark mode',
          clear: 'Clear history',
          save: 'Save changes',
          quickAccess: 'Quick Access',
          quickAccessCode: 'Access Code'
        }
      }
    };

    // Add users storage
    this.users = this.loadUsers();

    // Security enhancements
    this.loginAttempts = this.loadLoginAttempts();
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    this.maxLoginAttempts = 5;
    this.lockoutTime = 15 * 60 * 1000; // 15 minutes

    // Quick access system
    this.quickAccessCodes = this.loadQuickAccessCodes();
    this.codeExpiryTime = 7 * 24 * 60 * 60 * 1000; // 7 days

    this.initializeAuth();
    this.loadSettings();
    this.bindEvents();
    this.startSessionMonitoring();
  }

  // New methods for quick access system
  loadQuickAccessCodes() {
    try {
      const codes = localStorage.getItem('quickAccessCodes');
      return codes ? JSON.parse(codes) : {};
    } catch (error) {
      console.error('Error loading quick access codes:', error);
      return {};
    }
  }

  saveQuickAccessCodes() {
    try {
      localStorage.setItem('quickAccessCodes', JSON.stringify(this.quickAccessCodes));
    } catch (error) {
      console.error('Error saving quick access codes:', error);
    }
  }

  generateQuickAccessCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  createQuickAccessCode(userId) {
    const code = this.generateQuickAccessCode();
    this.quickAccessCodes[userId] = {
      code: code,
      created: Date.now(),
      expires: Date.now() + this.codeExpiryTime
    };
    this.saveQuickAccessCodes();
    return code;
  }

  validateQuickAccessCode(code, userId) {
    const userCode = this.quickAccessCodes[userId];
    if (!userCode) return false;
    
    if (Date.now() > userCode.expires) {
      delete this.quickAccessCodes[userId];
      this.saveQuickAccessCodes();
      return false;
    }
    
    return userCode.code === code;
  }

  showQuickAccessCodeModal(code) {
    const translations = this.languages[this.settings.language].translations;
    const modal = this.createModal(translations.quickAccess, `
      <div class="quick-access-container">
        <div class="quick-access-success">
          <div class="success-animation">
            <svg class="success-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h3>¡${translations.quickAccessCode} Generado!</h3>
          <p>Guarda este código para acceso rápido en futuros inicios de sesión:</p>
          <div class="quick-code-display">
            <span class="quick-code">${code}</span>
            <button class="copy-code-btn" onclick="this.copyQuickCode('${code}')">📋 Copiar</button>
          </div>
          <div class="quick-access-info">
            <p><strong>¿Cómo usar el código?</strong></p>
            <ul>
              <li>En la pantalla de login, ingresa tu email</li>
              <li>En lugar de la contraseña, usa este código de 4 dígitos</li>
              <li>El código expira en 7 días</li>
              <li>Solo funciona en este dispositivo</li>
            </ul>
          </div>
          <button class="auth-btn" onclick="this.closeModal()">Continuar</button>
        </div>
      </div>
    `);

    // Add global method for copying code
    window.copyQuickCode = (code) => {
      navigator.clipboard.writeText(code).then(() => {
        this.showMessage('Código copiado al portapapeles', 'success');
      });
    };

    window.closeModal = () => {
      modal.remove();
    };
  }

  showQuickAccessLogin() {
    const quickAccessContainer = document.createElement('div');
    quickAccessContainer.className = 'quick-access-login';
    quickAccessContainer.innerHTML = `
      <div class="quick-access-header">
        <h3>🚀 Acceso Rápido</h3>
        <p>Ingresa tu código de 4 dígitos</p>
      </div>
      <div class="quick-code-input-container">
        <input type="text" class="quick-code-input" maxlength="4" placeholder="••••" autocomplete="off">
        <button class="use-quick-code-btn">Acceder</button>
      </div>
      <div class="quick-access-actions">
        <button class="back-to-normal-login">← Volver al login normal</button>
      </div>
    `;

    const loginBox = document.querySelector('.login-box');
    const loginForm = document.querySelector('.login-form');
    
    loginForm.style.display = 'none';
    loginBox.appendChild(quickAccessContainer);

    // Add event listeners
    const codeInput = quickAccessContainer.querySelector('.quick-code-input');
    const useCodeBtn = quickAccessContainer.querySelector('.use-quick-code-btn');
    const backBtn = quickAccessContainer.querySelector('.back-to-normal-login');

    codeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
      if (e.target.value.length === 4) {
        useCodeBtn.style.background = 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))';
      } else {
        useCodeBtn.style.background = '#cbd5e1';
      }
    });

    useCodeBtn.addEventListener('click', () => {
      this.attemptQuickLogin(codeInput.value);
    });

    backBtn.addEventListener('click', () => {
      quickAccessContainer.remove();
      loginForm.style.display = 'block';
    });

    codeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && codeInput.value.length === 4) {
        this.attemptQuickLogin(codeInput.value);
      }
    });

    codeInput.focus();
  }

  async attemptQuickLogin(code) {
    try {
      if (code.length !== 4) {
        throw new Error('El código debe tener 4 dígitos');
      }

      const email = document.getElementById('email').value.trim().toLowerCase();
      if (!email) {
        throw new Error('Por favor ingresa tu email primero');
      }

      const users = this.loadUsers();
      const user = users.find(u => u.email === email);
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (!this.validateQuickAccessCode(code, user.id)) {
        throw new Error('Código inválido o expirado');
      }

      // Successful quick login
      this.currentUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        sessionToken: this.generateSessionToken(),
        loginTime: Date.now(),
        quickLogin: true
      };

      this.isAuthenticated = true;
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      this.updateLastActivity();
      this.clearFailedAttempts(email);

      this.showMessage('Acceso rápido exitoso', 'success');
      this.showChat();

    } catch (error) {
      this.showMessage(error.message, 'error');
    }
  }

  // Enhanced security methods
  async hashPassword(password) {
    // Simple hash for demo - in production use bcrypt or similar
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt_innovaplus_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password) {
    // Password must be at least 8 characters with uppercase, lowercase, number, and special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  sanitizeInput(input) {
    return input.replace(/[<>\"'&]/g, '').trim();
  }

  loadLoginAttempts() {
    try {
      const attempts = localStorage.getItem('loginAttempts');
      return attempts ? JSON.parse(attempts) : {};
    } catch (error) {
      console.error('Error loading login attempts:', error);
      return {};
    }
  }

  saveLoginAttempts() {
    try {
      localStorage.setItem('loginAttempts', JSON.stringify(this.loginAttempts));
    } catch (error) {
      console.error('Error saving login attempts:', error);
    }
  }

  isAccountLocked(email) {
    const attempts = this.loginAttempts[email];
    if (!attempts) return false;
    
    if (attempts.count >= this.maxLoginAttempts) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      if (timeSinceLastAttempt < this.lockoutTime) {
        return true;
      } else {
        // Reset attempts after lockout period
        delete this.loginAttempts[email];
        this.saveLoginAttempts();
        return false;
      }
    }
    return false;
  }

  recordFailedAttempt(email) {
    if (!this.loginAttempts[email]) {
      this.loginAttempts[email] = { count: 0, lastAttempt: 0 };
    }
    this.loginAttempts[email].count++;
    this.loginAttempts[email].lastAttempt = Date.now();
    this.saveLoginAttempts();
  }

  clearFailedAttempts(email) {
    if (this.loginAttempts[email]) {
      delete this.loginAttempts[email];
      this.saveLoginAttempts();
    }
  }

  generateSessionToken() {
    return crypto.randomUUID();
  }

  startSessionMonitoring() {
    setInterval(() => {
      this.checkSessionTimeout();
    }, 60000); // Check every minute
  }

  checkSessionTimeout() {
    if (this.isAuthenticated && this.currentUser) {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
        if (timeSinceLastActivity > this.sessionTimeout) {
          this.logout();
          this.showMessage('Sesión expirada por inactividad', 'warning');
        }
      }
    }
  }

  updateLastActivity() {
    if (this.isAuthenticated) {
      localStorage.setItem('lastActivity', Date.now().toString());
    }
  }

  showMessage(message, type = 'info') {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.className = `auth-toast toast-${type}`;
    toast.textContent = message;
    
    // Style the toast
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      zIndex: '10000',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease',
      backgroundColor: type === 'error' ? '#ef4444' : 
                      type === 'success' ? '#10b981' : 
                      type === 'warning' ? '#f59e0b' : '#3b82f6'
    });
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // Initialize auth state
  initializeAuth() {
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUser = JSON.parse(userData);
      this.isAuthenticated = true;
      this.showChat();
    }
  }

  // Load user settings
  loadSettings() {
    // Apply theme
    document.body.className = this.settings.theme;

    // Apply language
    this.updateLanguage(this.settings.language);

    // Apply other settings
    this.applyNotificationSettings();
    this.applyPrivacySettings();
  }

  // Save settings to localStorage
  saveSettings() {
    localStorage.setItem('theme', this.settings.theme);
    localStorage.setItem('language', this.settings.language);
    localStorage.setItem('notifications', this.settings.notifications);
    localStorage.setItem('privacyMode', this.settings.privacyMode);
  }

  // Update interface language
  updateLanguage(lang) {
    this.settings.language = lang;
    const translations = this.languages[lang]?.translations || this.languages.en.translations;

    document.querySelectorAll('[data-translate]').forEach(el => {
      const key = el.dataset.translate;
      if (translations[key]) {
        el.textContent = translations[key];
      }
    });

    // Update placeholders
    if (document.getElementById('user-input')) {
      document.getElementById('user-input').placeholder = 
        lang === 'es' ? 'Escribe tu mensaje...' : 'Type your message...';
    }

    // Update chat instance language
    if (window.chat) {
      window.chat.currentLanguage = lang;
      // Add welcome message in new language
      if (window.chat.messagesContainer.children.length === 0) {
        window.chat.addWelcomeMessage();
      }
    }

    this.saveSettings();
  }

  // Toggle dark/light theme
  toggleTheme() {
    this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
    document.body.className = this.settings.theme;
    this.saveSettings();
  }

  // Apply notification settings
  applyNotificationSettings() {
    if (this.settings.notifications) {
      // Request notification permissions if needed
      if (Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
    }
  }

  // Apply privacy settings
  applyPrivacySettings() {
    if (this.settings.privacyMode === 'strict') {
      // Clear localStorage except auth
      Object.keys(localStorage).forEach(key => {
        if (key !== 'user') {
          localStorage.removeItem(key);
        }
      });
      // Disable analytics/tracking if any
    }
  }

  // Load saved users from localStorage 
  loadUsers() {
    try {
      const users = localStorage.getItem('registeredUsers');
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }

  // Save users to localStorage
  saveUsers(users) {
    try {
      localStorage.setItem('registeredUsers', JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  async login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      // Enhanced input validation
      if (!email || !password) {
        throw new Error('Por favor completa todos los campos');
      }

      // Sanitize inputs
      const sanitizedEmail = this.sanitizeInput(email).toLowerCase();
      
      if (!this.validateEmail(sanitizedEmail)) {
        throw new Error('Por favor ingresa un email válido');
      }

      // Check if account is locked
      if (this.isAccountLocked(sanitizedEmail)) {
        const remainingTime = Math.ceil((this.lockoutTime - (Date.now() - this.loginAttempts[sanitizedEmail].lastAttempt)) / 60000);
        throw new Error(`Cuenta bloqueada temporalmente. Intenta en ${remainingTime} minutos`);
      }

      // Load existing users
      const users = this.loadUsers();
      
      // First check if it's a quick access code (4 digits)
      if (/^\d{4}$/.test(password)) {
        const user = users.find(u => u.email === sanitizedEmail);
        if (user && this.validateQuickAccessCode(password, user.id)) {
          // Quick access login
          this.currentUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            sessionToken: this.generateSessionToken(),
            loginTime: Date.now(),
            quickLogin: true
          };

          this.isAuthenticated = true;
          localStorage.setItem('user', JSON.stringify(this.currentUser));
          this.updateLastActivity();
          this.clearFailedAttempts(sanitizedEmail);

          this.showMessage('Acceso rápido exitoso', 'success');
          this.showChat();
          return;
        }
      }
      
      // Hash the provided password for comparison
      const hashedPassword = await this.hashPassword(password);
      
      // Check if user exists with matching credentials
      const user = users.find(u => u.email === sanitizedEmail && u.password === hashedPassword);
      
      if (!user) {
        this.recordFailedAttempt(sanitizedEmail);
        const attemptsLeft = this.maxLoginAttempts - (this.loginAttempts[sanitizedEmail]?.count || 0);
        throw new Error(`Credenciales inválidas. ${attemptsLeft} intentos restantes`);
      }

      // Clear failed attempts on successful login
      this.clearFailedAttempts(sanitizedEmail);

      // Generate session token and quick access code
      const sessionToken = this.generateSessionToken();
      const quickCode = this.createQuickAccessCode(user.id);

      // Login successful
      this.currentUser = {
        id: user.id,
        username: user.username, 
        email: user.email,
        sessionToken: sessionToken,
        loginTime: Date.now()
      };
      
      this.isAuthenticated = true;
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      this.updateLastActivity();

      this.showMessage('Inicio de sesión exitoso', 'success');
      this.showChat();

      // Show quick access code modal after successful login
      setTimeout(() => {
        this.showQuickAccessCodeModal(quickCode);
      }, 1000);

    } catch (error) {
      console.error('Login error:', error);
      this.showMessage(error.message, 'error');
    }
  }

  async signup() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
      // Enhanced input validation
      if (!username || !email || !password) {
        throw new Error('Por favor completa todos los campos');
      }

      // Sanitize inputs
      const sanitizedUsername = this.sanitizeInput(username);
      const sanitizedEmail = this.sanitizeInput(email).toLowerCase();

      // Validate username
      if (sanitizedUsername.length < 3 || sanitizedUsername.length > 20) {
        throw new Error('El nombre de usuario debe tener entre 3 y 20 caracteres');
      }

      if (!/^[a-zA-Z0-9_]+$/.test(sanitizedUsername)) {
        throw new Error('El nombre de usuario solo puede contener letras, números y guiones bajos');
      }

      // Validate email
      if (!this.validateEmail(sanitizedEmail)) {
        throw new Error('Por favor ingresa un email válido');
      }

      // Enhanced password validation
      if (!this.validatePassword(password)) {
        throw new Error('La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos');
      }

      // Enhanced duplicate checking - block if email or username already exists
      const users = this.loadUsers();
      
      const existingEmailUser = users.find(u => u.email === sanitizedEmail);
      if (existingEmailUser) {
        throw new Error('Este correo electrónico ya está registrado. Si es tu cuenta, usa "¿Olvidaste tu contraseña?" para recuperar el acceso.');
      }

      const existingUsernameUser = users.find(u => u.username.toLowerCase() === sanitizedUsername.toLowerCase());
      if (existingUsernameUser) {
        throw new Error('Este nombre de usuario ya está en uso. Por favor elige otro.');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create new user
      const newUser = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        username: sanitizedUsername,
        email: sanitizedEmail,
        password: hashedPassword,
        createdAt: new Date().toISOString(),
        isVerified: true, // In production, implement email verification
        profile: {
          lastLogin: null,
          loginCount: 0
        }
      };

      // Add to users array
      users.push(newUser);
      this.saveUsers(users);

      // Generate session token and quick access code
      const sessionToken = this.generateSessionToken();
      const quickCode = this.createQuickAccessCode(newUser.id);

      // Login the new user
      this.currentUser = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        sessionToken: sessionToken,
        loginTime: Date.now()
      };
      
      this.isAuthenticated = true;
      localStorage.setItem('user', JSON.stringify(this.currentUser));
      this.updateLastActivity();

      this.showMessage('Registro exitoso', 'success');
      this.showChat();

      // Show quick access code modal after successful registration
      setTimeout(() => {
        this.showQuickAccessCodeModal(quickCode);
      }, 1000);

    } catch (error) {
      console.error('Signup error:', error);
      this.showMessage(error.message, 'error');
    }
  }

  // Settings modal
  showSettingsModal() {
    const translations = this.languages[this.settings.language].translations;
    const modal = this.createModal(translations.settings, `
      <div class="settings-container">
        <div class="settings-section">
          <h3>${translations.profile}</h3>
          <div class="profile-summary">
            <div class="profile-avatar-small">${this.currentUser.username[0].toUpperCase()}</div>
            <div class="profile-info">
              <p class="profile-username">${this.currentUser.username}</p>
              <p class="profile-email">${this.currentUser.email}</p>
            </div>
          </div>
          <button class="settings-btn edit-profile-btn" data-translate="editProfile">${translations.editProfile}</button>
        </div>
        
        <div class="settings-section">
          <h3>${translations.theme}</h3>
          <div class="setting-row">
            <label data-translate="darkMode">${translations.darkMode}</label>
            <label class="switch">
              <input type="checkbox" ${this.settings.theme === 'dark' ? 'checked' : ''} id="themeToggle">
              <span class="slider round"></span>
            </label>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>${translations.language}</h3>
          <div class="language-grid">
            ${Object.entries(this.languages).map(([code, lang]) => `
              <div class="language-option ${this.settings.language === code ? 'active' : ''}" data-lang="${code}">
                <span class="language-flag">${lang.flag}</span>
                <span class="language-name">${lang.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="settings-section">
          <h3>${translations.notifications}</h3>
          <div class="notifications-grid">
            <div class="setting-row">
              <label>Notificaciones del chat</label>
              <label class="switch">
                <input type="checkbox" ${this.settings.notifications ? 'checked' : ''} id="notificationsToggle">
                <span class="slider round"></span>
              </label>
            </div>
            <div class="setting-row">
              <label>Notificaciones del navegador</label>
              <label class="switch">
                <input type="checkbox" ${localStorage.getItem('browserNotifications') === 'true' ? 'checked' : ''} id="browserNotificationsToggle">
                <span class="slider round"></span>
              </label>
            </div>
            <div class="setting-row">
              <label>Sonidos</label>
              <label class="switch">
                <input type="checkbox" ${localStorage.getItem('soundNotifications') !== 'false' ? 'checked' : ''} id="soundNotificationsToggle">
                <span class="slider round"></span>
              </label>
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>${translations.privacy}</h3>
          <div class="privacy-controls">
            <div class="setting-row">
              <label>Modo de privacidad</label>
              <select class="privacy-select" id="privacyMode">
                <option value="normal" ${this.settings.privacyMode === 'normal' ? 'selected' : ''}>Normal</option>
                <option value="strict" ${this.settings.privacyMode === 'strict' ? 'selected' : ''}>Estricto</option>
              </select>
            </div>
            <div class="setting-row">
              <label>Recordar sesión</label>
              <label class="switch">
                <input type="checkbox" ${localStorage.getItem('rememberMe') !== 'false' ? 'checked' : ''} id="rememberMeToggle">
                <span class="slider round"></span>
              </label>
            </div>
          </div>
          <button class="settings-btn clear-history" data-translate="clear">${translations.clear}</button>
        </div>
        
        <div class="settings-section">
          <h3>Seguridad</h3>
          <div class="security-controls">
            <button class="settings-btn primary change-password-btn" id="settingsChangePassword">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              Cambiar Contraseña
            </button>
            <button class="settings-btn secondary" id="manageQuickAccess">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
              Gestionar Acceso Rápido
            </button>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>Datos</h3>
          <div class="data-controls">
            <button class="settings-btn secondary export-data">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              Exportar Datos
            </button>
            <button class="settings-btn danger delete-account">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2s-1.9-1.9-2-3v-4c0-1.1.9-2 2-2s2 .9 2 2v4c0 1.1-.9 2-2 2-2 2-2 2-2 2zm12 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2v4c0 1.1.9 2 2 2s2-.9 2-2v-4c0-1.1-.9-2-2-2-2 2-2 2-2 2zm-12 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2v4c0 1.1.9 2 2 2s2-.9 2-2v-4c0-1.1-.9-2-2-2-2 2-2 2-2 2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              Eliminar Cuenta
            </button>
          </div>
        </div>
      </div>
    `);

    // Enhanced event listeners with proper error handling
    modal.querySelector('#themeToggle').addEventListener('change', (e) => {
      try {
        this.settings.theme = e.target.checked ? 'dark' : 'light';
        document.body.className = this.settings.theme;
        this.saveSettings();
        this.showMessage('Tema cambiado correctamente', 'success');
      } catch (error) {
        this.showMessage('Error al cambiar el tema', 'error');
      }
    });

    // Language selection with enhanced UX
    modal.querySelectorAll('.language-option').forEach(option => {
      option.addEventListener('click', () => {
        try {
          const lang = option.dataset.lang;
          if (lang !== this.settings.language) {
            // Remove active class from all options
            modal.querySelectorAll('.language-option').forEach(opt => opt.classList.remove('active'));
            // Add active class to selected option
            option.classList.add('active');
            
            this.updateLanguage(lang);
            this.showMessage('Idioma cambiado correctamente', 'success');
            
            // Refresh modal with new language after a short delay
            setTimeout(() => {
              modal.remove();
              this.showSettingsModal();
            }, 1500);
          }
        } catch (error) {
          this.showMessage('Error al cambiar el idioma', 'error');
        }
      });
    });

    // Enhanced notification toggles
    modal.querySelector('#notificationsToggle').addEventListener('change', (e) => {
      try {
        this.settings.notifications = e.target.checked;
        this.saveSettings();
        this.applyNotificationSettings();
        this.showMessage('Configuración de notificaciones actualizada', 'success');
      } catch (error) {
        this.showMessage('Error al actualizar notificaciones', 'error');
      }
    });

    modal.querySelector('#browserNotificationsToggle').addEventListener('change', (e) => {
      try {
        if (e.target.checked) {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              localStorage.setItem('browserNotifications', 'true');
              this.showMessage('Notificaciones del navegador activadas', 'success');
            } else {
              e.target.checked = false;
              this.showMessage('Permisos de notificación denegados', 'warning');
            }
          });
        } else {
          localStorage.setItem('browserNotifications', 'false');
          this.showMessage('Notificaciones del navegador desactivadas', 'success');
        }
      } catch (error) {
        this.showMessage('Error al configurar notificaciones del navegador', 'error');
      }
    });

    modal.querySelector('#soundNotificationsToggle').addEventListener('change', (e) => {
      try {
        localStorage.setItem('soundNotifications', e.target.checked);
        this.showMessage('Notificaciones de sonido ' + (e.target.checked ? 'activadas' : 'desactivadas'), 'success');
      } catch (error) {
        this.showMessage('Error al configurar sonidos', 'error');
      }
    });

    // Privacy controls
    modal.querySelector('#privacyMode').addEventListener('change', (e) => {
      try {
        this.settings.privacyMode = e.target.value;
        this.saveSettings();
        this.applyPrivacySettings();
        this.showMessage('Configuración de privacidad actualizada', 'success');
      } catch (error) {
        this.showMessage('Error al actualizar privacidad', 'error');
      }
    });

    modal.querySelector('#rememberMeToggle').addEventListener('change', (e) => {
      try {
        localStorage.setItem('rememberMe', e.target.checked);
        this.showMessage('Configuración de "Recordarme" actualizada', 'success');
      } catch (error) {
        this.showMessage('Error al actualizar configuración', 'error');
      }
    });

    // Action buttons
    modal.querySelector('.clear-history').addEventListener('click', () => {
      if (confirm(this.settings.language === 'es' ? 
        '¿Estás seguro de que quieres borrar todo el historial?' : 
        'Are you sure you want to clear all history?')) {
        try {
          localStorage.removeItem('conversationHistory');
          localStorage.removeItem('innovaplus_session_memory');
          if (window.chat) {
            window.chat.clearHistory();
          }
          this.showMessage(this.settings.language === 'es' ? 
            'Historial borrado correctamente' : 
            'History cleared successfully', 'success');
        } catch (error) {
          this.showMessage('Error al borrar el historial', 'error');
        }
      }
    });

    modal.querySelector('#settingsChangePassword').addEventListener('click', () => {
      modal.remove();
      this.showChangePasswordModal();
    });

    modal.querySelector('#manageQuickAccess').addEventListener('click', () => {
      modal.remove();
      this.showQuickAccessManagement();
    });

    modal.querySelector('.edit-profile-btn').addEventListener('click', () => {
      modal.remove();
      this.showProfileModal();
    });

    modal.querySelector('.export-data').addEventListener('click', () => {
      try {
        this.exportUserData();
        this.showMessage('Datos exportados correctamente', 'success');
      } catch (error) {
        this.showMessage('Error al exportar datos', 'error');
      }
    });

    modal.querySelector('.delete-account').addEventListener('click', () => {
      this.deleteAccount();
    });
  }

  showQuickAccessManagement() {
    const userCode = this.quickAccessCodes[this.currentUser.id];
    const hasActiveCode = userCode && Date.now() < userCode.expires;
    
    const modal = this.createModal('Gestionar Acceso Rápido', `
      <div class="quick-access-management">
        <div class="current-code-status">
          <h3>Estado del Código Actual</h3>
          ${hasActiveCode ? `
            <div class="code-active">
              <div class="status-icon">✅</div>
              <div class="status-info">
                <p><strong>Código activo:</strong> ••••</p>
                <p><strong>Expira:</strong> ${new Date(userCode.expires).toLocaleDateString()}</p>
                <p><strong>Creado:</strong> ${new Date(userCode.created).toLocaleDateString()}</p>
              </div>
            </div>
            <div class="code-actions">
              <button class="settings-btn secondary" id="revealCode">👁️ Mostrar Código</button>
              <button class="settings-btn danger" id="revokeCode">🗑️ Revocar Código</button>
            </div>
          ` : `
            <div class="code-inactive">
              <div class="status-icon">⭕</div>
              <div class="status-info">
                <p>No tienes un código de acceso rápido activo</p>
                <p>Genera uno nuevo para acceso rápido en futuros inicios de sesión</p>
              </div>
            </div>
            <div class="code-actions">
              <button class="settings-btn primary" id="generateNewCode">🔑 Generar Nuevo Código</button>
            </div>
          `}
        </div>
        
        <div class="quick-access-info">
          <h3>ℹ️ Información del Acceso Rápido</h3>
          <ul>
            <li>El código de acceso rápido te permite iniciar sesión usando solo 4 dígitos</li>
            <li>Los códigos expiran automáticamente después de 7 días</li>
            <li>Solo funciona en el dispositivo donde fue generado</li>
            <li>Puedes revocar el código en cualquier momento</li>
            <li>Se genera automáticamente un nuevo código cada vez que inicias sesión</li>
          </ul>
        </div>
      </div>
    `);

    // Add event listeners
    if (hasActiveCode) {
      modal.querySelector('#revealCode').addEventListener('click', () => {
        const codeElement = modal.querySelector('.status-info p:first-child strong').nextSibling;
        if (codeElement.textContent === ' ••••') {
          codeElement.textContent = ` ${userCode.code}`;
          modal.querySelector('#revealCode').innerHTML = '🙈 Ocultar Código';
        } else {
          codeElement.textContent = ' ••••';
          modal.querySelector('#revealCode').innerHTML = '👁️ Mostrar Código';
        }
      });

      modal.querySelector('#revokeCode').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres revocar tu código de acceso rápido?')) {
          delete this.quickAccessCodes[this.currentUser.id];
          this.saveQuickAccessCodes();
          this.showMessage('Código de acceso rápido revocado', 'success');
          modal.remove();
          this.showQuickAccessManagement();
        }
      });
    } else {
      modal.querySelector('#generateNewCode').addEventListener('click', () => {
        const newCode = this.createQuickAccessCode(this.currentUser.id);
        this.showMessage('Nuevo código generado', 'success');
        modal.remove();
        this.showQuickAccessCodeModal(newCode);
      });
    }
  }

  // Profile modal
  showProfileModal() {
    const translations = this.languages[this.settings.language].translations;
    const users = this.loadUsers();
    const user = users.find(u => u.id === this.currentUser.id);
    
    const modal = this.createModal(translations.profile, `
      <div class="profile-container">
        <div class="profile-header">
          <div class="profile-avatar">${this.currentUser.username[0].toUpperCase()}</div>
          <h2>${this.currentUser.username}</h2>
        </div>
        <div class="profile-details">
          <div class="detail-row">
            <span class="label">Email:</span>
            <span>${this.currentUser.email}</span>
          </div>
          <div class="detail-row">
            <span class="label">Miembro desde:</span>
            <span>${user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="label">Sesiones:</span>
            <span>${user?.profile?.loginCount || 0}</span>
          </div>
          <div class="detail-row">
            <span class="label">ID de usuario:</span>
            <span>${this.currentUser.id.substring(0, 8)}...</span>
          </div>
        </div>
        <div class="profile-actions">
          <button class="edit-profile-btn" id="editProfileInfo">Editar Información</button>
          <button class="change-password-btn" id="profileChangePassword">Cambiar Contraseña</button>
          <button class="export-data-btn" id="exportUserData">Exportar Datos</button>
        </div>
      </div>
    `);

    modal.querySelector('#profileChangePassword').addEventListener('click', () => {
      modal.remove();
      this.showChangePasswordModal();
    });

    modal.querySelector('#editProfileInfo').addEventListener('click', () => {
      this.showEditProfileModal();
      modal.remove();
    });

    modal.querySelector('#exportUserData').addEventListener('click', () => {
      this.exportUserData();
      this.showMessage('Datos exportados correctamente', 'success');
    });
  }

  // New method for editing profile
  showEditProfileModal() {
    const translations = this.languages[this.settings.language].translations;
    const modal = this.createModal('Editar Perfil', `
      <div class="profile-edit-container">
        <form id="editProfileForm">
          <div class="input-group">
            <label for="editUsername">Nombre de usuario:</label>
            <input type="text" id="editUsername" value="${this.currentUser.username}" required>
            <div class="input-validation-message" id="editUsername-error"></div>
          </div>
          <div class="input-group">
            <label for="editEmail">Correo electrónico:</label>
            <input type="email" id="editEmail" value="${this.currentUser.email}" required>
            <div class="input-validation-message" id="editEmail-error"></div>
          </div>
          <div class="profile-edit-actions">
            <button type="submit" class="auth-btn">Guardar Cambios</button>
            <button type="button" class="auth-btn secondary" id="cancelEditProfile">Cancelar</button>
          </div>
        </form>
      </div>
    `);

    modal.querySelector('#editProfileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const newUsername = document.getElementById('editUsername').value.trim();
      const newEmail = document.getElementById('editEmail').value.trim();

      try {
        // Validate inputs
        if (!newUsername || !newEmail) {
          throw new Error('Todos los campos son requeridos');
        }

        if (!this.validateEmail(newEmail)) {
          throw new Error('Formato de email inválido');
        }

        // Check if username/email already exists (excluding current user)
        const users = this.loadUsers();
        const existingUser = users.find(u => 
          u.id !== this.currentUser.id && 
          (u.username.toLowerCase() === newUsername.toLowerCase() || u.email.toLowerCase() === newEmail.toLowerCase())
        );

        if (existingUser) {
          throw new Error('El nombre de usuario o email ya están en uso');
        }

        // Update user data
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
          users[userIndex].username = newUsername;
          users[userIndex].email = newEmail;
          this.saveUsers(users);

          // Update current user
          this.currentUser.username = newUsername;
          this.currentUser.email = newEmail;
          localStorage.setItem('user', JSON.stringify(this.currentUser));

          // Update UI
          const userAvatar = document.querySelector('.user-avatar');
          const userName = document.querySelector('.user-name');
          if (userAvatar && userName) {
            userAvatar.textContent = newUsername[0].toUpperCase();
            userName.textContent = newUsername;
          }

          this.showMessage('Perfil actualizado correctamente', 'success');
          modal.remove();
        }
      } catch (error) {
        this.showMessage(error.message, 'error');
      }
    });

    modal.querySelector('#cancelEditProfile').addEventListener('click', () => {
      modal.remove();
    });
  }

  // Language modal
  showLanguageModal() {
    const translations = this.languages[this.settings.language].translations;
    const modal = this.createModal(translations.language, `
      <div class="language-container">
        ${Object.entries(this.languages).map(([code, lang]) => `
          <div class="language-option ${this.settings.language === code ? 'active' : ''}" data-lang="${code}">
            ${lang.flag} ${lang.name}
          </div>
        `).join('')}
      </div>
    `);

    // Add click handlers for language options
    modal.querySelectorAll('.language-option').forEach(option => {
      option.addEventListener('click', () => {
        const lang = option.dataset.lang;
        this.updateLanguage(lang);
        this.showMessage('Idioma cambiado correctamente', 'success');
        modal.remove();
      });
    });
  }

  // Notifications modal
  showNotificationsModal() {
    const translations = this.languages[this.settings.language].translations;
    const modal = this.createModal(translations.notifications, `
      <div class="notifications-container">
        <div class="notification-setting">
          <label>Chat notifications</label>
          <label class="switch">
            <input type="checkbox" ${this.settings.notifications ? 'checked' : ''} id="notificationsToggle">
            <span class="slider round"></span>
          </label>
        </div>
        <div class="notification-setting">
          <label>Browser notifications</label>
          <label class="switch">
            <input type="checkbox" ${localStorage.getItem('browserNotifications') === 'true' ? 'checked' : ''} id="browserNotificationsToggle">
            <span class="slider round"></span>
          </label>
        </div>
        <div class="notification-setting">
          <label>Sound notifications</label>
          <label class="switch">
            <input type="checkbox" ${localStorage.getItem('soundNotifications') !== 'false' ? 'checked' : ''} id="soundNotificationsToggle">
            <span class="slider round"></span>
          </label>
        </div>
        <div class="notification-setting">
          <label>Email notifications</label>
          <label class="switch">
            <input type="checkbox" ${localStorage.getItem('emailNotifications') === 'true' ? 'checked' : ''} id="emailNotificationsToggle">
            <span class="slider round"></span>
          </label>
        </div>
      </div>
    `);

    // Add event listeners
    modal.querySelector('#notificationsToggle').addEventListener('change', (e) => {
      this.settings.notifications = e.target.checked;
      this.saveSettings();
      this.applyNotificationSettings();
      this.showMessage('Configuración de notificaciones actualizada', 'success');
    });

    modal.querySelector('#browserNotificationsToggle').addEventListener('change', (e) => {
      localStorage.setItem('browserNotifications', e.target.checked);
      if (e.target.checked) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            this.showMessage('Notificaciones del navegador activadas', 'success');
          } else {
            this.showMessage('Permisos de notificación denegados', 'warning');
            e.target.checked = false;
            localStorage.setItem('browserNotifications', 'false');
          }
        });
      } else {
        this.showMessage('Notificaciones del navegador desactivadas', 'success');
      }
    });

    modal.querySelector('#soundNotificationsToggle').addEventListener('change', (e) => {
      localStorage.setItem('soundNotifications', e.target.checked);
      this.showMessage('Notificaciones de sonido ' + (e.target.checked ? 'activadas' : 'desactivadas'), 'success');
    });

    modal.querySelector('#emailNotificationsToggle').addEventListener('change', (e) => {
      localStorage.setItem('emailNotifications', e.target.checked);
      this.showMessage('Notificaciones por email ' + (e.target.checked ? 'activadas' : 'desactivadas'), 'success');
    });
  }

  // Privacy modal
  showPrivacyModal() {
    const translations = this.languages[this.settings.language].translations;
    const modal = this.createModal(translations.privacy, `
      <div class="privacy-container">
        <div class="privacy-setting">
          <h3>Privacy Mode</h3>
          <select class="privacy-mode" id="privacyMode">
            <option value="normal" ${this.settings.privacyMode === 'normal' ? 'selected' : ''}>Normal</option>
            <option value="strict" ${this.settings.privacyMode === 'strict' ? 'selected' : ''}>Strict</option>
          </select>
          <p class="setting-description">Strict mode clears local data more frequently</p>
        </div>
        <div class="privacy-setting">
          <h3>Data Management</h3>
          <button class="clear-history" data-translate="clear">${translations.clear}</button>
          <button class="export-data">Exportar Datos</button>
          <button class="delete-account">Eliminar Cuenta</button>
        </div>
        <div class="privacy-setting">
          <h3>Session Settings</h3>
          <label class="switch-container">
            <span>Remember me</span>
            <label class="switch">
              <input type="checkbox" ${localStorage.getItem('rememberMe') !== 'false' ? 'checked' : ''} id="rememberMeToggle">
              <span class="slider round"></span>
            </label>
          </label>
        </div>
        <div class="privacy-setting">
          <h3>Data Collection</h3>
          <label class="switch-container">
            <span>Analytics</span>
            <label class="switch">
              <input type="checkbox" ${localStorage.getItem('allowAnalytics') !== 'false' ? 'checked' : ''} id="analyticsToggle">
              <span class="slider round"></span>
            </label>
          </label>
        </div>
      </div>
    `);

    // Add event listeners
    modal.querySelector('#privacyMode').addEventListener('change', (e) => {
      this.settings.privacyMode = e.target.value;
      this.saveSettings();
      this.applyPrivacySettings();
      this.showMessage('Configuración de privacidad actualizada', 'success');
    });

    modal.querySelector('.clear-history').addEventListener('click', () => {
      if (confirm(this.settings.language === 'es' ? 
        '¿Estás seguro de que quieres borrar todo el historial?' : 
        'Are you sure you want to clear all history?')) {
        localStorage.removeItem('conversationHistory');
        localStorage.removeItem('innovaplus_session_memory');
        if (window.chat) {
          window.chat.clearHistory();
        }
        this.showMessage(this.settings.language === 'es' ? 
          'Historial borrado correctamente' : 
          'History cleared successfully', 'success');
      }
    });

    modal.querySelector('.export-data').addEventListener('click', () => {
      this.exportUserData();
      this.showMessage('Datos exportados correctamente', 'success');
    });

    modal.querySelector('.delete-account').addEventListener('click', () => {
      this.deleteAccount();
    });

    modal.querySelector('#rememberMeToggle').addEventListener('change', (e) => {
      localStorage.setItem('rememberMe', e.target.checked);
      this.showMessage('Configuración de "Recordarme" actualizada', 'success');
    });

    modal.querySelector('#analyticsToggle').addEventListener('change', (e) => {
      localStorage.setItem('allowAnalytics', e.target.checked);
      this.showMessage('Configuración de analytics actualizada', 'success');
    });
  }

  exportUserData() {
    const userData = {
      user: this.currentUser,
      settings: this.settings,
      sessionMemory: localStorage.getItem('innovaplus_session_memory'),
      conversationHistory: localStorage.getItem('conversationHistory'),
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `innovaplus-data-${this.currentUser.username}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  deleteAccount() {
    if (confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
      if (confirm('Por favor confirma que quieres eliminar permanentemente tu cuenta y todos tus datos.')) {
        // Remove user from registered users
        const users = this.loadUsers();
        const filteredUsers = users.filter(u => u.id !== this.currentUser.id);
        this.saveUsers(filteredUsers);
        
        // Clear all user data
        localStorage.removeItem('user');
        localStorage.removeItem('conversationHistory');
        localStorage.removeItem('innovaplus_session_memory');
        localStorage.removeItem('lastActivity');
        
        this.showMessage('Tu cuenta ha sido eliminada exitosamente.', 'success');
        this.logout();
      }
    }
  }

  // New method to show change password modal
  showChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
      modal.classList.remove('hidden');
      
      // Reset form
      const form = modal.querySelector('#change-password-form');
      if (form) {
        form.reset();
        // Clear any previous error messages
        modal.querySelectorAll('.input-validation-message').forEach(el => {
          el.classList.remove('show');
        });
      }
    }
  }

  bindEvents() {
    // Login form
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.login();
    });

    // Signup form  
    document.getElementById('signup-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.signup();
    });

    // Toggle forms
    document.getElementById('show-signup')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-container').classList.add('hidden');
      document.getElementById('signup-container').classList.remove('hidden');
    });

    document.getElementById('show-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('signup-container').classList.add('hidden');
      document.getElementById('login-container').classList.remove('hidden');
    });

    // Quick access button
    const loginForm = document.getElementById('login-form');
    if (loginForm && !loginForm.querySelector('.quick-access-btn')) {
      const quickAccessBtn = document.createElement('button');
      quickAccessBtn.type = 'button';
      quickAccessBtn.className = 'quick-access-btn';
      quickAccessBtn.innerHTML = '🚀 Acceso Rápido';
      quickAccessBtn.addEventListener('click', () => {
        this.showQuickAccessLogin();
      });
      
      const loginBtn = loginForm.querySelector('.login-btn');
      loginBtn.parentNode.insertBefore(quickAccessBtn, loginBtn.nextSibling);
    }
  }

  showChat() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('signup-container').classList.add('hidden');
    document.getElementById('chat-app').classList.remove('hidden');

    // Update user profile
    const userAvatar = document.querySelector('.user-avatar');
    const userName = document.querySelector('.user-name');
    if (userAvatar && userName && this.currentUser) {
      userAvatar.textContent = this.currentUser.username[0].toUpperCase();
      userName.textContent = this.currentUser.username;
    }

    // Initialize chat if needed
    if (!window.chat) {
      window.chat = new ChatInterface();
    }

    // Update last activity on any interaction
    document.addEventListener('click', () => this.updateLastActivity());
    document.addEventListener('keypress', () => this.updateLastActivity());
    document.addEventListener('scroll', () => this.updateLastActivity());
  }

  showLogin() {
    document.getElementById('chat-app').classList.add('hidden');
    document.getElementById('signup-container').classList.add('hidden');
    document.getElementById('login-container').classList.remove('hidden');
  }

  createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;

    modal.querySelector('.close-modal').addEventListener('click', () => {
      modal.remove();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close modal with Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    document.body.appendChild(modal);
    return modal;
  }

  logout() {
    // Clear session data
    this.currentUser = null;
    this.isAuthenticated = false;
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    
    this.showLogin();
    
    // Reset chat interface
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = '';
    }

    this.showMessage('Sesión cerrada correctamente', 'success');
  }
}

// Initialize authentication
document.addEventListener('DOMContentLoaded', () => {
  window.auth = new Auth();
});