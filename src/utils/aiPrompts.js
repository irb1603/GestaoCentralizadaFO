// AI Prompts and Templates
// Gestão Centralizada FO - CMB

/**
 * Generate the system prompt for the AI assistant
 * @param {Object} session - User session data
 * @returns {string} System prompt
 */
export function generateSystemPrompt(session) {
    const companyInfo = session?.company
        ? `Companhia: ${session.company}`
        : 'Acesso: Todas as Companhias (Admin/ComandoCA)';

    const roleLabel = {
        'admin': 'Administrador do Sistema',
        'comandoCA': 'Comando do Corpo de Alunos',
        'commander': 'Comandante de Companhia',
        'sergeant': 'Sargenteante'
    }[session?.role] || session?.role;

    return `Você é o Assistente de IA do Sistema de Gestão de FOs do Colégio Militar de Brasília (CMB).

CONTEXTO:
- Usuário: ${session?.username || 'Desconhecido'} (${roleLabel})
- ${companyInfo}
- Data atual: ${new Date().toLocaleDateString('pt-BR')}

SUAS FUNÇÕES PRINCIPAIS:
1. Fornecer estatísticas e análises de Fatos Observados (FOs)
2. Buscar FOs por descrição, data, aluno ou turma
3. Identificar padrões e alunos em situação de risco
4. Comparar períodos e companhias
5. Auxiliar na gestão disciplinar com dados precisos

CAPACIDADES DE BUSCA:
- Busca por texto: "FOs que mencionam atraso", "busque por uniforme"
- Busca por data: "FOs de 15/01", "FOs da semana passada"
- Busca por aluno: "FOs do aluno Silva", "histórico do 12345"
- Busca por turma: "análise da turma 1A", "problemas na turma 2B"
- Comparações: "compare com mês anterior", "compare companhias"

FORMATO DE RESPOSTA:
- Use **negrito** para destacar informações importantes
- Organize dados em listas ou tabelas quando apropriado
- Inclua sempre um RESUMO no início para respostas longas
- Para estatísticas, apresente de forma visual:

  Exemplo:
  **Resumo do Período:**
  - FOs Negativos: 25 (-3 vs semana anterior)
  - FOs Positivos: 12 (+5 vs semana anterior)
  - Alunos em risco: 3

REGRAS OBRIGATÓRIAS:
- NUNCA invente dados - use APENAS os dados fornecidos
- Se não houver dados, diga claramente "Não há dados disponíveis para..."
- Seja conciso mas completo
- Respostas em português brasileiro

NOTA: O enquadramento RICM está disponível diretamente no card do FO na página inicial.`;
}

/**
 * Generate context data prompt based on query type
 * @param {string} queryType - Type of query
 * @param {Object} data - Relevant data
 * @returns {string} Context string
 */
export function generateContextPrompt(queryType, data) {
    switch (queryType) {
        case 'fo_stats':
            return formatFOStats(data);
        case 'observers':
            return formatObserverStats(data);
        case 'aditamento':
            return formatAditamentoStats(data);
        case 'faltas':
            return formatFaltasStats(data);
        case 'aoe_retirada':
            return formatAOERetiradaStats(data);
        case 'sancoes':
            return formatSancoesStats(data);
        case 'comportamento':
            return formatComportamentoStats(data);
        default:
            return JSON.stringify(data, null, 2);
    }
}

function formatFOStats(data) {
    return `ESTATÍSTICAS DE FATOS OBSERVADOS:
- Período: ${data.periodo || 'Não especificado'}
- FOs Positivos: ${data.positivos || 0}
- FOs Negativos: ${data.negativos || 0}
- FOs Neutros: ${data.neutros || 0}
- Total: ${data.total || 0}
${data.detalhes ? `\nDetalhes:\n${data.detalhes}` : ''}`;
}

function formatObserverStats(data) {
    let text = `RANKING DE OBSERVADORES:\nPeríodo: ${data.periodo || 'Não especificado'}\n\n`;
    if (data.ranking && Array.isArray(data.ranking)) {
        data.ranking.forEach((obs, i) => {
            text += `${i + 1}. ${obs.nome}: ${obs.count} FOs registrados\n`;
        });
    }
    return text;
}

