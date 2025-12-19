// Audit Logger Service
// Gestão Centralizada FO - CMB

import { db } from '../firebase/config.js';
import {
    collection,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { getSession } from '../firebase/auth.js';

const AUDIT_COLLECTION = 'auditLog';

/**
 * Log an action to the audit log
 * @param {string} action - 'create' | 'update' | 'delete'
 * @param {string} collectionName - Name of the collection affected
 * @param {string} documentId - ID of the document affected
 * @param {Object|null} previousData - Previous state of the data
 * @param {Object|null} newData - New state of the data
 */
export async function logAction(action, collectionName, documentId, previousData, newData) {
    const session = getSession();

    try {
        const logEntry = {
            action,
            collection: collectionName,
            documentId,
            company: newData?.company || previousData?.company || null,
            userId: session?.username || 'public',
            userName: session?.username || 'Usuário Público',
            role: session?.role || 'public',
            timestamp: serverTimestamp(),
            previousData: previousData ? JSON.stringify(previousData) : null,
            newData: newData ? JSON.stringify(newData) : null,
        };

        await addDoc(collection(db, AUDIT_COLLECTION), logEntry);
    } catch (error) {
        // Don't fail the main operation if audit logging fails
        console.error('Failed to log action:', error);
    }
}

/**
 * Format action for display
 * @param {string} action 
 * @returns {Object}
 */
export function formatAction(action) {
    const actions = {
        'create': { label: 'Criação', color: 'success', icon: 'plus' },
        'update': { label: 'Edição', color: 'warning', icon: 'edit' },
        'delete': { label: 'Exclusão', color: 'danger', icon: 'trash' }
    };

    return actions[action] || { label: action, color: 'neutral', icon: 'info' };
}

/**
 * Format collection name for display
 * @param {string} collectionName 
 * @returns {string}
 */
export function formatCollectionName(collectionName) {
    const names = {
        'fatosObservados': 'Fato Observado',
        'students': 'Aluno',
        'users': 'Usuário'
    };

    return names[collectionName] || collectionName;
}

/**
 * Parse stored JSON data safely
 * @param {string|null} jsonString 
 * @returns {Object|null}
 */
export function parseStoredData(jsonString) {
    if (!jsonString) return null;

    try {
        return JSON.parse(jsonString);
    } catch {
        return null;
    }
}
