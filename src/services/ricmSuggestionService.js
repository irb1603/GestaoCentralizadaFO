// RICM Suggestion Service - Local Analysis (no AI dependency)
// Gestão Centralizada FO - CMB
//
// Este serviço analisa a descrição do fato observado e sugere:
// - Faltas disciplinares (Art. 13 RICM)
// - Atenuantes (Art. 14 RICM)
// - Agravantes (Art. 15 RICM)

import { db } from '../firebase/config.js';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { FALTAS_DISCIPLINARES, ATENUANTES, AGRAVANTES } from '../constants/ricm.js';

// Cache para evitar múltiplas consultas ao mesmo aluno
const studentContextCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos (aumentado para reduzir leituras)

/**
 * Keywords associadas a cada falta disciplinar
 * Estrutura: { faltaId: [keywords] }
 */
const FALTA_KEYWORDS = {
    1: ['mentira', 'mentiu', 'mentindo', 'falsa', 'falsamente', 'verdade', 'faltar à verdade', 'não disse a verdade', 'omitiu', 'enganou', 'enganar'],
    2: ['material alheio', 'livro de outro', 'caderno de colega', 'sem consentimento', 'pegou de', 'usou sem permissão', 'pertencente a outro'],
    3: ['atraso', 'atrasado', 'chegou tarde', 'faltou', 'ausente', 'não compareceu', 'chegou após', 'perdeu horário', 'não se apresentou'],
    4: ['uniforme diferente', 'uniforme errado', 'fardamento incorreto', 'fora do padrão', 'traje inadequado', 'sem uniforme correto'],
    5: ['asseio', 'higiene', 'sujo', 'desalinhado', 'má apresentação', 'cabelo fora', 'barba', 'unhas', 'desleixado', 'desarrumado'],
    6: ['trocar uniforme', 'trocou de roupa', 'local inadequado', 'vestiário', 'banheiro inadequado'],
    7: ['material desarrumado', 'dependência suja', 'bagunça', 'desorganização', 'armário desarrumado', 'mesa suja', 'lixo'],
    8: ['sem material', 'esqueceu material', 'não trouxe', 'sem livro', 'sem caderno', 'não apresentou trabalho', 'trabalho atrasado', 'não entregou', 'esqueceu o livro', 'sem tarefa'],
    9: ['descumpriu norma', 'não cumpriu', 'desobedeceu', 'violou regra', 'infringiu', 'descumprimento', 'não seguiu orientação'],
    10: ['durante aula', 'atividade estranha', 'mexendo em', 'usando celular em aula', 'distraído', 'não prestou atenção', 'conversando na aula', 'brincando na aula'],
    11: ['ausentou', 'saiu sem autorização', 'fugiu', 'evadiu', 'abandonou', 'deixou o local', 'saiu da sala'],
    12: ['representou sem autorização', 'tomou compromisso', 'falou em nome', 'comprometeu o colégio'],
    13: ['simulou doença', 'fingiu estar doente', 'alegou doença', 'fez de doente', 'esquivou-se', 'para não fazer'],
    14: ['dano material', 'estragou', 'quebrou material de', 'danificou pertence', 'rasgou', 'riscou material de colega'],
    15: ['panfleto', 'jornal proibido', 'publicação política', 'material impróprio', 'contra a moral', 'político-partidário'],
    16: ['vendendo', 'comprando', 'transação', 'negócio', 'dinheiro dentro do colégio', 'comercializando', 'vendeu', 'comprou'],
    17: ['uniforme irregular', 'peça faltando', 'RUE', 'fora do regulamento', 'sem cinto', 'sem distintivo', 'farda incompleta'],
    18: ['documento não devolvido', 'não entregou assinado', 'prazo do documento', 'comunicado não devolvido', 'autorização não entregue'],
    19: ['não denunciou', 'viu e não comunicou', 'presenciou e não relatou', 'omissão', 'não levou ao conhecimento'],
    20: ['celular', 'aparelho eletrônico', 'fone de ouvido', 'smartphone', 'tablet', 'jogo eletrônico', 'usando telefone'],
    21: ['anônimo', 'anonimato', 'não se identificou', 'carta anônima', 'mensagem anônima'],
    22: ['comportamento inadequado', 'desrespeitoso', 'desafiador', 'má educação', 'grosseria', 'falta de educação', 'respondeu mal', 'debochou'],
    23: ['inconveniente', 'perturbou', 'atrapalhou aula', 'bagunça em aula', 'tumulto', 'algazarra em aula', 'gritando'],
    24: ['objeto perigoso', 'arma', 'faca', 'canivete', 'tesoura pontiaguda', 'objeto cortante', 'estilete', 'ameaça segurança'],
    25: ['agrediu', 'agressão física', 'bateu', 'empurrou', 'chutou', 'machucou', 'lesão', 'feriu', 'agrediu moralmente', 'humilhou', 'ofendeu'],
    26: ['vandalismo', 'pichação', 'destruiu', 'depredou', 'vandalizou', 'pixou'],
    27: ['dano patrimônio', 'quebrou patrimônio', 'estragou propriedade', 'danificou União', 'estragou material do colégio'],
    28: ['droga', 'cigarro', 'álcool', 'bebida alcoólica', 'entorpecente', 'vape', 'cigarro eletrônico', 'substância ilícita', 'maconha'],
    29: ['jogo de azar', 'apostas', 'baralho', 'dado', 'jogo proibido', 'valendo dinheiro'],
    30: ['não pagou', 'dívida', 'compromisso financeiro', 'calote', 'esquivou-se de pagar'],
    31: ['lugar impróprio', 'local inadequado', 'bar', 'festa imprópria', 'estabelecimento incompatível'],
    32: ['retirou material', 'pegou sem autorização', 'levou sem permissão', 'subtraiu', 'furtou'],
    33: ['entrou sem autorização', 'saiu sem autorização', 'por local proibido', 'pulou muro', 'entrada irregular', 'saída irregular'],
    34: ['entrou em dependência', 'acessou sem permissão', 'local restrito', 'área proibida'],
    35: ['recurso desrespeitoso', 'reclamação inadequada', 'termos desrespeitosos', 'argumentos falsos', 'má-fé em recurso'],
    36: ['publicou na internet', 'postou em rede social', 'divulgou online', 'mídia social', 'WhatsApp', 'Instagram', 'Facebook', 'TikTok', 'imagem do colégio'],
    37: ['briga', 'rixa', 'luta', 'lutando', 'brigando', 'confronto físico', 'socos', 'agarrou'],
    38: ['perfil falso', 'fake', 'conta falsa', 'identidade falsa online'],
    39: ['gravou sem autorização', 'filmou dentro', 'gravação não autorizada', 'vídeo sem permissão'],
    40: ['algazarra', 'vaia', 'distúrbio', 'gritaria', 'tumulto', 'grupo fazendo barulho', 'bagunça coletiva'],
    41: ['indisciplina coletiva', 'movimento coletivo', 'impediu entrada', 'ausência coletiva', 'greve', 'boicote'],
    42: ['cópia ilegal', 'material copiado', 'direitos autorais', 'pirataria', 'plágio material'],
    43: ['cola', 'fraude', 'colou na prova', 'processo fraudulento', 'adulteração', 'copiou resposta', 'trapaceou'],
    44: ['bullying', 'ciberbullying', 'apelido pejorativo', 'xingou', 'discriminou', 'humilhação', 'constrangeu', 'intimidação', 'zoação', 'exclusão'],
    45: ['gravou sem conhecimento', 'filmou colega', 'foto sem autorização', 'imagem sem consentimento'],
    46: ['fogo de artifício', 'bomba', 'rojão', 'explosivo', 'fogos', 'bombinha', 'traque']
};

