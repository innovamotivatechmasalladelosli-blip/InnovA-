/**
 * Manejadores de UI para el Login Mejorado
 */

// Cambiar entre formularios
function switchToLogin() {
  document.getElementById('login-form-container').classList.add('active');
  document.getElementById('signup-form-container').classList.remove('active');
  document.getElementById('recovery-form-container').classList.remove('active');
}

function switchToSignup() {
  document.getElementById('login-form-container').classList.remove('active');
  document.getElementById('signup-form-container').classList.add('active');
  document.getElementById('recovery-form-container').classList.remove('active');
}

function showPasswordRecovery() {
  document.getElementById('login-form-container').classList.remove('active');
  document.getElementById('signup-form-container').classList.remove('active');
  document.getElementById('recovery-form-container').classList.add('active');
}

// Mostrar/ocultar contraseña
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
}

// Verificar fortaleza de contraseña
function checkPasswordStrength(password) {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  // Actualizar indicadores de requisitos
  updateRequirement('req-length', requirements.length);
  updateRequirement('req-uppercase', requirements.uppercase);
  updateRequirement('req-lowercase', requirements.lowercase);
  updateRequirement('req-number', requirements.number);
  updateRequirement('req-special', requirements.special);

  // Calcular fortaleza
  const metRequirements = Object.values(requirements).filter(req => req).length;
  let strength = 'weak';
  let strengthText = 'Débil';

  if (metRequirements >= 4) {
    strength = 'strong';
    strengthText = 'Fuerte';
  } else if (metRequirements >= 3) {
    strength = 'medium';
    strengthText = 'Media';
  }

  // Actualizar barra de fortaleza
  const strengthBar = document.getElementById('strength-bar');
  const strengthTextEl = document.getElementById('strength-text');

  strengthBar.className = 'strength-bar ' + strength;
  strengthTextEl.className = 'strength-text ' + strength;
  strengthTextEl.textContent = strengthText;

  // Animar barra
  const percentage = (metRequirements / 5) * 100;
  strengthBar.style.width = percentage + '%';
}

function updateRequirement(elementId, met) {
  const element = document.getElementById(elementId);
  if (met) {
    element.classList.add('met');
  } else {
    element.classList.remove('met');
  }
}

// Validar formulario de login
function validateLoginForm() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  let isValid = true;

  // Validar email
  if (!email) {
    showError('login-email-error', 'Por favor ingresa tu email');
    isValid = false;
  } else if (!isValidEmail(email)) {
    showError('login-email-error', 'Por favor ingresa un email válido');
    isValid = false;
  } else {
    clearError('login-email-error');
  }

  // Validar contraseña
  if (!password) {
    showError('login-password-error', 'Por favor ingresa tu contraseña');
    isValid = false;
  } else {
    clearError('login-password-error');
  }

  return isValid;
}

// Validar formulario de registro
function validateSignupForm() {
  const username = document.getElementById('signup-username').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  const termsAgree = document.getElementById('terms-agree').checked;

  let isValid = true;

  // Validar nombre de usuario
  if (!username) {
    showError('signup-username-error', 'Por favor ingresa un nombre de usuario');
    isValid = false;
  } else if (username.length < 3) {
    showError('signup-username-error', 'El nombre de usuario debe tener al menos 3 caracteres');
    isValid = false;
  } else {
    clearError('signup-username-error');
  }

  // Validar email
  if (!email) {
    showError('signup-email-error', 'Por favor ingresa tu email');
    isValid = false;
  } else if (!isValidEmail(email)) {
    showError('signup-email-error', 'Por favor ingresa un email válido');
    isValid = false;
  } else {
    clearError('signup-email-error');
  }

  // Validar contraseña
  if (!password) {
    showError('signup-password-error', 'Por favor ingresa una contraseña');
    isValid = false;
  } else if (password.length < 8) {
    showError('signup-password-error', 'La contraseña debe tener al menos 8 caracteres');
    isValid = false;
  } else if (!/[A-Z]/.test(password)) {
    showError('signup-password-error', 'La contraseña debe contener al menos una mayúscula');
    isValid = false;
  } else if (!/[a-z]/.test(password)) {
    showError('signup-password-error', 'La contraseña debe contener al menos una minúscula');
    isValid = false;
  } else if (!/[0-9]/.test(password)) {
    showError('signup-password-error', 'La contraseña debe contener al menos un número');
    isValid = false;
  } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    showError('signup-password-error', 'La contraseña debe contener al menos un carácter especial');
    isValid = false;
  } else {
    clearError('signup-password-error');
  }

  // Validar confirmación de contraseña
  if (!confirmPassword) {
    showError('signup-confirm-password-error', 'Por favor confirma tu contraseña');
    isValid = false;
  } else if (password !== confirmPassword) {
    showError('signup-confirm-password-error', 'Las contraseñas no coinciden');
    isValid = false;
  } else {
    clearError('signup-confirm-password-error');
  }

  // Validar términos
  if (!termsAgree) {
    showError('terms-error', 'Debes aceptar los términos y condiciones');
    isValid = false;
  }

  return isValid;
}

