/**
 * Sistema de Autenticación Mejorado para InnovA+
 * Incluye: validación robusta, seguridad mejorada, UX optimizada
 */

class AuthenticationManager {
  constructor() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.sessionToken = null;
    this.sessionExpiry = null;
    
    // Configuración de seguridad
    this.config = {
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
      maxLoginAttempts: 5,
      lockoutTime: 15 * 60 * 1000, // 15 minutos
      passwordMinLength: 8,
      passwordRequirements: {
        uppercase: true,
        lowercase: true,
        numbers: true,
        special: true
      },
      rememberMeDuration: 30 * 24 * 60 * 60 * 1000, // 30 días
      twoFactorEnabled: false
    };

    // Estado de intentos de login
    this.loginAttempts = this.loadLoginAttempts();
    this.recoveryTokens = this.loadRecoveryTokens();
    this.users = this.loadUsers();
    
    this.initialize();
  }

  /**
   * Inicializar el sistema de autenticación
   */
  initialize() {
    this.restoreSession();
    this.setupEventListeners();
    this.startSessionMonitoring();
  }

  /**
   * Configurar listeners de eventos
   */
  setupEventListeners() {
    // Detectar inactividad
    document.addEventListener('mousemove', () => this.resetInactivityTimer());
    document.addEventListener('keypress', () => this.resetInactivityTimer());
    document.addEventListener('click', () => this.resetInactivityTimer());
  }

  /**
   * Validar formato de email
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validar fortaleza de contraseña
   */
  validatePassword(password) {
    const requirements = {
      length: password.length >= this.config.passwordMinLength,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    return {
      isValid: Object.values(requirements).every(req => req),
      requirements,
      strength: this.calculatePasswordStrength(requirements)
    };
  }

  /**
   * Calcular fortaleza de contraseña
   */
  calculatePasswordStrength(requirements) {
    const metRequirements = Object.values(requirements).filter(req => req).length;
    if (metRequirements <= 2) return 'weak';
    if (metRequirements <= 3) return 'medium';
    return 'strong';
  }

  /**
   * Hashear contraseña (simulado - usar bcrypt en producción)
   */
  hashPassword(password) {
    // En producción, usar bcrypt o similar
    return btoa(password + 'salt_' + Date.now());
  }

  /**
   * Verificar contraseña
   */
  verifyPassword(password, hash) {
    // En producción, usar bcrypt.compare()
    return btoa(password + 'salt_' + Date.now().toString().slice(0, -3)) === hash ||
           btoa(password + 'salt_' + (Date.now() - 1000).toString().slice(0, -3)) === hash;
  }

  /**
   * Registrar nuevo usuario
   */
  register(userData) {
    const { username, email, password, confirmPassword } = userData;

    // Validaciones
    if (!username || username.trim().length < 3) {
      return {
        success: false,
        error: 'El nombre de usuario debe tener al menos 3 caracteres'
      };
    }

    if (!this.validateEmail(email)) {
      return {
        success: false,
        error: 'Por favor ingresa un email válido'
      };
    }

    if (password !== confirmPassword) {
      return {
        success: false,
        error: 'Las contraseñas no coinciden'
      };
    }

    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: 'La contraseña no cumple con los requisitos de seguridad',
        requirements: passwordValidation.requirements
      };
    }

    // Verificar si el usuario ya existe
    if (this.users.some(u => u.email === email || u.username === username)) {
      return {
        success: false,
        error: 'El email o nombre de usuario ya está registrado'
      };
    }

    // Crear nuevo usuario
    const newUser = {
      id: this.generateUserId(),
      username,
      email,
      passwordHash: this.hashPassword(password),
      createdAt: new Date().toISOString(),
      lastLogin: null,
      twoFactorEnabled: false,
      preferences: {
        theme: 'light',
        language: 'es',
        notifications: true,
        emailNotifications: true
      }
    };

    this.users.push(newUser);
    this.saveUsers();

    return {
      success: true,
      message: 'Cuenta creada exitosamente',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    };
  }

  /**
   * Iniciar sesión
   */
  login(email, password, rememberMe = false) {
    // Verificar intentos de login
    const lockout = this.checkLoginLockout(email);
    if (lockout) {
      return {
        success: false,
        error: `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(lockout.remainingTime / 1000)} segundos`
      };
    }

    // Buscar usuario
    const user = this.users.find(u => u.email === email);
    if (!user) {
      this.recordLoginAttempt(email, false);
      return {
        success: false,
        error: 'Email o contraseña incorrectos'
      };
    }

    // Verificar contraseña
    if (!this.verifyPassword(password, user.passwordHash)) {
      this.recordLoginAttempt(email, false);
      return {
        success: false,
        error: 'Email o contraseña incorrectos'
      };
    }

    // Login exitoso
    this.recordLoginAttempt(email, true);
    this.createSession(user, rememberMe);

    return {
      success: true,
      message: 'Sesión iniciada exitosamente',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        preferences: user.preferences
      }
    };
  }

  /**
   * Crear sesión
   */
  createSession(user, rememberMe = false) {
    this.currentUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      preferences: user.preferences
    };

    this.sessionToken = this.generateSessionToken();
    this.sessionExpiry = new Date(Date.now() + this.config.sessionTimeout);
    this.isAuthenticated = true;

    // Guardar sesión
    const sessionData = {
      token: this.sessionToken,
      user: this.currentUser,
      expiry: this.sessionExpiry.toISOString(),
      rememberMe: rememberMe,
      createdAt: new Date().toISOString()
    };

    if (rememberMe) {
      localStorage.setItem('innova_session', JSON.stringify(sessionData));
    } else {
      sessionStorage.setItem('innova_session', JSON.stringify(sessionData));
    }

    // Actualizar último login
    user.lastLogin = new Date().toISOString();
    this.saveUsers();
  }

  /**
   * Restaurar sesión existente
   */
  restoreSession() {
    let sessionData = JSON.parse(localStorage.getItem('innova_session') || sessionStorage.getItem('innova_session') || 'null');
    
    if (sessionData && new Date(sessionData.expiry) > new Date()) {
      this.currentUser = sessionData.user;
      this.sessionToken = sessionData.token;
      this.sessionExpiry = new Date(sessionData.expiry);
      this.isAuthenticated = true;
      return true;
    }

    this.clearSession();
    return false;
  }

  /**
   * Cerrar sesión
   */
  logout() {
    this.currentUser = null;
    this.sessionToken = null;
    this.sessionExpiry = null;
    this.isAuthenticated = false;

    localStorage.removeItem('innova_session');
    sessionStorage.removeItem('innova_session');

    return {
      success: true,
      message: 'Sesión cerrada exitosamente'
    };
  }

  /**
   * Limpiar sesión
   */
  clearSession() {
    this.currentUser = null;
    this.sessionToken = null;
    this.sessionExpiry = null;
    this.isAuthenticated = false;
  }

  /**
   * Solicitar recuperación de contraseña
   */
  requestPasswordReset(email) {
    const user = this.users.find(u => u.email === email);
    
    if (!user) {
      // No revelar si el email existe
      return {
        success: true,
        message: 'Si el email existe, recibirás un enlace de recuperación'
      };
    }

    const token = this.generateRecoveryToken();
    this.recoveryTokens[token] = {
      userId: user.id,
      email: email,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutos
      used: false
    };

    this.saveRecoveryTokens();

    return {
      success: true,
      message: 'Enlace de recuperación enviado',
      token: token // En producción, enviar por email
    };
  }

  /**
   * Resetear contraseña
   */
  resetPassword(token, newPassword, confirmPassword) {
    if (!this.recoveryTokens[token]) {
      return {
        success: false,
        error: 'Token inválido o expirado'
      };
    }

    const tokenData = this.recoveryTokens[token];

    if (tokenData.used) {
      return {
        success: false,
        error: 'Este token ya ha sido utilizado'
      };
    }

    if (tokenData.expiresAt < Date.now()) {
      return {
        success: false,
        error: 'El token ha expirado'
      };
    }

    if (newPassword !== confirmPassword) {
      return {
        success: false,
        error: 'Las contraseñas no coinciden'
      };
    }

    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: 'La contraseña no cumple con los requisitos de seguridad'
      };
    }

    // Actualizar contraseña
    const user = this.users.find(u => u.id === tokenData.userId);
    if (user) {
      user.passwordHash = this.hashPassword(newPassword);
      this.saveUsers();
    }

    // Marcar token como usado
    tokenData.used = true;
    this.saveRecoveryTokens();

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente'
    };
  }

  /**
   * Verificar intentos de login
   */
  checkLoginLockout(email) {
    const attempts = this.loginAttempts[email];
    if (!attempts) return null;

    if (attempts.failedCount >= this.config.maxLoginAttempts) {
      const lockoutEnd = attempts.lastFailedAt + this.config.lockoutTime;
      const now = Date.now();

      if (now < lockoutEnd) {
        return {
          isLocked: true,
          remainingTime: lockoutEnd - now
        };
      } else {
        // Lockout expirado
        delete this.loginAttempts[email];
        this.saveLoginAttempts();
      }
    }

    return null;
  }

  /**
   * Registrar intento de login
   */
  recordLoginAttempt(email, success) {
    if (success) {
      delete this.loginAttempts[email];
    } else {
      if (!this.loginAttempts[email]) {
        this.loginAttempts[email] = {
          failedCount: 0,
          lastFailedAt: null
        };
      }

      this.loginAttempts[email].failedCount++;
      this.loginAttempts[email].lastFailedAt = Date.now();
    }

    this.saveLoginAttempts();
  }

  /**
   * Generar ID de usuario
   */
  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generar token de sesión
   */
  generateSessionToken() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 20);
  }

  /**
   * Generar token de recuperación
   */
  generateRecoveryToken() {
    return 'reset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 20);
  }

  /**
   * Cargar usuarios desde localStorage
   */
  loadUsers() {
    try {
      return JSON.parse(localStorage.getItem('innova_users') || '[]');
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }

  /**
   * Guardar usuarios en localStorage
   */
  saveUsers() {
    try {
      localStorage.setItem('innova_users', JSON.stringify(this.users));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  /**
   * Cargar intentos de login
   */
  loadLoginAttempts() {
    try {
      return JSON.parse(localStorage.getItem('innova_login_attempts') || '{}');
    } catch (error) {
      console.error('Error loading login attempts:', error);
      return {};
    }
  }

  /**
   * Guardar intentos de login
   */
  saveLoginAttempts() {
    try {
      localStorage.setItem('innova_login_attempts', JSON.stringify(this.loginAttempts));
    } catch (error) {
      console.error('Error saving login attempts:', error);
    }
  }

  /**
   * Cargar tokens de recuperación
   */
  loadRecoveryTokens() {
    try {
      return JSON.parse(localStorage.getItem('innova_recovery_tokens') || '{}');
    } catch (error) {
      console.error('Error loading recovery tokens:', error);
      return {};
    }
  }

  /**
   * Guardar tokens de recuperación
   */
  saveRecoveryTokens() {
    try {
      localStorage.setItem('innova_recovery_tokens', JSON.stringify(this.recoveryTokens));
    } catch (error) {
      console.error('Error saving recovery tokens:', error);
    }
  }

  /**
   * Monitorear sesión
   */
  startSessionMonitoring() {
    setInterval(() => {
      if (this.isAuthenticated && this.sessionExpiry) {
        if (new Date() > this.sessionExpiry) {
          this.logout();
          window.location.reload();
        }
      }
    }, 60000); // Verificar cada minuto
  }

  /**
   * Timer de inactividad
   */
  resetInactivityTimer() {
    if (this.isAuthenticated && this.sessionExpiry) {
      this.sessionExpiry = new Date(Date.now() + this.config.sessionTimeout);
    }
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Verificar si está autenticado
   */
  isUserAuthenticated() {
    return this.isAuthenticated && this.currentUser !== null;
  }

  /**
   * Actualizar preferencias de usuario
   */
  updateUserPreferences(preferences) {
    const user = this.users.find(u => u.id === this.currentUser.id);
    if (user) {
      user.preferences = { ...user.preferences, ...preferences };
      this.currentUser.preferences = user.preferences;
      this.saveUsers();
      return { success: true };
    }
    return { success: false, error: 'Usuario no encontrado' };
  }
}

// Crear instancia global
const authManager = new AuthenticationManager();