/**
 * Keywords que indicam possíveis atenuantes na descrição
 */
const ATENUANTE_KEYWORDS = {
    1: [], // Menos de 3 meses - verificar pelo banco de dados
    2: [], // Criança/adolescente - verificar idade do aluno
    3: [], // Comportamento BOM/ÓTIMO/EXCEPCIONAL - verificar histórico
    4: [], // Primeira falta - verificar histórico
    5: ['primeira vez', 'nunca tinha feito', 'não sabia', 'desconhecia', 'não tinha experiência', 'novo no colégio'],
    6: ['ajudou', 'colaborou', 'prestou serviço', 'destacou-se positivamente', 'boa ação anterior'],
    7: ['evitar mal maior', 'para proteger', 'para ajudar', 'em defesa de', 'para impedir algo pior'],
    8: ['defesa própria', 'se defendendo', 'defendeu-se', 'reagiu a agressão', 'foi provocado', 'em defesa de colega']
};

/**
 * Keywords que indicam possíveis agravantes na descrição
 */
const AGRAVANTE_KEYWORDS = {
    1: ['oficial-aluno', 'graduado', 'monitor', 'chefe de turma'],
    2: ['CFR', 'curso de formação'],
    3: [], // Comportamento REGULAR/INSUFICIENTE/MAU - verificar histórico
    4: ['durante aula', 'em aula', 'na instrução', 'em formatura', 'atividade escolar', 'durante prova'],
    5: [], // Reincidência - verificar histórico
    6: ['várias faltas', 'múltiplas infrações', 'além disso também', 'e ainda', 'simultaneamente'],
    7: ['junto com', 'em grupo', 'combinaram', 'combinado', 'em conluio', 'planejaram juntos', 'dois alunos', 'três alunos'],
    8: ['abusou da função', 'usou cargo para', 'aproveitou-se da função', 'como chefe de turma'],
    9: ['em público', 'na frente de todos', 'em forma', 'em sala de aula cheia', 'presença de tropa', 'todos viram'],
    10: ['premeditado', 'planejou', 'calculou', 'preparou-se para', 'com intenção', 'propositalmente', 'de caso pensado']
};

