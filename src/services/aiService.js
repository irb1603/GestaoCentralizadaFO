// AI Service - Multi-Provider Integration (Groq + Gemini)
// Gestão Centralizada FO - CMB

import { db } from '../firebase/config.js';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    getDoc,
    orderBy,
    limit,
    serverTimestamp
} from 'firebase/firestore';
import { getSession } from '../firebase/auth.js';
import { AI_CONFIGS_COLLECTION, AI_LOGS_COLLECTION, DEFAULT_AI_MODEL, DEFAULT_AI_PROVIDER, AI_PROVIDERS, AI_CONTEXT_DAYS, AI_CONFIG } from '../constants/aiConfig.js';
import { generateSystemPrompt, generateContextPrompt, SUGGESTED_QUERIES } from '../utils/aiPrompts.js';
import { getCachedAIData, cacheAIData, CACHE_TTL } from './cacheService.js';
import { logFirebaseRead } from './firebaseLogger.js';

/**
 * API URLs for each provider
 */
const API_URLS = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models'
};

/**
 * Get the provider for a given model
 * @param {string} model - Model ID
 * @returns {string} Provider name ('groq' or 'gemini')
 */
function getProviderForModel(model) {
    if (!model) return DEFAULT_AI_PROVIDER;

    // Check in models config
    const modelConfig = AI_CONFIG.models[model];
    if (modelConfig?.provider) {
        return modelConfig.provider;
    }

    // Infer from model name
    if (model.startsWith('llama') || model.startsWith('mixtral')) {
        return AI_PROVIDERS.GROQ;
    }
    if (model.startsWith('gemini')) {
        return AI_PROVIDERS.GEMINI;
    }

    return DEFAULT_AI_PROVIDER;
}

/**
 * Get default model for a provider
 * @param {string} provider - Provider name
 * @returns {string} Default model ID
 */
function getDefaultModelForProvider(provider) {
    return DEFAULT_AI_MODEL[provider] || DEFAULT_AI_MODEL.groq;
}

/**
 * Validate and get a valid model/provider combination
 * @param {string} model - Model ID to validate
 * @param {string} provider - Provider name
 * @returns {{model: string, provider: string}} Valid model and provider
 */
function getValidConfig(model, provider) {
    // If provider is specified, use it; otherwise infer from model
    const effectiveProvider = provider || getProviderForModel(model);

    // Validate model exists for provider
    const providerConfig = AI_CONFIG.providers[effectiveProvider];
    if (providerConfig?.models && model && providerConfig.models[model]) {
        return { model, provider: effectiveProvider };
    }

    // Fallback to default model for provider
    const defaultModel = getDefaultModelForProvider(effectiveProvider);
    console.warn(`[AI] Invalid model "${model}" for provider "${effectiveProvider}", using ${defaultModel}`);
    return { model: defaultModel, provider: effectiveProvider };
}

// Cache for AI config (avoid repeated Firebase reads)
const AI_CONFIG_CACHE_KEY = 'aiConfig';
const AI_CONFIG_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get AI API key for the current user's company
 * OPTIMIZED: Uses cache to avoid repeated Firebase reads
 * @returns {Promise<Object>} API configuration
 */
async function getAIConfig() {
    const session = getSession();
    if (!session) {
        throw new Error('Usuário não autenticado');
    }

    // Determine which API key to use based on role
    let configKey = session.company;
    if (session.role === 'admin' || session.role === 'comandoCA') {
        configKey = 'admin';
    }

    // OPTIMIZATION: Check cache first to avoid Firebase reads
    const cacheKey = `${AI_CONFIG_CACHE_KEY}_${configKey}`;
    const cached = getCachedAIData(cacheKey, configKey);
    if (cached) {
        console.log(`[AI] Using cached config for ${configKey}`);
        return cached;
    }

    try {
        // Try to get config from Firebase (only if not cached)
        console.log(`[AI] Fetching config from Firebase for ${configKey}`);
        const configRef = doc(db, AI_CONFIGS_COLLECTION, configKey);
        const configSnap = await getDoc(configRef);

        logFirebaseRead({
            operation: 'getDoc',
            collection: AI_CONFIGS_COLLECTION,
            documentCount: configSnap.exists() ? 1 : 0,
            query: `configKey=${configKey}`,
            fromCache: false,
            source: 'aiService.getAIConfig'
        });

        if (configSnap.exists()) {
            const config = configSnap.data();
            console.log(`[AI] Loaded config for ${configKey}: provider=${config.provider}, model=${config.model}`);

            // Cache the config for 30 minutes
            cacheAIData(cacheKey, config, configKey, AI_CONFIG_CACHE_TTL);

            return config;
        }

        // Fallback to environment variable or throw error
        throw new Error(`Configuração de IA não encontrada para ${configKey}. Configure a API key na página Admin.`);
    } catch (error) {
        console.error('Error getting AI config:', error);
        throw error;
    }
}

/**
 * Get company filter for queries
 * @returns {string|null}
 */
function getCompanyFilter() {
    const session = getSession();
    if (!session) return null;

    if (session.role === 'admin' || session.role === 'comandoCA') {
        return null; // No filter - can see all companies
    }

    return session.company;
}

/**
 * Call Groq API (OpenAI-compatible)
 * @param {string} apiKey - Groq API key
 * @param {string} model - Model name (e.g., llama-3.3-70b-versatile)
 * @param {string} systemPrompt - System prompt
 * @param {string} userMessage - User message
 * @param {string} contextData - Additional context
 * @returns {Promise<string>} AI response
 */
async function callGroqAPI(apiKey, model, systemPrompt, userMessage, contextData = '') {
    const fullUserMessage = contextData
        ? `DADOS ATUAIS DO SISTEMA:\n${contextData}\n\nPERGUNTA DO USUÁRIO: ${userMessage}`
        : userMessage;

    console.log(`[AI] Calling Groq API with model: ${model}`);
    console.log(`[AI] API Key being used: ${apiKey.substring(0, 15)}... (length: ${apiKey.length})`);

    const response = await fetch(API_URLS.groq, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: fullUserMessage }
            ],
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 0.95
        })
    });

    console.log(`[AI] Groq response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
        let errorMessage = 'Erro na API do Groq';
        try {
            const error = await response.json();
            console.error('[AI] Groq API Error:', error);
            console.error('[AI] Response status:', response.status);
            console.error('[AI] Response headers:', Object.fromEntries(response.headers.entries()));
            const apiError = error.error?.message || '';
            const errorCode = error.error?.code || '';

            if (response.status === 401) {
                // Show actual error from Groq for debugging
                errorMessage = `API key Groq inválida (${errorCode}): ${apiError || 'Verifique se a key está correta'}`;
            } else if (response.status === 429) {
                errorMessage = 'Limite de requisições Groq atingido. Aguarde alguns segundos.';
            } else if (response.status === 400) {
                errorMessage = `Erro na requisição: ${apiError || 'Parâmetros inválidos'}`;
            } else if (apiError) {
                errorMessage = apiError;
            }
        } catch (parseError) {
            console.error('[AI] Failed to parse error response:', parseError);
            errorMessage = `Erro ${response.status}: ${response.statusText || 'Falha na comunicação'}`;
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();

    if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content;
    }

    throw new Error('Resposta inválida do Groq');
}

/**
 * Call Gemini API
 * @param {string} apiKey - Gemini API key
 * @param {string} model - Model name
 * @param {string} systemPrompt - System prompt
 * @param {string} userMessage - User message
 * @param {string} contextData - Additional context
 * @returns {Promise<string>} AI response
 */
async function callGeminiAPI(apiKey, model, systemPrompt, userMessage, contextData = '') {
    const fullPrompt = contextData
        ? `${systemPrompt}\n\nDADOS ATUAIS DO SISTEMA:\n${contextData}\n\nPERGUNTA DO USUÁRIO: ${userMessage}`
        : `${systemPrompt}\n\nPERGUNTA DO USUÁRIO: ${userMessage}`;

    const apiUrl = `${API_URLS.gemini}/${model}:generateContent?key=${apiKey}`;
    console.log(`[AI] Calling Gemini API: ${API_URLS.gemini}/${model}:generateContent`);

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: fullPrompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
            ]
        })
    });

    console.log(`[AI] Gemini response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
        let errorMessage = 'Erro na API do Gemini';
        try {
            const error = await response.json();
            console.error('[AI] Gemini API Error:', error);
            const apiError = error.error?.message || '';

            if (response.status === 404) {
                errorMessage = `Modelo "${model}" não encontrado. Verifique as configurações de IA.`;
            } else if (response.status === 401 || response.status === 403) {
                errorMessage = 'API key inválida ou sem permissão. Verifique a configuração.';
            } else if (response.status === 429 || apiError.toLowerCase().includes('quota') || apiError.toLowerCase().includes('rate')) {
                errorMessage = 'Limite de requisições atingido. Tente novamente em alguns minutos.';
            } else if (response.status === 400) {
                errorMessage = `Erro na requisição: ${apiError || 'Parâmetros inválidos'}`;
            } else if (apiError) {
                errorMessage = apiError;
            }
        } catch (parseError) {
            errorMessage = `Erro ${response.status}: ${response.statusText || 'Falha na comunicação com a API'}`;
        }
        throw new Error(errorMessage);
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
    }

    throw new Error('Resposta inválida do Gemini');
}

/**
 * Call AI API based on provider
 * @param {string} provider - Provider name ('groq' or 'gemini')
 * @param {string} apiKey - API key
 * @param {string} model - Model name
 * @param {string} systemPrompt - System prompt
 * @param {string} userMessage - User message
 * @param {string} contextData - Additional context
 * @returns {Promise<string>} AI response
 */
