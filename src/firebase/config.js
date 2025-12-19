// Firebase Configuration
// Gestão Centralizada FO - CMB
//
// IMPORTANTE: Substitua os valores abaixo pelas credenciais do seu projeto Firebase
// Para obter as credenciais:
// 1. Acesse https://console.firebase.google.com
// 2. Selecione ou crie um projeto
// 3. Vá em Configurações do Projeto > Geral
// 4. Em "Seus apps", adicione um app Web
// 5. Copie as credenciais para cá

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyDNycHKm2AtRgW3Zp1Xyf-lZLIwPnguwkI",
    authDomain: "gestaocentralizadafo.firebaseapp.com",
    projectId: "gestaocentralizadafo",
    storageBucket: "gestaocentralizadafo.firebasestorage.app",
    messagingSenderId: "1096874897446",
    appId: "1:1096874897446:web:3111a35d7dce6fdd58b6e7",
    measurementId: "G-X2NJN60HCW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export default app;