// Validar email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Mostrar error
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
    element.classList.add('show');
  }
}

// Limpiar error
function clearError(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = '';
    element.classList.remove('show');
  }
}

// Manejar envío de formulario de login
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      if (!validateLoginForm()) {
        return;
      }

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const rememberMe = document.getElementById('remember-me').checked;

      try {
        const result = authManager.login(email, password, rememberMe);

        if (result.success) {
          // Mostrar mensaje de éxito
          showSuccessMessage('¡Bienvenido! Iniciando sesión...');

          // Redirigir al chat después de 1 segundo
          setTimeout(() => {
            showChatInterface();
          }, 1000);
        } else {
          showError('login-password-error', result.error);
        }
      } catch (error) {
        console.error('Error during login:', error);
        showError('login-password-error', 'Error al iniciar sesión. Intenta de nuevo.');
      }
    });
  }

  // Manejar envío de formulario de registro
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      if (!validateSignupForm()) {
        return;
      }

      const username = document.getElementById('signup-username').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;

      try {
        const result = authManager.register({
          username,
          email,
          password,
          confirmPassword: document.getElementById('signup-confirm-password').value
        });

        if (result.success) {
          showSuccessMessage('¡Cuenta creada exitosamente! Iniciando sesión...');

          // Auto-login después de registro
          setTimeout(() => {
            const loginResult = authManager.login(email, password, false);
            if (loginResult.success) {
              showChatInterface();
            }
          }, 1500);
        } else {
          if (result.requirements) {
            showError('signup-password-error', result.error);
          } else {
            showError('signup-email-error', result.error);
          }
        }
      } catch (error) {
        console.error('Error during signup:', error);
        showError('signup-email-error', 'Error al crear la cuenta. Intenta de nuevo.');
      }
    });
  }

  // Manejar envío de formulario de recuperación
  const recoveryForm = document.getElementById('recovery-form');
  if (recoveryForm) {
    recoveryForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const email = document.getElementById('recovery-email').value.trim();

      if (!email || !isValidEmail(email)) {
        showError('recovery-email-error', 'Por favor ingresa un email válido');
        return;
      }

      try {
        const result = authManager.requestPasswordReset(email);

        if (result.success) {
          showSuccessMessage('Enlace de recuperación enviado a tu email');

          // Mostrar token para demostración
          if (result.token) {
            setTimeout(() => {
              alert('Token de demostración: ' + result.token + '\n\nEn producción, este token se enviaría por email.');
            }, 500);
          }

          // Volver al login después de 3 segundos
          setTimeout(() => {
            switchToLogin();
          }, 3000);
        } else {
          showError('recovery-email-error', result.error);
        }
      } catch (error) {
        console.error('Error during password recovery:', error);
        showError('recovery-email-error', 'Error al procesar la solicitud. Intenta de nuevo.');
      }
    });
  }
});

// Mostrar mensaje de éxito
function showSuccessMessage(message) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-success';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Mostrar interfaz de chat
function showChatInterface() {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('chat-container').style.display = 'block';

  // Inicializar interfaz de chat si existe
  if (typeof ChatInterface !== 'undefined') {
    window.chatInterface = new ChatInterface();
  }
}

// Estilos para toast
const toastStyles = `
  .toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 16px 24px;
    background-color: #10b981;
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    opacity: 0;
    transform: translateY(20px);
    transition: all 300ms ease-in-out;
    z-index: 9999;
    font-weight: 500;
  }

  .toast.show {
    opacity: 1;
    transform: translateY(0);
  }

  .toast-success {
    background-color: #10b981;
  }

  .toast-error {
    background-color: #ef4444;
  }

  @media (max-width: 640px) {
    .toast {
      bottom: 10px;
      right: 10px;
      left: 10px;
    }
  }
`;

// Inyectar estilos de toast
const styleSheet = document.createElement('style');
styleSheet.textContent = toastStyles;
document.head.appendChild(styleSheet);

// Restaurar sesión si existe
document.addEventListener('DOMContentLoaded', function() {
  if (authManager.isUserAuthenticated()) {
    showChatInterface();
  }
});
