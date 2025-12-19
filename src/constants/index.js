// Constants - Padronized variables for the CMB system
// Gestão Centralizada FO - CMB

/**
 * FO Status - Fluxo do Fato Observado
 */
export const FO_STATUS = {
    PENDENTE: 'pendente',
    ADVERTENCIA: 'advertencia',
    REPREENSAO: 'repreensao',
    ATIVIDADE_OE: 'atividade_oe',
    RETIRADA: 'retirada',
    CONSOLIDAR: 'consolidar',
    CONCLUIR: 'concluir',
    ENCERRADO: 'encerrado',
    GLPI: 'glpi'
};

/**
 * FO Status Labels for display
 */
export const FO_STATUS_LABELS = {
    [FO_STATUS.PENDENTE]: 'Pendente',
    [FO_STATUS.ADVERTENCIA]: 'Advertência',
    [FO_STATUS.REPREENSAO]: 'Repreensão',
    [FO_STATUS.ATIVIDADE_OE]: 'AOE',
    [FO_STATUS.RETIRADA]: 'Retirada',
    [FO_STATUS.CONSOLIDAR]: 'Consolidar',
    [FO_STATUS.CONCLUIR]: 'Concluir',
    [FO_STATUS.ENCERRADO]: 'Encerrado',
    [FO_STATUS.GLPI]: 'GLPI'
};

/**
 * FO Status Colors for badges
 */
export const FO_STATUS_COLORS = {
    [FO_STATUS.PENDENTE]: 'warning',
    [FO_STATUS.ADVERTENCIA]: 'danger',
    [FO_STATUS.REPREENSAO]: 'danger',
    [FO_STATUS.ATIVIDADE_OE]: 'primary',
    [FO_STATUS.RETIRADA]: 'danger',
    [FO_STATUS.CONSOLIDAR]: 'primary',
    [FO_STATUS.CONCLUIR]: 'success',
    [FO_STATUS.ENCERRADO]: 'neutral',
    [FO_STATUS.GLPI]: 'info'
};

/**
 * Tipos de Sanção Disciplinar
 */
export const SANCAO_DISCIPLINAR = {
    JUSTIFICADO: 'Justificado',
    ADVERTENCIA: 'Advertência',
    REPREENSAO: 'Repreensão',
    ATIVIDADE_OE: 'AOE',
    RETIRADA: 'Retirada'
};

/**
 * Tipos de Fato Observado
 */
export const TIPO_FATO = {
    POSITIVO: 'positivo',
    NEGATIVO: 'negativo',
    NEUTRO: 'neutro'
};

export const TIPO_FATO_LABELS = {
    [TIPO_FATO.POSITIVO]: 'Positivo',
    [TIPO_FATO.NEGATIVO]: 'Negativo',
    [TIPO_FATO.NEUTRO]: 'Neutro'
};

export const TIPO_FATO_COLORS = {
    [TIPO_FATO.POSITIVO]: 'success',
    [TIPO_FATO.NEGATIVO]: 'danger',
    [TIPO_FATO.NEUTRO]: 'primary'
};

/**
 * Companhias (Anos Escolares)
 */
export const COMPANIES = {
    '6cia': '6cia',
    '7cia': '7cia',
    '8cia': '8cia',
    '9cia': '9cia',
    '1cia': '1cia',
    '2cia': '2cia',
    '3cia': '3cia'
};

export const COMPANY_NAMES = {
    '6cia': '6ª Companhia (6º Ano)',
    '7cia': '7ª Companhia (7º Ano)',
    '8cia': '8ª Companhia (8º Ano)',
    '9cia': '9ª Companhia (9º Ano)',
    '1cia': '1ª Companhia (1º Ano EM)',
    '2cia': '2ª Companhia (2º Ano EM)',
    '3cia': '3ª Companhia (3º Ano EM)'
};

export const COMPANY_SHORT_NAMES = {
    '6cia': '6ª Cia',
    '7cia': '7ª Cia',
    '8cia': '8ª Cia',
    '9cia': '9ª Cia',
    '1cia': '1ª Cia',
    '2cia': '2ª Cia',
    '3cia': '3ª Cia'
};

/**
 * Mapeamento Turma -> Companhia
 */
export const TURMA_TO_COMPANY = {
    '6': '6cia',
    '7': '7cia',
    '8': '8cia',
    '9': '9cia',
    '1': '1cia',
    '2': '2cia',
    '3': '3cia'
};

