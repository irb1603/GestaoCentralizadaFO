// AI Service - Gemini Integration
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
import { AI_CONFIGS_COLLECTION, AI_LOGS_COLLECTION, DEFAULT_AI_MODEL, AI_CONTEXT_DAYS } from '../constants/aiConfig.js';
import { generateSystemPrompt, generateContextPrompt, SUGGESTED_QUERIES } from '../utils/aiPrompts.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Get AI API key for the current user's company
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

    try {
        // Try to get config from Firebase
        const configRef = doc(db, AI_CONFIGS_COLLECTION, configKey);
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
            return configSnap.data();
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

    const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
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

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erro na API do Gemini');
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
    }

    throw new Error('Resposta inválida do Gemini');
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

    // FO Statistics
    if (lowerQuery.includes('fo') || lowerQuery.includes('fato') || lowerQuery.includes('observad')) {
        contextData.foStats = await getFOStats(companyFilter, startOfWeek, startOfMonth);
    }

    // Observer ranking
    if (lowerQuery.includes('observador') || lowerQuery.includes('registr')) {
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

    return contextData;
}

/**
 * Get FO statistics
 */
async function getFOStats(companyFilter, startOfWeek, startOfMonth) {
    let q = query(collection(db, 'fatosObservados'));

    if (companyFilter) {
        q = query(q, where('company', '==', companyFilter));
    }

    const snapshot = await getDocs(q);
    const fos = snapshot.docs.map(doc => doc.data());

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

    return stats;
}

/**
 * Get observer ranking
 */
async function getObserverRanking(companyFilter, startOfMonth) {
    let q = query(collection(db, 'fatosObservados'));

    if (companyFilter) {
        q = query(q, where('company', '==', companyFilter));
    }

    const snapshot = await getDocs(q);
    const fos = snapshot.docs.map(doc => doc.data());
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

    return { periodo: 'Mês atual', ranking };
}

/**
 * Get aditamento statistics
 */
async function getAditamentoStats(companyFilter) {
    let q = query(
        collection(db, 'fatosObservados'),
        where('dataAdtBI', '!=', null)
    );

    const snapshot = await getDocs(q);
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

    return {
        semana: thisWeekFOs.length,
        repreensao: thisWeekFOs.filter(fo => fo.sancaoDisciplinar === 'REPREENSAO').length,
        aoe: thisWeekFOs.filter(fo => fo.sancaoDisciplinar === 'ATIVIDADE_OE').length,
        retirada: thisWeekFOs.filter(fo => fo.sancaoDisciplinar === 'RETIRADA').length
    };
}

/**
 * Get faltas statistics
 */
async function getFaltasStats(companyFilter) {
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

    return {
        total: faltas.length,
        maioresFaltantes
    };
}

/**
 * Get students in AOE/Retirada
 */
async function getSancoesCumprimento(companyFilter) {
    const today = new Date().toISOString().split('T')[0];

    let q = query(collection(db, 'fatosObservados'));

    const snapshot = await getDocs(q);
    let fos = snapshot.docs.map(doc => doc.data());

    if (companyFilter) {
        fos = fos.filter(fo => fo.company === companyFilter);
    }

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

    return { data: today, aoe, retirada };
}

/**
 * Get sanções statistics
 */
async function getSancoesStats(companyFilter, startOfMonth) {
    let q = query(collection(db, 'fatosObservados'));

    if (companyFilter) {
        q = query(q, where('company', '==', companyFilter));
    }

    const snapshot = await getDocs(q);
    const fos = snapshot.docs.map(doc => doc.data());
    const monthStart = startOfMonth.toISOString().split('T')[0];

    const monthFOs = fos.filter(fo => (fo.dataRegistro || fo.dataFato) >= monthStart);

    return {
        periodo: 'Mês atual',
        advertencia: monthFOs.filter(fo => fo.sancaoDisciplinar === 'ADVERTENCIA').length,
        repreensao: monthFOs.filter(fo => fo.sancaoDisciplinar === 'REPREENSAO').length,
        aoe: monthFOs.filter(fo => fo.sancaoDisciplinar === 'ATIVIDADE_OE').length,
        retirada: monthFOs.filter(fo => fo.sancaoDisciplinar === 'RETIRADA').length,
        justificado: monthFOs.filter(fo => fo.sancaoDisciplinar === 'JUSTIFICADO').length,
        total: monthFOs.filter(fo => fo.sancaoDisciplinar).length
    };
}

/**
 * Get comportamento statistics
 */
async function getComportamentoStats(companyFilter) {
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

    return { alunos: declining.slice(0, 10) };
}

/**
 * Format context data for AI prompt
 */
function formatContextForPrompt(contextData) {
    let formatted = '';

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
        const model = config.model || DEFAULT_AI_MODEL;
        const apiKey = config.apiKey;

        if (!apiKey) {
            throw new Error('API key não configurada. Contate o administrador.');
        }

        // Generate system prompt
        const systemPrompt = generateSystemPrompt(session);

        // Gather context data based on query
        const contextData = await gatherContextData(userMessage);
        const formattedContext = formatContextForPrompt(contextData);

        // Call Gemini API
        const response = await callGeminiAPI(apiKey, model, systemPrompt, userMessage, formattedContext);

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
