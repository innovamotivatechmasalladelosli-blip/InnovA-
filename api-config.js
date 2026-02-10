const API_CONFIG = {
    GOOGLE_API_KEY: "AIzaSyBqdQFUJ-JKeLkqNsDZXKVU9qWzLETpBaY",
    MODEL_NAME: "gemini-1.5-flash", // O el modelo que prefieras de Google
    ENDPOINTS: {
        CHAT: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        EMBEDDINGS: "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent"
    }
};

window.API_CONFIG = API_CONFIG;
