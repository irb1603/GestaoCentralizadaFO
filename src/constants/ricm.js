// RICM Constants - Faltas Disciplinares, Atenuantes e Agravantes
// Regulamento Interno dos Colégios Militares
// Gestão Centralizada FO - CMB

/**
 * Relação de Faltas Disciplinares (46 itens)
 */
export const FALTAS_DISCIPLINARES = [
    { id: 1, texto: "Faltar à verdade." },
    { id: 2, texto: "Utilizar-se de livros, cadernos ou outros materiais pertencentes a colegas, sem o devido consentimento." },
    { id: 3, texto: "Deixar de comparecer ou chegar atrasado às atividades programadas." },
    { id: 4, texto: "Apresentar-se com uniforme diferente do que foi previamente estabelecido." },
    { id: 5, texto: "Ter pouco cuidado com o asseio próprio ou coletivo e com sua apresentação individual." },
    { id: 6, texto: "Trocar de uniforme em locais não apropriados." },
    { id: 7, texto: "Deixar material ou dependência sob sua responsabilidade, desarrumada ou com má apresentação, ou para tal contribuir." },
    { id: 8, texto: "Deixar de apresentar material, documento ou trabalhos escolares de sua responsabilidade, nas atividades escolares ou quando solicitado, em dia e em ordem." },
    { id: 9, texto: "Deixar de cumprir o prescrito nos regulamentos, normas e orientações, ou contribuir para tal." },
    { id: 10, texto: "Ocupar-se durante as aulas com qualquer outro trabalho estranho a elas." },
    { id: 11, texto: "Ausentar-se das atividades escolares sem autorização." },
    { id: 12, texto: "Representar o Colégio ou por ele tomar compromisso, sem estar para isso autorizado." },
    { id: 13, texto: "Simular doença para esquivar-se ao atendimento de obrigações e atividades escolares." },
    { id: 14, texto: "Causar danos materiais a outro aluno." },
    { id: 15, texto: "Ter em seu poder, introduzir, ler ou distribuir, dentro do colégio, cartazes, jornais ou publicações, de cunho político-partidário ou que atentem contra a disciplina ou a moral." },
    { id: 16, texto: "Propor ou aceitar transação pecuniária de qualquer natureza, no interior do colégio." },
    { id: 17, texto: "Deixar de usar ou usar de maneira irregular, peças de uniforme previstas no RUE/CM ou nas normas vigentes." },
    { id: 18, texto: "Deixar de devolver à subunidade, dentro do prazo estipulado, qualquer documento, devidamente assinado pelo pai ou responsável." },
    { id: 19, texto: "Não levar falta ou irregularidade que presenciar, ou de que tiver ciência e não lhe couber reprimir, ao conhecimento de autoridade competente." },
    { id: 20, texto: "Utilizar sem devida autorização telefones celulares e/ou aparelhos eletrônicos nas atividades escolares, nas instruções ou em formaturas, perturbando o desenvolvimento das atividades, sob pena de serem recolhidos e entregue somente aos responsáveis." },
    { id: 21, texto: "Utilizar-se do anonimato." },
    { id: 22, texto: "Comportar-se de maneira inadequada, desrespeitando ou desafiando pessoas, descumprindo normas vigentes ou normas de boa educação." },
    { id: 23, texto: "Portar-se de modo inconveniente nas atividades escolares, nas instruções ou em formaturas, perturbando o desenvolvimento dessas atividades." },
    { id: 24, texto: "Portar objetos que ameacem a segurança individual e/ou da coletividade." },
    { id: 25, texto: "Causar danos físicos e ou morais a outro aluno." },
    { id: 26, texto: "Praticar atos de vandalismo." },
    { id: 27, texto: "Causar danos materiais ao patrimônio da União." },
    { id: 28, texto: "Portar, usar e/ou distribuir drogas lícitas ou ilícitas nas dependências do colégio ou fora dele." },
    { id: 29, texto: "Praticar jogos de azar e outros proibidos pela legislação em vigor, assim como aqueles atentatórios e/ou inadequados ao ambiente educativo." },
    { id: 30, texto: "Esquivar-se a satisfazer compromissos de ordem moral ou pecuniária que houver assumido." },
    { id: 31, texto: "Frequentar lugares incompatíveis com o decoro da sociedade e de sua situação de aluno." },
    { id: 32, texto: "Retirar ou tentar retirar de qualquer dependência do colégio, material, viatura ou animal, ou mesmo deles servir-se sem ordem do responsável ou do proprietário." },
    { id: 33, texto: "Entrar no colégio ou dele sair, não estando para isso autorizado, bem como entrar ou sair por locais e vias não permitidos." },
    { id: 34, texto: "Ir a qualquer dependência do colégio sem autorização, bem como nela penetrar sem permissão ou ordem da autoridade que nela estiver presente." },
    { id: 35, texto: "Apresentar parte ou recursos sem seguir as normas e preceitos regulamentares, em termos desrespeitosos, com argumentos falsos ou de má fé, ou mesmo sem justa causa ou razão." },
    { id: 36, texto: "Publicar, divulgar ou contribuir para que sejam publicadas ou divulgadas por internet, por mídias sociais ou por aplicativos, mensagens, fotos, arquivos ou quaisquer outros documentos que possam concorrer para atingir a imagem do Colégio, de algum de seus integrantes ou de algum aluno." },
    { id: 37, texto: "Promover ou envolver-se em rixa, inclusive luta corporal, com outro aluno." },
    { id: 38, texto: "Fazer uso de perfis falsos em redes sociais para a difusão de informações." },
    { id: 39, texto: "Divulgar imagens gravadas dentro dos CM sem apreciação e autorização do Comandante." },
    { id: 40, texto: "Formar grupos ou promover algazarras, vaias ou distúrbios nas salas de aula ou outras dependências e nas imediações do estabelecimento, bem como perturbar, por qualquer outro modo, o sossego das aulas e a ordem natural." },
    { id: 41, texto: "Participar de movimentos de indisciplina coletiva, impedir a entrada de colegas na sala de aula ou incitá-los a ausências coletivas." },
    { id: 42, texto: "Utilizar material didático copiado total ou parcial, sem a devida autorização dos detentores dos direitos autorais ou da Administração do Colégio." },
    { id: 43, texto: "Utilizar de processos fraudulentos na realização de provas e trabalhos escolares, bem como a adulteração de documentação." },
    { id: 44, texto: "Praticar atos de bullying ou ciberbullying (colocar apelidos pejorativos, xingar, discriminar) ou expor a situações embaraçosas colegas, professores e funcionários." },
    { id: 45, texto: "Realizar gravação de imagem, vídeo ou áudio de outro aluno sem o prévio conhecimento/autorização para tal." },
    { id: 46, texto: "Usar fogos de artifício, bombas ou rojões, sob pena de afastamento automático." }
];

