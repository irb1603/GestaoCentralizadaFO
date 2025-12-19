// Comportamento Calculation Service
// Gestão Centralizada FO - CMB

/**
 * Regras de cálculo do comportamento:
 * 
 * 1. NOTA INICIAL: 10.0
 * 
 * 2. SANÇÕES (reduzem a nota):
 *    - Advertência: 0 (não afeta)
 *    - Repreensão: -0.3
 *    - Atividade de Orientação Educacional: -0.5
 *    - Retirada: -0.8 POR DIA (máximo 6 dias = -4.8)
 *    - Justificado: 0 (não conta como sanção)
 * 
 * 3. BÔNUS (aumenta a nota):
 *    - A cada 90 dias SEM sanção (Justificado não conta como sanção):
 *      +0.01/dia de bônus = até +0.9 no período
 *    - Nota máxima: 10.0
 */

import { db } from '../firebase/config.js';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// Sanção impact values
export const SANCAO_IMPACT = {
    JUSTIFICADO: 0,
    ADVERTENCIA: 0,
    REPREENSAO: -0.3,
    ATIVIDADE_OE: -0.5,
    RETIRADA: -0.8 // Por dia de cumprimento
};

// Maximum days for Retirada
export const MAX_RETIRADA_DIAS = 6;

// Bonus for days without sanction
export const BONUS_PER_DAY = 0.01;
export const BONUS_PERIOD_DAYS = 90;

/**
 * Calculate comportamento variation for a single sanction
 * @param {string} sancaoTipo - Type of sanction
 * @param {number} diasCumprimento - Number of days (only for RETIRADA and ATIVIDADE_OE)
 * @returns {number} Variation in comportamento
 */
export function calculateSancaoVariation(sancaoTipo, diasCumprimento = 1) {
    const baseImpact = SANCAO_IMPACT[sancaoTipo] || 0;

    // For RETIRADA, multiply by days (capped at MAX_RETIRADA_DIAS)
    if (sancaoTipo === 'RETIRADA') {
        const dias = Math.min(diasCumprimento, MAX_RETIRADA_DIAS);
        return baseImpact * dias;
    }

    // For other sanctions, return base impact
    return baseImpact;
}

/**
 * Calculate bonus for days without sanction
 * @param {number} diasSemSancao - Days without any sanction
 * @returns {number} Bonus value
 */
export function calculateBonus(diasSemSancao) {
    if (diasSemSancao <= 0) return 0;

    // Calculate how many complete 90-day periods
    const periodosCompletos = Math.floor(diasSemSancao / BONUS_PERIOD_DAYS);

    // Days within current period
    const diasNoPeriodoAtual = diasSemSancao % BONUS_PERIOD_DAYS;

    // Bonus for complete periods (90 days * 0.01 = 0.9 per period)
    const bonusPeriodosCompletos = periodosCompletos * BONUS_PERIOD_DAYS * BONUS_PER_DAY;

    // Bonus for current period
    const bonusPeriodoAtual = diasNoPeriodoAtual * BONUS_PER_DAY;

    return bonusPeriodosCompletos + bonusPeriodoAtual;
}

/**
 * Get all sanctions for a student
 * @param {string} studentNumber 
 * @returns {Promise<Array>}
 */
export async function getStudentSancoes(studentNumber) {
    const q = query(
        collection(db, 'fatosObservados'),
        where('studentNumbers', 'array-contains', parseInt(studentNumber)),
        where('sancaoDisciplinar', '!=', null),
        orderBy('dataFato', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })).filter(fo => fo.sancaoDisciplinar && fo.sancaoDisciplinar !== 'JUSTIFICADO');
}

/**
 * Calculate current comportamento for a student
 * @param {string} studentNumber 
 * @param {string} startDate - Period start date (YYYY-MM-DD)
 * @param {string} endDate - Period end date (YYYY-MM-DD)
 * @returns {Promise<Object>}
 */
export async function calculateComportamento(studentNumber, startDate, endDate) {
    const sancoes = await getStudentSancoes(studentNumber);

    let notaInicial = 10.0;
    let totalVariacao = 0;
    const detalhes = [];

    // Filter sanctions within period and calculate impact
    const sancoesNoPeriodo = sancoes.filter(fo => {
        const dataFato = fo.dataFato;
        return dataFato >= startDate && dataFato <= endDate;
    });

    // Calculate sanction impacts
    for (const sancao of sancoesNoPeriodo) {
        const dias = sancao.quantidadeDias || 1;
        const variacao = calculateSancaoVariation(sancao.sancaoDisciplinar, dias);
        totalVariacao += variacao;

        detalhes.push({
            tipo: sancao.sancaoDisciplinar,
            dataFato: sancao.dataFato,
            dias,
            variacao,
            numeroFO: sancao.numeroFO || sancao.id
        });
    }

    // Calculate bonus for days without sanction
    const ultimaSancaoDate = sancoesNoPeriodo.length > 0
        ? new Date(sancoesNoPeriodo[sancoesNoPeriodo.length - 1].dataFato)
        : new Date(startDate);

    const hoje = new Date(endDate);
    const diasSemSancao = Math.floor((hoje - ultimaSancaoDate) / (1000 * 60 * 60 * 24));

    const bonus = calculateBonus(diasSemSancao);

    // Calculate final nota
    let notaFinal = notaInicial + totalVariacao + bonus;
    notaFinal = Math.max(0, Math.min(10, notaFinal)); // Clamp between 0 and 10

    return {
        studentNumber,
        periodo: { inicio: startDate, fim: endDate },
        notaInicial,
        sancoes: detalhes,
        totalVariacaoSancoes: totalVariacao,
        diasSemSancao,
        bonus,
        notaFinal: parseFloat(notaFinal.toFixed(2)),
        calculadoEm: new Date().toISOString()
    };
}

/**
 * Format comportamento variation for display
 * @param {number} variacao 
 * @returns {string}
 */
export function formatVariacao(variacao) {
    if (variacao === 0) return '0.0';
    const sign = variacao > 0 ? '+' : '';
    return `${sign}${variacao.toFixed(1)}`;
}

/**
 * Get comportamento color based on value
 * @param {number} nota 
 * @returns {string} CSS color variable
 */
export function getComportamentoColor(nota) {
    if (nota >= 9) return 'var(--color-success-500)';
    if (nota >= 7) return 'var(--color-warning-500)';
    if (nota >= 5) return 'var(--color-warning-600)';
    return 'var(--color-danger-500)';
}

/**
 * Get comportamento classification
 * @param {number} nota 
 * @returns {string}
 */
export function getComportamentoClassificacao(nota) {
    if (nota >= 9.5) return 'Excepcional';
    if (nota >= 8.5) return 'Ótimo';
    if (nota >= 7.0) return 'Bom';
    if (nota >= 5.0) return 'Regular';
    if (nota >= 3.0) return 'Insuficiente';
    return 'Mau';
}