async function callAI(provider, apiKey, model, systemPrompt, userMessage, contextData = '') {
    if (provider === AI_PROVIDERS.GROQ) {
        return callGroqAPI(apiKey, model, systemPrompt, userMessage, contextData);
    } else {
        return callGeminiAPI(apiKey, model, systemPrompt, userMessage, contextData);
    }
}

/**
 * Log AI conversation to Firebase
 * @param {string} query - User query
 * @param {string} response - AI response
 * @param {string} model - Model used
 */
async function logConversation(query, response, model) {
    const session = getSession();

    try {
        await addDoc(collection(db, AI_LOGS_COLLECTION), {
            username: session?.username || 'unknown',
            company: session?.company || null,
            role: session?.role || 'unknown',
            query,
            response,
            model,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error('Error logging AI conversation:', error);
    }
}

/**
 * Gather context data based on user query
 * @param {string} userQuery - User's question
 * @returns {Promise<Object>} Context data
 */
async function gatherContextData(userQuery) {
    const companyFilter = getCompanyFilter();
    const lowerQuery = userQuery.toLowerCase();
    const contextData = {};

    // Determine query type and gather relevant data
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Extract student number if mentioned (e.g., "aluno 12345", "número 67890")
    const studentNumberMatch = lowerQuery.match(/(?:aluno|número|n[º°]|num)\s*(\d{4,6})/i);
    const studentNumber = studentNumberMatch ? studentNumberMatch[1] : null;

    // ============================================
    // NEW SEARCH FEATURES - Priority detection
    // ============================================

    // 1. TEXT SEARCH - Search FOs by description/keyword
    const isTextSearch = lowerQuery.match(/(?:menciona|mencionam|referencia|referência|contém|contem|busque|encontre|sobre|descreve|descrita)/i);
    if (isTextSearch) {
        contextData.foSearch = await searchFOsByKeyword(userQuery, companyFilter);
    }

    // 2. DATE SEARCH - Search FOs by date
    const isDateSearch = lowerQuery.match(
        /(?:hoje|ontem|semana\s+passada|última\s+semana|ultima\s+semana|esta\s+semana|semana\s+atual|mês\s+passado|mes\s+passado|último\s+mês|ultimo\s+mes|janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|\d{1,2}[\/\-]\d{1,2})/i
    );
    if (isDateSearch && !isTextSearch) { // Don't run if text search already running
        contextData.foByDate = await getFOsByDateRange(userQuery, companyFilter);
    }

    // 3. STUDENT NAME SEARCH - Search by student name (not number)
    const studentNameMatch = lowerQuery.match(/(?:aluno|fos\s+do|histórico\s+do|historico\s+do)\s+([a-záéíóúâêîôûãõç\s]{3,}?)(?:\s+(?:da|do|de|na|no)|$|\?)/i);
    if (studentNameMatch && !studentNumber) {
        const searchName = studentNameMatch[1].trim();
        if (searchName.length >= 3 && !searchName.match(/^\d+$/)) {
            contextData.studentNameSearch = await searchStudentsByName(searchName, companyFilter);
        }
    }

    // 4. TURMA DEEP DIVE - Specific turma analysis
    const turmaMatch = lowerQuery.match(/(?:turma|classe|sala)\s+([a-z0-9]+)/i);
    const isTurmaDeepDive = turmaMatch && (lowerQuery.includes('análise') || lowerQuery.includes('analise') ||
        lowerQuery.includes('problema') || lowerQuery.includes('detalhe') || lowerQuery.includes('situação'));
    if (isTurmaDeepDive && turmaMatch) {
        contextData.turmaDeepDive = await getTurmaDeepDive(turmaMatch[1], companyFilter);
    }

    // 5. COMPANY COMPARISON - Compare across companies (Admin only)
    const isCompanyComparison = lowerQuery.match(/(?:compar|ranking|entre|todas)\s*(?:as\s+)?(?:companhias|cias|subunidades)/i);
    if (isCompanyComparison) {
        contextData.companyComparison = await getCompanyComparison();
    }

    // ============================================
    // EXISTING FEATURES
    // ============================================

    // Student History (individual student analysis by number)
    if (studentNumber) {
        if (lowerQuery.includes('histórico') || lowerQuery.includes('historico') || lowerQuery.includes('fos do')) {
            contextData.studentHistory = await getStudentHistory(studentNumber, companyFilter);
        }
    }

    // Recurrence Analysis
    if (lowerQuery.includes('reincid') || lowerQuery.includes('múltiplos') || lowerQuery.includes('multiplos') ||
        lowerQuery.includes('repetid') || lowerQuery.includes('mais de')) {
        contextData.recurrence = await getRecurrenceAnalysis(companyFilter);
    }

    // Period Comparison
    if (lowerQuery.includes('compar') || lowerQuery.includes('anterior') || lowerQuery.includes('últim') ||
        lowerQuery.includes('ultim') || lowerQuery.includes('passad') || lowerQuery.includes('evolu')) {
        contextData.periodComparison = await getPeriodComparison(companyFilter);
    }

    // Analysis by Class/Turma
    if (lowerQuery.includes('turma') || lowerQuery.includes('classe') || lowerQuery.includes('sala')) {
        contextData.byTurma = await getAnalysisByTurma(companyFilter);
    }

    // Preventive Alerts
    if (lowerQuery.includes('alert') || lowerQuery.includes('risco') || lowerQuery.includes('próxim') ||
        lowerQuery.includes('proxim') || lowerQuery.includes('atenção') || lowerQuery.includes('atencao') ||
        lowerQuery.includes('cuidado') || lowerQuery.includes('problema')) {
        contextData.alerts = await getPreventiveAlerts(companyFilter);
    }

    // FO Statistics
    if (lowerQuery.includes('fo') || lowerQuery.includes('fato') || lowerQuery.includes('observad')) {
        contextData.foStats = await getFOStats(companyFilter, startOfWeek, startOfMonth);
    }

    // Observer ranking
    if (lowerQuery.includes('observador') || lowerQuery.includes('registr') || lowerQuery.includes('professor')) {
        contextData.observerRanking = await getObserverRanking(companyFilter, startOfMonth);
    }

    // Aditamento
    if (lowerQuery.includes('aditamento') || lowerQuery.includes('adt') || lowerQuery.includes('bi')) {
        contextData.aditamento = await getAditamentoStats(companyFilter);
    }

    // Faltas
    if (lowerQuery.includes('falta') || lowerQuery.includes('ausên') || lowerQuery.includes('faltante')) {
        contextData.faltas = await getFaltasStats(companyFilter);
    }

    // AOE/Retirada
    if (lowerQuery.includes('aoe') || lowerQuery.includes('orientação') || lowerQuery.includes('retirada') || lowerQuery.includes('cumprimento')) {
        contextData.sancoesCumprimento = await getSancoesCumprimento(companyFilter);
    }

    // Sanções
    if (lowerQuery.includes('sanç') || lowerQuery.includes('estatística') || lowerQuery.includes('advertência') || lowerQuery.includes('repreensão')) {
        contextData.sancoes = await getSancoesStats(companyFilter, startOfMonth);
    }

    // Comportamento
    if (lowerQuery.includes('comportamento') || lowerQuery.includes('caindo') || lowerQuery.includes('queda')) {
        contextData.comportamento = await getComportamentoStats(companyFilter);
    }

    // FOs Pedagógicos (only for Cmt Cia - company filter must be set)
    if ((lowerQuery.includes('pedagógic') || lowerQuery.includes('pedagogic') || lowerQuery.includes('aprendizado') ||
        lowerQuery.includes('aula') || lowerQuery.includes('livro') || lowerQuery.includes('tarefa') ||
        lowerQuery.includes('dever') || lowerQuery.includes('trabalho')) && companyFilter) {
        contextData.pedagogicos = await getPedagogicalFOs(companyFilter);
    }

    return contextData;
}

// ============================================
// HELPER: Get ALL FOs (cached globally for reuse)
// ============================================

/**
 * Get ALL FOs for company (with aggressive caching)
 * This is used as base for multiple analyses to minimize reads
 */
async function getAllFOs(companyFilter) {
    const cacheKey = 'allFOs';
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached ALL FOs for', company);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh ALL FOs for', company);

    let q = query(collection(db, 'fatosObservados'));

    if (companyFilter) {
        q = query(q, where('company', '==', companyFilter));
    }

    const snapshot = await getDocs(q);

    logFirebaseRead({
        operation: 'getDocs',
        collection: 'fatosObservados',
        documentCount: snapshot.size,
        query: companyFilter ? `company=${companyFilter}` : 'all FOs',
        fromCache: false,
        source: 'aiService.getAllFOs'
    });

    const fos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Cache for 5 minutes (base data for many analyses - extended for fewer reads)
    cacheAIData(cacheKey, fos, company, CACHE_TTL.STATS);

    return fos;
}

// ============================================
// NEW FEATURES - HIGH PRIORITY
// ============================================

/**
 * Get complete student history (with cache)
 * OPTIMIZATION: 1 query for FOs + 1 read for student data = 2 operations total
 */
async function getStudentHistory(studentNumber, companyFilter) {
    const cacheKey = 'studentHistory_' + studentNumber;
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached student history for', studentNumber);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh student history for', studentNumber);

    try {
        // Get student basic data (1 read)
        const studentDoc = await getDoc(doc(db, 'students', String(studentNumber)));

        logFirebaseRead({
            operation: 'getDoc',
            collection: 'students',
            documentCount: studentDoc.exists() ? 1 : 0,
            query: `studentNumber=${studentNumber}`,
            fromCache: false,
            source: 'aiService.getStudentHistory'
        });

        if (!studentDoc.exists()) {
            return { error: `Aluno ${studentNumber} não encontrado no sistema.` };
        }

        const studentData = studentDoc.data();

        // Get all FOs for this student (1 query)
        let q = query(
            collection(db, 'fatosObservados'),
            where('studentNumbers', 'array-contains', parseInt(studentNumber))
        );

        const snapshot = await getDocs(q);

        logFirebaseRead({
            operation: 'getDocs',
            collection: 'fatosObservados',
            documentCount: snapshot.size,
            query: `studentNumber=${studentNumber}`,
            fromCache: false,
            source: 'aiService.getStudentHistory'
        });

        const fos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Aggregate data
        const positivos = fos.filter(fo => fo.tipo === 'positivo').length;
        const negativos = fos.filter(fo => fo.tipo === 'negativo').length;
        const neutros = fos.filter(fo => fo.tipo === 'neutro').length;

        // Count sanctions
        const sanctions = {
            advertencia: fos.filter(fo => fo.sancaoDisciplinar === 'ADVERTENCIA').length,
            repreensao: fos.filter(fo => fo.sancaoDisciplinar === 'REPREENSAO').length,
            aoe: fos.filter(fo => fo.sancaoDisciplinar === 'ATIVIDADE_OE').length,
            retirada: fos.filter(fo => fo.sancaoDisciplinar === 'RETIRADA').length,
            justificado: fos.filter(fo => fo.sancaoDisciplinar === 'JUSTIFICADO').length
        };

        // Most recent FOs (last 5)
        const recentFOs = fos
            .sort((a, b) => new Date(b.dataFato || b.createdAt) - new Date(a.dataFato || a.createdAt))
            .slice(0, 5)
            .map(fo => ({
                data: fo.dataFato,
                tipo: fo.tipo,
                descricao: fo.descricao?.substring(0, 100),
                sancao: fo.sancaoDisciplinar,
                status: fo.status
            }));

        const result = {
            studentNumber,
            nome: studentData.nome,
            turma: studentData.turma,
            company: studentData.company,
            totalFOs: fos.length,
            positivos,
            negativos,
            neutros,
            sanctions,
            recentFOs,
            firstFO: fos.length > 0 ? fos[fos.length - 1].dataFato : null,
            lastFO: fos.length > 0 ? fos[0].dataFato : null
        };

        // Cache for 5 minutes
        cacheAIData(cacheKey, result, company, CACHE_TTL.STATS);

        return result;
    } catch (error) {
        console.error('Error getting student history:', error);
        return { error: `Erro ao buscar histórico: ${error.message}` };
    }
}

