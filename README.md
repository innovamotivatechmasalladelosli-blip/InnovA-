# InnovA+ - Interfaz de Chat Avanzada con IA

Una interfaz de chat moderna y potente integrada con **Google Gemini API**, que ofrece múltiples modos de funcionamiento para análisis profundo, investigación, generación de código, documentos, imágenes y escenas VR.

## 🚀 Características

### Modos de Funcionamiento

- **Análisis Profundo**: Razonamiento lógico, análisis de pros y contras, implicaciones
- **Investigación Web**: Búsqueda de información con citas de fuentes verificables
- **Generación de Imágenes**: Creación de imágenes a partir de descripciones
- **Generación de Código**: Código funcional en múltiples lenguajes de programación
- **Documentos**: Generación de PDF, Word, PowerPoint y Excel
- **Realidad Virtual**: Escenas VR/3D interactivas con A-Frame
- **Análisis de Datos**: Visualización de datos con gráficos interactivos

### Sistema de Memoria

- Historial de conversación persistente
- Seguimiento de funciones utilizadas
- Detección automática de solicitudes de modificación
- Contexto mejorado basado en uso anterior

### Seguridad y Autenticación

- Sistema de autenticación local con hash de contraseñas
- Recuperación de contraseña con tokens temporales
- Acceso rápido con códigos de 4 dígitos
- Monitoreo de sesión y cierre automático

## 📋 Requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Clave de API de Google Gemini
- Conexión a Internet

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/innovamotivatechmasalladelosli-blip/InnovA-.git
cd InnovA-
```

### 2. Configurar la API

Edita el archivo `api-config.js` y reemplaza la clave de API:

```javascript
const API_CONFIG = {
    GOOGLE_API_KEY: "TU_CLAVE_DE_API_AQUI",
    MODEL_NAME: "gemini-1.5-flash",
    ENDPOINTS: {
        CHAT: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        EMBEDDINGS: "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent"
    }
};
```

### 3. Abrir en el navegador

Simplemente abre el archivo `index.html` en tu navegador web:

```bash
# En Linux/Mac
open index.html

# En Windows
start index.html
```

O sirve los archivos con un servidor local:

```bash
# Usando Python 3
python -m http.server 8000

# Usando Node.js
npx http-server
```

Luego accede a `http://localhost:8000`

## 📁 Estructura de Archivos

```
├── index.html              # Página principal
├── script.js              # Lógica principal del chat
├── auth.js                # Sistema de autenticación
├── auth-handlers.js       # Manejadores de autenticación
├── api-config.js          # Configuración de la API
├── gemini-api.js          # Integración con Google Gemini
├── code-generator.js      # Generador de código
├── documents.js           # Generador de documentos
├── virtual-reality.js     # Generador de escenas VR
├── styles.css             # Estilos principales
├── code-styles.css        # Estilos para código
├── document-styles.css    # Estilos para documentos
├── vr-styles.css          # Estilos para VR
└── logo.svg               # Logo de la aplicación
```

## 🔑 Configuración de la API de Google Gemini

### Obtener tu clave de API

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Haz clic en "Create API Key"
3. Copia la clave generada
4. Pégala en `api-config.js`

### Modelos disponibles

- `gemini-1.5-flash`: Rápido y eficiente (recomendado)
- `gemini-1.5-pro`: Más potente pero más lento
- `gemini-2.0-flash`: Última versión (si está disponible)

## 💻 Uso

### Crear una cuenta

1. Haz clic en "¿No tienes cuenta? Regístrate"
2. Ingresa un nombre de usuario, email y contraseña
3. La contraseña debe tener al menos 8 caracteres con mayúsculas, minúsculas, números y caracteres especiales

### Iniciar sesión

1. Ingresa tu email y contraseña
2. O usa el código de acceso rápido si ya lo generaste

### Usar los modos

- Activa/desactiva los modos que necesites en la barra de herramientas
- Escribe tu consulta en el campo de entrada
- La IA analizará automáticamente qué modos son más útiles
- Recibe respuestas con contenido generado según sea necesario

### Modificar contenido generado

Simplemente solicita cambios al contenido anterior:
- "Cambia el código para usar async/await"
- "Hazlo más corto"
- "Agrega más ejemplos"

## 🎨 Personalización

### Cambiar temas

Los temas se pueden personalizar editando las variables CSS en `styles.css`:

```css
:root {
  --primary-color: #6366f1;
  --secondary-color: #8b5cf6;
  --background-color: #ffffff;
  --text-color: #1f2937;
}
```

### Agregar nuevos modos

Edita `script.js` y agrega nuevos modos en la clase `ChatInterface`:

```javascript
this.modes = {
  analytical: true,
  research: true,
  image: true,
  document: true,
  virtualReality: true,
  code: true,
  // Agrega tu nuevo modo aquí
  tuNuevoModo: true
};
```

## 🐛 Solución de problemas

### La API no responde

- Verifica que tu clave de API sea válida
- Comprueba tu conexión a Internet
- Asegúrate de que no hayas excedido tu cuota de API

### Las imágenes no se generan

- El servicio de generación de imágenes usa Pollinations.ai como fallback
- Verifica tu conexión a Internet
- Intenta con un prompt más específico

### El VR no funciona

- Asegúrate de que tu navegador sea compatible con WebGL
- Actualiza tus drivers de GPU
- Intenta en otro navegador

## 📝 Licencia

Este proyecto está bajo licencia MIT. Ver `LICENSE` para más detalles.

## 👥 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

Para preguntas o sugerencias, contacta a través de:
- Email: innovamotivatechmasalladelosli@example.com
- GitHub Issues: [Crear un issue](https://github.com/innovamotivatechmasalladelosli-blip/InnovA-/issues)

## 🙏 Agradecimientos

- Google por Gemini API
- A-Frame por la plataforma VR
- jsPDF, Docx, PptxGenJS y ExcelJS por generación de documentos
- Monaco Editor por edición de código

---

**InnovA+** - Potenciando la creatividad y productividad con IA 🚀