/**
 * Circunstâncias Atenuantes (8 itens)
 */
export const ATENUANTES = [
    { id: 1, texto: "Ser aluno matriculado com menos de 03 (três) meses." },
    { id: 2, texto: "Ser por sua idade considerado criança ou adolescente." },
    { id: 3, texto: "Estar no comportamento BOM, ÓTIMO ou EXCEPCIONAL." },
    { id: 4, texto: "Ser a primeira falta." },
    { id: 5, texto: "Falta de prática nas atividades típicas do discente." },
    { id: 6, texto: "A relevância de ações prestadas." },
    { id: 7, texto: "Ter sido cometida a falta para evitar mal maior." },
    { id: 8, texto: "Ter sido cometida a falta em defesa própria de seus direitos ou de outrem, não se configurando causa de justificação." }
];

/**
 * Circunstâncias Agravantes (10 itens)
 */
export const AGRAVANTES = [
    { id: 1, texto: "Ser oficial-aluno ou graduado." },
    { id: 2, texto: "Ser aluno do CFR, quando ativado, ou já o haver concluído." },
    { id: 3, texto: "Estar no comportamento REGULAR, INSUFICIENTE ou MAU." },
    { id: 4, texto: "Cometer a falta em atividade escolar, hora de aula ou instrução." },
    { id: 5, texto: "Reincidência, no mesmo tipo de falta disciplinar." },
    { id: 6, texto: "Prática simultânea ou conexão de 02 (duas) ou mais faltas disciplinares." },
    { id: 7, texto: "Conluio de 02 (dois) ou mais alunos." },
    { id: 8, texto: "Ter abusado o faltoso disciplinar de atribuição que lhe foi conferida para o exercício de atividade escolar." },
    { id: 9, texto: "Ter cometido a falta em público, na presença de tropa ou de aluno em forma ou em sala de aula." },
    { id: 10, texto: "Ter agido com premeditação, no cometimento da falta." }
];

/**
 * Busca itens por palavra-chave
 * @param {Array} items - Lista de itens (FALTAS_DISCIPLINARES, ATENUANTES ou AGRAVANTES)
 * @param {string} searchTerm - Termo de busca
 * @returns {Array} Itens filtrados
 */
export function searchItems(items, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') return items;

    const term = searchTerm.toLowerCase().trim();
    return items.filter(item =>
        item.texto.toLowerCase().includes(term) ||
        item.id.toString() === term
    );
}

/**
 * Formata item para exibição
 * @param {Object} item 
 * @returns {string}
 */
export function formatItem(item) {
    return `${item.id} - ${item.texto}`;
}

/**
 * Calcula data de 3 dias úteis após a data fornecida
 * @param {string} dateStr - Data no formato YYYY-MM-DD
 * @returns {string} Data no formato YYYY-MM-DD
 */
export function add3BusinessDays(dateStr) {
    if (!dateStr) return '';

    const date = new Date(dateStr + 'T12:00:00');
    let daysAdded = 0;

    while (daysAdded < 3) {
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay();
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            daysAdded++;
        }
    }

    return date.toISOString().split('T')[0];
}
