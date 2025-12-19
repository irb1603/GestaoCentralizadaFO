// Email Templates - Notificação de Sanções Disciplinares
// Gestão Centralizada FO - CMB

import { formatDate, COMPANY_NAMES } from '../constants/index.js';

/**
 * Get company name for email signature
 * @param {string} companyKey 
 * @returns {string}
 */
function getCompanySignature(companyKey) {
    const signatures = {
        '6cia': '6ª Companhia de Alunos',
        '7cia': '7ª Companhia de Alunos',
        '8cia': '8ª Companhia de Alunos',
        '9cia': '9ª Companhia de Alunos',
        '1cia': '1ª Companhia de Alunos',
        '2cia': '2ª Companhia de Alunos',
        '3cia': '3ª Companhia de Alunos'
    };
    return signatures[companyKey] || '2ª Companhia de Alunos';
}

/**
 * Generate email subject based on sanction type
 * @param {string} sancaoTipo 
 * @param {string} studentNumber 
 * @returns {string}
 */
export function getEmailSubject(sancaoTipo, studentNumber) {
    const subjectMap = {
        'JUSTIFICADO': `Arquivamento de FO - Justificativa Aceita - Aluno ${studentNumber}`,
        'ADVERTENCIA': `Notificação de Sanção - Advertência - Aluno ${studentNumber}`,
        'REPREENSAO': `Notificação de Sanção - Repreensão - Aluno ${studentNumber}`,
        'ATIVIDADE_OE': `Notificação de Sanção - Atividade de Orientação Educacional - Aluno ${studentNumber}`,
        'RETIRADA': `Notificação de Sanção - Retirada - Aluno ${studentNumber}`
    };
    return subjectMap[sancaoTipo] || `Notificação de Sanção - Aluno ${studentNumber}`;
}

/**
 * Generate email body for JUSTIFICADO
 */
function getJustificadoTemplate(fo, student, company) {
    return `Sr(a) Responsável,

Informamos que após análise da justificativa apresentada pelo aluno(a) Nr ${student.numero}, ${student.nome}, turma ${student.turma}, referente ao Fato Observado Nº ${fo.numeroFO || fo.id}, do dia ${formatDate(fo.dataFato)}, a Companhia de Alunos considerou a justificativa procedente.

O caso foi arquivado sem aplicação de sanção disciplinar.

Atenciosamente,
${getCompanySignature(company)}`;
}

/**
 * Generate email body for ADVERTÊNCIA
 */
function getAdvertenciaTemplate(fo, student, company, comportamento = {}) {
    const notaAtual = comportamento.notaAtual || 10.0;
    const novaNota = notaAtual; // Advertência não altera nota
    const variacao = 0.0;

    return `Sr(a) Responsável,

Informamos que foi aplicada a sanção de Advertência ao aluno(a) Nr ${student.numero}, ${student.nome}, turma ${student.turma}, após transcorrido o prazo para apresentação de defesa e alegações do responsável e aluno junto ao SINCOMIL, e também análise do fato por parte da Companhia de Aluno em solução ao Fato Observado Nº ${fo.numeroFO || fo.id}, do dia ${formatDate(fo.dataFato)}.

A Notificação inicial foi enviada ao email do responsável cadastrado junto ao SINCOMIL e, também, através do Termo de Ciência entregue ao aluno.

NOTA DE COMPORTAMENTO:
O aluno(a) possui atualmente nota de comportamento de ${notaAtual.toFixed(1)}. Com a aplicação desta sanção disciplinar, a nota de comportamento será atualizada para ${novaNota.toFixed(1)} (variação de ${variacao.toFixed(1)}).

Atenciosamente,
${getCompanySignature(company)}`;
}

/**
 * Generate email body for REPREENSÃO
 */
function getRepreensaoTemplate(fo, student, company, comportamento = {}) {
    const notaAtual = comportamento.notaAtual || 10.0;
    const variacao = -0.3;
    const novaNota = Math.max(0, notaAtual + variacao);

    return `Sr(a) Responsável,

Informamos que foi aplicada a sanção de Repreensão ao aluno(a) Nr ${student.numero}, ${student.nome}, turma ${student.turma}, após transcorrido o prazo para apresentação de defesa e alegações do responsável e aluno junto ao SINCOMIL, e também análise do fato por parte da Companhia de Aluno em solução ao Fato Observado Nº ${fo.numeroFO || fo.id}, do dia ${formatDate(fo.dataFato)}.

NOTA DE COMPORTAMENTO:
O aluno(a) possui atualmente nota de comportamento de ${notaAtual.toFixed(1)}. Com a aplicação desta sanção disciplinar, a nota de comportamento será atualizada para ${novaNota.toFixed(1)} (variação de ${variacao.toFixed(1)}).

A Notificação inicial foi enviada ao email do responsável cadastrado junto ao SINCOMIL e, também, através do Termo de Ciência entregue ao aluno.

Atenciosamente,
${getCompanySignature(company)}`;
}

/**
 * Generate email body for ATIVIDADE DE ORIENTAÇÃO EDUCACIONAL
 */
