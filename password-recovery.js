/**
 * Sistema de Recuperación de Contraseña con Gmail
 */

class PasswordRecoveryService {
  constructor() {
    this.recoveryTokens = new Map();
    this.tokenExpiry = 15 * 60 * 1000; // 15 minutos
  }

  /**
   * Generar token de recuperación
   */
  generateToken() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Solicitar recuperación de contraseña
   */
  requestRecovery(email) {
    try {
      // Verificar si el email existe
      const users = JSON.parse(localStorage.getItem('innova_users') || '[]');
      const user = users.find(u => u.email === email);

      if (!user) {
        // Por seguridad, no revelar si el email existe
        return {
          success: true,
          message: 'Si el email existe, recibirás un enlace de recuperación',
          hidden: true
        };
      }

      // Generar token
      const token = this.generateToken();
      const expiryTime = Date.now() + this.tokenExpiry;

      // Guardar token
      this.recoveryTokens.set(token, {
        email: email,
        username: user.username,
        expiryTime: expiryTime
      });

      // Guardar en localStorage también
      const tokens = JSON.parse(localStorage.getItem('recovery_tokens') || '{}');
      tokens[token] = {
        email: email,
        username: user.username,
        expiryTime: expiryTime
      };
      localStorage.setItem('recovery_tokens', JSON.stringify(tokens));

      return {
        success: true,
        token: token,
        email: email,
        username: user.username,
        message: 'Token de recuperación generado'
      };
    } catch (error) {
      console.error('Error requesting recovery:', error);
      return {
        success: false,
        error: 'Error al procesar la solicitud'
      };
    }
  }

  /**
   * Enviar email de recuperación (simulado)
   */
  async sendRecoveryEmail(email, token, username) {
    try {
      // Crear contenido del email
      const recoveryLink = `${window.location.origin}?reset=${token}`;
      
      const emailContent = {
        to: email,
        subject: '🔐 Recupera tu contraseña en InnovA+',
        body: `
Hola ${username},

Recibimos una solicitud para recuperar tu contraseña en InnovA+.

Haz clic en el siguiente enlace para cambiar tu contraseña:
${recoveryLink}

O copia este código:
${token}

Este enlace expira en 15 minutos.

Si no solicitaste este cambio, ignora este email.

---
InnovA+ Team
        `
      };

      // En producción, esto enviaría un email real
      // Por ahora, simulamos el envío
      console.log('Email de recuperación:', emailContent);

      // Mostrar en consola para demostración
      if (typeof window !== 'undefined') {
        window.lastRecoveryEmail = emailContent;
      }

      return {
        success: true,
        message: 'Email enviado a ' + email,
        email: email,
        token: token
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: 'Error al enviar email'
      };
    }
  }

  /**
   * Verificar token de recuperación
   */
  verifyToken(token) {
    try {
      // Buscar en memoria
      if (this.recoveryTokens.has(token)) {
        const data = this.recoveryTokens.get(token);
        
        // Verificar expiración
        if (Date.now() > data.expiryTime) {
          this.recoveryTokens.delete(token);
          return {
            valid: false,
            error: 'El token ha expirado'
          };
        }

        return {
          valid: true,
          email: data.email,
          username: data.username
        };
      }

      // Buscar en localStorage
      const tokens = JSON.parse(localStorage.getItem('recovery_tokens') || '{}');
      if (tokens[token]) {
        const data = tokens[token];
        
        // Verificar expiración
        if (Date.now() > data.expiryTime) {
          delete tokens[token];
          localStorage.setItem('recovery_tokens', JSON.stringify(tokens));
          return {
            valid: false,
            error: 'El token ha expirado'
          };
        }

        return {
          valid: true,
          email: data.email,
          username: data.username
        };
      }

      return {
        valid: false,
        error: 'Token inválido'
      };
    } catch (error) {
      console.error('Error verifying token:', error);
      return {
        valid: false,
        error: 'Error al verificar token'
      };
    }
  }

  /**
   * Cambiar contraseña con token
   */
  resetPassword(token, newPassword) {
    try {
      // Verificar token
      const verification = this.verifyToken(token);
      if (!verification.valid) {
        return {
          success: false,
          error: verification.error
        };
      }

      // Obtener usuario
      const users = JSON.parse(localStorage.getItem('innova_users') || '[]');
      const userIndex = users.findIndex(u => u.email === verification.email);

      if (userIndex === -1) {
        return {
          success: false,
          error: 'Usuario no encontrado'
        };
      }

      // Actualizar contraseña
      users[userIndex].password = newPassword;
      localStorage.setItem('innova_users', JSON.stringify(users));

      // Eliminar token
      this.recoveryTokens.delete(token);
      const tokens = JSON.parse(localStorage.getItem('recovery_tokens') || '{}');
      delete tokens[token];
      localStorage.setItem('recovery_tokens', JSON.stringify(tokens));

      return {
        success: true,
        message: 'Contraseña actualizada exitosamente'
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      return {
        success: false,
        error: 'Error al cambiar contraseña'
      };
    }
  }

  /**
   * Limpiar tokens expirados
   */
  cleanupExpiredTokens() {
    try {
      // Limpiar memoria
      for (const [token, data] of this.recoveryTokens.entries()) {
        if (Date.now() > data.expiryTime) {
          this.recoveryTokens.delete(token);
        }
      }

      // Limpiar localStorage
      const tokens = JSON.parse(localStorage.getItem('recovery_tokens') || '{}');
      for (const token in tokens) {
        if (Date.now() > tokens[token].expiryTime) {
          delete tokens[token];
        }
      }
      localStorage.setItem('recovery_tokens', JSON.stringify(tokens));
    } catch (error) {
      console.error('Error cleaning up tokens:', error);
    }
  }
}

// Crear instancia global
const passwordRecovery = new PasswordRecoveryService();

// Limpiar tokens expirados cada 5 minutos
setInterval(() => {
  passwordRecovery.cleanupExpiredTokens();
}, 5 * 60 * 1000);
