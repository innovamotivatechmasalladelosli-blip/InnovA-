# Guía de Configuración Rápida - InnovA+

## 🚀 Inicio Rápido (5 minutos)

### Paso 1: Obtener tu clave de API de Google Gemini

1. Abre [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Haz clic en **"Create API Key"**
3. Selecciona o crea un proyecto
4. Copia la clave generada

### Paso 2: Configurar la aplicación

1. Abre el archivo `api-config.js` en tu editor de texto
2. Reemplaza `TU_CLAVE_DE_API_AQUI` con tu clave real:

```javascript
const API_CONFIG = {
    GOOGLE_API_KEY: "AIzaSyDALO3g96nRm0gif3pup0QMf6M5DgMPwko", // ← Reemplaza esto
    MODEL_NAME: "gemini-1.5-flash",
    ENDPOINTS: {
        CHAT: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        EMBEDDINGS: "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent"
    }
};
```

3. Guarda el archivo

### Paso 3: Ejecutar la aplicación

**Opción A: Abrir directamente**
- Haz doble clic en `index.html`

**Opción B: Usar un servidor local**

Con Python 3:
```bash
python -m http.server 8000
```

Con Node.js:
```bash
npx http-server
```

Luego abre tu navegador en `http://localhost:8000`

### Paso 4: Crear tu primera cuenta

1. Haz clic en "¿No tienes cuenta? Regístrate"
2. Completa el formulario:
   - **Nombre de usuario**: Elige un nombre único
   - **Email**: Tu correo electrónico
   - **Contraseña**: Mínimo 8 caracteres con mayúsculas, minúsculas, números y caracteres especiales

3. ¡Listo! Ya puedes usar InnovA+

## 📱 Primeros Pasos

### Activar modos

En la barra de herramientas superior, puedes activar/desactivar:
- ✅ **Análisis Profundo**: Razonamiento lógico
- ✅ **Investigación Web**: Búsqueda de información
- ✅ **Generación de Imágenes**: Crear imágenes
- ✅ **Generación de Documentos**: PDF, Word, PowerPoint, Excel
- ✅ **Generación de Código**: Código en cualquier lenguaje
- ✅ **Realidad Virtual**: Escenas 3D interactivas

### Ejemplos de uso

**Análisis:**
```
Analiza los pros y contras de usar React vs Vue para un proyecto web
```

**Investigación:**
```
¿Cuáles son las últimas tendencias en inteligencia artificial en 2024?
```

**Código:**
```
Crea un servidor Express.js con autenticación JWT
```

**Documentos:**
```
Genera un reporte PDF sobre sostenibilidad empresarial
```

**Imágenes:**
```
Crea una imagen de un paisaje futurista con ciudades flotantes
```

**VR:**
```
Crea una escena VR de un museo interactivo
```

## 🔐 Seguridad

### Contraseña segura

Tu contraseña debe contener:
- ✅ Mínimo 8 caracteres
- ✅ Al menos una mayúscula (A-Z)
- ✅ Al menos una minúscula (a-z)
- ✅ Al menos un número (0-9)
- ✅ Al menos un carácter especial (@$!%*?&)

**Ejemplo válido:** `MiContraseña123!`

### Acceso rápido

Después de iniciar sesión, puedes generar un código de acceso rápido (4 dígitos) que te permite entrar sin contraseña durante 7 días.

## 🌐 Despliegue en la nube

### Opción 1: GitHub Pages

1. Sube tu repositorio a GitHub
2. Ve a **Settings → Pages**
3. Selecciona **main branch** como fuente
4. Tu sitio estará en `https://tu-usuario.github.io/InnovA-`

### Opción 2: Vercel

```bash
npm install -g vercel
vercel
```

### Opción 3: Netlify

1. Conecta tu repositorio de GitHub
2. Configura la rama de despliegue como `main`
3. Haz clic en "Deploy"

## 🆘 Solución de problemas

### "Error: API key not valid"
- Verifica que copiaste correctamente la clave en `api-config.js`
- Asegúrate de que la clave no tenga espacios adicionales
- Intenta generar una nueva clave en Google AI Studio

### "No se puede conectar a la API"
- Verifica tu conexión a Internet
- Comprueba que Google Gemini API no esté caída
- Intenta en modo incógnito del navegador

### "Las imágenes no se generan"
- Verifica tu conexión a Internet
- Intenta con un prompt más detallado
- Espera unos segundos entre intentos

### "El VR no funciona"
- Actualiza tu navegador
- Verifica que tu GPU sea compatible con WebGL
- Intenta en Chrome o Firefox

## 📚 Recursos útiles

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [A-Frame Documentation](https://aframe.io/docs/)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)

## 💡 Tips y trucos

1. **Modifica contenido anterior**: Simplemente pide cambios al contenido generado
2. **Guarda conversaciones**: Usa el navegador para guardar la página
3. **Exporta documentos**: Todos los documentos se descargan automáticamente
4. **Comparte código**: Copia el código desde el editor integrado
5. **Modo oscuro**: Cambia en la sección de Configuración

## 🎓 Aprende más

Consulta la [documentación completa](README.md) para más detalles sobre todas las características.

---

¿Necesitas ayuda? Abre un [issue en GitHub](https://github.com/innovamotivatechmasalladelosli-blip/InnovA-/issues)
