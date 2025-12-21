# Configuração Gmail API - Gestão Centralizada FO

## Visão Geral
Este guia explica como configurar a Gmail API para envio automático de emails.
Cada conta Gmail tem limite de **500 emails/dia**.

**URL de Produção:** `https://gestaocentralizadafo.netlify.app`

---

## Passo 1: Criar Projeto no Google Cloud Console

> ⚠️ **Você pode usar o MESMO projeto para todas as contas!** Não precisa criar um projeto por conta.

1. Acesse: https://console.cloud.google.com/
2. Se já criou o projeto, selecione **`GestaoCentralizadaFO-Email`**
3. Se não criou ainda:
   - Clique em **"Selecionar projeto"** → **"Novo Projeto"**
   - Nome: `GestaoCentralizadaFO-Email`
   - Clique **"Criar"**

---

## Passo 2: Ativar Gmail API (fazer apenas 1 vez)

1. No menu lateral, vá em **APIs e Serviços** → **Biblioteca**
2. Pesquise por **"Gmail API"**
3. Clique em **Gmail API** → **"Ativar"**

---

## Passo 3: Configurar Tela de Consentimento OAuth (fazer apenas 1 vez)

1. Vá em **APIs e Serviços** → **Tela de consentimento OAuth**
2. Selecione **"Externo"** → **"Criar"**
3. Preencha:
   - Nome do app: `Gestão FO CMB`
   - Email de suporte: seu email
   - Domínios autorizados: `netlify.app`
   - Email do desenvolvedor: seu email
4. Clique **"Salvar e continuar"**
5. Em **Acesso a dados**, clique **"Adicionar ou remover escopos"**
6. Adicione o escopo: `https://www.googleapis.com/auth/gmail.send`
7. Clique **"Atualizar"** → **"Salvar e continuar"**
8. Em **Usuários de teste**, adicione TODAS as contas:
   - `2ciaalcmb@gmail.com` ✅ (já adicionado)
   - `3ciacmb@gmail.com`
   - `6ciacmb@gmail.com`
   - `7ciaalcmb@gmail.com`
   - `sgte8ciacmb@gmail.com`
   - `9ciaalcmb@gmail.com`
   - `1ciacmb2024@gmail.com`
9. Clique **"Salvar e continuar"**

---

## Passo 4: Criar Credenciais OAuth 2.0 (fazer apenas 1 vez)

1. Vá em **APIs e Serviços** → **Credenciais**
2. Clique **"+ Criar Credenciais"** → **"ID do cliente OAuth"**
3. Tipo de aplicativo: **"Aplicativo da Web"**
4. Nome: `GestaoCentralizadaFO Web`
5. Em **URIs de redirecionamento autorizados**, adicione:
   - `https://gestaocentralizadafo.netlify.app/oauth-callback` ← **PRODUÇÃO**
   - `http://localhost:5173/oauth-callback` ← (opcional, para testes locais)
6. Clique **"Criar"**
7. **ANOTE** o **Client ID** e **Client Secret** (são os mesmos para todas as contas)

---

## Passo 5: Obter Refresh Token para cada conta

> 🔄 **Repita este passo para cada conta de email**

### Para a conta 3ciacmb@gmail.com (exemplo):

1. Abra o navegador em modo **anônimo/privado**
2. Acesse a URL (substitua CLIENT_ID pelo seu):

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=SEU_CLIENT_ID.apps.googleusercontent.com&redirect_uri=https://gestaocentralizadafo.netlify.app/oauth-callback&response_type=code&scope=https://www.googleapis.com/auth/gmail.send&access_type=offline&prompt=consent
```

3. Faça login com a conta correspondente (ex: `3ciacmb@gmail.com`)
4. Autorize o app
5. Será redirecionado para uma URL com `?code=XXXXXXX`
6. Copie o **code** da URL

### Trocar Code por Refresh Token:

Execute no terminal:

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=SEU_CLIENT_ID" \
  -d "client_secret=SEU_CLIENT_SECRET" \
  -d "code=CODIGO_OBTIDO" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=https://gestaocentralizadafo.netlify.app/oauth-callback"
```

A resposta terá o **refresh_token**. **GUARDE ESTE TOKEN!**

---

## Passo 6: Salvar Credenciais no Firebase

Salve na collection `emailConfigs` (um documento por companhia):

```javascript
// Documento ID: "3cia" (ou 6cia, 7cia, etc.)
{
  "email": "3ciacmb@gmail.com",
  "refreshToken": "SEU_REFRESH_TOKEN",
  "clientId": "SEU_CLIENT_ID.apps.googleusercontent.com",
  "clientSecret": "SEU_CLIENT_SECRET",
  "active": true
}
```

---

## Lista de Contas e Status

| Cia | Email | Doc ID Firebase | Status |
|-----|-------|-----------------|--------|
| 2cia | 2ciaalcmb@gmail.com | `2cia` | ✅ Configurado |
| 3cia | 3ciacmb@gmail.com | `3cia` | ⏳ Próximo |
| 6cia | 6ciacmb@gmail.com | `6cia` | ❌ Pendente |
| 7cia | 7ciaalcmb@gmail.com | `7cia` | ❌ Pendente |
| 8cia | sgte8ciacmb@gmail.com | `8cia` | ❌ Pendente |
| 9cia | 9ciaalcmb@gmail.com | `9cia` | ❌ Pendente |
| 1cia | 1ciacmb2024@gmail.com | `1cia` | ❌ Pendente |

---

## Resumo das Diferenças (Produção vs Local)

| Item | Local | Produção |
|------|-------|----------|
| Redirect URI | `http://localhost:5173/oauth-callback` | `https://gestaocentralizadafo.netlify.app/oauth-callback` |
| Client ID/Secret | Mesmos | Mesmos |
| Refresh Token | Diferente por conta | Diferente por conta |

---

## Limites

- **Por conta Gmail gratuita**: 500 emails/dia
- **Por conta Workspace**: 2.000 emails/dia
- **Total com 7 contas gratuitas**: 3.500 emails/dia
