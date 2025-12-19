// Authentication Service
// Gestão Centralizada FO - CMB

import { db } from './config.js';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc
} from 'firebase/firestore';

// User accounts configuration
export const USER_ACCOUNTS = {
    // Admin account
    'Admin': { role: 'admin', company: null, canEditAll: true, canViewAudit: true },
    'ComandoCA': { role: 'comandoCA', company: null, canEditAll: false, canViewAudit: true },

    // 6ª Companhia (6º Ano)
    'Cmt6cia': { role: 'commander', company: '6cia', canEditAll: false, canViewAudit: true },
    'Sgte6cia': { role: 'sergeant', company: '6cia', canEditAll: false, canViewAudit: false },

    // 7ª Companhia (7º Ano)
    'Cmt7cia': { role: 'commander', company: '7cia', canEditAll: false, canViewAudit: true },
    'Sgte7cia': { role: 'sergeant', company: '7cia', canEditAll: false, canViewAudit: false },

    // 8ª Companhia (8º Ano)
    'Cmt8cia': { role: 'commander', company: '8cia', canEditAll: false, canViewAudit: true },
    'Sgte8cia': { role: 'sergeant', company: '8cia', canEditAll: false, canViewAudit: false },

    // 9ª Companhia (9º Ano)
    'Cmt9cia': { role: 'commander', company: '9cia', canEditAll: false, canViewAudit: true },
    'Sgte9cia': { role: 'sergeant', company: '9cia', canEditAll: false, canViewAudit: false },

    // 1ª Companhia (1º Ano EM)
    'Cmt1cia': { role: 'commander', company: '1cia', canEditAll: false, canViewAudit: true },
    'Sgte1cia': { role: 'sergeant', company: '1cia', canEditAll: false, canViewAudit: false },

    // 2ª Companhia (2º Ano EM)
    'Cmt2cia': { role: 'commander', company: '2cia', canEditAll: false, canViewAudit: true },
    'Sgte2cia': { role: 'sergeant', company: '2cia', canEditAll: false, canViewAudit: false },

    // 3ª Companhia (3º Ano EM)
    'Cmt3cia': { role: 'commander', company: '3cia', canEditAll: false, canViewAudit: true },
    'Sgte3cia': { role: 'sergeant', company: '3cia', canEditAll: false, canViewAudit: false },
};

// Company names for display
export const COMPANY_NAMES = {
    '6cia': '6ª Companhia (6º Ano)',
    '7cia': '7ª Companhia (7º Ano)',
    '8cia': '8ª Companhia (8º Ano)',
    '9cia': '9ª Companhia (9º Ano)',
    '1cia': '1ª Companhia (1º Ano EM)',
    '2cia': '2ª Companhia (2º Ano EM)',
    '3cia': '3ª Companhia (3º Ano EM)',
};

// Session management
const SESSION_KEY = 'cmb_session';

/**
 * Authenticate user with username and password
 * @param {string} username - The username
 * @param {string} password - The password
 * @returns {Promise<Object>} - User data on success
 */
export async function login(username, password) {
    // Check if user exists in our accounts
    const userConfig = USER_ACCOUNTS[username];

    if (!userConfig) {
        throw new Error('Usuário não encontrado');
    }

    // Check password (by default, password equals username)
    let passwordValid = false;

    try {
        // Add timeout to prevent hanging when Firebase is not configured
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firebase timeout')), 3000)
        );

        const userDocPromise = getDoc(doc(db, 'users', username));
        const userDoc = await Promise.race([userDocPromise, timeoutPromise]);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            passwordValid = userData.password === password;
        } else {
            // User not in Firestore yet, check if password matches username (default)
            passwordValid = password === username;

            if (passwordValid) {
                // Create user document in Firestore (don't wait)
                setDoc(doc(db, 'users', username), {
                    username,
                    password: username, // Default password
                    role: userConfig.role,
                    company: userConfig.company,
                    createdAt: new Date().toISOString(),
                }).catch(err => console.warn('Could not save user to Firestore:', err));
            }
        }
    } catch (error) {
        // If Firebase is not configured or times out, use local auth
        console.warn('Firebase not available, using local auth:', error.message);
        passwordValid = password === username;
    }

    if (!passwordValid) {
        throw new Error('Senha incorreta');
    }

    // Create session
    const session = {
        username,
        ...userConfig,
        loginTime: new Date().toISOString(),
    };

    // Store session
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return session;
}

/**
 * Logout current user
 */
export function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = '/';
}

/**
 * Get current session
 * @returns {Object|null} - Current session or null
 */
export function getSession() {
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;

    try {
        return JSON.parse(sessionData);
    } catch {
        return null;
    }
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
    return getSession() !== null;
}

/**
 * Check if current user can edit data
 * @returns {boolean}
 */
export function canEdit() {
    const session = getSession();
    if (!session) return false;

    // Admin can edit everything
    if (session.role === 'admin') return true;

    // ComandoCA cannot edit
    if (session.role === 'comandoCA') return false;

    // Commanders and sergeants can edit their company data
    return true;
}

/**
 * Check if current user can view audit logs
 * @returns {boolean}
 */
export function canViewAudit() {
    const session = getSession();
    if (!session) return false;

    return session.canViewAudit === true;
}

/**
 * Check if current user is admin
 * @returns {boolean}
 */
export function isAdmin() {
    const session = getSession();
    return session?.role === 'admin';
}

/**
 * Get company filter for current user
 * @returns {string|null} - Company ID or null for all companies
 */
export function getCompanyFilter() {
    const session = getSession();
    if (!session) return null;

    // Admin and ComandoCA can see all companies
    if (session.role === 'admin' || session.role === 'comandoCA') {
        return null;
    }

    return session.company;
}

/**
 * Change user password (admin only)
 * @param {string} targetUsername - Username to change
 * @param {string} newPassword - New password
 */
export async function changePassword(targetUsername, newPassword) {
    const session = getSession();

    if (!session || session.role !== 'admin') {
        throw new Error('Apenas administradores podem alterar senhas');
    }

    const userConfig = USER_ACCOUNTS[targetUsername];
    if (!userConfig) {
        throw new Error('Usuário não encontrado');
    }

    // Use setDoc with merge to create document if it doesn't exist
    await setDoc(doc(db, 'users', targetUsername), {
        username: targetUsername,
        password: newPassword,
        role: userConfig.role,
        company: userConfig.company,
        updatedAt: new Date().toISOString(),
        updatedBy: session.username,
    }, { merge: true });
}

/**
 * Get list of all usernames for FO registration
 * @returns {string[]}
 */
export function getAllUsernames() {
    return Object.keys(USER_ACCOUNTS);
}
