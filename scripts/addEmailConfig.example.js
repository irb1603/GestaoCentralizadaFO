/**
 * Script para adicionar configuração de email no Firebase
 * Uso:
 *   1. Copie este arquivo para addEmailConfig.js
 *   2. Preencha as credenciais reais
 *   3. Execute: node scripts/addEmailConfig.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Configuração do Firebase (mesma do projeto)
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "gestaocentralizadafo.firebaseapp.com",
    projectId: "gestaocentralizadafo",
    storageBucket: "gestaocentralizadafo.firebasestorage.app",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
};

// ============================================
// PREENCHA AQUI OS DADOS DA COMPANHIA
// ============================================

const CONFIG = {
    companyId: '3cia',  // ID do documento (3cia, 6cia, 7cia, etc.)
    email: 'email@gmail.com',
    refreshToken: 'SEU_REFRESH_TOKEN_AQUI',
    clientId: 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com',
    clientSecret: 'SEU_CLIENT_SECRET_AQUI',
    active: true
};

// ============================================

async function addEmailConfig() {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    try {
        await setDoc(doc(db, 'emailConfigs', CONFIG.companyId), {
            email: CONFIG.email,
            refreshToken: CONFIG.refreshToken,
            clientId: CONFIG.clientId,
            clientSecret: CONFIG.clientSecret,
            active: CONFIG.active,
            createdAt: new Date().toISOString()
        });

        console.log(`✅ Configuração salva para ${CONFIG.companyId} (${CONFIG.email})`);
    } catch (error) {
        console.error('❌ Erro ao salvar:', error.message);
    }

    process.exit(0);
}

addEmailConfig();