/**
 * Normaliza texto para comparação (remove acentos, lowercase)
 */
function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calcula score de correspondência entre descrição e keywords
 */
function calculateMatchScore(descricao, keywords) {
    const normalizedDesc = normalizeText(descricao);
    let score = 0;
    let matchedKeywords = [];

    for (const keyword of keywords) {
        const normalizedKeyword = normalizeText(keyword);
        if (normalizedDesc.includes(normalizedKeyword)) {
            // Peso maior para keywords mais longas (mais específicas)
            const weight = normalizedKeyword.split(' ').length;
            score += weight;
            matchedKeywords.push(keyword);
        }
    }

    return { score, matchedKeywords };
}

/**
 * Analisa descrição e sugere faltas disciplinares
 * @param {string} descricao - Descrição do fato observado
 * @returns {Array} Lista de faltas sugeridas com score
 */
function analyzeFaltas(descricao) {
    if (!descricao || descricao.trim() === '') return [];

    const suggestions = [];

    for (const [faltaId, keywords] of Object.entries(FALTA_KEYWORDS)) {
        const { score, matchedKeywords } = calculateMatchScore(descricao, keywords);

        if (score > 0) {
            const falta = FALTAS_DISCIPLINARES.find(f => f.id === parseInt(faltaId));
            if (falta) {
                suggestions.push({
                    id: falta.id,
                    texto: falta.texto,
                    score,
                    matchedKeywords,
                    confidence: score >= 3 ? 'alta' : score >= 2 ? 'média' : 'baixa'
                });
            }
        }
    }

    // Ordenar por score (maior primeiro) e limitar a 5
    return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
}

/**
 * Busca contexto do aluno no Firebase (otimizado com cache)
 * @param {number|string} studentNumber - Número do aluno
 * @returns {Promise<Object>} Contexto do aluno
 */
