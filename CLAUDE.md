# CLAUDE.md

Este arquivo fornece orientacoes ao Claude Code (claude.ai/code) ao trabalhar com o codigo deste repositorio.

## Visao Geral do Projeto

Sistema de Gestao de Faltas Operacionais (FO) - Uma aplicacao web completa para gestao centralizada de registros disciplinares de alunos do Colegio Militar de Brasilia (CMB). O sistema gerencia todo o fluxo do processo disciplinar, desde a observacao inicial ate a documentacao final, incluindo a implementacao do framework RICM (Regulamento Interno dos Colegios Militares) com 46 transgressoes disciplinares, 8 circunstancias atenuantes e 10 circunstancias agravantes.

## Comandos de Desenvolvimento

```bash
# Servidor de desenvolvimento (executa em http://localhost:5173)
npm run dev

# Build de producao
npm run build

# Visualizar build de producao localmente
npm run preview

# Instalar dependencias
npm install
```

## Arquitetura

### Aplicacao com Multiplos Pontos de Entrada

A aplicacao possui **dois pontos de entrada HTML separados** com propositos diferentes:

1. **index.html** -> `src/main.js` - Sistema principal autenticado (SPA com roteamento dinamico)
2. **public-fo.html** -> `src/fo-main.js` - Formulario publico para envio de observacoes FO (nao autenticado)

Todos os pontos de entrada estao configurados em `vite.config.js` e sao compilados para `dist/`.

### Arquitetura SPA (index.html)

A aplicacao principal (`src/main.js`) e uma **SPA client-side usando JavaScript vanilla** com:
- **Roteamento por query parameter** (`?page=inicial`, `?page=advertencias`, etc.) - SEM hash routing
- **Carregamento dinamico de paginas** via ES modules (`import()`) para code splitting
- **Layout persistente** com sidebar e header que permanecem renderizados durante a navegacao
- **Gate de autenticacao** - redireciona para login se nao autenticado

Fluxo de navegacao:
1. Usuario navega para `/?page=advertencias`
2. `main.js` verifica autenticacao
3. Renderiza layout (sidebar + header)
4. Importa dinamicamente e renderiza o modulo da pagina
5. Configura event listeners especificos da pagina

### Backend Firebase

- **Autenticacao**: Sistema customizado usando colecao Firestore `users` (NAO Firebase Auth)
  - Contas de usuario codificadas em `src/firebase/auth.js` -> `USER_ACCOUNTS`
  - Sessao armazenada em localStorage com chave `cmb_session`
  - Validacao de senha verifica documento Firestore, fallback para padrao (username)
  - Expiracao de sessao apos 30 minutos de inatividade

- **Colecoes do Banco de Dados**:
  - `fatosObservados` - Registros principais de FO com workflow baseado em status
  - `students` - Dados mestres de alunos (numero, nome, turma, companhia, contato)
  - `users` - Credenciais e preferencias de usuarios
  - `auditLog` - Trilha de auditoria completa de todas as acoes do sistema
  - `faltasEscolares` - Rastreamento de faltas escolares
  - `emailConfigs` - Configuracoes de email por companhia (Gmail API)
  - `aiConfigs` - Configuracoes de API da IA por companhia

- **Storage**: Firebase Storage para anexos de documentos

### Camada de Cache

**Critico para performance** - `src/services/cacheService.js` implementa um cache de tres niveis:
- **Cache em memoria** (Map) para dados mais rapidos na sessao
- **sessionStorage** para persistencia entre recarregamentos de pagina
- **localStorage** para dados persistentes entre sessoes do navegador

#### TTLs do Cache (Otimizados Agressivamente para Plano Gratuito do Firebase)

| Categoria | TTL | Proposito |
|-----------|-----|-----------|
| Students | 30 min | Raramente muda |
| Students List | 30 min | Listas de alunos raramente mudam |
| FOs | 10 min | Dados principais de FO |
| FOs Pending | 5 min | Mais dinamico, precisa de dados mais frescos |
| Auth | 2 horas | Credenciais de autenticacao |
| Stats | 15 min | Estatisticas do dashboard |
| Audit | 5 min | Logs de auditoria |
| Global | 1 hora | Dados estaticos/globais |

#### Pre-aquecimento do Cache (Inicializacao do App)

**DESABILITADO** - O pre-aquecimento do cache foi removido para evitar 2.7k+ leituras do Firebase no carregamento da pagina. Alunos e FOs agora sao carregados **SOB DEMANDA** quando o usuario pesquisa. Isso reduz as leituras iniciais de ~2700 para ~10 (apenas config/auth).

