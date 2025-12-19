# Configuração Gmail API - Gestão Centralizada FO

## Visão Geral
Este guia explica como configurar a Gmail API para envio automático de emails.
Cada conta Gmail tem limite de **500 emails/dia**.

---

## Passo 1: Criar Projeto no Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Clique em **"Selecionar projeto"** → **"Novo Projeto"**
3. Nome: `GestaoCentralizadaFO-Email`
4. Clique **"Criar"**
5. Aguarde a criação e selecione o projeto

---

## Passo 2: Ativar Gmail API

1. No menu lateral, vá em **APIs e Serviços** → **Biblioteca**
2. Pesquise por **"Gmail API"**
3. Clique em **Gmail API** → **"Ativar"**

---

## Passo 3: Configurar Tela de Consentimento OAuth

1. Vá em **APIs e Serviços** → **Tela de consentimento OAuth**
2. Selecione **"Externo"** → **"Criar"**
3. Preencha:
   - Nome do app: `Gestão FO CMB`
   - Email de suporte: seu email
   - Domínios autorizados: (deixe vazio por enquanto)
   - Email do desenvolvedor: seu email
4. Clique **"Salvar e continuar"**
5. Em **Acesso a dados**, clique **"Adicionar ou remover escopos"**
6. Adicione o escopo: `https://www.googleapis.com/auth/gmail.send`
7. Clique **"Atualizar"** → **"Salvar e continuar"**
8. Em **Usuários de teste**, adicione:
   - `2ciaalcmb@gmail.com`
   - (adicione as outras contas conforme necessário)
9. Clique **"Salvar e continuar"**

---

## Passo 4: Criar Credenciais OAuth 2.0

1. Vá em **APIs e Serviços** → **Credenciais**
2. Clique **"+ Criar Credenciais"** → **"ID do cliente OAuth"**
3. Tipo de aplicativo: **"Aplicativo da Web"**
4. Nome: `GestaoCentralizadaFO Web`
5. Em **URIs de redirecionamento autorizados**, adicione:
   - `http://localhost:5173/oauth-callback`
   - `https://seu-dominio.web.app/oauth-callback` (para produção)
6. Clique **"Criar"**
7. **ANOTE** o **Client ID** e **Client Secret**

---

## Passo 5: Obter Refresh Token para cada conta

### Para a conta 2ciaalcmb@gmail.com:

1. Abra o navegador em modo **anônimo/privado**
2. Acesse a URL (substitua CLIENT_ID):

```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=SEU_CLIENT_ID.apps.googleusercontent.com&
  redirect_uri=http://localhost:5173/oauth-callback&
  response_type=code&
  scope=https://www.googleapis.com/auth/gmail.send&
  access_type=offline&
  prompt=consent
```

3. Faça login com `2ciaalcmb@gmail.com`
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
  -d "redirect_uri=http://localhost:5173/oauth-callback"
```

A resposta terá o **refresh_token**. **GUARDE ESTE TOKEN!**

---

## Passo 6: Salvar Credenciais no Firebase

Salve na collection `emailConfigs`:

```javascript
// Documento ID: "2cia"
{
  "email": "2ciaalcmb@gmail.com",
  "refreshToken": "SEU_REFRESH_TOKEN",
  "clientId": "SEU_CLIENT_ID.apps.googleusercontent.com",
  "clientSecret": "SEU_CLIENT_SECRET",
  "active": true
}
```

> ⚠️ **IMPORTANTE**: Em produção, use Firebase Functions com variáveis de ambiente secretas!

---

## Repetir para outras contas

Para cada conta (3cia, 6cia, 7cia, 8cia, 9cia, 1cia):

1. Adicione a conta como **usuário de teste** (Passo 3, item 8)
2. Faça login com a conta (Passo 5)
3. Obtenha o refresh token
4. Salve no Firebase com o ID correspondente (3cia, 6cia, etc.)

---

## Credenciais Atuais

| Companhia | Email | Status |
|-----------|-------|--------|
| 2cia | 2ciaalcmb@gmail.com | ⏳ Pendente |
| 3cia | 3ciaalcmb@gmail.com | ❌ Não configurado |
| 6cia | 6ciaalcmb@gmail.com | ❌ Não configurado |
| 7cia | 7ciaalcmb@gmail.com | ❌ Não configurado |
| 8cia | 8ciaalcmb@gmail.com | ❌ Não configurado |
| 9cia | 9ciaalcmb@gmail.com | ❌ Não configurado |
| 1cia | 1ciaalcmb@gmail.com | ❌ Não configurado |

---

## Limites

- **Por conta Gmail gratuita**: 500 emails/dia
- **Por conta Workspace**: 2.000 emails/dia
- **Total com 7 contas gratuitas**: 3.500 emails/dia
