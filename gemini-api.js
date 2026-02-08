class GeminiAPI {
    constructor() {
        this.apiKey = window.API_CONFIG.GOOGLE_API_KEY;
        this.model = window.API_CONFIG.MODEL_NAME;
    }

    async generateContent(messages, options = {}) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        
        // Convertir el formato de mensajes de OpenAI a Gemini
        const contents = messages.map(msg => {
            return {
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            };
        });

        // Gemini no soporta 'system' de la misma manera en generateContent básico, 
        // a menudo se pone en el primer mensaje del usuario o se usa system_instruction en v1beta
        const systemInstruction = messages.find(m => m.role === 'system');
        
        const requestBody = {
            contents: contents.filter(c => c.role !== 'system'),
            generationConfig: {
                temperature: options.temperature || 0.7,
                topK: options.topK || 40,
                topP: options.topP || 0.95,
                maxOutputTokens: options.maxOutputTokens || 2048,
                responseMimeType: options.json ? "application/json" : "text/plain"
            }
        };

        if (systemInstruction) {
            requestBody.system_instruction = {
                parts: [{ text: systemInstruction.content }]
            };
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Error en la API de Gemini');
            }

            const data = await response.json();
            const textResponse = data.candidates[0].content.parts[0].text;
            
            return {
                content: textResponse,
                usage: data.usageMetadata
            };
        } catch (error) {
            console.error('Error llamando a Gemini:', error);
            throw error;
        }
    }

    async generateImage(prompt) {
        // Nota: La API de Gemini actual no genera imágenes directamente como DALL-E.
        // Si el usuario tiene una clave de Google AI Studio, usualmente es para LLM.
        // Sin embargo, para no romper la funcionalidad, podemos usar un placeholder 
        // o un servicio gratuito de generación de imágenes si es necesario.
        // Por ahora, lanzaremos un error informativo o usaremos un fallback.
        console.warn("La generación de imágenes no está disponible directamente en la API de Gemini básica.");
        throw new Error("La generación de imágenes requiere una API específica de Imagen o similar.");
    }
}

window.geminiApi = new GeminiAPI();

// Crear un polyfill para websim.chat.completions.create
if (typeof window.websim === 'undefined') {
    window.websim = {};
}

window.websim.chat = {
    completions: {
        create: async (params) => {
            const response = await window.geminiApi.generateContent(params.messages, {
                json: params.json,
                temperature: params.temperature
            });
            return response;
        }
    }
};

// Polyfill para websim.imageGen
window.websim.imageGen = async (params) => {
    // Como Gemini no genera imágenes, usaremos un servicio de placeholder con el prompt
    const encodedPrompt = encodeURIComponent(params.prompt);
    return {
        url: `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000)}`
    };
};
