// Firebase Configuration
// Gestão Centralizada FO - CMB
//
// As credenciais são carregadas de variáveis de ambiente (.env)
// Para desenvolvimento local, crie um arquivo .env na raiz do projeto
// Para produção (Netlify), configure as variáveis em Site Settings > Environment Variables
//
// Variáveis necessárias:
// - VITE_FIREBASE_API_KEY
// - VITE_FIREBASE_AUTH_DOMAIN
// - VITE_FIREBASE_PROJECT_ID
// - VITE_FIREBASE_STORAGE_BUCKET
// - VITE_FIREBASE_MESSAGING_SENDER_ID
// - VITE_FIREBASE_APP_ID
// - VITE_FIREBASE_MEASUREMENT_ID

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate configuration
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

let app = null;
let db = null;
let auth = null;

if (missingKeys.length > 0) {
    const errorMsg = `[Firebase] Variáveis de ambiente não configuradas: ${missingKeys.map(k => `VITE_FIREBASE_${k.toUpperCase()}`).join(', ')}`;
    console.error(errorMsg);
    console.error('[Firebase] Configure as variáveis no arquivo .env (local) ou nas Environment Variables do Netlify (produção)');

    // Show error in UI
    document.addEventListener('DOMContentLoaded', () => {
        const appDiv = document.getElementById('app');
        if (appDiv) {
            appDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1f2e; color: #fff;">
                    <div style="background: #dc3545; color: white; padding: 1.5rem 2rem; border-radius: 8px; max-width: 600px; text-align: center;">
                        <h2 style="margin: 0 0 1rem 0;">Erro de Configuração</h2>
                        <p style="margin: 0 0 1rem 0;">As variáveis de ambiente do Firebase não estão configuradas.</p>
                        <p style="margin: 0; font-size: 0.875rem; opacity: 0.9;">
                            Configure as seguintes variáveis no Netlify:<br>
                            <code style="background: rgba(0,0,0,0.2); padding: 0.25rem 0.5rem; border-radius: 4px; display: inline-block; margin-top: 0.5rem;">
                                ${missingKeys.map(k => `VITE_FIREBASE_${k.toUpperCase()}`).join(', ')}
                            </code>
                        </p>
                    </div>
                </div>
            `;
        }
    });
} else {
    try {
        // Initialize Firebase
        app = initializeApp(firebaseConfig);

        // Initialize Firestore
        db = getFirestore(app);

        // Initialize Auth
        auth = getAuth(app);

        console.log('[Firebase] Inicializado com sucesso');
    } catch (error) {
        console.error('[Firebase] Erro ao inicializar:', error);

        // Show error in UI
        document.addEventListener('DOMContentLoaded', () => {
            const appDiv = document.getElementById('app');
            if (appDiv) {
                appDiv.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1f2e; color: #fff;">
                        <div style="background: #dc3545; color: white; padding: 1.5rem 2rem; border-radius: 8px; max-width: 600px; text-align: center;">
                            <h2 style="margin: 0 0 1rem 0;">Erro do Firebase</h2>
                            <p style="margin: 0;">${error.message}</p>
                        </div>
                    </div>
                `;
            }
        });
    }
}

export { db, auth };
export default app;