/**
 * Get recurrence analysis (with cache)
 * OPTIMIZATION: Uses cached getAllFOs() = 0 new reads if cache hit
 */
async function getRecurrenceAnalysis(companyFilter) {
    const cacheKey = 'recurrenceAnalysis';
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached recurrence analysis for', company);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh recurrence analysis for', company);

    // Get all FOs (uses cache if available)
    const fos = await getAllFOs(companyFilter);

    // Aggregate by student
    const studentFOCount = {};
    fos.forEach(fo => {
        const studentNum = fo.studentNumbers?.[0];
        if (studentNum) {
            if (!studentFOCount[studentNum]) {
                studentFOCount[studentNum] = {
                    numero: studentNum,
                    nome: fo.studentInfo?.[0]?.nome || 'Desconhecido',
                    turma: fo.studentInfo?.[0]?.turma || '?',
                    total: 0,
                    negativos: 0,
                    byType: {}
                };
            }
            studentFOCount[studentNum].total++;
            if (fo.tipo === 'negativo') {
                studentFOCount[studentNum].negativos++;
            }

            // Count by RICM article (if available)
            const falta = fo.enquadramento?.falta;
            if (falta) {
                studentFOCount[studentNum].byType[falta] = (studentFOCount[studentNum].byType[falta] || 0) + 1;
            }
        }
    });

    // Find students with 3+ FOs
    const recurrent = Object.values(studentFOCount)
        .filter(s => s.total >= 3)
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);

    // Find students with same violation 2+ times
    const sameViolation = Object.values(studentFOCount)
        .filter(s => Object.values(s.byType).some(count => count >= 2))
        .map(s => ({
            ...s,
            repeatedViolations: Object.entries(s.byType)
                .filter(([_, count]) => count >= 2)
                .map(([falta, count]) => ({ falta, count }))
        }))
        .slice(0, 10);

    const result = {
        recurrentStudents: recurrent,
        sameViolationStudents: sameViolation,
        totalRecurrent: recurrent.length
    };

    // Cache for 5 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.STATS);

    return result;
}

/**
 * Get period comparison (with cache)
 * OPTIMIZATION: Uses cached getAllFOs() = 0 new reads if cache hit
 */
async function getPeriodComparison(companyFilter) {
    const cacheKey = 'periodComparison';
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached period comparison for', company);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh period comparison for', company);

    // Get all FOs (uses cache if available)
    const fos = await getAllFOs(companyFilter);

    const today = new Date();

    // Current month
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Previous month
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Filter by period
    const currentMonth = fos.filter(fo => {
        const date = new Date(fo.dataFato || fo.createdAt);
        return date >= currentMonthStart && date <= currentMonthEnd;
    });

    const previousMonth = fos.filter(fo => {
        const date = new Date(fo.dataFato || fo.createdAt);
        return date >= previousMonthStart && date <= previousMonthEnd;
    });

    // Calculate stats
    const calcStats = (fosArray) => ({
        total: fosArray.length,
        positivos: fosArray.filter(fo => fo.tipo === 'positivo').length,
        negativos: fosArray.filter(fo => fo.tipo === 'negativo').length,
        neutros: fosArray.filter(fo => fo.tipo === 'neutro').length
    });

    const currentStats = calcStats(currentMonth);
    const previousStats = calcStats(previousMonth);

    // Calculate variation
    const variation = {
        total: currentStats.total - previousStats.total,
        positivos: currentStats.positivos - previousStats.positivos,
        negativos: currentStats.negativos - previousStats.negativos,
        neutros: currentStats.neutros - previousStats.neutros,
        percentage: previousStats.total > 0
            ? ((currentStats.total - previousStats.total) / previousStats.total * 100).toFixed(1)
            : 'N/A'
    };

    const result = {
        currentMonth: {
            periodo: `${currentMonthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
            ...currentStats
        },
        previousMonth: {
            periodo: `${previousMonthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
            ...previousStats
        },
        variation,
        trend: variation.total > 0 ? 'aumento' : variation.total < 0 ? 'redução' : 'estável'
    };

    // Cache for 5 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.STATS);

    return result;
}

/**
 * Get analysis by Turma (with cache)
 * OPTIMIZATION: Uses cached getAllFOs() = 0 new reads if cache hit
 */
async function getAnalysisByTurma(companyFilter) {
    const cacheKey = 'analysisByTurma';
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached analysis by turma for', company);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh analysis by turma for', company);

    // Get all FOs (uses cache if available)
    const fos = await getAllFOs(companyFilter);

    // Aggregate by turma
    const turmaStats = {};

    fos.forEach(fo => {
        const turma = fo.studentInfo?.[0]?.turma || 'Sem Turma';

        if (!turmaStats[turma]) {
            turmaStats[turma] = {
                turma,
                total: 0,
                positivos: 0,
                negativos: 0,
                neutros: 0,
                students: new Set()
            };
        }

        turmaStats[turma].total++;
        if (fo.tipo === 'positivo') turmaStats[turma].positivos++;
        if (fo.tipo === 'negativo') turmaStats[turma].negativos++;
        if (fo.tipo === 'neutro') turmaStats[turma].neutros++;

        const studentNum = fo.studentNumbers?.[0];
        if (studentNum) {
            turmaStats[turma].students.add(studentNum);
        }
    });

    // Convert to array and calculate averages
    const turmas = Object.values(turmaStats).map(t => ({
        turma: t.turma,
        total: t.total,
        positivos: t.positivos,
        negativos: t.negativos,
        neutros: t.neutros,
        studentsCount: t.students.size,
        avgFOsPerStudent: t.students.size > 0 ? (t.total / t.students.size).toFixed(2) : 0,
        negativosPercentage: t.total > 0 ? ((t.negativos / t.total) * 100).toFixed(1) : 0
    }));

    // Sort by total FOs (most problematic first)
    turmas.sort((a, b) => b.total - a.total);

    const result = {
        turmas,
        totalTurmas: turmas.length,
        mostProblematic: turmas[0],
        mostPositive: turmas.sort((a, b) => b.positivos - a.positivos)[0]
    };

    // Cache for 5 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.STATS);

    return result;
}

/**
 * Get preventive alerts (with cache)
 * OPTIMIZATION: Uses cached getAllFOs() and comportamento = minimal new reads
 */
