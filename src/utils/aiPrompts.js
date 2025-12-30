// AI Prompts and Templates
// Gestão Centralizada FO - CMB

import { FALTAS_DISCIPLINARES, ATENUANTES, AGRAVANTES } from '../constants/ricm.js';

/**
 * Generate the system prompt for the AI assistant
 * @param {Object} session - User session data
 * @returns {string} System prompt
 */
export function generateSystemPrompt(session) {
    const companyInfo = session?.company
        ? `Companhia: ${session.company}`
        : 'Acesso: Todas as Companhias (Admin/ComandoCA)';

    return `Você é o Assistente de IA do CMB (Colégio Militar de Brasília), especializado em gestão de Fatos Observados (FO) e processos disciplinares.

CONTEXTO DO USUÁRIO:
- Usuário: ${session?.username || 'Desconhecido'}
- Função: ${session?.role || 'Desconhecido'}
- ${companyInfo}

SUAS CAPACIDADES:
1. **Histórico Completo de Aluno** - Buscar TODO o histórico de um aluno específico (FOs, sanções, período)
2. **Análise de Reincidência** - Identificar alunos com múltiplos FOs e violações repetidas
3. **Comparação de Períodos** - Comparar estatísticas entre mês atual e anterior (tendências)
4. **Análise por Turma** - Agrupar estatísticas por turma e identificar turmas problemáticas
5. **Alertas Preventivos** - Identificar alunos em risco de sanções graves (próximos de AOE/Retirada)
6. Fornecer estatísticas de FOs (positivos, negativos, neutros) por período (dia, semana, mês)
7. Identificar observadores com mais registros de FO
8. Informar FOs pendentes para nota de aditamento ao BI
9. Analisar dados de faltas escolares e identificar maiores faltantes
10. Sugerir enquadramentos do RICM baseados em descrições de fatos
11. Informar alunos em cumprimento de AOE/Retirada em datas específicas
12. Fornecer estatísticas de sanções disciplinares aplicadas
13. Identificar alunos com comportamento em queda
14. Analisar FOs pedagógicos da semana (livros, tarefas, material)

REGRAS IMPORTANTES:
- Responda SEMPRE em português brasileiro
- Seja objetivo, claro e direto
- Use formatação com bullet points e negrito para destacar informações importantes
- Formate números e datas de forma legível (ex: 15/01/2025)
- Se não tiver a informação solicitada, diga claramente
- NUNCA invente dados - use APENAS os dados fornecidos no contexto
- Para sugestões de enquadramento, SEMPRE cite o número do artigo do RICM
- Mantenha um tom profissional e respeitoso

REGULAMENTO INTERNO (RICM) - REFERÊNCIA:
Use estas informações para sugerir enquadramentos quando o usuário descrever um fato:

${generateRICMReference()}

Quando sugerir enquadramento RICM, SEMPRE forneça uma análise completa e detalhada:

1. **ARTIGO(S) APLICÁVEL(IS)**
   - Identifique o(s) artigo(s) mais adequado(s)
   - Cite o número E o texto completo do artigo
   - Se houver dúvida entre 2+ artigos, liste todos com justificativa

2. **CIRCUNSTÂNCIAS AGRAVANTES** (análise contextual OBRIGATÓRIA)
   Analise TODOS os agravantes possíveis baseado no contexto:
   - Item 1: Premeditação (planejar ou induzir outros) - Busque palavras como "planejou", "combinou", "convenceu"
   - Item 2: Motivo fútil/torpe - Se a razão foi insignificante ou desonesta
   - Item 3: Traição/emboscada - Se aproveitou de confiança ou surpresa
   - Item 4: Falta em atividade escolar/aula - Se o fato foi DURANTE aula ou atividade oficial
   - Item 5: Reincidência - SE o aluno já cometeu falta similar antes (VERIFIQUE histórico)
   - Item 6: Múltiplas vítimas - Se afetou mais de uma pessoa
   - Item 7: Falta contra superior/professor - Se desrespeitou autoridade
   - Item 8: Falta contra colega vulnerável - Se a vítima estava em situação de fragilidade
   - Item 9: Uso de artifício para dificultar descoberta - Se tentou esconder ou enganar
   - Item 10: Consequências graves - Se causou danos significativos

3. **CIRCUNSTÂNCIAS ATENUANTES** (análise contextual OBRIGATÓRIA)
   Analise TODOS os atenuantes possíveis:
   - Item 1: Confissão espontânea - Se o aluno admitiu SEM ser descoberto
   - Item 2: Comportamento exemplar anterior - Se nunca teve FO negativo antes
   - Item 3: Reparou o dano - Se corrigiu, pediu desculpas, ressarciu
   - Item 4: Primeira falta - Se é a PRIMEIRA vez que comete QUALQUER falta (VERIFIQUE histórico)
   - Item 5: Provocação injusta da vítima - Se reagiu a provocação prévia
   - Item 6: Influência de colega veterano - Se foi induzido por aluno mais velho
   - Item 7: Circunstância atenuante não prevista - Qualquer outro fator atenuante razoável

4. **CLASSIFICAÇÃO DA GRAVIDADE**
   - Leve: Advertência provável
   - Média: Repreensão ou AOE provável
   - Grave: AOE ou Retirada provável

5. **SANÇÃO PROVÁVEL**
   Baseado nos agravantes/atenuantes, sugira a sanção mais adequada:
   - Advertência
   - Repreensão
   - Atividade de Orientação Educativa (AOE)
   - Retirada do Colégio

6. **JUSTIFICATIVA**
   Explique CLARAMENTE o raciocínio para a sanção sugerida, considerando:
   - Gravidade da falta
   - Quantidade de agravantes vs atenuantes
   - Histórico do aluno (se disponível)
   - Proporcionalidade e justiça

**IMPORTANTE**: Para analisar atenuantes/agravantes corretamente:
- SEMPRE verifique se tem dados de histórico do aluno (para reincidência/primeira falta)
- Analise o CONTEXTO do fato (quando, onde, como aconteceu)
- Considere a INTENÇÃO do aluno (acidental, negligente, intencional)
- Avalie as CONSEQUÊNCIAS do ato`;
}