async function getStudentContext(studentNumber) {
    if (!studentNumber) return null;

    const cacheKey = String(studentNumber);
    const cached = studentContextCache.get(cacheKey);

    // Verificar cache
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log('[RICM] Using cached student context for', studentNumber);
        return cached.data;
    }

    console.log('[RICM] Fetching student context for', studentNumber);

    try {
        // Buscar dados do aluno (1 read)
        const studentDoc = await getDoc(doc(db, 'students', String(studentNumber)));
        let studentData = null;
        if (studentDoc.exists()) {
            studentData = studentDoc.data();
        }

        // Buscar todos os FOs do aluno (1 query)
        const fosQuery = query(
            collection(db, 'fatosObservados'),
            where('studentNumbers', 'array-contains', parseInt(studentNumber))
        );
        const fosSnapshot = await getDocs(fosQuery);
        const fos = fosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calcular métricas
        const now = new Date();
        const negativos = fos.filter(fo => fo.tipo === 'negativo');
        const positivos = fos.filter(fo => fo.tipo === 'positivo');

        // Verificar se há sanções ativas (cumprindo hoje)
        const today = now.toISOString().split('T')[0];
        const sancoesAtivas = fos.filter(fo => {
            const datas = fo.datasCumprimento || (fo.dataCumprimento ? [fo.dataCumprimento] : []);
            return datas.includes(today);
        });

        // Calcular tempo no CMB (baseado no primeiro FO ou data de cadastro)
        let tempoNoCMB = null;
        if (fos.length > 0) {
            const primeiroFO = fos
                .map(fo => new Date(fo.dataFato || fo.createdAt))
                .sort((a, b) => a - b)[0];
            const diffMonths = (now.getFullYear() - primeiroFO.getFullYear()) * 12 +
                               (now.getMonth() - primeiroFO.getMonth());
            tempoNoCMB = diffMonths;
        }

        // Verificar turma para determinar se é criança (6º/7º ano)
        const turma = studentData?.turma || fos[0]?.studentInfo?.[0]?.turma || '';
        const isCrianca = turma.startsWith('6') || turma.startsWith('7');

        // Contar sanções anteriores
        const sancoes = {
            advertencia: fos.filter(fo => fo.sancaoDisciplinar === 'ADVERTENCIA').length,
            repreensao: fos.filter(fo => fo.sancaoDisciplinar === 'REPREENSAO').length,
            aoe: fos.filter(fo => fo.sancaoDisciplinar === 'ATIVIDADE_OE').length,
            retirada: fos.filter(fo => fo.sancaoDisciplinar === 'RETIRADA').length
        };

        // Determinar comportamento aproximado
        let comportamento = 'BOM'; // Padrão
        const totalSancoesGraves = sancoes.repreensao + sancoes.aoe + sancoes.retirada;
        if (totalSancoesGraves >= 5 || sancoes.retirada >= 2) {
            comportamento = 'MAU';
        } else if (totalSancoesGraves >= 3 || sancoes.aoe >= 1) {
            comportamento = 'INSUFICIENTE';
        } else if (totalSancoesGraves >= 2) {
            comportamento = 'REGULAR';
        } else if (negativos.length === 0 && positivos.length >= 3) {
            comportamento = 'EXCEPCIONAL';
        } else if (negativos.length <= 1 && positivos.length >= 2) {
            comportamento = 'ÓTIMO';
        }

        // Mapear enquadramentos anteriores para verificar reincidência
        const enquadramentosAnteriores = negativos
            .filter(fo => fo.enquadramento)
            .map(fo => fo.enquadramento.split(',').map(e => parseInt(e.trim())))
            .flat()
            .filter(e => !isNaN(e));

        const context = {
            studentNumber,
            nome: studentData?.nome || fos[0]?.studentInfo?.[0]?.nome || null,
            turma,
            company: studentData?.company || fos[0]?.company || null,
            isCrianca,
            tempoNoCMB,
            menosDeTresMeses: tempoNoCMB !== null && tempoNoCMB < 3,
            totalFOs: fos.length,
            positivos: positivos.length,
            negativos: negativos.length,
            sancoes,
            comportamento,
            comportamentoBom: ['BOM', 'ÓTIMO', 'EXCEPCIONAL'].includes(comportamento),
            comportamentoRuim: ['REGULAR', 'INSUFICIENTE', 'MAU'].includes(comportamento),
            primeiraNegativa: negativos.length === 0,
            cumprindoSancao: sancoesAtivas.length > 0,
            enquadramentosAnteriores,
            hasPositivos: positivos.length > 0
        };

        // Salvar no cache
        studentContextCache.set(cacheKey, {
            data: context,
            timestamp: Date.now()
        });

        return context;

    } catch (error) {
        console.error('[RICM] Error fetching student context:', error);
        return null;
    }
}

/**
 * Analisa e sugere atenuantes
 * @param {string} descricao - Descrição do fato
 * @param {Object} studentContext - Contexto do aluno
 * @returns {Array} Lista de atenuantes sugeridos
 */