async function getPreventiveAlerts(companyFilter) {
    const cacheKey = 'preventiveAlerts';
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached preventive alerts for', company);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh preventive alerts for', company);

    // Get all FOs (uses cache if available)
    const fos = await getAllFOs(companyFilter);

    // Aggregate by student
    const studentRisk = {};

    fos.forEach(fo => {
        const studentNum = fo.studentNumbers?.[0];
        if (!studentNum) return;

        if (!studentRisk[studentNum]) {
            studentRisk[studentNum] = {
                numero: studentNum,
                nome: fo.studentInfo?.[0]?.nome || 'Desconhecido',
                turma: fo.studentInfo?.[0]?.turma || '?',
                riskScore: 0,
                repreensoes: 0,
                aoes: 0,
                negativos: 0,
                reasons: []
            };
        }

        const student = studentRisk[studentNum];

        // Count sanctions
        if (fo.sancaoDisciplinar === 'REPREENSAO') {
            student.repreensoes++;
            student.riskScore += 10;
        }
        if (fo.sancaoDisciplinar === 'ATIVIDADE_OE') {
            student.aoes++;
            student.riskScore += 20;
        }
        if (fo.tipo === 'negativo') {
            student.negativos++;
            student.riskScore += 2;
        }
    });

    // Identify high-risk students
    const alerts = Object.values(studentRisk)
        .map(s => {
            // Risk criteria
            if (s.aoes >= 2) {
                s.reasons.push(`${s.aoes} AOEs registradas (risco de Retirada)`);
                s.riskLevel = 'CRÍTICO';
            } else if (s.aoes >= 1) {
                s.reasons.push(`${s.aoes} AOE registrada`);
                s.riskLevel = 'ALTO';
            } else if (s.repreensoes >= 3) {
                s.reasons.push(`${s.repreensoes} Repreensões (próximo de AOE)`);
                s.riskLevel = 'ALTO';
            } else if (s.repreensoes >= 2) {
                s.reasons.push(`${s.repreensoes} Repreensões`);
                s.riskLevel = 'MÉDIO';
            } else if (s.negativos >= 5) {
                s.reasons.push(`${s.negativos} FOs negativos`);
                s.riskLevel = 'MÉDIO';
            }

            return s;
        })
        .filter(s => s.riskLevel)
        .sort((a, b) => b.riskScore - a.riskScore);

    const result = {
        highRiskStudents: alerts,
        critical: alerts.filter(a => a.riskLevel === 'CRÍTICO').length,
        high: alerts.filter(a => a.riskLevel === 'ALTO').length,
        medium: alerts.filter(a => a.riskLevel === 'MÉDIO').length,
        totalAlerts: alerts.length
    };

    // Cache for 2 minutes (risk changes quickly)
    cacheAIData(cacheKey, result, company, CACHE_TTL.FOS);

    return result;
}

// ============================================
// EXISTING FEATURES (with cache)
// ============================================

/**
 * Get FO statistics (with cache)
 * OPTIMIZED: Uses getAllFOs() instead of separate query
 */
async function getFOStats(companyFilter, startOfWeek, startOfMonth) {
    const cacheKey = 'foStats';
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached FO stats for', company);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh FO stats for', company);

    // OPTIMIZED: Use cached getAllFOs instead of separate query
    const fos = await getAllFOs(companyFilter);

    const today = new Date().toISOString().split('T')[0];
    const weekStart = startOfWeek.toISOString().split('T')[0];
    const monthStart = startOfMonth.toISOString().split('T')[0];

    const stats = {
        hoje: { positivos: 0, negativos: 0, neutros: 0 },
        semana: { positivos: 0, negativos: 0, neutros: 0 },
        mes: { positivos: 0, negativos: 0, neutros: 0 }
    };

    fos.forEach(fo => {
        const dataRegistro = fo.dataRegistro || fo.dataFato;
        const tipo = fo.tipo;

        if (dataRegistro === today) {
            stats.hoje[tipo + 's'] = (stats.hoje[tipo + 's'] || 0) + 1;
        }
        if (dataRegistro >= weekStart) {
            stats.semana[tipo + 's'] = (stats.semana[tipo + 's'] || 0) + 1;
        }
        if (dataRegistro >= monthStart) {
            stats.mes[tipo + 's'] = (stats.mes[tipo + 's'] || 0) + 1;
        }
    });

    // Cache for 2 minutes (stats change frequently)
    cacheAIData(cacheKey, stats, company, CACHE_TTL.FOS);

    return stats;
}

/**
 * Get observer ranking (with cache)
 * OPTIMIZED: Uses getAllFOs() instead of separate query
 */
async function getObserverRanking(companyFilter, startOfMonth) {
    const cacheKey = 'observerRanking';
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached observer ranking for', company);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh observer ranking for', company);

    // OPTIMIZED: Use cached getAllFOs instead of separate query
    const fos = await getAllFOs(companyFilter);
    const monthStart = startOfMonth.toISOString().split('T')[0];

    const observerCounts = {};
    fos.forEach(fo => {
        const dataRegistro = fo.dataRegistro || fo.dataFato;
        if (dataRegistro >= monthStart && fo.nomeObservador) {
            observerCounts[fo.nomeObservador] = (observerCounts[fo.nomeObservador] || 0) + 1;
        }
    });

    const ranking = Object.entries(observerCounts)
        .map(([nome, count]) => ({ nome, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const result = { periodo: 'Mês atual', ranking };

    // Cache for 5 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.STATS);

    return result;
}

/**
 * Get aditamento statistics (with cache)
 */
async function getAditamentoStats(companyFilter) {
    const cacheKey = 'aditamentoStats';
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached aditamento stats for', company);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh aditamento stats for', company);

    let q = query(
        collection(db, 'fatosObservados'),
        where('dataAdtBI', '!=', null)
    );

    const snapshot = await getDocs(q);

    logFirebaseRead({
        operation: 'getDocs',
        collection: 'fatosObservados',
        documentCount: snapshot.size,
        query: 'dataAdtBI != null' + (companyFilter ? `, company=${companyFilter}` : ''),
        fromCache: false,
        source: 'aiService.getAditamentoStats'
    });

    let fos = snapshot.docs.map(doc => doc.data());

    if (companyFilter) {
        fos = fos.filter(fo => fo.company === companyFilter);
    }

    // This week
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const weekStart = startOfWeek.toISOString().split('T')[0];
    const weekEnd = endOfWeek.toISOString().split('T')[0];

    const thisWeekFOs = fos.filter(fo => fo.dataAdtBI >= weekStart && fo.dataAdtBI <= weekEnd);

    const result = {
        semana: thisWeekFOs.length,
        repreensao: thisWeekFOs.filter(fo => fo.sancaoDisciplinar === 'REPREENSAO').length,
        aoe: thisWeekFOs.filter(fo => fo.sancaoDisciplinar === 'ATIVIDADE_OE').length,
        retirada: thisWeekFOs.filter(fo => fo.sancaoDisciplinar === 'RETIRADA').length
    };

    // Cache for 5 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.STATS);

    return result;
}

/**
 * Get faltas statistics (with cache)
 */
async function getFaltasStats(companyFilter) {
    const cacheKey = 'faltasStats';
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached faltas stats for', company);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh faltas stats for', company);

    let q = query(collection(db, 'faltasEscolares'));

    const snapshot = await getDocs(q);
    let faltas = snapshot.docs.map(doc => doc.data());

    if (companyFilter) {
        // Filter by turma prefix (company)
        const turmaPrefix = companyFilter.replace('cia', '');
        faltas = faltas.filter(f => String(f.turma || '').startsWith(turmaPrefix));
    }

    // Aggregate by student
    const studentFaltas = {};
    faltas.forEach(f => {
        const num = f.studentNumber;
        if (!studentFaltas[num]) {
            studentFaltas[num] = { numero: num, nome: f.studentName || 'Desconhecido', faltas: 0 };
        }
        // Count tempos as faltas
        const temposCount = Object.values(f.tempos || {}).filter(v => v === true).length;
        studentFaltas[num].faltas += temposCount;
    });

    const maioresFaltantes = Object.values(studentFaltas)
        .sort((a, b) => b.faltas - a.faltas)
        .slice(0, 10);

    const result = {
        total: faltas.length,
        maioresFaltantes
    };

    // Cache for 5 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.STATS);

    return result;
}

/**
 * Get students in AOE/Retirada (with cache)
 * OPTIMIZED: Uses getAllFOs() instead of separate query
 */
async function getSancoesCumprimento(companyFilter) {
    const cacheKey = 'sancoesCumprimento';
    const company = companyFilter || 'all';

    // Try cache first (shorter TTL since it's date-specific)
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached sanções cumprimento for', company);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh sanções cumprimento for', company);

    const today = new Date().toISOString().split('T')[0];

    // OPTIMIZED: Use cached getAllFOs instead of separate query
    const fos = await getAllFOs(companyFilter);

    // Filter by those with datasCumprimento containing today
    const aoe = fos.filter(fo =>
        fo.sancaoDisciplinar === 'ATIVIDADE_OE' &&
        fo.datasCumprimento?.includes(today)
    ).map(fo => ({
        numero: fo.studentNumbers?.[0],
        nome: fo.studentInfo?.[0]?.nome,
        turma: fo.studentInfo?.[0]?.turma
    }));

    const retirada = fos.filter(fo =>
        fo.sancaoDisciplinar === 'RETIRADA' &&
        fo.datasCumprimento?.includes(today)
    ).map(fo => ({
        numero: fo.studentNumbers?.[0],
        nome: fo.studentInfo?.[0]?.nome,
        turma: fo.studentInfo?.[0]?.turma
    }));

    const result = { data: today, aoe, retirada };

    // Cache for 2 minutes (changes frequently)
    cacheAIData(cacheKey, result, company, CACHE_TTL.FOS);

    return result;
}

/**
 * Get sanções statistics (with cache)
 * OPTIMIZED: Uses getAllFOs() instead of separate query
 */
async function getSancoesStats(companyFilter, startOfMonth) {
    const cacheKey = 'sancoesStats';
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached sanções stats for', company);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh sanções stats for', company);

    // OPTIMIZED: Use cached getAllFOs instead of separate query
    const fos = await getAllFOs(companyFilter);
    const monthStart = startOfMonth.toISOString().split('T')[0];

    const monthFOs = fos.filter(fo => (fo.dataRegistro || fo.dataFato) >= monthStart);

    const result = {
        periodo: 'Mês atual',
        advertencia: monthFOs.filter(fo => fo.sancaoDisciplinar === 'ADVERTENCIA').length,
        repreensao: monthFOs.filter(fo => fo.sancaoDisciplinar === 'REPREENSAO').length,
        aoe: monthFOs.filter(fo => fo.sancaoDisciplinar === 'ATIVIDADE_OE').length,
        retirada: monthFOs.filter(fo => fo.sancaoDisciplinar === 'RETIRADA').length,
        justificado: monthFOs.filter(fo => fo.sancaoDisciplinar === 'JUSTIFICADO').length,
        total: monthFOs.filter(fo => fo.sancaoDisciplinar).length
    };

    // Cache for 5 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.STATS);

    return result;
}