function formatAditamentoStats(data) {
    return `FOs PARA ADITAMENTO:
- Semana atual: ${data.semana || 0} FOs
- Por sanção:
  - Repreensão: ${data.repreensao || 0}
  - AOE: ${data.aoe || 0}
  - Retirada: ${data.retirada || 0}`;
}

function formatFaltasStats(data) {
    let text = `ESTATÍSTICAS DE FALTAS ESCOLARES:\n`;
    text += `- Total de faltas no período: ${data.total || 0}\n`;
    text += `- Média por aluno: ${data.media || 0}\n\n`;

    if (data.maioresFaltantes && Array.isArray(data.maioresFaltantes)) {
        text += `MAIORES FALTANTES:\n`;
        data.maioresFaltantes.forEach((aluno, i) => {
            text += `${i + 1}. Nº ${aluno.numero} - ${aluno.nome}: ${aluno.faltas} faltas\n`;
        });
    }
    return text;
}

function formatAOERetiradaStats(data) {
    let text = `ALUNOS EM CUMPRIMENTO DE SANÇÃO:\nData: ${data.data || 'Não especificada'}\n\n`;

    if (data.aoe && Array.isArray(data.aoe)) {
        text += `EM AOE (${data.aoe.length}):\n`;
        data.aoe.forEach(a => {
            text += `- Nº ${a.numero} - ${a.nome} (Turma ${a.turma})\n`;
        });
    }

    if (data.retirada && Array.isArray(data.retirada)) {
        text += `\nEM RETIRADA (${data.retirada.length}):\n`;
        data.retirada.forEach(a => {
            text += `- Nº ${a.numero} - ${a.nome} (Turma ${a.turma})\n`;
        });
    }
    return text;
}

function formatSancoesStats(data) {
    return `ESTATÍSTICAS DE SANÇÕES APLICADAS:
Período: ${data.periodo || 'Não especificado'}

- Advertências: ${data.advertencia || 0}
- Repreensões: ${data.repreensao || 0}
- AOE: ${data.aoe || 0}
- Retiradas: ${data.retirada || 0}
- Justificados: ${data.justificado || 0}
- Total: ${data.total || 0}`;
}

function formatComportamentoStats(data) {
    let text = `ALUNOS COM COMPORTAMENTO EM QUEDA:\n`;

    if (data.alunos && Array.isArray(data.alunos)) {
        data.alunos.forEach((a, i) => {
            text += `${i + 1}. Nº ${a.numero} - ${a.nome}\n`;
            text += `   Nota anterior: ${a.notaAnterior} → Nota atual: ${a.notaAtual}\n`;
            text += `   Variação: ${a.variacao > 0 ? '+' : ''}${a.variacao}\n\n`;
        });
    }
    return text;
}

/**
 * Suggested queries for the user - organized by category
 */
export const SUGGESTED_QUERIES = [
    // Estatísticas rápidas
    "Resumo de FOs da semana",
    "Estatísticas do mês atual",
    "Compare com o mês anterior",

    // Buscas por texto/descrição
    "FOs que mencionam atraso",
    "Busque FOs sobre uniforme",
    "FOs com referência a celular",

    // Buscas por data
    "FOs de hoje",
    "FOs da semana passada",
    "FOs de janeiro",

    // Alunos específicos
    "Histórico do aluno 12345",
    "FOs do aluno Silva",
    "Alunos em risco de sanção grave",
    "Alunos reincidentes",

    // Por turma
    "Análise da turma 1A",
    "Turmas com mais problemas",
    "Problemas pedagógicos por turma",

    // Gestão diária
    "Quem está de AOE/Retirada hoje?",
    "FOs para aditamento",
    "Ranking de observadores",

    // Comparações (para Admin/ComandoCA)
    "Compare as companhias",
    "Comportamento em queda",
    "Maiores faltantes"
];

