# Guia de Migração: Firebase para Supabase

## Sistema de Gestão Centralizada FO - Colégio Militar de Brasília

**Versão:** 1.0
**Data:** Dezembro 2024
**Status:** Documento de referência para futura migração

---

## Índice

1. [Por que migrar para Supabase?](#1-por-que-migrar-para-supabase)
2. [Comparativo Firebase vs Supabase](#2-comparativo-firebase-vs-supabase)
3. [Estrutura Atual do Firebase](#3-estrutura-atual-do-firebase)
4. [Schema PostgreSQL (Supabase)](#4-schema-postgresql-supabase)
5. [Plano de Migração em 5 Fases](#5-plano-de-migração-em-5-fases)
6. [Adaptação do Código JavaScript](#6-adaptação-do-código-javascript)
7. [Migração de Storage](#7-migração-de-storage)
8. [Row Level Security (RLS)](#8-row-level-security-rls)
9. [Scripts de Migração de Dados](#9-scripts-de-migração-de-dados)
10. [Checklist de Migração](#10-checklist-de-migração)

---

## 1. Por que migrar para Supabase?

### Limitações do Firebase (Plano Gratuito Spark)
- **50.000 leituras/dia** - Limite que pode ser atingido com uso intenso
- **20.000 escritas/dia**
- **20.000 exclusões/dia**
- Cobrança por operação no plano pago

### Vantagens do Supabase (Plano Gratuito)
- **Sem limite de leituras/escritas** - Cobrança apenas por armazenamento
- **500 MB** de banco de dados PostgreSQL
- **1 GB** de Storage para arquivos
- **API REST** automática
- **Autenticação** integrada
- **Realtime** subscriptions incluído
- **Backup automático** diário

### Quando considerar a migração?
- Se o uso ultrapassar 30.000+ leituras/dia consistentemente
- Se o custo do Firebase Blaze se tornar significativo
- Se precisar de queries SQL mais complexas

---

## 2. Comparativo Firebase vs Supabase

| Aspecto | Firebase Firestore | Supabase PostgreSQL |
|---------|-------------------|---------------------|
| **Tipo de DB** | NoSQL (documentos) | SQL (relacional) |
| **Queries** | where(), orderBy() limitados | SQL completo, JOINs |
| **Cobrança** | Por leitura/escrita | Por armazenamento |
| **Limite grátis** | 50K reads/day | 500MB storage |
| **Autenticação** | Firebase Auth | Supabase Auth |
| **Storage** | Firebase Storage | Supabase Storage |
| **Realtime** | onSnapshot() | Realtime subscriptions |
| **SDK** | firebase/firestore | @supabase/supabase-js |

---

## 3. Estrutura Atual do Firebase

### 3.1 Coleção: `fatosObservados`
Principal coleção do sistema - Fatos Observados (FOs)

```javascript
{
  id: string,                    // Auto-generated
  anoEscolar: string,           // '6cia', '7cia', '8cia', '9cia', '1cia', '2cia', '3cia'
  company: string,              // Mesmo que anoEscolar
  studentNumbers: number[],      // Array de números dos alunos
  studentInfo: [{               // Array denormalizado
    numero: number,
    nome: string,
    turma: string
  }],
  tipo: string,                 // 'positivo', 'negativo', 'neutro'
  dataFato: string,             // YYYY-MM-DD
  horaFato: string,             // HH:MM
  descricao: string,            // Descrição do fato
  nomeObservador: string,       // Nome do observador
  registradoPor: string,        // Username
  status: string,               // Workflow status
  dataRegistro: string,         // YYYY-MM-DD
  tipoFO: string,               // 'individual'

  // Sanção
  sancaoDisciplinar: string,    // 'ADVERTENCIA', 'REPREENSAO', 'ATIVIDADE_OE', 'RETIRADA'
  sancaoAplicada: string,       // Texto da sanção

  // Enquadramento RICM
  enquadramento: {
    falta: string,
    atenuantes: string[],
    agravantes: string[]
  },

  // Datas
  dataCumprimento: string,
  datasCumprimento: string[],
  dataAdtBI: string,

  // Timestamps
  createdAt: Timestamp,
  updatedAt: string
}
```

### 3.2 Coleção: `students`
Cadastro de alunos

```javascript
{
  id: string,                   // = numero
  numero: number,               // Número do aluno (PK)
  nome: string,
  turma: string,                // Ex: '601', '702', '1001'
  company: string,              // Derivado da turma
  anoEscolar: string,
  email: string,
  telefone: string,
  endereco: string,
  responsavel: string,
  contatoResponsavel: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 3.3 Coleção: `users`
Usuários do sistema (autenticação customizada)

```javascript
{
  id: string,                   // = username
  username: string,
  password: string,             // Texto plano (sistema legado)
  role: string,                 // 'admin', 'comandoCA', 'commander', 'sergeant', 'auxiliar'
  company: string,              // Companhia associada
  allowedPages: string[],       // Páginas permitidas (auxiliar)
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 3.4 Coleção: `auditLog`
Trilha de auditoria

```javascript
{
  id: string,
  action: string,               // 'create', 'update', 'delete'
  collection: string,
  documentId: string,
  company: string,
  userId: string,
  userName: string,
  role: string,
  timestamp: Timestamp,
  previousData: string,         // JSON stringified
  newData: string               // JSON stringified
}
```

### 3.5 Coleção: `faltasEscolares`
Registro de faltas escolares

```javascript
{
  id: string,
  data: string,                 // YYYY-MM-DD
  turma: string,
  company: string,
  alunos: [{
    numero: number,
    nome: string,
    turma: string,
    tempos: {
      'tempo1': boolean,
      'tempo2': boolean,
      // ... até tempo6
    }
  }],
  registradoPor: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 3.6 Coleção: `foRegistradores`
Autenticação do formulário público

```javascript
{
  id: string,
  usuario: string,
  senha: string,
  nomeCompleto: string,
  createdAt: string,
  updatedAt: string,
  autoCadastro: boolean
}
```

### 3.7 Coleção: `aiConfigs`
Configuração de IA por companhia

```javascript
{
  id: string,                   // 'admin', '6cia', etc.
  apiKey: string,
  model: string,
  maxTokens: number,
  temperature: number
}
```

### 3.8 Coleção: `aiConversations`
Histórico de conversas com IA

```javascript
{
  id: string,
  username: string,
  company: string,
  role: string,
  query: string,
  response: string,
  model: string,
  timestamp: Timestamp
}
```

### 3.9 Coleção: `comportamento`
Notas de comportamento

```javascript
{
  id: string,
  studentNumber: string,
  studentName: string,
  turma: string,
  company: string,
  nota: number,                 // 0-10
  dataConsolidacao: string,
  sancoesAplicadas: {
    advertencias: number,
    repreensoes: number,
    aoes: number,
    retiradas: number,
    diasRetirada: number
  },
  diasSemSancao: number,
  bonusAcumulado: number,
  historico: [{
    data: string,
    notaAnterior: number,
    notaNova: number,
    motivo: string
  }]
}
```

### 3.10 Coleção: `termosCiencia`
Termos de ciência assinados

```javascript
{
  id: string,
  studentNumber: number,
  fileName: string,
  fileUrl: string,
  uploadedAt: string,
  uploadedBy: string,
  type: string,
  documentType: string,
  tags: string[]
}
```

### 3.11 Coleção: `outrosDocumentos`
Documentos adicionais

```javascript
{
  id: string,
  studentNumber: number,
  fileName: string,
  fileUrl: string,
  uploadedAt: string,
  uploadedBy: string,
  type: string,
  category: string,
  tags: string[]
}
```

### 3.12 Coleção: `emailLogs`
Log de emails enviados

```javascript
{
  id: string,
  recipient: string,
  subject: string,
  foId: string,
  status: string,
  timestamp: Timestamp,
  error: string
}
```

---

## 4. Schema PostgreSQL (Supabase)

### 4.1 Tabela: `students`

```sql
CREATE TABLE students (
    numero INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    turma VARCHAR(10) NOT NULL,
    company VARCHAR(10) NOT NULL,
    ano_escolar VARCHAR(10),
    email TEXT,
    telefone VARCHAR(20),
    endereco TEXT,
    responsavel TEXT,
    contato_responsavel VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT
);

CREATE INDEX idx_students_company ON students(company);
CREATE INDEX idx_students_turma ON students(turma);
```

### 4.2 Tabela: `users`

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'comandoCA', 'commander', 'sergeant', 'auxiliar')),
    company VARCHAR(10),
    allowed_pages TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_company ON users(company);
```

### 4.3 Tabela: `fatos_observados`

```sql
CREATE TABLE fatos_observados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company VARCHAR(10) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('positivo', 'negativo', 'neutro')),
    data_fato DATE NOT NULL,
    hora_fato TIME,
    descricao TEXT NOT NULL,
    nome_observador TEXT NOT NULL,
    registrado_por TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pendente',
    data_registro DATE DEFAULT CURRENT_DATE,
    tipo_fo VARCHAR(20) DEFAULT 'individual',

    -- Sanção
    sancao_disciplinar VARCHAR(30),
    sancao_aplicada TEXT,

    -- Enquadramento RICM
    enquadramento_falta TEXT,
    enquadramento_atenuantes TEXT[],
    enquadramento_agravantes TEXT[],

    -- Datas
    datas_cumprimento DATE[],
    data_adt_bi DATE,

    -- GLPI
    glpi_ticket VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fo_company ON fatos_observados(company);
CREATE INDEX idx_fo_status ON fatos_observados(status);
CREATE INDEX idx_fo_data_fato ON fatos_observados(data_fato);
CREATE INDEX idx_fo_created_at ON fatos_observados(created_at DESC);
```

### 4.4 Tabela: `fo_students` (Relacionamento N:N)

```sql
-- Tabela de relacionamento entre FOs e alunos
CREATE TABLE fo_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fo_id UUID REFERENCES fatos_observados(id) ON DELETE CASCADE,
    student_numero INTEGER REFERENCES students(numero),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fo_id, student_numero)
);

CREATE INDEX idx_fo_students_fo ON fo_students(fo_id);
CREATE INDEX idx_fo_students_student ON fo_students(student_numero);
```

### 4.5 Tabela: `audit_log`

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(20) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id TEXT NOT NULL,
    company VARCHAR(10),
    user_id TEXT NOT NULL,
    user_name TEXT,
    user_role VARCHAR(20),
    previous_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_company ON audit_log(company);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_table ON audit_log(table_name);
```

### 4.6 Tabela: `faltas_escolares`

```sql
CREATE TABLE faltas_escolares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    turma VARCHAR(10) NOT NULL,
    company VARCHAR(10) NOT NULL,
    registrado_por TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_faltas_data ON faltas_escolares(data);
CREATE INDEX idx_faltas_company ON faltas_escolares(company);
```

### 4.7 Tabela: `faltas_alunos` (Detalhes por aluno)

```sql
CREATE TABLE faltas_alunos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    falta_id UUID REFERENCES faltas_escolares(id) ON DELETE CASCADE,
    student_numero INTEGER REFERENCES students(numero),
    tempo1 BOOLEAN DEFAULT FALSE,
    tempo2 BOOLEAN DEFAULT FALSE,
    tempo3 BOOLEAN DEFAULT FALSE,
    tempo4 BOOLEAN DEFAULT FALSE,
    tempo5 BOOLEAN DEFAULT FALSE,
    tempo6 BOOLEAN DEFAULT FALSE,
    UNIQUE(falta_id, student_numero)
);

CREATE INDEX idx_faltas_alunos_falta ON faltas_alunos(falta_id);
CREATE INDEX idx_faltas_alunos_student ON faltas_alunos(student_numero);
```

### 4.8 Tabela: `fo_registradores`

```sql
CREATE TABLE fo_registradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario VARCHAR(50) UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    nome_completo TEXT NOT NULL,
    auto_cadastro BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registradores_usuario ON fo_registradores(usuario);
```

### 4.9 Tabela: `ai_configs`

```sql
CREATE TABLE ai_configs (
    id VARCHAR(20) PRIMARY KEY,  -- 'admin', '6cia', etc.
    api_key TEXT NOT NULL,
    model VARCHAR(50) DEFAULT 'gemini-2.5-flash-lite',
    max_tokens INTEGER DEFAULT 2048,
    temperature DECIMAL(2,1) DEFAULT 0.7
);
```

### 4.10 Tabela: `ai_conversations`

```sql
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    company VARCHAR(10),
    role VARCHAR(20),
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    model VARCHAR(50),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_conv_timestamp ON ai_conversations(timestamp DESC);
```

### 4.11 Tabela: `comportamento`

```sql
CREATE TABLE comportamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_numero INTEGER REFERENCES students(numero),
    nota DECIMAL(4,2) DEFAULT 10.00,
    data_consolidacao DATE,

    -- Sanções aplicadas
    advertencias INTEGER DEFAULT 0,
    repreensoes INTEGER DEFAULT 0,
    aoes INTEGER DEFAULT 0,
    retiradas INTEGER DEFAULT 0,
    dias_retirada INTEGER DEFAULT 0,

    -- Bônus
    dias_sem_sancao INTEGER DEFAULT 0,
    bonus_acumulado DECIMAL(4,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_numero)
);

CREATE INDEX idx_comportamento_student ON comportamento(student_numero);
```

### 4.12 Tabela: `comportamento_historico`

```sql
CREATE TABLE comportamento_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comportamento_id UUID REFERENCES comportamento(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    nota_anterior DECIMAL(4,2),
    nota_nova DECIMAL(4,2),
    motivo TEXT
);

CREATE INDEX idx_comp_hist_comportamento ON comportamento_historico(comportamento_id);
```

### 4.13 Tabela: `documentos`

```sql
CREATE TABLE documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_numero INTEGER REFERENCES students(numero),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('termo_ciencia', 'outro')),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    category VARCHAR(50),
    tags TEXT[],
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documentos_student ON documentos(student_numero);
CREATE INDEX idx_documentos_tipo ON documentos(tipo);
```

### 4.14 Tabela: `email_logs`

```sql
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    fo_id UUID REFERENCES fatos_observados(id),
    status VARCHAR(20) DEFAULT 'pending',
    error TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_logs_fo ON email_logs(fo_id);
```

---

## 5. Plano de Migração em 5 Fases

### Fase 1: Configuração Inicial (1-2 horas)

1. **Criar conta no Supabase**
   - Acessar https://supabase.com
   - Criar novo projeto "gestaocentralizadafo"
   - Anotar credenciais:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_KEY`

2. **Configurar projeto**
   - Região: South America (São Paulo) - sa-east-1
   - Senha do banco: usar senha forte
   - Habilitar Row Level Security (RLS)

### Fase 2: Criar Schema (2-3 horas)

1. **Executar scripts SQL**
   - Acessar SQL Editor no Supabase
   - Executar scripts da seção 4 em ordem:
     1. students
     2. users
     3. fatos_observados
     4. fo_students
     5. audit_log
     6. Demais tabelas

2. **Criar índices**
   - Executar todos os CREATE INDEX

3. **Configurar RLS**
   - Ver seção 8 para políticas de segurança

### Fase 3: Migração de Dados (4-6 horas)

1. **Exportar dados do Firebase**
   - Usar Firebase Admin SDK
   - Exportar cada coleção para JSON

2. **Transformar dados**
   - Converter formato NoSQL → SQL
   - Normalizar arrays em tabelas relacionais

3. **Importar no Supabase**
   - Usar scripts da seção 9
   - Validar contagens

### Fase 4: Adaptar Código (8-12 horas)

1. **Instalar Supabase SDK**
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Criar novo config**
   - Substituir `src/firebase/config.js`
   - Ver seção 6 para exemplos

3. **Adaptar services**
   - database.js
   - auth.js
   - auditLogger.js
   - cacheService.js (manter!)

4. **Adaptar páginas**
   - Atualizar imports
   - Converter queries

### Fase 5: Migração de Storage (2-3 horas)

1. **Criar buckets no Supabase**
   - `termos-ciencia`
   - `outros-documentos`

2. **Migrar arquivos**
   - Download do Firebase Storage
   - Upload para Supabase Storage

3. **Atualizar URLs**
   - Atualizar referências nos documentos

---

## 6. Adaptação do Código JavaScript

### 6.1 Nova configuração (`src/supabase/config.js`)

```javascript
// Supabase Configuration - Gestão Centralizada FO
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://SEU_PROJETO.supabase.co';
const supabaseKey = 'SUA_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Para operações admin (usar com cuidado)
// const supabaseAdmin = createClient(supabaseUrl, 'SERVICE_KEY');
```

### 6.2 Novo auth service (`src/supabase/auth.js`)

```javascript
// Authentication Service - Supabase
import { supabase } from './config.js';

const SESSION_KEY = 'cmb_session';

// Hardcoded accounts permanecem iguais
const USER_ACCOUNTS = {
    'admin': { role: 'admin', company: null },
    'ComandoCA': { role: 'comandoCA', company: null },
    'Cmt6cia': { role: 'commander', company: '6cia' },
    // ... resto igual
};

export async function validateCredentials(usuario, senha) {
    // 1. Verificar contas hardcoded
    const hardcoded = USER_ACCOUNTS[usuario];

    // 2. Buscar no Supabase
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', usuario)
        .single();

    if (error && !hardcoded) {
        return { success: false, message: 'Usuário não encontrado' };
    }

    // 3. Validar senha
    const storedPassword = user?.password_hash || usuario; // fallback
    if (senha !== storedPassword) {
        return { success: false, message: 'Senha incorreta' };
    }

    // 4. Criar sessão
    const session = {
        username: usuario,
        role: hardcoded?.role || user?.role,
        company: hardcoded?.company || user?.company,
        timestamp: Date.now()
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { success: true, user: session };
}

export function getSession() {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
}

export function logout() {
    sessionStorage.removeItem(SESSION_KEY);
}

export function getCompanyFilter() {
    const session = getSession();
    if (!session) return null;
    if (session.role === 'admin' || session.role === 'comandoCA') return null;
    return session.company;
}
```

### 6.3 Novo database service (`src/supabase/database.js`)

```javascript
// Database Service - Supabase
import { supabase } from './config.js';
import { getCompanyFilter, getSession } from './auth.js';
import { logAction } from '../services/auditLogger.js';

// =============================================
// STUDENTS
// =============================================

export async function getStudents(company = null) {
    let query = supabase
        .from('students')
        .select('*')
        .order('numero', { ascending: true });

    const companyFilter = company || getCompanyFilter();
    if (companyFilter) {
        query = query.eq('company', companyFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function getStudentByNumber(numero) {
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('numero', numero)
        .single();

    if (error) return null;
    return data;
}

export async function createStudent(studentData) {
    const session = getSession();
    const { data, error } = await supabase
        .from('students')
        .insert({
            ...studentData,
            created_by: session?.username,
            updated_by: session?.username
        })
        .select()
        .single();

    if (error) throw error;

    await logAction('create', 'students', data.numero, null, data);
    return data;
}

export async function updateStudent(numero, updates) {
    const session = getSession();
    const previous = await getStudentByNumber(numero);

    const { data, error } = await supabase
        .from('students')
        .update({
            ...updates,
            updated_by: session?.username,
            updated_at: new Date().toISOString()
        })
        .eq('numero', numero)
        .select()
        .single();

    if (error) throw error;

    await logAction('update', 'students', numero, previous, data);
    return data;
}

// =============================================
// FATOS OBSERVADOS
// =============================================

export async function getFOs(status = null) {
    let query = supabase
        .from('fatos_observados')
        .select(`
            *,
            fo_students (
                student_numero,
                students (
                    numero,
                    nome,
                    turma
                )
            )
        `)
        .order('created_at', { ascending: false });

    const companyFilter = getCompanyFilter();
    if (companyFilter) {
        query = query.eq('company', companyFilter);
    }

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Transformar para formato compatível
    return data.map(fo => ({
        ...fo,
        id: fo.id,
        studentNumbers: fo.fo_students.map(fs => fs.student_numero),
        studentInfo: fo.fo_students.map(fs => fs.students)
    }));
}

export async function createFO(foData) {
    const session = getSession();
    const { studentNumbers, studentInfo, ...rest } = foData;

    // 1. Inserir FO
    const { data: fo, error: foError } = await supabase
        .from('fatos_observados')
        .insert({
            ...rest,
            registrado_por: session?.username
        })
        .select()
        .single();

    if (foError) throw foError;

    // 2. Inserir relacionamentos com alunos
    if (studentNumbers?.length > 0) {
        const relations = studentNumbers.map(numero => ({
            fo_id: fo.id,
            student_numero: numero
        }));

        const { error: relError } = await supabase
            .from('fo_students')
            .insert(relations);

        if (relError) throw relError;
    }

    await logAction('create', 'fatos_observados', fo.id, null, fo);
    return fo;
}

export async function updateFO(foId, updates) {
    const session = getSession();

    // Buscar estado anterior
    const { data: previous } = await supabase
        .from('fatos_observados')
        .select('*')
        .eq('id', foId)
        .single();

    const { data, error } = await supabase
        .from('fatos_observados')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', foId)
        .select()
        .single();

    if (error) throw error;

    await logAction('update', 'fatos_observados', foId, previous, data);
    return data;
}

export async function deleteFO(foId) {
    const { data: previous } = await supabase
        .from('fatos_observados')
        .select('*')
        .eq('id', foId)
        .single();

    const { error } = await supabase
        .from('fatos_observados')
        .delete()
        .eq('id', foId);

    if (error) throw error;

    await logAction('delete', 'fatos_observados', foId, previous, null);
}

// =============================================
// AUDIT LOG
// =============================================

export async function getAuditLogs(limit = 100) {
    let query = supabase
        .from('audit_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

    const companyFilter = getCompanyFilter();
    if (companyFilter) {
        query = query.eq('company', companyFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}
```

### 6.4 Comparativo de Queries

| Operação | Firebase | Supabase |
|----------|----------|----------|
| **Buscar todos** | `getDocs(collection(db, 'students'))` | `supabase.from('students').select('*')` |
| **Buscar por ID** | `getDoc(doc(db, 'students', id))` | `supabase.from('students').eq('id', id).single()` |
| **Filtrar** | `query(collection, where('status', '==', 'pendente'))` | `supabase.from('fatos_observados').eq('status', 'pendente')` |
| **Ordenar** | `orderBy('createdAt', 'desc')` | `.order('created_at', { ascending: false })` |
| **Limitar** | `limit(10)` | `.limit(10)` |
| **Criar** | `addDoc(collection, data)` | `supabase.from('table').insert(data)` |
| **Atualizar** | `updateDoc(docRef, data)` | `supabase.from('table').update(data).eq('id', id)` |
| **Deletar** | `deleteDoc(docRef)` | `supabase.from('table').delete().eq('id', id)` |
| **Realtime** | `onSnapshot(query, callback)` | `supabase.from('table').on('*', callback).subscribe()` |

---

## 7. Migração de Storage

### 7.1 Criar Buckets no Supabase

```sql
-- Via SQL ou Dashboard
INSERT INTO storage.buckets (id, name, public) VALUES
    ('termos-ciencia', 'termos-ciencia', false),
    ('outros-documentos', 'outros-documentos', false);
```

### 7.2 Políticas de Storage

```sql
-- Permitir upload autenticado
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('termos-ciencia', 'outros-documentos'));

-- Permitir leitura autenticada
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id IN ('termos-ciencia', 'outros-documentos'));
```

### 7.3 Exemplo de Upload

```javascript
// Firebase (atual)
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storageRef = ref(storage, `termos-ciencia/${studentNumber}/${filename}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);

// Supabase (novo)
const { data, error } = await supabase.storage
    .from('termos-ciencia')
    .upload(`${studentNumber}/${filename}`, file);

const { data: urlData } = supabase.storage
    .from('termos-ciencia')
    .getPublicUrl(`${studentNumber}/${filename}`);
```

---

## 8. Row Level Security (RLS)

### 8.1 Política para `fatos_observados`

```sql
-- Habilitar RLS
ALTER TABLE fatos_observados ENABLE ROW LEVEL SECURITY;

-- Admin e ComandoCA podem ver tudo
CREATE POLICY "Admin full access" ON fatos_observados
    FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'comandoCA')
    );

-- Outros usuários veem apenas sua companhia
CREATE POLICY "Company filtered access" ON fatos_observados
    FOR ALL
    USING (
        company = auth.jwt() ->> 'company'
        OR auth.jwt() ->> 'role' IN ('admin', 'comandoCA')
    );
```

### 8.2 Política para `students`

```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company filtered students" ON students
    FOR ALL
    USING (
        company = auth.jwt() ->> 'company'
        OR auth.jwt() ->> 'role' IN ('admin', 'comandoCA')
    );
```

### 8.3 Política para `audit_log`

```sql
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas leitura para não-admins
CREATE POLICY "Read only for authenticated" ON audit_log
    FOR SELECT
    USING (
        auth.jwt() ->> 'role' NOT IN ('sergeant', 'auxiliar')
        AND (
            company = auth.jwt() ->> 'company'
            OR auth.jwt() ->> 'role' IN ('admin', 'comandoCA')
        )
    );

-- Apenas insert para o sistema
CREATE POLICY "Insert for system" ON audit_log
    FOR INSERT
    WITH CHECK (true);
```

---

## 9. Scripts de Migração de Dados

### 9.1 Script de Exportação Firebase

```javascript
// export-firebase.js
// Executar com: node export-firebase.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Inicializar Firebase Admin
initializeApp({
    credential: cert('./serviceAccount.json')
});

const db = getFirestore();

async function exportCollection(collectionName) {
    const snapshot = await db.collection(collectionName).get();
    const data = [];

    snapshot.forEach(doc => {
        data.push({
            id: doc.id,
            ...doc.data()
        });
    });

    fs.writeFileSync(
        `./export/${collectionName}.json`,
        JSON.stringify(data, null, 2)
    );

    console.log(`Exported ${data.length} documents from ${collectionName}`);
}

// Exportar todas as coleções
const collections = [
    'students',
    'users',
    'fatosObservados',
    'auditLog',
    'faltasEscolares',
    'foRegistradores',
    'aiConfigs',
    'aiConversations',
    'comportamento',
    'termosCiencia',
    'outrosDocumentos',
    'emailLogs'
];

async function main() {
    fs.mkdirSync('./export', { recursive: true });

    for (const collection of collections) {
        await exportCollection(collection);
    }

    console.log('Export complete!');
}

main();
```

### 9.2 Script de Importação Supabase

```javascript
// import-supabase.js
// Executar com: node import-supabase.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    'https://SEU_PROJETO.supabase.co',
    'SUA_SERVICE_KEY'  // Usar service key para bypass RLS
);

async function importStudents() {
    const data = JSON.parse(fs.readFileSync('./export/students.json'));

    const transformed = data.map(s => ({
        numero: s.numero,
        nome: s.nome,
        turma: s.turma,
        company: s.company,
        ano_escolar: s.anoEscolar,
        email: s.email || null,
        telefone: s.telefone || null,
        endereco: s.endereco || null,
        responsavel: s.responsavel || null,
        contato_responsavel: s.contatoResponsavel || null,
        created_at: s.createdAt?._seconds
            ? new Date(s.createdAt._seconds * 1000).toISOString()
            : new Date().toISOString()
    }));

    const { data: result, error } = await supabase
        .from('students')
        .upsert(transformed);

    if (error) throw error;
    console.log(`Imported ${transformed.length} students`);
}

async function importFOs() {
    const data = JSON.parse(fs.readFileSync('./export/fatosObservados.json'));

    for (const fo of data) {
        // 1. Inserir FO
        const foData = {
            id: fo.id,
            company: fo.company,
            tipo: fo.tipo,
            data_fato: fo.dataFato,
            hora_fato: fo.horaFato || null,
            descricao: fo.descricao,
            nome_observador: fo.nomeObservador,
            registrado_por: fo.registradoPor,
            status: fo.status,
            data_registro: fo.dataRegistro,
            tipo_fo: fo.tipoFO || 'individual',
            sancao_disciplinar: fo.sancaoDisciplinar || null,
            sancao_aplicada: fo.sancaoAplicada || null,
            enquadramento_falta: fo.enquadramento?.falta || null,
            enquadramento_atenuantes: fo.enquadramento?.atenuantes || [],
            enquadramento_agravantes: fo.enquadramento?.agravantes || [],
            datas_cumprimento: fo.datasCumprimento ||
                (fo.dataCumprimento ? [fo.dataCumprimento] : []),
            data_adt_bi: fo.dataAdtBI || null,
            glpi_ticket: fo.glpiTicket || null,
            created_at: fo.createdAt?._seconds
                ? new Date(fo.createdAt._seconds * 1000).toISOString()
                : new Date().toISOString()
        };

        const { error: foError } = await supabase
            .from('fatos_observados')
            .upsert(foData);

        if (foError) {
            console.error(`Error importing FO ${fo.id}:`, foError);
            continue;
        }

        // 2. Inserir relacionamentos
        if (fo.studentNumbers?.length > 0) {
            const relations = fo.studentNumbers.map(numero => ({
                fo_id: fo.id,
                student_numero: numero
            }));

            await supabase
                .from('fo_students')
                .upsert(relations);
        }
    }

    console.log(`Imported ${data.length} FOs`);
}

async function importUsers() {
    const data = JSON.parse(fs.readFileSync('./export/users.json'));

    const transformed = data.map(u => ({
        username: u.username || u.id,
        password_hash: u.password || u.username,  // Manter compatibilidade
        role: u.role,
        company: u.company || null,
        allowed_pages: u.allowedPages || null
    }));

    const { error } = await supabase
        .from('users')
        .upsert(transformed, { onConflict: 'username' });

    if (error) throw error;
    console.log(`Imported ${transformed.length} users`);
}

async function main() {
    console.log('Starting import...');

    await importStudents();
    await importUsers();
    await importFOs();
    // Adicionar outras importações...

    console.log('Import complete!');
}

main().catch(console.error);
```

---

## 10. Checklist de Migração

### Pré-migração
- [ ] Criar backup completo do Firebase
- [ ] Exportar todos os dados para JSON
- [ ] Criar conta no Supabase
- [ ] Configurar novo projeto
- [ ] Anotar credenciais

### Schema
- [ ] Criar todas as tabelas (seção 4)
- [ ] Criar índices
- [ ] Configurar RLS (seção 8)
- [ ] Testar políticas de segurança

### Dados
- [ ] Executar script de exportação
- [ ] Transformar dados para formato SQL
- [ ] Executar script de importação
- [ ] Validar contagens de registros
- [ ] Verificar integridade referencial

### Código
- [ ] Instalar @supabase/supabase-js
- [ ] Criar src/supabase/config.js
- [ ] Criar src/supabase/auth.js
- [ ] Criar src/supabase/database.js
- [ ] Atualizar imports em todas as páginas
- [ ] Atualizar serviços (aiService, etc.)
- [ ] Manter cacheService.js (funciona igual)

### Storage
- [ ] Criar buckets no Supabase
- [ ] Configurar políticas de storage
- [ ] Migrar arquivos do Firebase Storage
- [ ] Atualizar URLs nos documentos

### Testes
- [ ] Testar login com todas as roles
- [ ] Testar filtro por companhia
- [ ] Testar CRUD de FOs
- [ ] Testar CRUD de alunos
- [ ] Testar upload de documentos
- [ ] Testar geração de relatórios
- [ ] Testar audit log
- [ ] Testar em produção (staging)

### Deploy
- [ ] Atualizar variáveis de ambiente no Netlify
- [ ] Deploy para staging
- [ ] Testes finais
- [ ] Deploy para produção
- [ ] Monitorar erros
- [ ] Desativar Firebase após confirmação

---

## Referências

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Migração Firebase → Supabase](https://supabase.com/docs/guides/migrations/firebase-auth)

---

**Nota:** Este documento é uma referência para futura migração. O sistema continuará usando Firebase até que seja necessário migrar. Mantenha este documento atualizado conforme o schema do Firebase evolui.
