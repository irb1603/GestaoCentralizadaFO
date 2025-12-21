# Scripts de Configuração

Esta pasta contém scripts utilitários para configuração do sistema.

## ⚠️ SEGURANÇA

**IMPORTANTE:** Os arquivos `.js` desta pasta contêm credenciais sensíveis e **NÃO devem ser commitados** no Git.

## Como usar

1. Copie o arquivo `.example.js` correspondente para `.js`:
   ```bash
   cp scripts/addEmailConfig.example.js scripts/addEmailConfig.js
   cp scripts/testEmail.example.js scripts/testEmail.js
   ```

2. Edite o arquivo `.js` e preencha suas credenciais reais

3. Execute o script:
   ```bash
   node scripts/addEmailConfig.js
   # ou
   node scripts/testEmail.js
   ```

## Scripts disponíveis

### addEmailConfig.js
Adiciona ou atualiza a configuração de email de uma companhia no Firebase.

### testEmail.js
Testa o envio de email usando as credenciais configuradas no Firebase.

## Credenciais necessárias

- **Firebase API Key**: Obtida no console do Firebase
- **Gmail OAuth Client ID/Secret**: Obtidos no Google Cloud Console
- **Refresh Token**: Obtido seguindo o guia em `GMAIL_API_SETUP.md`

## Notas

- Os arquivos `.js` estão no `.gitignore` para proteger suas credenciais
- Apenas os arquivos `.example.js` são versionados no Git
- Nunca compartilhe seus arquivos `.js` que contêm credenciais reais