function analyzeAtenuantes(descricao, studentContext) {
    const suggestions = [];

    // Atenuante 1: Menos de 3 meses no CMB
    if (studentContext?.menosDeTresMeses) {
        suggestions.push({
            id: 1,
            texto: ATENUANTES.find(a => a.id === 1).texto,
            reason: `Aluno está há menos de 3 meses no CMB (${studentContext.tempoNoCMB || 0} meses)`,
            source: 'dados do aluno',
            confidence: 'alta'
        });
    }

    // Atenuante 2: Criança ou adolescente (6º/7º ano)
    if (studentContext?.isCrianca) {
        suggestions.push({
            id: 2,
            texto: ATENUANTES.find(a => a.id === 2).texto,
            reason: `Aluno da turma ${studentContext.turma} (considerado criança/adolescente)`,
            source: 'dados do aluno',
            confidence: 'alta'
        });
    }

    // Atenuante 3: Comportamento BOM, ÓTIMO ou EXCEPCIONAL
    if (studentContext?.comportamentoBom) {
        suggestions.push({
            id: 3,
            texto: ATENUANTES.find(a => a.id === 3).texto,
            reason: `Comportamento atual: ${studentContext.comportamento}`,
            source: 'histórico do aluno',
            confidence: 'alta'
        });
    }

    // Atenuante 4: Primeira falta
    if (studentContext?.primeiraNegativa) {
        suggestions.push({
            id: 4,
            texto: ATENUANTES.find(a => a.id === 4).texto,
            reason: 'Aluno não possui FOs negativos anteriores',
            source: 'histórico do aluno',
            confidence: 'alta'
        });
    }

    // Atenuante 5: Falta de prática (análise de texto)
    const { score: score5 } = calculateMatchScore(descricao, ATENUANTE_KEYWORDS[5]);
    if (score5 > 0) {
        suggestions.push({
            id: 5,
            texto: ATENUANTES.find(a => a.id === 5).texto,
            reason: 'Descrição indica falta de experiência/conhecimento',
            source: 'análise da descrição',
            confidence: 'média'
        });
    }

    // Atenuante 6: Relevância de ações prestadas
    if (studentContext?.hasPositivos && studentContext.positivos >= 2) {
        suggestions.push({
            id: 6,
            texto: ATENUANTES.find(a => a.id === 6).texto,
            reason: `Aluno possui ${studentContext.positivos} FOs positivos registrados`,
            source: 'histórico do aluno',
            confidence: 'média'
        });
    }

    // Atenuante 7: Para evitar mal maior (análise de texto)
    const { score: score7 } = calculateMatchScore(descricao, ATENUANTE_KEYWORDS[7]);
    if (score7 > 0) {
        suggestions.push({
            id: 7,
            texto: ATENUANTES.find(a => a.id === 7).texto,
            reason: 'Descrição indica ação para evitar mal maior',
            source: 'análise da descrição',
            confidence: 'média'
        });
    }

    // Atenuante 8: Defesa própria (análise de texto)
    const { score: score8 } = calculateMatchScore(descricao, ATENUANTE_KEYWORDS[8]);
    if (score8 > 0) {
        suggestions.push({
            id: 8,
            texto: ATENUANTES.find(a => a.id === 8).texto,
            reason: 'Descrição indica defesa própria ou de terceiros',
            source: 'análise da descrição',
            confidence: 'média'
        });
    }

    return suggestions;
}

/**
 * Analisa e sugere agravantes
 * @param {string} descricao - Descrição do fato
 * @param {Object} studentContext - Contexto do aluno
 * @param {Array} faltasSugeridas - Faltas sugeridas para verificar reincidência
 * @returns {Array} Lista de agravantes sugeridos
 */
