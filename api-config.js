const API_CONFIG = {
    GOOGLE_API_KEY: "AIzaSyDALO3g96nRm0gif3pup0QMf6M5DgMPwko",
    MODEL_NAME: "gemini-1.5-flash",
    ENDPOINTS: {
        CHAT: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        EMBEDDINGS: "https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent"
    }
};

window.API_CONFIG = API_CONFIG;