function getAtividadeOETemplate(fo, student, company, comportamento = {}) {
    const notaAtual = comportamento.notaAtual || 10.0;
    const variacao = -0.5;
    const novaNota = Math.max(0, notaAtual + variacao);
    const qtdDias = fo.quantidadeDias || 1;
    const dataCumprimento = fo.dataCumprimento ? formatDate(fo.dataCumprimento) : 'A definir';

    return `Sr(a) Responsável,

Informamos que foi aplicada a sanção de Atividade de Orientação Educacional ao aluno(a) Nr ${student.numero}, ${student.nome}, turma ${student.turma}, após transcorrido o prazo para apresentação de defesa e alegações do responsável e aluno junto ao SINCOMIL, e também a análise do fato por parte da Companhia de Aluno em solução ao Fato Observado Nº ${fo.numeroFO || fo.id}, do dia ${formatDate(fo.dataFato)}.

A Notificação inicial foi enviada ao email do responsável cadastrado junto ao SINCOMIL e, também, através do Termo de Ciência entregue ao aluno.

NOTA DE COMPORTAMENTO:
O aluno(a) possui atualmente nota de comportamento de ${notaAtual.toFixed(1)}. Com a aplicação desta sanção disciplinar, a nota de comportamento será atualizada para ${novaNota.toFixed(1)} (variação de ${variacao.toFixed(1)}).

O(A) aluno(a) cumprirá a Sanção Disciplinar de ${String(qtdDias).padStart(2, '0')} dia(s) de Atividade de Orientação Educacional no(s) dia(s) ${dataCumprimento}.

Atenciosamente,
${getCompanySignature(company)}`;
}

/**
 * Generate email body for RETIRADA
 */
function getRetiradaTemplate(fo, student, company, comportamento = {}) {
    const notaAtual = comportamento.notaAtual || 10.0;
    const qtdDias = Math.min(fo.quantidadeDias || 1, 6); // Máximo 6 dias
    const variacaoPorDia = -0.8;
    const variacao = variacaoPorDia * qtdDias; // -0.8 * dias
    const novaNota = Math.max(0, notaAtual + variacao);
    const dataCumprimento = fo.dataCumprimento ? formatDate(fo.dataCumprimento) : 'A definir';

    return `Sr(a) Responsável,

Informamos que foi aplicada a sanção de Retirada ao aluno(a) Nr ${student.numero}, ${student.nome}, turma ${student.turma}, após transcorrido o prazo para apresentação de defesa e alegações do responsável e aluno junto ao SINCOMIL, e também a análise do fato por parte da Companhia de Aluno em solução ao Fato Observado Nº ${fo.numeroFO || fo.id}, do dia ${formatDate(fo.dataFato)}.

A Notificação inicial foi enviada ao email do responsável cadastrado junto ao SINCOMIL e, também, através do Termo de Ciência entregue ao aluno.

NOTA DE COMPORTAMENTO:
O aluno(a) possui atualmente nota de comportamento de ${notaAtual.toFixed(1)}. Com a aplicação desta sanção disciplinar, a nota de comportamento será atualizada para ${novaNota.toFixed(1)} (variação de ${variacao.toFixed(1)}).

O(A) aluno(a) cumprirá a Sanção Disciplinar de ${String(qtdDias).padStart(2, '0')} dia(s) de Retirada no(s) dia(s) ${dataCumprimento}.

Atenciosamente,
${getCompanySignature(company)}`;
}

/**
 * Generate email body based on sanction type
 * @param {string} sancaoTipo - JUSTIFICADO, ADVERTENCIA, REPREENSAO, ATIVIDADE_OE, RETIRADA
 * @param {Object} fo - Fato Observado data
 * @param {Object} student - Student data (numero, nome, turma)
 * @param {string} company - Company key (6cia, 7cia, etc.)
 * @param {Object} comportamento - Optional comportamento data { notaAtual }
 * @returns {string} Email body text
 */
export function generateEmailBody(sancaoTipo, fo, student, company, comportamento = {}) {
    const studentData = {
        numero: student.numero || fo.studentNumbers?.[0] || '-',
        nome: student.nome || fo.studentInfo?.[0]?.nome || '-',
        turma: student.turma || fo.studentInfo?.[0]?.turma || '-'
    };

    switch (sancaoTipo) {
        case 'JUSTIFICADO':
            return getJustificadoTemplate(fo, studentData, company);
        case 'ADVERTENCIA':
            return getAdvertenciaTemplate(fo, studentData, company, comportamento);
        case 'REPREENSAO':
            return getRepreensaoTemplate(fo, studentData, company, comportamento);
        case 'ATIVIDADE_OE':
            return getAtividadeOETemplate(fo, studentData, company, comportamento);
        case 'RETIRADA':
            return getRetiradaTemplate(fo, studentData, company, comportamento);
        default:
            return getAdvertenciaTemplate(fo, studentData, company, comportamento);
    }
}

/**
 * Get variation in comportamento note based on sanction type
 * @param {string} sancaoTipo 
 * @returns {number}
 */
export function getComportamentoVariation(sancaoTipo) {
    const variations = {
        'JUSTIFICADO': 0,
        'ADVERTENCIA': 0,
        'REPREENSAO': -0.3,
        'ATIVIDADE_OE': -0.5,
        'RETIRADA': -0.8
    };
    return variations[sancaoTipo] || 0;
}

/**
 * Email configuration by company
 */
export const EMAIL_CONFIGS = {
    '6cia': { email: '6ciaalcmb@gmail.com', name: '6ª Cia Alu' },
    '7cia': { email: '7ciaalcmb@gmail.com', name: '7ª Cia Alu' },
    '8cia': { email: '8ciaalcmb@gmail.com', name: '8ª Cia Alu' },
    '9cia': { email: '9ciaalcmb@gmail.com', name: '9ª Cia Alu' },
    '1cia': { email: '1ciaalcmb@gmail.com', name: '1ª Cia Alu' },
    '2cia': { email: '2ciaalcmb@gmail.com', name: '2ª Cia Alu' },
    '3cia': { email: '3ciaalcmb@gmail.com', name: '3ª Cia Alu' }
};
