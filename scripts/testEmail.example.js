/**
 * Script para testar envio de email via Gmail API
 * Uso:
 *   1. Copie este arquivo para testEmail.js
 *   2. Preencha as credenciais reais do Firebase
 *   3. Execute: node scripts/testEmail.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "gestaocentralizadafo.firebaseapp.com",
    projectId: "gestaocentralizadafo",
    storageBucket: "gestaocentralizadafo.firebasestorage.app",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
};

// ============================================
// CONFIGURE O TESTE AQUI
// ============================================
const COMPANY_ID = '8cia';  // ID da companhia a testar
const TEST_EMAIL = 'seu-email@gmail.com';  // Seu email para receber o teste
// ============================================

async function testEmailSending() {
    console.log('🔄 Iniciando teste de email...\n');

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // 1. Buscar configuração de email
    console.log(`📧 Buscando configuração para ${COMPANY_ID}...`);
    const configDoc = await getDoc(doc(db, 'emailConfigs', COMPANY_ID));

    if (!configDoc.exists()) {
        console.error(`❌ Configuração não encontrada para ${COMPANY_ID}`);
        process.exit(1);
    }

    const config = configDoc.data();
    console.log(`   ✓ Email: ${config.email}`);
    console.log(`   ✓ Active: ${config.active}`);

    // 2. Obter access token
    console.log('\n🔑 Obtendo access token...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: config.refreshToken,
            grant_type: 'refresh_token'
        })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
        console.error(`❌ Erro ao obter token: ${tokenData.error_description}`);
        process.exit(1);
    }

    console.log('   ✓ Access token obtido com sucesso!');

    // 3. Enviar email de teste
    console.log(`\n📤 Enviando email de teste para ${TEST_EMAIL}...`);

    const emailContent = `From: ${config.email}
To: ${TEST_EMAIL}
Subject: =?UTF-8?B?${Buffer.from('Teste - Gestão Centralizada FO').toString('base64')}?=
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

<html>
<body>
  <h2>Teste de Email - Gestão Centralizada FO</h2>
  <p>Este é um email de teste enviado por <strong>${config.email}</strong></p>
  <p>Data/Hora: ${new Date().toLocaleString('pt-BR')}</p>
  <hr>
  <p style="color: green;">✅ Se você está vendo esta mensagem, o envio está funcionando!</p>
</body>
</html>`;

    const base64Email = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: base64Email })
    });

    const sendData = await sendResponse.json();

    if (sendData.error) {
        console.error(`❌ Erro ao enviar: ${sendData.error.message}`);
        process.exit(1);
    }

    console.log('   ✓ Email enviado com sucesso!');
    console.log(`   Message ID: ${sendData.id}`);
    console.log(`\n✅ TESTE CONCLUÍDO! Verifique sua caixa de entrada em ${TEST_EMAIL}`);

    process.exit(0);
}

testEmailSending().catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
});
