// Split from auth.js - Login/Signup form handlers
class AuthenticationHandlers {
  static async handleLogin(email, password) {
    if (!email || !password) {
      throw new Error('Por favor completa todos los campos');
    }

    // Load existing users
    const users = this.loadUsers();
    
    // Check if user exists
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    return {
      id: user.id,
      username: user.username, 
      email: user.email
    };
  }

  static async handleSignup(username, email, password) {
    if (!username || !email || !password) {
      throw new Error('Por favor completa todos los campos');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    const users = this.loadUsers();

    // Check if user already exists
    if (users.some(u => u.email === email)) {
      throw new Error('Este correo electrónico ya está registrado');
    }

    if (users.some(u => u.username === username)) {
      throw new Error('Este nombre de usuario ya está en uso');
    }

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password // In a real app, this should be hashed
    };

    users.push(newUser);
    this.saveUsers(users);

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email
    };
  }

  // New password recovery methods
  static async handlePasswordRecovery(email) {
    if (!email) {
      throw new Error('Por favor ingresa tu correo electrónico');
    }

    const users = this.loadUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) {
      throw new Error('No encontramos una cuenta con ese correo electrónico');
    }

    // Generate recovery token
    const recoveryToken = this.generateRecoveryToken();
    const recoveryData = {
      userId: user.id,
      email: user.email,
      token: recoveryToken,
      expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes
      used: false
    };

    // Store recovery token
    this.saveRecoveryToken(recoveryData);

    // In a real app, you would send this via email
    // For demo purposes, we'll show it in a modal
    return {
      token: recoveryToken,
      email: user.email
    };
  }

  static async handlePasswordReset(token, newPassword) {
    if (!token || !newPassword) {
      throw new Error('Token y nueva contraseña son requeridos');
    }

    if (newPassword.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
    }

    const recoveryData = this.getRecoveryToken(token);
    
    if (!recoveryData) {
      throw new Error('Token de recuperación inválido');
    }

    if (recoveryData.used) {
      throw new Error('Este token ya ha sido utilizado');
    }

    if (Date.now() > recoveryData.expiresAt) {
      throw new Error('El token de recuperación ha expirado');
    }

    // Update user password
    const users = this.loadUsers();
    const userIndex = users.findIndex(u => u.id === recoveryData.userId);
    
    if (userIndex === -1) {
      throw new Error('Usuario no encontrado');
    }

    users[userIndex].password = newPassword;
    this.saveUsers(users);

    // Mark token as used
    recoveryData.used = true;
    this.saveRecoveryToken(recoveryData);

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente'
    };
  }

  static async handlePasswordChange(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      throw new Error('Se requieren la contraseña actual y la nueva');
    }

    if (newPassword.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
    }

    const users = this.loadUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (user.password !== currentPassword) {
      throw new Error('La contraseña actual es incorrecta');
    }

    if (currentPassword === newPassword) {
      throw new Error('La nueva contraseña debe ser diferente a la actual');
    }

    // Update password
    user.password = newPassword;
    this.saveUsers(users);

    return {
      success: true,
      message: 'Contraseña cambiada exitosamente'
    };
  }

  static generateRecoveryToken() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  static saveRecoveryToken(recoveryData) {
    try {
      const tokens = this.getRecoveryTokens();
      
      // Remove expired tokens
      const validTokens = tokens.filter(token => Date.now() < token.expiresAt);
      
      // Add new token
      validTokens.push(recoveryData);
      
      localStorage.setItem('recoveryTokens', JSON.stringify(validTokens));
    } catch (error) {
      console.error('Error saving recovery token:', error);
    }
  }

  static getRecoveryToken(token) {
    try {
      const tokens = this.getRecoveryTokens();
      return tokens.find(t => t.token === token);
    } catch (error) {
      console.error('Error getting recovery token:', error);
      return null;
    }
  }

  static getRecoveryTokens() {
    try {
      const tokens = localStorage.getItem('recoveryTokens');
      return tokens ? JSON.parse(tokens) : [];
    } catch (error) {
      console.error('Error loading recovery tokens:', error);
      return [];
    }
  }

  static loadUsers() {
    try {
      const users = localStorage.getItem('registeredUsers');
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }

  static saveUsers(users) {
    try {
      localStorage.setItem('registeredUsers', JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }
}

window.AuthenticationHandlers = AuthenticationHandlers;