function analyzeAgravantes(descricao, studentContext, faltasSugeridas = []) {
    const suggestions = [];

    // Agravante 1: Oficial-aluno ou graduado (análise de texto)
    const { score: score1 } = calculateMatchScore(descricao, AGRAVANTE_KEYWORDS[1]);
    if (score1 > 0) {
        suggestions.push({
            id: 1,
            texto: AGRAVANTES.find(a => a.id === 1).texto,
            reason: 'Descrição indica que aluno é oficial-aluno ou graduado',
            source: 'análise da descrição',
            confidence: 'média'
        });
    }

    // Agravante 2: CFR (análise de texto)
    const { score: score2 } = calculateMatchScore(descricao, AGRAVANTE_KEYWORDS[2]);
    if (score2 > 0) {
        suggestions.push({
            id: 2,
            texto: AGRAVANTES.find(a => a.id === 2).texto,
            reason: 'Descrição menciona CFR',
            source: 'análise da descrição',
            confidence: 'média'
        });
    }

    // Agravante 3: Comportamento REGULAR, INSUFICIENTE ou MAU
    if (studentContext?.comportamentoRuim) {
        suggestions.push({
            id: 3,
            texto: AGRAVANTES.find(a => a.id === 3).texto,
            reason: `Comportamento atual: ${studentContext.comportamento}`,
            source: 'histórico do aluno',
            confidence: 'alta'
        });
    }

    // Agravante 4: Durante atividade escolar (análise de texto)
    const { score: score4 } = calculateMatchScore(descricao, AGRAVANTE_KEYWORDS[4]);
    if (score4 > 0) {
        suggestions.push({
            id: 4,
            texto: AGRAVANTES.find(a => a.id === 4).texto,
            reason: 'Fato ocorreu durante atividade escolar/aula',
            source: 'análise da descrição',
            confidence: 'alta'
        });
    }

    // Agravante 5: Reincidência (verificar histórico)
    if (studentContext?.enquadramentosAnteriores?.length > 0 && faltasSugeridas.length > 0) {
        const faltasReincidentes = faltasSugeridas.filter(f =>
            studentContext.enquadramentosAnteriores.includes(f.id)
        );

        if (faltasReincidentes.length > 0) {
            suggestions.push({
                id: 5,
                texto: AGRAVANTES.find(a => a.id === 5).texto,
                reason: `Aluno já cometeu a(s) falta(s): ${faltasReincidentes.map(f => f.id).join(', ')}`,
                source: 'histórico do aluno',
                confidence: 'alta'
            });
        }
    }

    // Agravante 6: Múltiplas faltas simultâneas
    if (faltasSugeridas.length >= 2) {
        const { score: score6 } = calculateMatchScore(descricao, AGRAVANTE_KEYWORDS[6]);
        if (score6 > 0 || faltasSugeridas.filter(f => f.confidence !== 'baixa').length >= 2) {
            suggestions.push({
                id: 6,
                texto: AGRAVANTES.find(a => a.id === 6).texto,
                reason: `Identificadas ${faltasSugeridas.length} possíveis faltas no mesmo fato`,
                source: 'análise da descrição',
                confidence: 'média'
            });
        }
    }

    // Agravante 7: Conluio (análise de texto)
    const { score: score7 } = calculateMatchScore(descricao, AGRAVANTE_KEYWORDS[7]);
    if (score7 > 0) {
        suggestions.push({
            id: 7,
            texto: AGRAVANTES.find(a => a.id === 7).texto,
            reason: 'Descrição indica participação de múltiplos alunos',
            source: 'análise da descrição',
            confidence: 'média'
        });
    }

    // Agravante 8: Abuso de função (análise de texto)
    const { score: score8 } = calculateMatchScore(descricao, AGRAVANTE_KEYWORDS[8]);
    if (score8 > 0) {
        suggestions.push({
            id: 8,
            texto: AGRAVANTES.find(a => a.id === 8).texto,
            reason: 'Descrição indica abuso de cargo/função',
            source: 'análise da descrição',
            confidence: 'média'
        });
    }

    // Agravante 9: Em público/presença de tropa (análise de texto)
    const { score: score9 } = calculateMatchScore(descricao, AGRAVANTE_KEYWORDS[9]);
    if (score9 > 0) {
        suggestions.push({
            id: 9,
            texto: AGRAVANTES.find(a => a.id === 9).texto,
            reason: 'Fato ocorreu em público ou na presença de tropa',
            source: 'análise da descrição',
            confidence: 'média'
        });
    }

    // Agravante 10: Premeditação (análise de texto)
    const { score: score10 } = calculateMatchScore(descricao, AGRAVANTE_KEYWORDS[10]);
    if (score10 > 0) {
        suggestions.push({
            id: 10,
            texto: AGRAVANTES.find(a => a.id === 10).texto,
            reason: 'Descrição indica premeditação',
            source: 'análise da descrição',
            confidence: 'média'
        });
    }

    return suggestions;
}

