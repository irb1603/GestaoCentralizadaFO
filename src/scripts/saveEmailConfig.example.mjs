// Script temporário para salvar credenciais do Gmail no Firestore
// Execute:
//   1. Copie este arquivo para saveEmailConfig.mjs
//   2. Preencha as credenciais reais
//   3. Execute: node src/scripts/saveEmailConfig.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase config (mesmo do projeto)
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

async function saveEmailConfig() {
    const config = {
        email: 'email@gmail.com',
        clientId: 'SEU_CLIENT_ID.apps.googleusercontent.com',
        clientSecret: 'SEU_CLIENT_SECRET',
        refreshToken: 'SEU_REFRESH_TOKEN',
        active: true,
        createdAt: new Date().toISOString()
    };

    try {
        await setDoc(doc(db, 'emailConfigs', '2cia'), config);
        console.log('✅ Credenciais salvas com sucesso!');
        console.log('Collection: emailConfigs');
        console.log('Document ID: 2cia');
        console.log('Email:', config.email);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        process.exit(1);
    }
}

saveEmailConfig();
