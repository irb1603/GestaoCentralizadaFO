# Scripts de Configuração (src/scripts)

Esta pasta contém scripts utilitários para configuração e teste de email.

## ⚠️ SEGURANÇA

**IMPORTANTE:** Os arquivos `.mjs` desta pasta contêm credenciais sensíveis (Client Secret, Refresh Tokens) e **NÃO devem ser commitados** no Git.

## Como usar

1. Copie o arquivo `.example.mjs` correspondente para `.mjs`:
   ```bash
   cp src/scripts/saveEmailConfig.example.mjs src/scripts/saveEmailConfig.mjs
   cp src/scripts/testEmailSend.example.mjs src/scripts/testEmailSend.mjs
   ```

2. Edite o arquivo `.mjs` e preencha suas credenciais reais do Firebase

3. Execute o script:
   ```bash
   node src/scripts/saveEmailConfig.mjs
   # ou
   node src/scripts/testEmailSend.mjs
   ```

## Scripts disponíveis

### saveEmailConfig.mjs
Salva as credenciais do Gmail OAuth no Firestore para uma companhia.

### testEmailSend.mjs
Testa o envio de email buscando as credenciais do Firestore.

## Notas

- Os arquivos `.mjs` estão no `.gitignore` para proteger suas credenciais
- Apenas os arquivos `.example.mjs` são versionados no Git
- Nunca compartilhe seus arquivos `.mjs` que contêm credenciais reais
- Use preferencialmente os scripts na pasta raiz `/scripts` que são mais atualizados