**Sempre use o servico de cache** ao buscar alunos ou FOs para evitar leituras excessivas do Firebase. Invalide o cache apos mutacoes usando `invalidateStudentCache()` ou `invalidateFOCache()`.

### Firebase Logger

**NOVO** - Sistema de logging para rastrear leituras do Firebase (`src/services/firebaseLogger.js`):
- Registra todas as operacoes de leitura (getDoc, getDocs, onSnapshot)
- Rastreia: usuario, colecao, quantidade de documentos, timestamp
- Widget flutuante para admins mostra estatisticas em tempo real
- Exporta logs em JSON ou CSV para analise
- Ajuda a identificar gargalos de leituras

### Workflow de Status

Registros de FO seguem um workflow de 8 estagios definido em `src/constants/index.js` -> `FO_STATUS`:

```
pendente -> [advertencia|repreensao|atividade_oe|retirada] -> consolidar -> concluir -> encerrado
                                                            \-> glpi (trilha paralela)
```

Cada status possui:
- Modulo de pagina correspondente em `src/pages/`
- Item de navegacao na sidebar
- Codificacao por cor (`FO_STATUS_COLORS`)
- Label de exibicao (`FO_STATUS_LABELS`)

Tipos de sancao (advertencia, repreensao, atividade_oe, retirada) usam um **template compartilhado** em `src/pages/sanctionPage.js` para reduzir duplicacao de codigo.

### Sistema de Permissoes

5 papeis de usuario com acesso hierarquico:
- **admin** - Acesso total, todas as companhias, pode deletar FOs
- **comandoCA** - Visualiza tudo, edita status, nao deleta
- **commander** - Apenas companhia especifica, edita propria companhia
- **sergeant** - Apenas companhia especifica, edita propria companhia, sem acesso a auditoria
- **auxiliar** - Apenas paginas restritas (faltas-escolares, processo-disciplinar)

Filtragem por companhia e automatica baseada na sessao do usuario - use `getCompanyFilter()` de `src/firebase/auth.js`.

### Geracao de Documentos

Dois tipos de documentos gerados client-side:

1. **DOCX** (Notas de Aditamento) - `src/utils/docxGenerator.js`
   - Usa biblioteca `docx`
   - Formatacao profissional com cabecalhos militares
   - Exportacao via `file-saver`

2. **PDF** (Processo Disciplinar) - `src/utils/pdfGenerator.js`
   - API de impressao nativa do navegador
   - Conversao HTML -> PDF customizada
   - Inclui citacoes RICM e assinaturas

### Integracao de IA

Multiplos provedores de IA integrados em `src/services/aiService.js`:
- **Provedores suportados**: Groq (Llama, Mixtral) e Google Gemini
- **Componente AI Chat** (`src/components/aiChat.js`) - botao de chat flutuante visivel para usuarios autenticados
- Capacidades:
  - Sugestoes de framework RICM baseadas na descricao do FO
  - Analise estatistica de dados disciplinares
  - Queries em linguagem natural sobre alunos/FOs
  - Assistencia na redacao de documentos
- Prompts definidos em `src/utils/aiPrompts.js`
- Configuracao de API em `src/constants/aiConfig.js`

### Servico de OCR

Processamento de folhas de presenca via `src/services/ocrService.js`:
- Usa **Tesseract.js** para reconhecimento de texto
- Suporta processamento de **PDF** via pdf.js
- Pre-processamento de imagem para melhor precisao
- Extracao de numeros de alunos de listas de chamada

### PWA (Progressive Web App)

**NOVO** - Suporte a PWA para instalacao em dispositivos moveis:
- `public/manifest.webmanifest` - Configuracao do PWA
- `public/sw.js` - Service Worker para cache e notificacoes
- Meta tags iOS no `index.html` para suporte ao iPhone
- Suporte a notificacoes push (preparado para implementacao futura)

### Sistema de Constantes

Todas as constantes do sistema centralizadas em `src/constants/`:
- `index.js` - Status, rotas, colecoes, funcoes utilitarias
- `ricm.js` - Framework RICM completo (46 faltas, 8 atenuantes, 10 agravantes)
- `aiConfig.js` - Configuracao do servico de IA

**Sempre importe das constantes** ao inves de codificar valores diretamente.

### Arquitetura de Componentes

Componentes reutilizaveis em `src/components/`:
- `sidebar.js` - Navegacao com filtragem de menu baseada em papel
- `header.js` - Barra superior com info do usuario e logout
- `expandableCard.js` - Cards de FO colapsaveis com detalhes completos
- `actionModals.js` - Modais compartilhados para mudancas de status, delecoes, etc.
- `aiChat.js` - Assistente de IA flutuante
- `firebaseLoggerWidget.js` - Widget de monitoramento de leituras Firebase (apenas admin)