/**
 * Get comportamento statistics (with cache)
 */
async function getComportamentoStats(companyFilter) {
    const cacheKey = 'comportamentoStats';
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached comportamento stats for', company);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh comportamento stats for', company);

    let q = query(collection(db, 'comportamento'), orderBy('dataConsolidacao', 'desc'));

    const snapshot = await getDocs(q);
    let comportamentos = snapshot.docs.map(doc => doc.data());

    if (companyFilter) {
        comportamentos = comportamentos.filter(c => c.company === companyFilter);
    }

    // Group by student and compare last two entries
    const studentBehavior = {};
    comportamentos.forEach(c => {
        const num = c.studentNumber;
        if (!studentBehavior[num]) {
            studentBehavior[num] = [];
        }
        studentBehavior[num].push(c);
    });

    const declining = [];
    Object.entries(studentBehavior).forEach(([num, entries]) => {
        if (entries.length >= 2) {
            const [latest, previous] = entries;
            const variacao = (latest.nota || 0) - (previous.nota || 0);
            if (variacao < 0) {
                declining.push({
                    numero: num,
                    nome: latest.studentName || 'Desconhecido',
                    notaAnterior: previous.nota,
                    notaAtual: latest.nota,
                    variacao
                });
            }
        }
    });

    declining.sort((a, b) => a.variacao - b.variacao);

    const result = { alunos: declining.slice(0, 10) };

    // Cache for 5 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.STATS);

    return result;
}

/**
 * KEYWORDS for pedagogical FO detection
 */
const PEDAGOGICAL_KEYWORDS = [
    'livro', 'esqueceu o livro', 'sem livro', 'não trouxe o livro',
    'tarefa', 'dever de casa', 'não fez tarefa', 'sem tarefa', 'não fez o dever',
    'trabalho', 'não entregou trabalho', 'sem trabalho',
    'dormindo', 'dormiu na aula', 'dormindo em aula',
    'atenção', 'desatento', 'não prestou atenção', 'disperso',
    'material', 'sem material', 'esqueceu material',
    'caderno', 'sem caderno', 'esqueceu caderno',
    'conversa', 'conversando', 'atrapalhando aula',
    'celular', 'usando celular', 'mexendo no celular'
];

// ============================================
// NEW SEARCH FEATURES - ZERO FIREBASE READS
// ============================================

/**
 * Month names in Portuguese for date parsing
 */
const MONTH_NAMES = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3,
    'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
    'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
};

/**
 * Search FOs by keyword/description text
 * ZERO Firebase reads - uses cached getAllFOs()
 */
async function searchFOsByKeyword(keyword, companyFilter) {
    const cacheKey = `foSearch_${keyword.toLowerCase().replace(/\s+/g, '_')}`;
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached FO search for', keyword);
        return cached;
    }

    console.log('[AI Search] Searching FOs for keyword:', keyword);

    // Get all FOs (uses cache - 0 new reads)
    const fos = await getAllFOs(companyFilter);

    // Extract search terms (remove common words)
    const stopWords = ['que', 'de', 'da', 'do', 'em', 'para', 'com', 'os', 'as', 'um', 'uma', 'fos', 'fo', 'menciona', 'mencionam', 'referencia', 'referência', 'sobre', 'contém', 'busque', 'encontre'];
    const searchTerms = keyword.toLowerCase()
        .split(/\s+/)
        .filter(term => term.length > 2 && !stopWords.includes(term));

    if (searchTerms.length === 0) {
        return { error: 'Nenhum termo de busca válido encontrado.' };
    }

    // Filter FOs by description
    const matches = fos.filter(fo => {
        const descricao = (fo.descricao || '').toLowerCase();
        return searchTerms.some(term => descricao.includes(term));
    });

    // Sort by date (most recent first)
    matches.sort((a, b) => new Date(b.dataFato || b.dataRegistro) - new Date(a.dataFato || a.dataRegistro));

    // Aggregate by type
    const byType = {
        positivos: matches.filter(f => f.tipo === 'positivo').length,
        negativos: matches.filter(f => f.tipo === 'negativo').length,
        neutros: matches.filter(f => f.tipo === 'neutro').length
    };

    // Aggregate by student
    const byStudent = {};
    matches.forEach(fo => {
        const studentNum = fo.studentNumbers?.[0];
        if (studentNum) {
            if (!byStudent[studentNum]) {
                byStudent[studentNum] = {
                    numero: studentNum,
                    nome: fo.studentInfo?.[0]?.nome || 'Desconhecido',
                    turma: fo.studentInfo?.[0]?.turma || '?',
                    count: 0
                };
            }
            byStudent[studentNum].count++;
        }
    });

    const result = {
        searchTerms,
        totalFound: matches.length,
        byType,
        topStudents: Object.values(byStudent)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
        recentFOs: matches.slice(0, 15).map(fo => ({
            data: fo.dataFato || fo.dataRegistro,
            tipo: fo.tipo,
            descricao: fo.descricao?.substring(0, 100),
            numero: fo.studentNumbers?.[0],
            nome: fo.studentInfo?.[0]?.nome,
            turma: fo.studentInfo?.[0]?.turma,
            sancao: fo.sancaoDisciplinar
        }))
    };

    // Cache for 2 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.FOS);

    return result;
}

/**
 * Parse date range from natural language query
 */
function parseDateRange(query) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lowerQuery = query.toLowerCase();

    // "hoje"
    if (lowerQuery.includes('hoje')) {
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { start: today, end };
    }

    // "ontem"
    if (lowerQuery.includes('ontem')) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const end = new Date(yesterday);
        end.setHours(23, 59, 59, 999);
        return { start: yesterday, end };
    }

    // "semana passada" or "última semana"
    if (lowerQuery.includes('semana passada') || lowerQuery.includes('última semana') || lowerQuery.includes('ultima semana')) {
        const endOfLastWeek = new Date(today);
        endOfLastWeek.setDate(today.getDate() - today.getDay()); // Start of this week (Sunday)
        endOfLastWeek.setDate(endOfLastWeek.getDate() - 1); // Saturday of last week
        endOfLastWeek.setHours(23, 59, 59, 999);

        const startOfLastWeek = new Date(endOfLastWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 6); // Sunday of last week
        startOfLastWeek.setHours(0, 0, 0, 0);

        return { start: startOfLastWeek, end: endOfLastWeek };
    }

    // "esta semana" or "semana atual"
    if (lowerQuery.includes('esta semana') || lowerQuery.includes('semana atual')) {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { start: startOfWeek, end };
    }

    // "mês passado" or "último mês"
    if (lowerQuery.includes('mês passado') || lowerQuery.includes('mes passado') || lowerQuery.includes('último mês') || lowerQuery.includes('ultimo mes')) {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        endOfLastMonth.setHours(23, 59, 59, 999);
        return { start: startOfLastMonth, end: endOfLastMonth };
    }

    // Month name (e.g., "janeiro", "fevereiro")
    for (const [monthName, monthIndex] of Object.entries(MONTH_NAMES)) {
        if (lowerQuery.includes(monthName)) {
            // Check if year is mentioned
            const yearMatch = lowerQuery.match(/\b(202\d)\b/);
            const year = yearMatch ? parseInt(yearMatch[1]) : today.getFullYear();

            const startOfMonth = new Date(year, monthIndex, 1);
            const endOfMonth = new Date(year, monthIndex + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            return { start: startOfMonth, end: endOfMonth };
        }
    }

    // Specific date: dd/mm or dd/mm/yyyy
    const dateMatch = lowerQuery.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1;
        let year = dateMatch[3] ? parseInt(dateMatch[3]) : today.getFullYear();
        if (year < 100) year += 2000;

        const specificDate = new Date(year, month, day);
        const end = new Date(specificDate);
        end.setHours(23, 59, 59, 999);
        return { start: specificDate, end };
    }

    // Default: last 7 days
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start: sevenDaysAgo, end };
}

/**
 * Get FOs by date range
 * ZERO Firebase reads - uses cached getAllFOs()
 */
async function getFOsByDateRange(query, companyFilter) {
    const dateRange = parseDateRange(query);
    const cacheKey = `foByDate_${dateRange.start.toISOString().split('T')[0]}_${dateRange.end.toISOString().split('T')[0]}`;
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached FO date search');
        return cached;
    }

    console.log('[AI Search] Searching FOs by date:', dateRange.start.toLocaleDateString('pt-BR'), 'to', dateRange.end.toLocaleDateString('pt-BR'));

    // Get all FOs (uses cache - 0 new reads)
    const fos = await getAllFOs(companyFilter);

    // Filter by date
    const matches = fos.filter(fo => {
        const foDateStr = fo.dataFato || fo.dataRegistro;
        if (!foDateStr) return false;
        const foDate = new Date(foDateStr);
        return foDate >= dateRange.start && foDate <= dateRange.end;
    });

    // Sort by date (most recent first)
    matches.sort((a, b) => new Date(b.dataFato || b.dataRegistro) - new Date(a.dataFato || a.dataRegistro));

    const result = {
        periodo: `${dateRange.start.toLocaleDateString('pt-BR')} a ${dateRange.end.toLocaleDateString('pt-BR')}`,
        totalFound: matches.length,
        byType: {
            positivos: matches.filter(f => f.tipo === 'positivo').length,
            negativos: matches.filter(f => f.tipo === 'negativo').length,
            neutros: matches.filter(f => f.tipo === 'neutro').length
        },
        bySanction: {
            advertencia: matches.filter(f => f.sancaoDisciplinar === 'ADVERTENCIA').length,
            repreensao: matches.filter(f => f.sancaoDisciplinar === 'REPREENSAO').length,
            aoe: matches.filter(f => f.sancaoDisciplinar === 'ATIVIDADE_OE').length,
            retirada: matches.filter(f => f.sancaoDisciplinar === 'RETIRADA').length,
            justificado: matches.filter(f => f.sancaoDisciplinar === 'JUSTIFICADO').length
        },
        recentFOs: matches.slice(0, 15).map(fo => ({
            data: fo.dataFato || fo.dataRegistro,
            tipo: fo.tipo,
            descricao: fo.descricao?.substring(0, 80),
            numero: fo.studentNumbers?.[0],
            nome: fo.studentInfo?.[0]?.nome,
            turma: fo.studentInfo?.[0]?.turma,
            sancao: fo.sancaoDisciplinar
        }))
    };

    // Cache for 2 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.FOS);

    return result;
}

