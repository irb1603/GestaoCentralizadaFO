// AI Configuration - API Keys and Settings
// Gestão Centralizada FO - CMB

/**
 * Default Gemini Model to use
 * gemini-2.0-flash has the HIGHEST free tier limits (1500 RPD, 10 RPM)
 * Updated Dec 2025 with correct Google Gemini API model IDs
 * See: https://ai.google.dev/gemini-api/docs/rate-limits
 */
export const DEFAULT_AI_MODEL = 'gemini-2.0-flash';

/**
 * AI Configuration per company
 * API keys should be stored in Firebase for security
 * This is the fallback/reference structure
 *
 * IMPORTANT: Model IDs must match Google's official Gemini API model names
 * See: https://ai.google.dev/gemini-api/docs/models
 * Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
 */
export const AI_CONFIG = {
    models: {
        'gemini-2.0-flash': {
            name: 'Gemini 2.0 Flash (Recomendado - Maior Limite)',
            freeLimit: { rpd: 1500, rpm: 10 },
            pricing: { input: 0.10, output: 0.40 }
        },
        'gemini-2.5-flash-lite': {
            name: 'Gemini 2.5 Flash Lite (1000/dia)',
            freeLimit: { rpd: 1000, rpm: 15 },
            pricing: { input: 0.075, output: 0.30 }
        },
        'gemini-2.5-flash': {
            name: 'Gemini 2.5 Flash (250/dia)',
            freeLimit: { rpd: 250, rpm: 10 },
            pricing: { input: 0.15, output: 0.60 }
        },
        'gemini-2.5-pro': {
            name: 'Gemini 2.5 Pro (100/dia - Avançado)',
            freeLimit: { rpd: 100, rpm: 5 },
            pricing: { input: 1.25, output: 5.00 }
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
