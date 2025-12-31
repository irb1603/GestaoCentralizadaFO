// AI Configuration - API Keys and Settings
// Gestão Centralizada FO - CMB

/**
 * Available AI Providers
 * GROQ is recommended: 14,400 requests/day (FREE), fastest inference
 * GEMINI: 1,500 requests/day (FREE) but often hits rate limits
 */
export const AI_PROVIDERS = {
    GROQ: 'groq',
    GEMINI: 'gemini'
};

/**
 * Default AI Provider - GROQ recommended for higher limits
 */
export const DEFAULT_AI_PROVIDER = AI_PROVIDERS.GROQ;

/**
 * Default Model per provider
 */
export const DEFAULT_AI_MODEL = {
    groq: 'llama-3.3-70b-versatile',
    gemini: 'gemini-2.0-flash'
};

/**
 * AI Configuration per company
 * API keys should be stored in Firebase for security
 *
 * GROQ: https://console.groq.com - 14,400 req/day FREE
 * GEMINI: https://aistudio.google.com - 1,500 req/day FREE
 */
export const AI_CONFIG = {
    providers: {
        groq: {
            name: 'Groq (Recomendado - 14.400/dia)',
            apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
            freeLimit: { rpd: 14400, rpm: 30 },
            models: {
                'llama-3.3-70b-versatile': {
                    name: 'Llama 3.3 70B (Recomendado)',
                    freeLimit: { rpd: 14400, rpm: 30 },
                    contextWindow: 128000
                },
                'llama-3.1-8b-instant': {
                    name: 'Llama 3.1 8B (Rápido)',
                    freeLimit: { rpd: 14400, rpm: 30 },
                    contextWindow: 128000
                },
                'mixtral-8x7b-32768': {
                    name: 'Mixtral 8x7B',
                    freeLimit: { rpd: 14400, rpm: 30 },
                    contextWindow: 32768
                }
            }
        },
        gemini: {
            name: 'Google Gemini (1.500/dia)',
            apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
            freeLimit: { rpd: 1500, rpm: 10 },
            models: {
                'gemini-2.0-flash': {
                    name: 'Gemini 2.0 Flash',
                    freeLimit: { rpd: 1500, rpm: 10 }
                },
                'gemini-2.5-flash-lite': {
                    name: 'Gemini 2.5 Flash Lite',
                    freeLimit: { rpd: 1000, rpm: 15 }
                }
            }
        }
    },

    // Legacy support - models list for backwards compatibility
    models: {
        'llama-3.3-70b-versatile': {
            name: 'Groq Llama 3.3 70B (14.400/dia)',
            provider: 'groq',
            freeLimit: { rpd: 14400, rpm: 30 }
        },
        'llama-3.1-8b-instant': {
            name: 'Groq Llama 3.1 8B (14.400/dia)',
            provider: 'groq',
            freeLimit: { rpd: 14400, rpm: 30 }
        },
        'gemini-2.0-flash': {
            name: 'Gemini 2.0 Flash (1.500/dia)',
            provider: 'gemini',
            freeLimit: { rpd: 1500, rpm: 10 }
        }
    },

    // Company to API key mapping (keys stored in Firebase)
    companyKeyMapping: {
        'admin': 'admin',
        'comandoCA': 'admin',
        '6cia': '6cia',
        '7cia': '7cia',
        '8cia': '8cia',
        '9cia': '9cia',
        '1cia': '1cia',
        '2cia': '2cia',
        '3cia': '3cia'
    }
};

/**
 * Firebase collection for AI configurations
 */
export const AI_CONFIGS_COLLECTION = 'aiConfigs';

/**
 * Firebase collection for AI conversation logs
 */
export const AI_LOGS_COLLECTION = 'aiConversations';

/**
 * Default system prompt context limit (days)
 */
export const AI_CONTEXT_DAYS = 30;

/**
 * Maximum tokens for context
 */
export const AI_MAX_CONTEXT_TOKENS = 8000;