/**
 * Rotas da Aplicação
 */
export const ROUTES = {
    INICIAL: 'inicial',
    ADVERTENCIAS: 'advertencias',
    REPREENSOES: 'repreensoes',
    ATIVIDADES_OE: 'atividades-oe',
    RETIRADAS: 'retiradas',
    CONSOLIDAR: 'consolidar',
    CONCLUIR: 'concluir',
    ENCERRADOS: 'encerrados',
    GLPI: 'glpi',
    COMPORTAMENTO: 'comportamento',
    NOTAS_ADITAMENTO: 'notas-aditamento',
    PROCESSO_DISCIPLINAR: 'processo-disciplinar',
    CONFIGURACOES: 'configuracoes',
    DADOS_ALUNOS: 'dados-alunos',
    AUDITORIA: 'auditoria',
    ESTATISTICAS: 'estatisticas',
    FALTAS_ESCOLARES: 'faltas-escolares',
    ADMIN: 'admin'
};

/**
 * Títulos das Páginas
 */
export const PAGE_TITLES = {
    [ROUTES.INICIAL]: 'Inicial',
    [ROUTES.ADVERTENCIAS]: 'Advertências',
    [ROUTES.REPREENSOES]: 'Repreensões',
    [ROUTES.ATIVIDADES_OE]: 'Atividades de Orientação Educacional',
    [ROUTES.RETIRADAS]: 'Retiradas',
    [ROUTES.CONSOLIDAR]: 'Consolidar',
    [ROUTES.CONCLUIR]: 'Concluir',
    [ROUTES.ENCERRADOS]: 'Encerrados',
    [ROUTES.GLPI]: 'GLPI',
    [ROUTES.COMPORTAMENTO]: 'Comportamento',
    [ROUTES.NOTAS_ADITAMENTO]: 'Notas para Aditamento',
    [ROUTES.PROCESSO_DISCIPLINAR]: 'Processo Disciplinar',
    [ROUTES.CONFIGURACOES]: 'Configurações',
    [ROUTES.DADOS_ALUNOS]: 'Dados dos Alunos',
    [ROUTES.AUDITORIA]: 'Auditoria',
    [ROUTES.ESTATISTICAS]: 'Estatísticas',
    [ROUTES.FALTAS_ESCOLARES]: 'Faltas Escolares',
    [ROUTES.ADMIN]: 'Administração'
};

/**
 * Coleções do Firestore
 */
export const COLLECTIONS = {
    USERS: 'users',
    STUDENTS: 'students',
    FATOS_OBSERVADOS: 'fatosObservados',
    AUDIT_LOG: 'auditLog',
    FALTAS: 'faltasEscolares'
};

/**
 * Tempos de Aula (para controle de faltas)
 */
export const TEMPOS_AULA = {
    FORM: { key: 'form', label: 'Formatura' },
    T1: { key: 't1', label: '1º Tempo' },
    T2: { key: 't2', label: '2º Tempo' },
    T3: { key: 't3', label: '3º Tempo' },
    T4: { key: 't4', label: '4º Tempo' },
    T5: { key: 't5', label: '5º Tempo' },
    T6: { key: 't6', label: '6º Tempo' },
    T7: { key: 't7', label: '7º Tempo' }
};

/**
 * Papéis de Usuário
 */
export const USER_ROLES = {
    ADMIN: 'admin',
    COMANDO_CA: 'comandoCA',
    COMMANDER: 'commander',
    SERGEANT: 'sergeant'
};

/**
 * WhatsApp URL base
 */
export const WHATSAPP_BASE_URL = 'https://wa.me/55';

/**
 * Gera link do WhatsApp com mensagem
 * @param {string} phone - Número do telefone (apenas números)
 * @param {string} message - Mensagem opcional
 * @returns {string}
 */
export function getWhatsAppLink(phone, message = '') {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `${WHATSAPP_BASE_URL}${cleanPhone}${message ? `?text=${encodedMessage}` : ''}`;
}

/**
 * Formata telefone para exibição
 * @param {string} phone 
 * @returns {string}
 */
export function formatPhone(phone) {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    return phone;
}

/**
 * Formata data para exibição (DD/MM/YYYY)
 * @param {string} dateStr 
 * @returns {string}
 */
export function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}
