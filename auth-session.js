/**
 * Sistema de Sesión Permanente para InnovA+
 */

class SessionManager {
  constructor() {
    this.sessionKey = 'innova_session';
    this.userKey = 'innova_user';
    this.initSession();
  }

  /**
   * Inicializar sesión
   */
  initSession() {
    const session = this.getSession();
    if (session && this.isSessionValid(session)) {
      // Sesión válida, actualizar timestamp
      this.updateSessionTimestamp();
    }
  }

  /**
   * Crear sesión permanente
   */
  createSession(user) {
    const session = {
      userId: user.id || user.email,
      email: user.email,
      username: user.username,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      permanent: true
    };

    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    localStorage.setItem(this.userKey, JSON.stringify(user));

    return session;
  }

  /**
   * Obtener sesión actual
   */
  getSession() {
    try {
      const session = localStorage.getItem(this.sessionKey);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser() {
    try {
      const user = localStorage.getItem(this.userKey);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Verificar si sesión es válida
   */
  isSessionValid(session) {
    if (!session) return false;
    
    // Sesión permanente, siempre válida
    if (session.permanent) {
      return true;
    }

    // Verificar expiración (24 horas)
    const expirationTime = 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - session.createdAt;

    return elapsed < expirationTime;
  }

  /**
   * Verificar si usuario está autenticado
   */
  isAuthenticated() {
    const session = this.getSession();
    return session && this.isSessionValid(session);
  }

  /**
   * Actualizar timestamp de actividad
   */
  updateSessionTimestamp() {
    const session = this.getSession();
    if (session) {
      session.lastActivity = Date.now();
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
    }
  }

  /**
   * Cerrar sesión
   */
  logout() {
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.userKey);
  }

  /**
   * Obtener información de sesión
   */
  getSessionInfo() {
    const session = this.getSession();
    if (!session) return null;

    return {
      email: session.email,
      username: session.username,
      createdAt: new Date(session.createdAt).toLocaleString(),
      lastActivity: new Date(session.lastActivity).toLocaleString(),
      isPermanent: session.permanent
    };
  }
}

// Crear instancia global
const sessionManager = new SessionManager();