/**
 * Função principal: Obtém sugestão completa de enquadramento
 * OTIMIZADO: Não busca contexto do aluno por padrão (reduz leituras do Firebase)
 * @param {string} descricao - Descrição do fato observado
 * @param {number|string} studentNumber - Número do aluno (opcional, não usado por padrão)
 * @param {boolean} fetchStudentContext - Se true, busca contexto do aluno (mais leituras)
 * @returns {Promise<Object>} Sugestões de enquadramento
 */
export async function getSuggestion(descricao, studentNumber = null, fetchStudentContext = false) {
    // 1. Analisar faltas baseado na descrição (sem leituras do Firebase)
    const faltasSugeridas = analyzeFaltas(descricao);

    // 2. Buscar contexto do aluno APENAS se explicitamente solicitado
    // Isso reduz significativamente as leituras do Firebase
    let studentContext = null;
    if (studentNumber && fetchStudentContext) {
        studentContext = await getStudentContext(studentNumber);
    }

    // 3. Analisar atenuantes (baseado em texto, com contexto se disponível)
    const atenuantesSugeridos = analyzeAtenuantes(descricao, studentContext);

    // 4. Analisar agravantes (baseado em texto, com contexto se disponível)
    const agravantesSugeridos = analyzeAgravantes(descricao, studentContext, faltasSugeridas);

    // 5. Determinar classificação provável da falta
    let classificacao = 'LEVE';
    if (faltasSugeridas.length > 0) {
        const faltasPrincipais = faltasSugeridas.slice(0, 2).map(f => f.id);
        // Faltas graves (exemplos)
        const faltasGraves = [24, 25, 26, 27, 28, 37, 43, 44, 46];
        const faltasMedias = [14, 15, 20, 22, 23, 33, 36, 40, 41];

        if (faltasPrincipais.some(id => faltasGraves.includes(id))) {
            classificacao = 'GRAVE';
        } else if (faltasPrincipais.some(id => faltasMedias.includes(id))) {
            classificacao = 'MÉDIA';
        }

        // Agravantes aumentam a classificação
        if (agravantesSugeridos.length >= 2 && classificacao !== 'GRAVE') {
            classificacao = classificacao === 'LEVE' ? 'MÉDIA' : 'GRAVE';
        }

        // Atenuantes podem reduzir
        if (atenuantesSugeridos.length >= 2 && classificacao !== 'LEVE') {
            classificacao = classificacao === 'GRAVE' ? 'MÉDIA' : 'LEVE';
        }
    }

    return {
        faltas: faltasSugeridas,
        atenuantes: atenuantesSugeridos,
        agravantes: agravantesSugeridos,
        classificacao,
        studentContext: studentContext ? {
            nome: studentContext.nome,
            turma: studentContext.turma,
            comportamento: studentContext.comportamento,
            totalFOs: studentContext.totalFOs,
            negativos: studentContext.negativos,
            positivos: studentContext.positivos
        } : null,
        descricaoOriginal: descricao, // Para uso no botão de buscar histórico
        timestamp: new Date().toISOString()
    };
}

/**
 * Limpa o cache de contexto de alunos
 */
export function clearStudentContextCache() {
    studentContextCache.clear();
    console.log('[RICM] Student context cache cleared');
}

/**
 * Formata a sugestão para exibição em HTML
 * @param {Object} suggestion - Resultado de getSuggestion()
 * @param {string|null} studentNumber - Número do aluno para botão "Buscar Histórico"
 * @returns {string} HTML formatado
 */