Componentes exportam tanto funcoes de renderizacao quanto funcoes de configuracao de eventos que devem ser chamadas separadamente.

### Sistema de Auditoria

Log de auditoria completo em `src/services/auditLogger.js`:
- Registra TODAS as mutacoes (criar, atualizar, deletar, mudancas de status)
- Captura: usuario, timestamp, tipo de acao, alvo, valores antigos/novos
- Armazenado na colecao `auditLog`
- Visivel na pagina Auditoria (com controle de permissao)

**Sempre chame `logAction()` apos mutacoes no banco de dados** para manter a trilha de auditoria.

## Padroes Importantes

### Padrao de Modulo de Pagina

Todos os modulos de pagina seguem esta estrutura:

```javascript
export async function renderNomeDaPagina(containerElement) {
  // 1. Obter sessao/permissoes
  const session = getSession();
  const companyFilter = getCompanyFilter();

  // 2. Tentar obter do cache primeiro
  let data = getCachedData();

  if (!data) {
    // 3. Consultar Firestore com filtro de companhia se necessario
    data = await fetchFromFirestore();

    // 4. Armazenar resultados em cache
    cacheData(data);
  }

  // 5. Renderizar HTML no container
  containerElement.innerHTML = generateHTML(data);

  // 6. Configurar event listeners
  setupEventListeners();
}
```

### Adicionando Novas Rotas

Para adicionar uma nova pagina:

1. Adicionar constante de rota em `ROUTES` em `src/constants/index.js`
2. Adicionar titulo da pagina em `PAGE_TITLES`
3. Criar modulo de pagina em `src/pages/suapagina.js` seguindo o padrao acima
4. Adicionar case no switch de `loadPage()` em `src/main.js`
5. Adicionar item de menu na sidebar em `src/components/sidebar.js` com verificacao de papel
6. Atualizar permissoes em `src/firebase/auth.js` se necessario

### Trabalhando com FOs

Ao consultar FOs, **sempre aplique filtro de companhia** a menos que o usuario seja admin/comandoCA:

```javascript
import { getCompanyFilter } from './firebase/auth.js';

const companyFilter = getCompanyFilter();
let q;

if (companyFilter) {
  q = query(
    collection(db, 'fatosObservados'),
    where('status', '==', targetStatus),
    where('company', '==', companyFilter)
  );
} else {
  q = query(
    collection(db, 'fatosObservados'),
    where('status', '==', targetStatus)
  );
}
```

### Estrutura de Dados do FO

Campos principais em documentos `fatosObservados`:
- `studentNumbers` - Array de numeros de alunos
- `studentInfo` - Array de objetos de aluno desnormalizados (para performance)
- `status` - Status atual do workflow
- `company` - Companhia (6cia, 7cia, etc.)
- `tipo` - positivo|negativo|neutro
- `dataFato` - Data no formato YYYY-MM-DD
- `numeroFO` - Numero do FO para rastreamento
- `enquadramento` - Framework RICM (falta, atenuantes, agravantes)
- `sancaoAplicada` - Sancao final aplicada
- `quantidadeDias` - Dias de cumprimento (para Retirada/AOE)

## Estilizacao

CSS customizado em `src/styles/`:
- `variables.css` - Propriedades CSS customizadas (cores, espacamento, etc.)
- `global.css` - Estilos base e resets
- `components.css` - Classes de componentes reutilizaveis (botoes, cards, badges, etc.)
- `pages.css` - Estilos especificos de paginas
- `fo-form.css` - Estilos do formulario publico de FO
- `faltas.css` - Estilos da pagina de faltas escolares
- `estatisticas.css` - Estilos da pagina de estatisticas

Usa **nomenclatura utility-first** para componentes (.btn, .card, .badge) com **modificadores BEM** (.btn--primary, .card__header).

## Deploy

Deployado no Netlify em: https://gestaocentralizadafo.netlify.app

Configuracao de build:
- Comando de build: `npm run build`
- Diretorio de publicacao: `dist`
- Nao precisa de roteamento server-side (SPA usa query parameters)

## Dependencias Principais

```json
{
  "chart.js": "^4.5.1",      // Graficos para estatisticas
  "docx": "^9.5.1",          // Geracao de documentos DOCX
  "file-saver": "^2.0.5",    // Download de arquivos
  "firebase": "^10.7.1",     // Backend Firebase
  "pdfjs-dist": "^5.4.449",  // Processamento de PDF para OCR
  "tesseract.js": "^7.0.0"   // OCR para leitura de listas de chamada
}
```

## Problemas Conhecidos e Padroes