/**
 * Search students by name (from FO denormalized data)
 * ZERO Firebase reads - uses cached getAllFOs()
 */
async function searchStudentsByName(searchName, companyFilter) {
    const cacheKey = `studentSearch_${searchName.toLowerCase().replace(/\s+/g, '_')}`;
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached student search for', searchName);
        return cached;
    }

    console.log('[AI Search] Searching students by name:', searchName);

    // Get all FOs (uses cache - 0 new reads)
    const fos = await getAllFOs(companyFilter);

    const searchTerm = searchName.toLowerCase();

    // Find FOs with matching student name
    const matches = fos.filter(fo => {
        const studentName = (fo.studentInfo?.[0]?.nome || '').toLowerCase();
        return studentName.includes(searchTerm);
    });

    // Aggregate by student
    const studentStats = {};
    matches.forEach(fo => {
        const studentNum = fo.studentNumbers?.[0];
        const studentName = fo.studentInfo?.[0]?.nome;
        if (!studentNum || !studentName) return;

        if (!studentStats[studentNum]) {
            studentStats[studentNum] = {
                numero: studentNum,
                nome: studentName,
                turma: fo.studentInfo?.[0]?.turma || '?',
                company: fo.company,
                total: 0,
                positivos: 0,
                negativos: 0,
                neutros: 0,
                sanctions: { advertencia: 0, repreensao: 0, aoe: 0, retirada: 0 },
                recentFOs: []
            };
        }

        const s = studentStats[studentNum];
        s.total++;
        if (fo.tipo === 'positivo') s.positivos++;
        if (fo.tipo === 'negativo') s.negativos++;
        if (fo.tipo === 'neutro') s.neutros++;
        if (fo.sancaoDisciplinar === 'ADVERTENCIA') s.sanctions.advertencia++;
        if (fo.sancaoDisciplinar === 'REPREENSAO') s.sanctions.repreensao++;
        if (fo.sancaoDisciplinar === 'ATIVIDADE_OE') s.sanctions.aoe++;
        if (fo.sancaoDisciplinar === 'RETIRADA') s.sanctions.retirada++;

        if (s.recentFOs.length < 5) {
            s.recentFOs.push({
                data: fo.dataFato || fo.dataRegistro,
                tipo: fo.tipo,
                descricao: fo.descricao?.substring(0, 80)
            });
        }
    });

    const students = Object.values(studentStats).sort((a, b) => b.total - a.total);

    const result = {
        searchTerm,
        studentsFound: students.length,
        totalFOs: matches.length,
        students: students.slice(0, 10)
    };

    // Cache for 5 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.STATS);

    return result;
}

/**
 * Get deep analysis for a specific turma
 * ZERO Firebase reads - uses cached getAllFOs()
 */
async function getTurmaDeepDive(turmaName, companyFilter) {
    const cacheKey = `turmaDeepDive_${turmaName.toLowerCase().replace(/\s+/g, '_')}`;
    const company = companyFilter || 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached turma analysis for', turmaName);
        return cached;
    }

    console.log('[AI Search] Analyzing turma:', turmaName);

    // Get all FOs (uses cache - 0 new reads)
    const fos = await getAllFOs(companyFilter);

    const searchTurma = turmaName.toLowerCase();

    // Filter by turma
    const turmaFOs = fos.filter(fo => {
        const turma = (fo.studentInfo?.[0]?.turma || '').toLowerCase();
        return turma.includes(searchTurma);
    });

    if (turmaFOs.length === 0) {
        return { error: `Nenhum FO encontrado para a turma "${turmaName}".` };
    }

    // Aggregate students in this turma
    const studentsInTurma = new Set();
    const studentProblems = {};

    turmaFOs.forEach(fo => {
        const studentNum = fo.studentNumbers?.[0];
        if (studentNum) {
            studentsInTurma.add(studentNum);

            if (!studentProblems[studentNum]) {
                studentProblems[studentNum] = {
                    numero: studentNum,
                    nome: fo.studentInfo?.[0]?.nome || 'Desconhecido',
                    negativos: 0,
                    sanctions: 0
                };
            }
            if (fo.tipo === 'negativo') studentProblems[studentNum].negativos++;
            if (fo.sancaoDisciplinar) studentProblems[studentNum].sanctions++;
        }
    });

    // Pedagogical issues
    const pedagogicalCount = turmaFOs.filter(fo =>
        PEDAGOGICAL_KEYWORDS.some(kw => (fo.descricao || '').toLowerCase().includes(kw))
    ).length;

    const result = {
        turma: turmaName,
        totalFOs: turmaFOs.length,
        studentsCount: studentsInTurma.size,
        avgFOsPerStudent: (turmaFOs.length / studentsInTurma.size).toFixed(2),
        byType: {
            positivos: turmaFOs.filter(f => f.tipo === 'positivo').length,
            negativos: turmaFOs.filter(f => f.tipo === 'negativo').length,
            neutros: turmaFOs.filter(f => f.tipo === 'neutro').length
        },
        bySanction: {
            advertencia: turmaFOs.filter(f => f.sancaoDisciplinar === 'ADVERTENCIA').length,
            repreensao: turmaFOs.filter(f => f.sancaoDisciplinar === 'REPREENSAO').length,
            aoe: turmaFOs.filter(f => f.sancaoDisciplinar === 'ATIVIDADE_OE').length,
            retirada: turmaFOs.filter(f => f.sancaoDisciplinar === 'RETIRADA').length
        },
        pedagogicalConcerns: pedagogicalCount,
        problematicStudents: Object.values(studentProblems)
            .filter(s => s.negativos >= 2 || s.sanctions >= 1)
            .sort((a, b) => (b.negativos + b.sanctions) - (a.negativos + a.sanctions))
            .slice(0, 10)
    };

    // Cache for 5 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.STATS);

    return result;
}

/**
 * Compare statistics across all companies
 * ZERO Firebase reads - uses cached getAllFOs()
 * Only for Admin/ComandoCA
 */
async function getCompanyComparison() {
    const session = getSession();

    // Only allow admins/comandoCA
    if (session?.role !== 'admin' && session?.role !== 'comandoCA') {
        return { error: 'Comparação entre companhias disponível apenas para Admin/Comando CA.' };
    }

    const cacheKey = 'companyComparison';
    const company = 'all';

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached company comparison');
        return cached;
    }

    console.log('[AI Search] Comparing companies');

    // Get ALL FOs (no company filter) - uses cache
    const fos = await getAllFOs(null);

    // Group by company
    const byCompany = {};
    fos.forEach(fo => {
        const cia = fo.company || 'Sem Companhia';
        if (!byCompany[cia]) {
            byCompany[cia] = [];
        }
        byCompany[cia].push(fo);
    });

    // Calculate stats per company
    const comparison = Object.entries(byCompany)
        .map(([company, companyFOs]) => ({
            company,
            total: companyFOs.length,
            positivos: companyFOs.filter(f => f.tipo === 'positivo').length,
            negativos: companyFOs.filter(f => f.tipo === 'negativo').length,
            neutros: companyFOs.filter(f => f.tipo === 'neutro').length,
            sancoesGraves: companyFOs.filter(f => ['RETIRADA', 'ATIVIDADE_OE'].includes(f.sancaoDisciplinar)).length,
            negativosPercentage: companyFOs.length > 0
                ? ((companyFOs.filter(f => f.tipo === 'negativo').length / companyFOs.length) * 100).toFixed(1)
                : 0
        }))
        .sort((a, b) => b.total - a.total);

    const result = {
        totalCompanies: comparison.length,
        totalFOs: fos.length,
        comparison,
        bestPositive: comparison.sort((a, b) => b.positivos - a.positivos)[0],
        worstNegative: comparison.sort((a, b) => b.negativos - a.negativos)[0]
    };

    // Cache for 5 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.STATS);

    return result;
}

/**
 * Get pedagogical FOs (learning-related) for the week (with cache)
 * Only available to Cmt Cia for their company
 */
