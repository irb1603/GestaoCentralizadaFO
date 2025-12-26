// Script para salvar credenciais do Gmail da 9cia no Firestore
// Execute: node scripts/add9ciaEmail.mjs
// IMPORTANTE: Copie este arquivo para add9ciaEmail.mjs e preencha com os valores reais

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDMNd9PiJMPjbN_iIu-bC-P3_q5TuDZJtA",
    authDomain: "gestaocentralizadafo.firebaseapp.com",
    projectId: "gestaocentralizadafo",
    storageBucket: "gestaocentralizadafo.firebasestorage.app",
    messagingSenderId: "792421596642",
    appId: "1:792421596642:web:2d4b6e80f8b3c9d8c7e6f5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function saveEmailConfig() {
    // Get existing 2cia config to copy clientId and clientSecret
    const existingConfig = await getDoc(doc(db, 'emailConfigs', '2cia'));

    if (!existingConfig.exists()) {
        console.error('❌ Configuração da 2cia não encontrada. Configure primeiro a 2cia.');
        process.exit(1);
    }

    const existingData = existingConfig.data();

    const config = {
        email: '9ciacmbfafd@gmail.com',
        clientId: existingData.clientId,
        clientSecret: existingData.clientSecret,
        refreshToken: 'COLE_O_REFRESH_TOKEN_AQUI', // Obtenha o refresh token do OAuth playground
        active: true,
        createdAt: new Date().toISOString()
    };

    try {
        await setDoc(doc(db, 'emailConfigs', '9cia'), config);
        console.log('✅ Credenciais da 9cia salvas com sucesso!');
        console.log('Collection: emailConfigs');
        console.log('Document ID: 9cia');
        console.log('Email:', config.email);
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        process.exit(1);
    }
}

saveEmailConfig();
