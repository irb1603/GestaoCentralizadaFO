// Script temporário para salvar credenciais do Gmail no Firestore
// Execute: node src/scripts/saveEmailConfig.js

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase config (mesmo do projeto)
const firebaseConfig = {
    apiKey: "AIzaSyC4eTl8dG_oj4GbJ5k7b3r7xSYFDQtHvmE",
    authDomain: "gestaocentralizadafo.firebaseapp.com",
    projectId: "gestaocentralizadafo",
    storageBucket: "gestaocentralizadafo.firebasestorage.app",
    messagingSenderId: "489924020490",
    appId: "1:489924020490:web:a6a8c5b7c6d8e9f0a1b2c3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function saveEmailConfig() {
    const config = {
        email: '2ciaalcmb@gmail.com',
        clientId: '489924020490-7trvleiabo9iu1b0muok4d4ovpgpdnjp.apps.googleusercontent.com',
        clientSecret: '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',
        refreshToken: '1//0hv9Oz5nWRVEJCgYIARAAGBESNwF-L9IrgGSvLwLQHeVJ6mEZqbmT-TGyNUNFSkv1F03RXo8prWI7MH9u9fA9Z1x6LhE93eZZpYQ',
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