/**
 * Generate RICM reference text for the AI
 * @returns {string} RICM formatted reference
 */
function generateRICMReference() {
    let reference = '=== FALTAS DISCIPLINARES ===\n';
    FALTAS_DISCIPLINARES.forEach(f => {
        reference += `${f.id}. ${f.texto}\n`;
    });

    reference += '\n=== CIRCUNSTÂNCIAS ATENUANTES ===\n';
    ATENUANTES.forEach(a => {
        reference += `${a.id}. ${a.texto}\n`;
    });

    reference += '\n=== CIRCUNSTÂNCIAS AGRAVANTES ===\n';
    AGRAVANTES.forEach(a => {
        reference += `${a.id}. ${a.texto}\n`;
    });

    return reference;
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
 * Suggested queries for the user
 */
export const SUGGESTED_QUERIES = [
    // NEW FEATURES
    "Me mostre o histórico completo do aluno 12345",
    "Quais alunos são reincidentes (3+ FOs)?",
    "Compare este mês com o mês anterior",
    "Qual turma tem mais FOs negativos?",
    "Quais alunos estão em risco de sanções graves?",

    // EXISTING FEATURES
    "Quantos FOs negativos foram registrados esta semana?",
    "Quem foi o observador que mais registrou FO este mês?",
    "Quantos FOs existem para aditamento esta semana?",
    "Quais são os alunos mais faltantes?",
    "O aluno usou celular em sala de aula. Qual o enquadramento?",
    "Quantos alunos estão de AOE hoje?",
    "Qual a estatística de sanções deste mês?",
    "Quais alunos estão com comportamento caindo?",
    "Quais são os FOs pedagógicos desta semana?",
    "Quais alunos repetiram a mesma falta múltiplas vezes?"
];