1. **Sem TypeScript** - JavaScript vanilla puro, sem verificacao de tipos em build-time
2. **Sem biblioteca de gerenciamento de estado** - Estado gerenciado via sessionStorage/localStorage e Firestore
3. **Sem biblioteca de roteamento client-side** - Implementacao customizada usando URLSearchParams
4. **Config do Firebase commitada** - Chaves de API sao restritas por regras de seguranca do Firebase, nao variaveis de ambiente
5. **Sistema de senha e basico** - Sistema de autenticacao customizado, nao Firebase Authentication
6. **Invalidacao de cache e manual** - Sempre chame funcoes de invalidacao apos mutacoes
7. **Filtro de companhia e critico** - Maioria das queries DEVE respeitar limites de companhia baseados no papel do usuario

## Notas de Teste

Sem suite de testes automatizados. Checklist de testes manuais:
- Testar todos os papeis (admin, comandoCA, commander, sergeant, auxiliar)
- Verificar se filtragem de companhia funciona corretamente
- Verificar se logs de auditoria sao criados para todas as mutacoes
- Testar geracao de documentos tanto DOCX quanto PDF
- Verificar invalidacao de cache apos atualizacoes
- Testar assistente de IA com varias queries
- Verificar expiracao de sessao apos 30 minutos de inatividade
- Verificar widget de Firebase Logger para admins

## Estrutura de Arquivos

```
src/
├── components/          # Componentes reutilizaveis da UI
│   ├── sidebar.js       # Navegacao lateral
│   ├── header.js        # Cabecalho superior
│   ├── expandableCard.js # Cards expansiveis de FO
│   ├── actionModals.js  # Modais de acoes
│   ├── aiChat.js        # Chat de IA flutuante
│   └── firebaseLoggerWidget.js # Widget de monitoramento Firebase
├── constants/           # Constantes do sistema
│   ├── index.js         # Status, rotas, colecoes
│   ├── ricm.js          # Framework RICM completo
│   └── aiConfig.js      # Configuracao de IA
├── firebase/            # Configuracao e servicos Firebase
│   ├── config.js        # Inicializacao do Firebase
│   ├── auth.js          # Autenticacao e sessao
│   └── database.js      # Operacoes do Firestore
├── pages/               # Modulos de pagina
│   ├── inicial.js       # Pagina inicial (pendentes)
│   ├── sanctionPage.js  # Template para paginas de sancao
│   ├── consolidar.js    # Consolidacao de FOs
│   ├── concluir.js      # Conclusao de FOs
│   ├── encerrados.js    # FOs encerrados
│   ├── glpi.js          # Fila GLPI
│   ├── comportamento.js # Relatorio de comportamento
│   ├── estatisticas.js  # Dashboard de estatisticas
│   └── ...
├── services/            # Servicos de negocios
│   ├── cacheService.js  # Camada de cache
│   ├── aiService.js     # Integracao de IA
│   ├── auditLogger.js   # Log de auditoria
│   ├── firebaseLogger.js # Logger de leituras Firebase
│   ├── dataService.js   # Operacoes de dados de alunos
│   ├── ocrService.js    # Reconhecimento optico
│   └── emailService.js  # Integracao Gmail API
├── styles/              # Arquivos CSS
├── utils/               # Utilitarios
├── main.js              # Ponto de entrada principal
└── fo-main.js           # Ponto de entrada do formulario publico

public/
├── manifest.webmanifest # Configuracao PWA
├── sw.js                # Service Worker
└── images/              # Imagens estaticas
```

## Rotas Disponiveis

| Rota | Pagina | Descricao |
|------|--------|-----------|
| `inicial` | Inicial | FOs pendentes de triagem |
| `advertencias` | Advertencias | FOs para advertencia |
| `repreensoes` | Repreensoes | FOs para repreensao |
| `atividades-oe` | AOE | Atividades de Orientacao Educacional |
| `retiradas` | Retiradas | FOs para retirada |
| `consolidar` | Consolidar | Consolidacao de sancoes |
| `concluir` | Concluir | Conclusao de processos |
| `encerrados` | Encerrados | Arquivo de FOs encerrados |
| `glpi` | GLPI | Fila de exclusao |
| `comportamento` | Comportamento | Relatorio de comportamento |
| `notas-aditamento` | Notas Aditamento | Geracao de aditamentos |
| `processo-disciplinar` | Proc. Disciplinar | Geracao de processos |
| `estatisticas` | Estatisticas | Dashboard analitico |
| `faltas-escolares` | Faltas Escolares | Controle de presenca |
| `dados-alunos` | Dados Alunos | Cadastro de alunos |
| `auditoria` | Auditoria | Logs do sistema |
| `admin` | Administracao | Configuracoes admin |