async function getPedagogicalFOs(companyFilter) {
    const session = getSession();

    // Only allow commanders to access this
    if (!companyFilter || !['commander', 'admin'].includes(session?.role)) {
        return null;
    }

    const cacheKey = 'pedagogicalFOs';
    const company = companyFilter;

    // Try cache first
    const cached = getCachedAIData(cacheKey, company);
    if (cached) {
        console.log('[AI Cache] Using cached pedagogical FOs for', company);
        return cached;
    }

    console.log('[AI Cache] Fetching fresh pedagogical FOs for', company);

    // Calculate week range
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const weekStart = startOfWeek.toISOString().split('T')[0];

    let q = query(
        collection(db, 'fatosObservados'),
        where('company', '==', companyFilter),
        where('tipo', '==', 'negativo')
    );

    const snapshot = await getDocs(q);
    const fos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by date (this week) and pedagogical keywords
    const pedagogicalFOs = fos.filter(fo => {
        const dataRegistro = fo.dataRegistro || fo.dataFato;
        if (dataRegistro < weekStart) return false;

        const descricao = (fo.descricao || '').toLowerCase();
        return PEDAGOGICAL_KEYWORDS.some(keyword => descricao.includes(keyword));
    });

    // Group by keyword category
    const categories = {
        livros: pedagogicalFOs.filter(fo =>
            ['livro', 'esqueceu o livro', 'sem livro', 'não trouxe o livro'].some(k => (fo.descricao || '').toLowerCase().includes(k))
        ),
        tarefas: pedagogicalFOs.filter(fo =>
            ['tarefa', 'dever', 'trabalho', 'não entregou'].some(k => (fo.descricao || '').toLowerCase().includes(k))
        ),
        atencao: pedagogicalFOs.filter(fo =>
            ['dormindo', 'dormiu', 'atenção', 'desatento', 'disperso', 'celular'].some(k => (fo.descricao || '').toLowerCase().includes(k))
        ),
        material: pedagogicalFOs.filter(fo =>
            ['material', 'caderno', 'sem caderno'].some(k => (fo.descricao || '').toLowerCase().includes(k))
        ),
        outros: []
    };

    // Get students info
    const studentsData = pedagogicalFOs.map(fo => ({
        numero: fo.studentNumbers?.[0],
        nome: fo.studentInfo?.[0]?.nome || 'Desconhecido',
        turma: fo.studentInfo?.[0]?.turma || '?',
        descricao: fo.descricao?.substring(0, 100),
        data: fo.dataRegistro || fo.dataFato
    }));

    const result = {
        total: pedagogicalFOs.length,
        semana: weekStart,
        categories: {
            livros: categories.livros.length,
            tarefas: categories.tarefas.length,
            atencao: categories.atencao.length,
            material: categories.material.length
        },
        detalhes: studentsData.slice(0, 15) // Limit to 15 for context
    };

    // Cache for 5 minutes
    cacheAIData(cacheKey, result, company, CACHE_TTL.STATS);

    return result;
}

/**
 * Format context data for AI prompt
 */
function formatContextForPrompt(contextData) {
    let formatted = '';

    // ============================================
    // NEW SEARCH FEATURES FORMATTING
    // ============================================

    // TEXT SEARCH RESULTS
    if (contextData.foSearch) {
        const fs = contextData.foSearch;
        if (fs.error) {
            formatted += `\n=== BUSCA POR TEXTO ===\nERRO: ${fs.error}\n`;
        } else {
            formatted += `\n=== BUSCA POR TEXTO ===
Termos buscados: ${fs.searchTerms?.join(', ')}
Total encontrado: ${fs.totalFound} FOs

POR TIPO:
- Positivos: ${fs.byType?.positivos || 0}
- Negativos: ${fs.byType?.negativos || 0}
- Neutros: ${fs.byType?.neutros || 0}

ALUNOS COM MAIS OCORRÊNCIAS:\n`;
            fs.topStudents?.forEach((s, i) => {
                formatted += `${i + 1}. Nº ${s.numero} - ${s.nome} (${s.turma}): ${s.count} FOs\n`;
            });

            if (fs.recentFOs?.length > 0) {
                formatted += `\nFOs ENCONTRADOS (mais recentes):\n`;
                fs.recentFOs.forEach((fo, i) => {
                    formatted += `${i + 1}. ${fo.data} | ${fo.tipo?.toUpperCase()} | Nº ${fo.numero} - ${fo.nome}\n   "${fo.descricao}..."\n`;
                });
            }
        }
    }

    // DATE SEARCH RESULTS
    if (contextData.foByDate) {
        const fd = contextData.foByDate;
        formatted += `\n=== FOs POR DATA ===
Período: ${fd.periodo}
Total encontrado: ${fd.totalFound} FOs

POR TIPO:
- Positivos: ${fd.byType?.positivos || 0}
- Negativos: ${fd.byType?.negativos || 0}
- Neutros: ${fd.byType?.neutros || 0}

POR SANÇÃO:
- Advertências: ${fd.bySanction?.advertencia || 0}
- Repreensões: ${fd.bySanction?.repreensao || 0}
- AOE: ${fd.bySanction?.aoe || 0}
- Retiradas: ${fd.bySanction?.retirada || 0}
- Justificados: ${fd.bySanction?.justificado || 0}`;

        if (fd.recentFOs?.length > 0) {
            formatted += `\n\nFOs DO PERÍODO:\n`;
            fd.recentFOs.forEach((fo, i) => {
                formatted += `${i + 1}. ${fo.data} | ${fo.tipo?.toUpperCase()} | Nº ${fo.numero} - ${fo.nome} (${fo.turma})\n   "${fo.descricao}..." | Sanção: ${fo.sancao || 'N/A'}\n`;
            });
        }
    }

    // STUDENT NAME SEARCH RESULTS
    if (contextData.studentNameSearch) {
        const sns = contextData.studentNameSearch;
        if (sns.error) {
            formatted += `\n=== BUSCA POR NOME ===\nERRO: ${sns.error}\n`;
        } else {
            formatted += `\n=== BUSCA POR NOME: "${sns.searchTerm}" ===
Alunos encontrados: ${sns.studentsFound}
Total de FOs: ${sns.totalFOs}

ALUNOS ENCONTRADOS:\n`;
            sns.students?.forEach((s, i) => {
                formatted += `${i + 1}. Nº ${s.numero} - ${s.nome} (Turma ${s.turma}, ${s.company})
   Total: ${s.total} FOs | +${s.positivos} -${s.negativos} ~${s.neutros}
   Sanções: Adv(${s.sanctions.advertencia}) Rep(${s.sanctions.repreensao}) AOE(${s.sanctions.aoe}) Ret(${s.sanctions.retirada})\n`;
            });
        }
    }

    // TURMA DEEP DIVE RESULTS
    if (contextData.turmaDeepDive) {
        const td = contextData.turmaDeepDive;
        if (td.error) {
            formatted += `\n=== ANÁLISE DE TURMA ===\nERRO: ${td.error}\n`;
        } else {
            formatted += `\n=== ANÁLISE DETALHADA: TURMA ${td.turma} ===
Total de FOs: ${td.totalFOs}
Alunos envolvidos: ${td.studentsCount}
Média FOs/aluno: ${td.avgFOsPerStudent}
Problemas pedagógicos: ${td.pedagogicalConcerns}

POR TIPO:
- Positivos: ${td.byType?.positivos || 0}
- Negativos: ${td.byType?.negativos || 0}
- Neutros: ${td.byType?.neutros || 0}

POR SANÇÃO:
- Advertências: ${td.bySanction?.advertencia || 0}
- Repreensões: ${td.bySanction?.repreensao || 0}
- AOE: ${td.bySanction?.aoe || 0}
- Retiradas: ${td.bySanction?.retirada || 0}`;

            if (td.problematicStudents?.length > 0) {
                formatted += `\n\nALUNOS PROBLEMÁTICOS DA TURMA:\n`;
                td.problematicStudents.forEach((s, i) => {
                    formatted += `${i + 1}. Nº ${s.numero} - ${s.nome}: ${s.negativos} negativos, ${s.sanctions} sanções\n`;
                });
            }
        }
    }

    // COMPANY COMPARISON RESULTS
    if (contextData.companyComparison) {
        const cc = contextData.companyComparison;
        if (cc.error) {
            formatted += `\n=== COMPARAÇÃO ENTRE COMPANHIAS ===\nERRO: ${cc.error}\n`;
        } else {
            formatted += `\n=== COMPARAÇÃO ENTRE COMPANHIAS ===
Total de companhias: ${cc.totalCompanies}
Total de FOs: ${cc.totalFOs}

RANKING POR TOTAL DE FOs:\n`;
            cc.comparison?.forEach((c, i) => {
                formatted += `${i + 1}. ${c.company}: ${c.total} FOs | +${c.positivos} -${c.negativos} ~${c.neutros} | ${c.negativosPercentage}% negativos | ${c.sancoesGraves} sanções graves\n`;
            });

            if (cc.bestPositive) {
                formatted += `\nMais FOs positivos: ${cc.bestPositive.company} (${cc.bestPositive.positivos})\n`;
            }
            if (cc.worstNegative) {
                formatted += `Mais FOs negativos: ${cc.worstNegative.company} (${cc.worstNegative.negativos})\n`;
            }
        }
    }

    // ============================================
    // EXISTING FEATURES FORMATTING
    // ============================================

    if (contextData.studentHistory) {
        const sh = contextData.studentHistory;
        if (sh.error) {
            formatted += `\n=== HISTÓRICO DO ALUNO ===\nERRO: ${sh.error}\n`;
        } else {
            formatted += `\n=== HISTÓRICO COMPLETO DO ALUNO ${sh.studentNumber} ===
Nome: ${sh.nome}
Turma: ${sh.turma}
Companhia: ${sh.company}

ESTATÍSTICAS:
Total de FOs: ${sh.totalFOs}
- Positivos: ${sh.positivos}
- Negativos: ${sh.negativos}
- Neutros: ${sh.neutros}

SANÇÕES APLICADAS:
- Advertências: ${sh.sanctions.advertencia}
- Repreensões: ${sh.sanctions.repreensao}
- AOE: ${sh.sanctions.aoe}
- Retiradas: ${sh.sanctions.retirada}
- Justificados: ${sh.sanctions.justificado}

PERÍODO:
- Primeiro FO: ${sh.firstFO || 'N/A'}
- Último FO: ${sh.lastFO || 'N/A'}

ÚLTIMOS 5 FOs:\n`;
            sh.recentFOs?.forEach((fo, i) => {
                formatted += `${i + 1}. ${fo.data} - ${fo.tipo.toUpperCase()} - ${fo.descricao || 'Sem descrição'}\n   Sanção: ${fo.sancao || 'Não aplicada'} | Status: ${fo.status}\n`;
            });
        }
    }

    if (contextData.recurrence) {
        formatted += `\n=== ANÁLISE DE REINCIDÊNCIA ===
Total de alunos reincidentes (3+ FOs): ${contextData.recurrence.totalRecurrent}

ALUNOS COM MAIS FOs:\n`;
        contextData.recurrence.recurrentStudents?.slice(0, 10).forEach((s, i) => {
            formatted += `${i + 1}. Nº ${s.numero} - ${s.nome} (${s.turma}): ${s.total} FOs (${s.negativos} negativos)\n`;
        });

        if (contextData.recurrence.sameViolationStudents?.length > 0) {
            formatted += `\nALUNOS COM MESMA VIOLAÇÃO REPETIDA:\n`;
            contextData.recurrence.sameViolationStudents.forEach((s, i) => {
                formatted += `${i + 1}. Nº ${s.numero} - ${s.nome}: `;
                s.repeatedViolations.forEach(v => {
                    formatted += `Falta ${v.falta} (${v.count}x) `;
                });
                formatted += `\n`;
            });
        }
    }

    if (contextData.periodComparison) {
        const pc = contextData.periodComparison;
        formatted += `\n=== COMPARAÇÃO DE PERÍODOS ===

MÊS ATUAL (${pc.currentMonth.periodo}):
- Total: ${pc.currentMonth.total} FOs
- Positivos: ${pc.currentMonth.positivos}
- Negativos: ${pc.currentMonth.negativos}
- Neutros: ${pc.currentMonth.neutros}

MÊS ANTERIOR (${pc.previousMonth.periodo}):
- Total: ${pc.previousMonth.total} FOs
- Positivos: ${pc.previousMonth.positivos}
- Negativos: ${pc.previousMonth.negativos}
- Neutros: ${pc.previousMonth.neutros}

VARIAÇÃO:
- Total: ${pc.variation.total > 0 ? '+' : ''}${pc.variation.total} (${pc.variation.percentage}%)
- Positivos: ${pc.variation.positivos > 0 ? '+' : ''}${pc.variation.positivos}
- Negativos: ${pc.variation.negativos > 0 ? '+' : ''}${pc.variation.negativos}
- Tendência: ${pc.trend.toUpperCase()}\n`;
    }

    if (contextData.byTurma) {
        formatted += `\n=== ANÁLISE POR TURMA ===
Total de turmas: ${contextData.byTurma.totalTurmas}

RANKING DE TURMAS (por total de FOs):\n`;
        contextData.byTurma.turmas?.slice(0, 10).forEach((t, i) => {
            formatted += `${i + 1}. ${t.turma}: ${t.total} FOs (${t.negativos} negativos, ${t.negativosPercentage}% negatividade)
   ${t.studentsCount} alunos | Média: ${t.avgFOsPerStudent} FOs/aluno\n`;
        });

        if (contextData.byTurma.mostProblematic) {
            formatted += `\nTURMA MAIS PROBLEMÁTICA: ${contextData.byTurma.mostProblematic.turma} (${contextData.byTurma.mostProblematic.total} FOs)\n`;
        }
    }

    if (contextData.alerts) {
        formatted += `\n=== ALERTAS PREVENTIVOS ===
Total de alunos em risco: ${contextData.alerts.totalAlerts}
- Risco CRÍTICO: ${contextData.alerts.critical}
- Risco ALTO: ${contextData.alerts.high}
- Risco MÉDIO: ${contextData.alerts.medium}

ALUNOS EM RISCO:\n`;
        contextData.alerts.highRiskStudents?.slice(0, 15).forEach((s, i) => {
            formatted += `${i + 1}. Nº ${s.numero} - ${s.nome} (${s.turma}) - ${s.riskLevel}
   Score: ${s.riskScore} | Motivos: ${s.reasons.join('; ')}\n`;
        });
    }

    // EXISTING FEATURES FORMATTING

    if (contextData.foStats) {
        formatted += `\n=== ESTATÍSTICAS DE FOs ===
HOJE: ${contextData.foStats.hoje.positivos} positivos, ${contextData.foStats.hoje.negativos} negativos, ${contextData.foStats.hoje.neutros} neutros
SEMANA: ${contextData.foStats.semana.positivos} positivos, ${contextData.foStats.semana.negativos} negativos, ${contextData.foStats.semana.neutros} neutros
MÊS: ${contextData.foStats.mes.positivos} positivos, ${contextData.foStats.mes.negativos} negativos, ${contextData.foStats.mes.neutros} neutros\n`;
    }

    if (contextData.observerRanking) {
        formatted += `\n=== RANKING DE OBSERVADORES (${contextData.observerRanking.periodo}) ===\n`;
        contextData.observerRanking.ranking.forEach((obs, i) => {
            formatted += `${i + 1}. ${obs.nome}: ${obs.count} FOs\n`;
        });
    }

    if (contextData.aditamento) {
        formatted += `\n=== FOs PARA ADITAMENTO (Semana) ===
Total: ${contextData.aditamento.semana}
Repreensão: ${contextData.aditamento.repreensao}
AOE: ${contextData.aditamento.aoe}
Retirada: ${contextData.aditamento.retirada}\n`;
    }

    if (contextData.faltas) {
        formatted += `\n=== MAIORES FALTANTES ===\n`;
        contextData.faltas.maioresFaltantes?.forEach((a, i) => {
            formatted += `${i + 1}. Nº ${a.numero} - ${a.nome}: ${a.faltas} faltas\n`;
        });
    }

    if (contextData.sancoesCumprimento) {
        formatted += `\n=== ALUNOS EM CUMPRIMENTO HOJE (${contextData.sancoesCumprimento.data}) ===
AOE: ${contextData.sancoesCumprimento.aoe?.length || 0} alunos
Retirada: ${contextData.sancoesCumprimento.retirada?.length || 0} alunos\n`;
    }

    if (contextData.sancoes) {
        formatted += `\n=== SANÇÕES DO MÊS ===
Advertência: ${contextData.sancoes.advertencia}
Repreensão: ${contextData.sancoes.repreensao}
AOE: ${contextData.sancoes.aoe}
Retirada: ${contextData.sancoes.retirada}
Justificado: ${contextData.sancoes.justificado}\n`;
    }

    if (contextData.comportamento) {
        formatted += `\n=== ALUNOS COM COMPORTAMENTO EM QUEDA ===\n`;
        contextData.comportamento.alunos?.forEach((a, i) => {
            formatted += `${i + 1}. Nº ${a.numero} - ${a.nome}: ${a.notaAnterior} → ${a.notaAtual} (${a.variacao})\n`;
        });
    }

    if (contextData.pedagogicos) {
        formatted += `\n=== FOs PEDAGÓGICOS DA SEMANA (${contextData.pedagogicos.semana}) ===\n`;
        formatted += `Total: ${contextData.pedagogicos.total} ocorrências relacionadas ao aprendizado\n`;
        formatted += `- Livros esquecidos: ${contextData.pedagogicos.categories?.livros || 0}\n`;
        formatted += `- Tarefas/Trabalhos: ${contextData.pedagogicos.categories?.tarefas || 0}\n`;
        formatted += `- Atenção/Celular: ${contextData.pedagogicos.categories?.atencao || 0}\n`;
        formatted += `- Material escolar: ${contextData.pedagogicos.categories?.material || 0}\n\n`;

        if (contextData.pedagogicos.detalhes?.length > 0) {
            formatted += `Detalhes:\n`;
            contextData.pedagogicos.detalhes.forEach((fo, i) => {
                formatted += `${i + 1}. Nº ${fo.numero} (${fo.turma}) - ${fo.data}: ${fo.descricao}...\n`;
            });
        }
    }

    return formatted || 'Nenhum dado específico encontrado para esta consulta.';
}

