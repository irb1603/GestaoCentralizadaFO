// Script de teste - Enviar email via Gmail API
// Execute:
//   1. Copie este arquivo para testEmailSend.mjs
//   2. Preencha as credenciais reais
//   3. Execute: node src/scripts/testEmailSend.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "gestaocentralizadafo.firebaseapp.com",
    projectId: "gestaocentralizadafo",
    storageBucket: "gestaocentralizadafo.firebasestorage.app",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getAccessToken(config) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: config.refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Erro ao renovar token: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    return data.access_token;
}

function createEmailMessage({ to, from, subject, body }) {
    const messageParts = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(body).toString('base64'),
    ];

    return Buffer.from(messageParts.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function sendTestEmail() {
    console.log('🔄 Buscando credenciais do Firestore...');

    const docRef = doc(db, 'emailConfigs', '2cia');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        throw new Error('Configuração não encontrada!');
    }

    const config = docSnap.data();
    console.log('✅ Credenciais encontradas para:', config.email);

    console.log('🔄 Obtendo access token...');
    const accessToken = await getAccessToken(config);
    console.log('✅ Access token obtido!');

    const emailData = {
        to: 'seu-email@gmail.com',
        from: config.email,
        subject: '🎉 Teste Gmail API - Gestão FO CMB',
        body: `Olá!

Este é um email de TESTE enviado automaticamente via Gmail API.

Remetente: ${config.email}
Data/Hora: ${new Date().toLocaleString('pt-BR')}

Se você recebeu este email, a integração está funcionando corretamente!

Atenciosamente,
Sistema de Gestão Centralizada FO - CMB`
    };

    console.log('🔄 Enviando email para:', emailData.to);

    const message = createEmailMessage(emailData);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: message }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Erro ao enviar email: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log('');
    console.log('🎉 EMAIL ENVIADO COM SUCESSO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('De:', emailData.from);
    console.log('Para:', emailData.to);
    console.log('Assunto:', emailData.subject);
    console.log('Message ID:', result.id);
    console.log('');
    console.log('📧 Verifique sua caixa de entrada!');

    process.exit(0);
}

sendTestEmail().catch(error => {
    console.error('❌ Erro:', error.message);
    process.exit(1);
});