export function formatSuggestionHTML(suggestion, studentNumber = null) {
    let html = `
        <button type="button" class="suggestion-close-btn" onclick="this.closest('.ai-suggestion-result').classList.add('hidden')" title="Fechar sugestão">
            ✕
        </button>
    `;

    // Contexto do aluno (se disponível)
    if (suggestion.studentContext) {
        html += `
            <div class="suggestion-section suggestion-section--student">
                <div class="suggestion-section-header">
                    <strong>📋 Dados do Aluno</strong>
                </div>
                <div class="suggestion-section-content">
                    <p><strong>${suggestion.studentContext.nome || 'N/A'}</strong> - Turma ${suggestion.studentContext.turma || 'N/A'}</p>
                    <p>Comportamento: <span class="badge badge--${suggestion.studentContext.comportamento === 'MAU' || suggestion.studentContext.comportamento === 'INSUFICIENTE' ? 'danger' : suggestion.studentContext.comportamento === 'REGULAR' ? 'warning' : 'success'}">${suggestion.studentContext.comportamento}</span></p>
                    <p>Histórico: ${suggestion.studentContext.negativos} negativos | ${suggestion.studentContext.positivos} positivos</p>
                </div>
            </div>
        `;
    }

    // Faltas sugeridas
    html += `
        <div class="suggestion-section suggestion-section--faltas">
            <div class="suggestion-section-header">
                <strong>📖 Faltas Disciplinares Sugeridas</strong>
                <span class="badge badge--${suggestion.classificacao === 'GRAVE' ? 'danger' : suggestion.classificacao === 'MÉDIA' ? 'warning' : 'success'}">${suggestion.classificacao}</span>
            </div>
            <div class="suggestion-section-content">
    `;

    if (suggestion.faltas.length > 0) {
        suggestion.faltas.forEach((falta, index) => {
            const confidenceClass = falta.confidence === 'alta' ? 'success' : falta.confidence === 'média' ? 'warning' : 'neutral';
            html += `
                <div class="suggestion-item ${index === 0 ? 'suggestion-item--primary' : ''}">
                    <span class="suggestion-item-number">${falta.id}</span>
                    <span class="suggestion-item-text">${falta.texto}</span>
                    <span class="badge badge--${confidenceClass} badge--sm">${falta.confidence}</span>
                </div>
            `;
        });
    } else {
        html += '<p class="suggestion-empty">Nenhuma falta identificada automaticamente. Analise a descrição manualmente.</p>';
    }

    html += '</div></div>';

    // Atenuantes sugeridos
    if (suggestion.atenuantes.length > 0) {
        html += `
            <div class="suggestion-section suggestion-section--atenuantes">
                <div class="suggestion-section-header">
                    <strong>⬇️ Atenuantes Aplicáveis</strong>
                </div>
                <div class="suggestion-section-content">
        `;

        suggestion.atenuantes.forEach(atenuante => {
            html += `
                <div class="suggestion-item">
                    <span class="suggestion-item-number suggestion-item-number--success">${atenuante.id}</span>
                    <div class="suggestion-item-details">
                        <span class="suggestion-item-text">${atenuante.texto}</span>
                        <span class="suggestion-item-reason">${atenuante.reason}</span>
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
    }

    // Agravantes sugeridos
    if (suggestion.agravantes.length > 0) {
        html += `
            <div class="suggestion-section suggestion-section--agravantes">
                <div class="suggestion-section-header">
                    <strong>⬆️ Agravantes Aplicáveis</strong>
                </div>
                <div class="suggestion-section-content">
        `;

        suggestion.agravantes.forEach(agravante => {
            html += `
                <div class="suggestion-item">
                    <span class="suggestion-item-number suggestion-item-number--danger">${agravante.id}</span>
                    <div class="suggestion-item-details">
                        <span class="suggestion-item-text">${agravante.texto}</span>
                        <span class="suggestion-item-reason">${agravante.reason}</span>
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
    }

    // Botão para buscar histórico do aluno (se não foi buscado ainda)
    if (!suggestion.studentContext && studentNumber) {
        html += `
            <div class="suggestion-fetch-context">
                <p style="margin-bottom: var(--space-2); font-size: var(--font-size-sm); color: var(--text-secondary);">
                    💡 Para sugestões de atenuantes/agravantes baseadas no histórico do aluno:
                </p>
                <button type="button" class="btn btn--secondary btn--sm fetch-student-context-btn"
                        data-student-number="${studentNumber}"
                        data-description="${suggestion.descricaoOriginal || ''}"
                        data-card-id="">
                    📋 Buscar Histórico do Aluno ${studentNumber}
                </button>
            </div>
        `;
    }

    // Aviso
    html += `
        <div class="suggestion-footer">
            <em>⚠️ Esta é uma sugestão automática baseada em análise de texto${suggestion.studentContext ? ' e histórico do aluno' : ''}.
            Confirme os artigos no RICM antes de aplicar.</em>
        </div>
    `;

    return html;
}