/**
 * Main function to chat with AI
 * @param {string} userMessage - User's message
 * @returns {Promise<string>} AI response
 */
export async function chatWithAI(userMessage) {
    const session = getSession();

    if (!session) {
        throw new Error('Você precisa estar logado para usar o assistente de IA.');
    }

    try {
        // Get AI configuration
        const config = await getAIConfig();

        // Get provider and model from config, with smart defaults
        const storedProvider = config.provider || DEFAULT_AI_PROVIDER;
        const storedModel = config.model;

        // Validate and get effective config
        const { model, provider } = getValidConfig(storedModel, storedProvider);

        // Get API key (check for provider-specific key first)
        let apiKey = config[`${provider}ApiKey`] || config.apiKey;

        if (!apiKey) {
            const providerName = provider === AI_PROVIDERS.GROQ ? 'Groq' : 'Gemini';
            throw new Error(`API key ${providerName} não configurada. Configure em Admin > IA.`);
        }

        // Clean up API key (remove any whitespace that may have been added)
        apiKey = apiKey.trim().replace(/\s+/g, '');
        console.log(`[AI] API Key length: ${apiKey.length}, starts with: ${apiKey.substring(0, 10)}...`);

        console.log(`[AI] Using provider: ${provider}, model: ${model}`);

        // Generate system prompt
        const systemPrompt = generateSystemPrompt(session);

        // Gather context data based on query
        const contextData = await gatherContextData(userMessage);
        const formattedContext = formatContextForPrompt(contextData);

        // Call AI API (routes to correct provider)
        const response = await callAI(provider, apiKey, model, systemPrompt, userMessage, formattedContext);

        // Log conversation
        await logConversation(userMessage, response, model);

        return response;

    } catch (error) {
        console.error('AI Chat Error:', error);
        throw error;
    }
}

/**
 * Get suggested queries
 * @returns {string[]}
 */
export function getSuggestedQueries() {
    return SUGGESTED_QUERIES;
}

/**
 * Check if AI is configured for the current user
 * @returns {Promise<boolean>}
 */
export async function isAIConfigured() {
    try {
        await getAIConfig();
        return true;
    } catch {
        return false;
    }
}
