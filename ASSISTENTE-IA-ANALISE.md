# 🤖 Análise Completa do Assistente de IA - CMB

**Sistema de Gestão de Fatos Observados**
**Data:** Dezembro 2024
**Objetivo:** Mapear capacidades atuais e identificar oportunidades de melhoria

---

## 📋 Índice

1. [Capacidades Atuais](#capacidades-atuais)
2. [Detecção de Consultas](#detecção-de-consultas)
3. [Dados Fornecidos](#dados-fornecidos)
4. [Limitações Identificadas](#limitações-identificadas)
5. [Oportunidades de Melhoria](#oportunidades-de-melhoria)

---

## 1. Capacidades Atuais

### ✅ **1.1 Estatísticas de Fatos Observados**

**O que faz:**
- Conta FOs por tipo (positivo/negativo/neutro)
- Agrupa por período (hoje, semana, mês)
- Filtra automaticamente por companhia (se não for admin)

**Palavras-chave detectadas:**
- `fo`, `fato`, `observad`

**Exemplo de pergunta:**
- "Quantos FOs negativos foram registrados esta semana?"
- "Me mostre os FOs de hoje"
- "Estatísticas de fatos observados do mês"

**Dados retornados:**
```
=== ESTATÍSTICAS DE FOs ===
HOJE: 5 positivos, 12 negativos, 2 neutros
SEMANA: 23 positivos, 45 negativos, 8 neutros
MÊS: 89 positivos, 156 negativos, 34 neutros
```

**Cache:** 2 minutos

---

### ✅ **1.2 Ranking de Observadores**

**O que faz:**
- Lista os 10 observadores que mais registraram FOs no mês
- Ordena por quantidade de registros

**Palavras-chave detectadas:**
- `observador`, `registr`

**Exemplo de pergunta:**
- "Quem foi o observador que mais registrou FO este mês?"
- "Ranking de observadores"
- "Quais professores mais registram FOs?"

**Dados retornados:**
```
=== RANKING DE OBSERVADORES (Mês atual) ===
1. Profª Maria Silva: 45 FOs
2. Prof. João Santos: 38 FOs
3. Sgt Carlos Souza: 32 FOs
...
```

**Cache:** 5 minutos

---

### ✅ **1.3 FOs para Aditamento ao BI**

**O que faz:**
- Conta FOs que têm campo `dataAdtBI` preenchido
- Agrupa por tipo de sanção (Repreensão, AOE, Retirada)
- Filtra pela semana atual

**Palavras-chave detectadas:**
- `aditamento`, `adt`, `bi`

**Exemplo de pergunta:**
- "Quantos FOs existem para aditamento esta semana?"
- "FOs para o BI"
- "Nota de aditamento"

**Dados retornados:**
```
=== FOs PARA ADITAMENTO (Semana) ===
Total: 12
Repreensão: 5
AOE: 4
Retirada: 3
```

**Cache:** 5 minutos

---

### ✅ **1.4 Estatísticas de Faltas Escolares**

**O que faz:**
- Busca TODAS as faltas escolares
- Agrega por aluno (soma de tempos faltados)
- Lista os 10 maiores faltantes

**Palavras-chave detectadas:**
- `falta`, `ausên`, `faltante`

**Exemplo de pergunta:**
- "Quais são os alunos mais faltantes?"
- "Faltas escolares"
- "Maiores faltantes da companhia"

**Dados retornados:**
```
=== MAIORES FALTANTES ===
1. Nº 12345 - João Silva: 23 faltas
2. Nº 67890 - Maria Santos: 18 faltas
3. Nº 11223 - Pedro Costa: 15 faltas
...
```

**Cache:** 5 minutos

---

### ✅ **1.5 Sugestão de Enquadramento RICM**

**O que faz:**
- Recebe descrição de um fato
- Analisa usando IA (Gemini) com todo o RICM no contexto
- Sugere artigo(s) aplicável(is)
- Indica atenuantes e agravantes
- Classifica gravidade da falta

**Palavras-chave detectadas:**
- Qualquer descrição de comportamento (IA processa semanticamente)

**Exemplo de pergunta:**
- "O aluno usou celular em sala de aula. Qual o enquadramento?"
- "Aluno dormiu durante a aula, como enquadrar?"
- "Esqueceu o livro pela terceira vez"

**Dados retornados:**
```
SUGESTÃO DE ENQUADRAMENTO:

Artigo aplicável: 20
"Utilizar sem devida autorização telefones celulares e/ou
aparelhos eletrônicos nas atividades escolares..."

AGRAVANTES POSSÍVEIS:
- Item 4: Cometer a falta em atividade escolar, hora de aula
- Item 5: Reincidência (se já faltou antes)

ATENUANTES POSSÍVEIS:
- Item 4: Ser a primeira falta

CLASSIFICAÇÃO: Falta Leve
```

**RICM completo no contexto:**
- 46 Faltas Disciplinares
- 8 Circunstâncias Atenuantes
- 10 Circunstâncias Agravantes

---

### ✅ **1.6 Alunos em Cumprimento de AOE/Retirada**

**O que faz:**
- Busca FOs com campo `datasCumprimento` contendo a data de hoje
- Separa por tipo de sanção (AOE vs Retirada)
- Lista número, nome e turma

**Palavras-chave detectadas:**
- `aoe`, `orientação`, `retirada`, `cumprimento`

**Exemplo de pergunta:**
- "Quantos alunos estão de AOE hoje?"
- "Quem está em retirada?"
- "Lista de cumprimento de sanção"

**Dados retornados:**
```
=== ALUNOS EM CUMPRIMENTO HOJE (30/12/2024) ===
AOE: 5 alunos
Retirada: 2 alunos

EM AOE:
- Nº 12345 - João Silva (Turma 601)
- Nº 67890 - Maria Santos (Turma 701)
...

EM RETIRADA:
- Nº 11223 - Pedro Costa (Turma 301)
- Nº 44556 - Ana Oliveira (Turma 201)
```

**Cache:** 2 minutos (muda diariamente)

---

### ✅ **1.7 Estatísticas de Sanções Aplicadas**

**O que faz:**
- Conta sanções aplicadas no mês atual
- Agrupa por tipo (Advertência, Repreensão, AOE, Retirada, Justificado)

**Palavras-chave detectadas:**
- `sanç`, `estatística`, `advertência`, `repreensão`

**Exemplo de pergunta:**
- "Qual a estatística de sanções deste mês?"
- "Quantas advertências foram aplicadas?"
- "Sanções disciplinares do mês"

**Dados retornados:**
```
=== SANÇÕES DO MÊS ===
Advertência: 45
Repreensão: 23
AOE: 12
Retirada: 3
Justificado: 8
```

**Cache:** 5 minutos

---

### ✅ **1.8 Comportamento em Queda**

**O que faz:**
- Busca registros de comportamento
- Compara as 2 últimas consolidações por aluno
- Identifica queda de nota
- Lista os 10 alunos com maior queda

**Palavras-chave detectadas:**
- `comportamento`, `caindo`, `queda`

**Exemplo de pergunta:**
- "Quais alunos estão com comportamento caindo?"
- "Comportamento em queda"
- "Alunos com piora no comportamento"

**Dados retornados:**
```
=== ALUNOS COM COMPORTAMENTO EM QUEDA ===
1. Nº 12345 - João Silva: 8.5 → 7.2 (-1.3)
2. Nº 67890 - Maria Santos: 9.0 → 8.0 (-1.0)
3. Nº 11223 - Pedro Costa: 7.8 → 7.0 (-0.8)
...
```

**Cache:** 5 minutos

---

### ✅ **1.9 FOs Pedagógicos da Semana** ⭐

**O que faz:**
- Busca FOs negativos da semana
- Filtra por palavras-chave pedagógicas (livro, tarefa, dormindo, etc.)
- Categoriza por tipo (livros, tarefas, atenção, material)
- Limita a 15 detalhes

**Palavras-chave detectadas:**
- `pedagógic`, `pedagogic`, `aprendizado`, `aula`, `livro`, `tarefa`, `dever`, `trabalho`

**Exemplo de pergunta:**
- "Quais são os FOs pedagógicos desta semana?"
- "Problemas relacionados ao aprendizado"
- "FOs de tarefas não feitas"

**Keywords pedagógicas detectadas:**
- Livros: 'livro', 'esqueceu o livro', 'sem livro', 'não trouxe o livro'
- Tarefas: 'tarefa', 'dever de casa', 'não fez tarefa', 'trabalho', 'não entregou'
- Atenção: 'dormindo', 'dormiu na aula', 'atenção', 'desatento', 'disperso'
- Material: 'material', 'caderno', 'sem caderno', 'esqueceu material'
- Outros: 'conversa', 'conversando', 'celular', 'usando celular'

**Dados retornados:**
```
=== FOs PEDAGÓGICOS DA SEMANA (26/12/2024) ===
Total: 34 ocorrências relacionadas ao aprendizado
- Livros esquecidos: 8
- Tarefas/Trabalhos: 15
- Atenção/Celular: 7
- Material escolar: 4

Detalhes:
1. Nº 12345 (601) - 27/12: Não trouxe o livro de matemática pela segunda vez...
2. Nº 67890 (701) - 27/12: Dormiu durante a aula de história...
3. Nº 11223 (801) - 28/12: Não fez tarefa de português...
...
```

**Restrição:** Apenas para Comandantes e Admin (por companhia)

**Cache:** 5 minutos

---

## 2. Detecção de Consultas

### 🔍 Como o Sistema Detecta o que Buscar

O sistema usa **detecção de palavras-chave** na pergunta do usuário para decidir quais dados buscar:

```javascript
// Exemplo do código (aiService.js - linha 154-207)
const lowerQuery = userQuery.toLowerCase();

// FO Statistics
if (lowerQuery.includes('fo') || lowerQuery.includes('fato') || lowerQuery.includes('observad')) {
    contextData.foStats = await getFOStats(companyFilter, startOfWeek, startOfMonth);
}

// Observer ranking
if (lowerQuery.includes('observador') || lowerQuery.includes('registr')) {
    contextData.observerRanking = await getObserverRanking(companyFilter, startOfMonth);
}

// ... e assim por diante
```

### ⚠️ Problema Atual: Detecção Simples

- **Não entende sinônimos** avançados
- **Não entende contexto** complexo
- Exemplo: "Quem mais aplica sanções?" → Não detecta (deveria buscar ranking de observadores)
- Exemplo: "Alunos problemáticos" → Não detecta (poderia ser comportamento ou FOs negativos)

---

## 3. Dados Fornecidos

### 📊 Formato das Respostas

Todas as respostas são formatadas em **texto estruturado** enviado ao Gemini, que então formula uma resposta em linguagem natural.

**Exemplo de fluxo:**

1. **Usuário pergunta:** "Quantos FOs temos hoje?"
2. **Sistema detecta:** palavra-chave "fo"
3. **Sistema busca:** `getFOStats()`
4. **Sistema formata:**
   ```
   === ESTATÍSTICAS DE FOs ===
   HOJE: 5 positivos, 12 negativos, 2 neutros
   SEMANA: 23 positivos, 45 negativos, 8 neutros
   MÊS: 89 positivos, 156 negativos, 34 neutros
   ```
5. **Gemini responde:**
   ```
   Hoje temos 19 Fatos Observados registrados:
   • 5 positivos
   • 12 negativos
   • 2 neutros

   Na semana, já acumulamos 76 FOs, sendo 45 negativos.
   ```

---

## 4. Limitações Identificadas

### 🚫 **4.1 Dados que NÃO podem ser obtidos**

❌ **Informações específicas de um aluno individual**
- Não tem função para buscar histórico completo de 1 aluno
- Exemplo: "Me mostre todos os FOs do aluno 12345"

❌ **Comparações entre períodos**
- Não compara mês atual vs mês anterior
- Exemplo: "Tivemos mais FOs este mês do que no mês passado?"

❌ **Tendências temporais**
- Não cria gráficos de evolução
- Exemplo: "Como está evoluindo o comportamento da companhia?"

❌ **Correlações**
- Não relaciona faltas escolares com FOs negativos
- Exemplo: "Alunos faltosos também têm mais FOs negativos?"

❌ **Alunos com múltiplas ocorrências**
- Não identifica reincidentes
- Exemplo: "Quais alunos já receberam mais de 3 FOs negativos?"

❌ **Análise por turma**
- Não agrupa estatísticas por turma específica
- Exemplo: "Qual turma tem mais FOs negativos?"

❌ **Análise por tipo de falta RICM**
- Não agrupa por artigo específico do RICM
- Exemplo: "Quantos FOs foram enquadrados no artigo 20 (celular)?"

❌ **Previsões**
- Não faz projeções ou alertas preventivos
- Exemplo: "Quais alunos correm risco de retirada?"

❌ **Estatísticas de observadores por tipo de FO**
- Não mostra se observador registra mais positivos ou negativos
- Exemplo: "Qual observador registra mais FOs positivos?"

❌ **Tempo médio de processamento**
- Não calcula tempo entre registro e conclusão de FO
- Exemplo: "Quanto tempo leva para processar um FO em média?"

---

### ⚠️ **4.2 Limitações Técnicas**

🔸 **Detecção de keywords limitada**
- Sistema atual usa `includes()` simples
- Não entende sinônimos complexos
- Não entende negações ("não quero ver...")

🔸 **Sem memória de conversação**
- Cada pergunta é independente
- Não mantém contexto entre perguntas
- Exemplo ruim:
  - User: "Me mostre FOs da semana"
  - AI: [responde]
  - User: "E quantos são negativos?"
  - AI: ❌ Não entende que "quantos" se refere à pergunta anterior

🔸 **Dados agregados apenas**
- Não retorna listas completas de FOs individuais
- Sempre retorna top 10/15 no máximo

🔸 **Queries ineficientes em alguns casos**
- `getAditamentoStats()` busca TODOS os FOs com aditamento e filtra no cliente
- `getSancoesCumprimento()` busca TODOS os FOs e filtra no cliente
- `getComportamentoStats()` busca TODOS os registros de comportamento

🔸 **Sem integração com outros dados**
- Não correlaciona FOs com notas acadêmicas
- Não correlaciona faltas com comportamento
- Cada métrica é isolada

---

## 5. Oportunidades de Melhoria

### 🚀 **5.1 Novas Capacidades Sugeridas**

#### **Alta Prioridade** 🔴

1. **Histórico Completo de Aluno**
   - Buscar todos os FOs de um aluno específico
   - Mostrar timeline de sanções
   - Calcular pontuação de comportamento
   - **Pergunta:** "Me mostre o histórico do aluno 12345"

2. **Análise de Reincidência**
   - Identificar alunos com múltiplos FOs do mesmo tipo
   - Alertar sobre padrões problemáticos
   - **Pergunta:** "Quais alunos já receberam 3+ FOs de celular?"

3. **Comparação de Períodos**
   - Comparar mês atual vs anterior
   - Identificar aumento/diminuição de FOs
   - **Pergunta:** "Temos mais FOs este mês do que no anterior?"

4. **Análise por Turma**
   - Estatísticas segregadas por turma
   - Identificar turmas problemáticas
   - **Pergunta:** "Qual turma da 6ª Cia tem mais FOs negativos?"

5. **Alertas Preventivos**
   - Identificar alunos próximos de sanções graves
   - Calcular risco de retirada
   - **Pergunta:** "Quais alunos estão próximos de retirada?"

#### **Média Prioridade** 🟡

6. **Análise por Artigo RICM**
   - Agrupar FOs por tipo de falta
   - Identificar faltas mais comuns
   - **Pergunta:** "Qual falta do RICM é mais cometida?"

7. **Estatísticas de Observadores Detalhadas**
   - Separar observadores por tipo de FO
   - Identificar viés (mais positivos vs negativos)
   - **Pergunta:** "Quais observadores registram mais FOs positivos?"

8. **Correlação Faltas × FOs**
   - Relacionar alunos faltosos com FOs negativos
   - Identificar se há padrão
   - **Pergunta:** "Alunos faltosos também têm mais FOs?"

9. **Tempo de Processamento**
   - Calcular tempo médio por status
   - Identificar FOs travados
   - **Pergunta:** "Quanto tempo demora para processar um FO?"

10. **Tendências Temporais**
    - Gráfico de evolução mensal
    - Identificar padrões sazonais
    - **Pergunta:** "Como evoluiu o comportamento nos últimos 6 meses?"

#### **Baixa Prioridade** 🟢

11. **Sugestões de Ações**
    - Recomendar intervenções pedagógicas
    - Sugerir reuniões com responsáveis
    - **Pergunta:** "O que fazer com alunos reincidentes em tarefas?"

12. **Exportação de Relatórios**
    - Gerar relatórios formatados
    - Exportar dados para análise externa
    - **Pergunta:** "Gere relatório mensal de FOs da 6ª Cia"

13. **Análise Preditiva**
    - Prever probabilidade de nova infração
    - Machine learning sobre padrões
    - **Pergunta:** "Quais alunos têm maior risco de FO no próximo mês?"

---

### 🔧 **5.2 Melhorias Técnicas Sugeridas**

#### **Detecção Inteligente de Intenção**

Substituir sistema de keywords por **NLU (Natural Language Understanding)**:

```javascript
// ATUAL (limitado)
if (lowerQuery.includes('observador')) {
    // busca ranking
}

// PROPOSTA (inteligente)
const intent = await detectIntent(userQuery);
// Retorna: { type: 'observer_ranking', confidence: 0.95 }
```

**Benefícios:**
- Entende sinônimos ("professor que mais registra" = observador)
- Entende contexto ("E quantos são negativos?" após pergunta sobre FOs)
- Detecta múltiplas intenções em uma pergunta

#### **Memória de Conversação**

Implementar histórico de contexto:

```javascript
// Manter últimas 5 perguntas + respostas
const conversationHistory = [
    { user: "FOs da semana", ai: "76 FOs...", data: {...} },
    { user: "Quantos negativos?", ai: "45 negativos", data: {...} }
];
```

**Benefícios:**
- Respostas contextualizadas
- Perguntas de acompanhamento funcionam
- Experiência mais natural

#### **Queries Otimizadas**

Usar queries compostas do Firestore em vez de filtrar no cliente:

```javascript
// ATUAL (ineficiente)
const snapshot = await getDocs(query(collection(db, 'fatosObservados')));
const filtered = snapshot.docs.filter(/* filtros complexos */);

// PROPOSTA (eficiente)
const q = query(
    collection(db, 'fatosObservados'),
    where('dataAdtBI', '>=', weekStart),
    where('dataAdtBI', '<=', weekEnd),
    where('company', '==', companyFilter)
);
```

**Benefícios:**
- Menos reads do Firebase
- Respostas mais rápidas
- Menor custo

#### **Dados Relacionados**

Criar views/agregações pré-calculadas:

```javascript
// Nova coleção: studentSummary
{
    studentNumber: 12345,
    totalFOs: 15,
    negativeFOs: 12,
    positiveFOs: 3,
    lastFODate: "2024-12-30",
    sanctions: { advertencia: 3, repreensao: 1 },
    comportamento: { current: 7.5, previous: 8.2, variation: -0.7 },
    faltas: { total: 12, lastWeek: 3 }
}
```

**Benefícios:**
- Busca rápida de dados completos de um aluno
- Queries complexas sem joins manuais
- Análises agregadas instantâneas

---

### 📈 **5.3 Novas Perguntas que Poderiam Ser Respondidas**

Com as melhorias propostas, o assistente poderia responder:

#### Sobre Alunos Individuais:
- "Mostre o histórico completo do aluno 12345"
- "Quantos FOs negativos o aluno 67890 já recebeu?"
- "Quando foi o último FO do aluno 11223?"
- "O aluno 12345 está melhorando ou piorando?"

#### Sobre Reincidência:
- "Quais alunos já receberam mais de 3 advertências?"
- "Alunos que mais reincidiram em celular"
- "Quem está próximo de AOE por acúmulo de faltas?"

#### Sobre Turmas:
- "Qual turma tem mais FOs negativos?"
- "Compare a 601 com a 602"
- "Ranking de turmas por comportamento"

#### Sobre Correlações:
- "Alunos faltosos também têm mais FOs negativos?"
- "FOs pedagógicos afetam o comportamento?"
- "Existe relação entre notas e faltas?"

#### Sobre Tendências:
- "Como evoluiu o comportamento nos últimos 3 meses?"
- "Temos mais ou menos FOs que no ano passado?"
- "Há padrão sazonal de FOs (mais em certas épocas)?"

#### Sobre Observadores:
- "Quais observadores registram mais FOs positivos?"
- "Existe viés de observador?"
- "Qual observador tem o registro mais equilibrado?"

#### Sobre Processamento:
- "Quanto tempo demora para processar um FO em média?"
- "Quais FOs estão travados há mais tempo?"
- "Qual status tem mais FOs acumulados?"

#### Sobre RICM:
- "Qual falta disciplinar é mais cometida?"
- "Quantos FOs foram enquadrados no artigo 20?"
- "Quais agravantes são mais aplicados?"

#### Sobre Ações:
- "Que intervenção fazer com aluno reincidente em tarefas?"
- "Devo convocar responsável do aluno 12345?"
- "Liste alunos que precisam de atenção urgente"

---

## 📊 Resumo de Capacidades

| Capacidade | Status Atual | Prioridade Melhoria |
|-----------|--------------|---------------------|
| Estatísticas de FOs | ✅ Implementado | - |
| Ranking de Observadores | ✅ Implementado | 🟡 Melhorar (separar por tipo) |
| FOs para Aditamento | ✅ Implementado | - |
| Faltas Escolares | ✅ Implementado | 🟡 Correlacionar com FOs |
| Enquadramento RICM | ✅ Implementado | 🟢 Melhorar precisão |
| Cumprimento AOE/Retirada | ✅ Implementado | - |
| Sanções Aplicadas | ✅ Implementado | 🟡 Adicionar tendências |
| Comportamento em Queda | ✅ Implementado | - |
| FOs Pedagógicos | ✅ Implementado | 🟡 Expandir keywords |
| **Histórico de Aluno** | ❌ Não implementado | 🔴 Alta |
| **Análise de Reincidência** | ❌ Não implementado | 🔴 Alta |
| **Comparação de Períodos** | ❌ Não implementado | 🔴 Alta |
| **Análise por Turma** | ❌ Não implementado | 🔴 Alta |
| **Alertas Preventivos** | ❌ Não implementado | 🔴 Alta |
| **Análise por Artigo RICM** | ❌ Não implementado | 🟡 Média |
| **Correlação Faltas × FOs** | ❌ Não implementado | 🟡 Média |
| **Tempo de Processamento** | ❌ Não implementado | 🟡 Média |
| **Tendências Temporais** | ❌ Não implementado | 🟡 Média |
| **Memória de Conversação** | ❌ Não implementado | 🟡 Média |

---

## 🎯 Conclusão

O assistente de IA atual é **funcional e útil** para consultas básicas de estatísticas, mas tem **grande potencial de expansão**.

**Principais gaps:**
1. Falta análise individual de alunos
2. Não detecta padrões e reincidências
3. Não compara períodos ou faz tendências
4. Detecção de intenção muito simples
5. Sem memória de conversação

**Próximos passos recomendados:**
1. Implementar busca de histórico individual de aluno (alta prioridade)
2. Criar análise de reincidência (alta prioridade)
3. Adicionar comparação de períodos (alta prioridade)
4. Melhorar detecção de keywords para sinônimos
5. Implementar queries mais eficientes

---

**Documentado por:** Claude Code
**Última atualização:** 30/12/2024
