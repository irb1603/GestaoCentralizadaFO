// Firebase Logger Service - Track Firebase Reads
// Gestao Centralizada FO - CMB
//
// This service intercepts Firestore calls and logs read operations
// to help identify bottlenecks and optimize Firebase usage.

import { getSession } from '../firebase/auth.js';

// ============================================
// Configuration
// ============================================

const MAX_LOG_ENTRIES = 1000;
const LOG_STORAGE_KEY = 'cmb_firebase_logs';

// ============================================
// Log Storage
// ============================================

let logs = [];
const sessionStartTime = Date.now();

let stats = {
    totalReads: 0,
    byCollection: {},
    byUser: {},
    byOperation: {
        getDoc: 0,
        getDocs: 0,
        onSnapshot: 0
    },
    cacheHits: 0,
    cacheMisses: 0
};

// ============================================
// Logging Functions
// ============================================

/**
 * Log a Firebase read operation
 * @param {Object} params - Log parameters
 * @param {string} params.operation - 'getDoc', 'getDocs', or 'onSnapshot'
 * @param {string} params.collection - Collection name
 * @param {number} params.documentCount - Number of documents read
 * @param {string} [params.query] - Query description (optional)
 * @param {boolean} [params.fromCache] - If data came from cache
 * @param {string} [params.source] - Source file/function that made the call
 */
export function logFirebaseRead(params) {
    const session = getSession();
    const username = session?.username || 'anonymous';

    const logEntry = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        timestampMs: Date.now(),
        operation: params.operation || 'unknown',
        collection: params.collection || 'unknown',
        documentCount: params.documentCount || 0,
        query: params.query || null,
        fromCache: params.fromCache || false,
        source: params.source || null,
        username: username,
        sessionTimeMs: Date.now() - sessionStartTime
    };

    logs.push(logEntry);

    if (logs.length > MAX_LOG_ENTRIES) {
        logs = logs.slice(-MAX_LOG_ENTRIES);
    }

    if (!logEntry.fromCache) {
        stats.totalReads += logEntry.documentCount;
        stats.cacheMisses++;

        if (!stats.byCollection[logEntry.collection]) {
            stats.byCollection[logEntry.collection] = 0;
        }
        stats.byCollection[logEntry.collection] += logEntry.documentCount;

        if (!stats.byUser[username]) {
            stats.byUser[username] = 0;
        }
        stats.byUser[username] += logEntry.documentCount;

        if (stats.byOperation[logEntry.operation] !== undefined) {
            stats.byOperation[logEntry.operation] += logEntry.documentCount;
        }
    } else {
        stats.cacheHits++;
    }

    try {
        sessionStorage.setItem(LOG_STORAGE_KEY, JSON.stringify({
            logs: logs.slice(-100),
            stats: stats
        }));
    } catch (e) { }

    if (import.meta.env?.DEV) {
        const cacheLabel = logEntry.fromCache ? '[CACHE]' : '[FIREBASE]';
        console.log(
            '%c' + cacheLabel + ' ' + logEntry.operation + ' ' + logEntry.collection + ': ' + logEntry.documentCount + ' docs',
            logEntry.fromCache ? 'color: #22c55e' : 'color: #f97316',
            logEntry.query ? '| Query: ' + logEntry.query : ''
        );
    }

    window.dispatchEvent(new CustomEvent('firebase-log', { detail: logEntry }));
    return logEntry;
}

/**
 * Log a cache hit (data retrieved from cache instead of Firebase)
 * @param {string} collection - Collection name
 * @param {string} [cacheKey] - Cache key used
 */
export function logCacheHit(collection, cacheKey = null) {
    return logFirebaseRead({
        operation: 'cache',
        collection: collection,
        documentCount: 0,
        query: cacheKey ? 'Cache key: ' + cacheKey : null,
        fromCache: true,
        source: 'cacheService'
    });
}

/**
 * Log a cache miss (data had to be fetched from Firebase)
 * @param {string} collection - Collection name
 * @param {number} documentCount - Number of documents fetched
 * @param {string} [query] - Query description
 */
export function logCacheMiss(collection, documentCount, query = null) {
    return logFirebaseRead({
        operation: 'getDocs',
        collection: collection,
        documentCount: documentCount,
        query: query,
        fromCache: false,
        source: 'cacheService'
    });
}

// ============================================
// Wrapped Firestore Functions
// ============================================

/**
 * Wrapper for getDocs that logs the read
 * @param {Function} getDocsFn - The getDocs function from firebase/firestore
 * @param {Query} query - Firestore query
 * @param {string} collectionName - Name of the collection
 * @param {string} [queryDesc] - Description of the query
 * @returns {Promise<QuerySnapshot>}
 */
export async function loggedGetDocs(getDocsFn, query, collectionName, queryDesc = null) {
    const startTime = performance.now();

    try {
        const snapshot = await getDocsFn(query);
        const duration = performance.now() - startTime;

        logFirebaseRead({
            operation: 'getDocs',
            collection: collectionName,
            documentCount: snapshot.size,
            query: queryDesc || (snapshot.size + ' docs in ' + Math.round(duration) + 'ms'),
            fromCache: false,
            source: 'loggedGetDocs'
        });

        return snapshot;
    } catch (error) {
        logFirebaseRead({
            operation: 'getDocs',
            collection: collectionName,
            documentCount: 0,
            query: 'ERROR: ' + error.message,
            fromCache: false,
            source: 'loggedGetDocs'
        });
        throw error;
    }
}

/**
 * Wrapper for getDoc that logs the read
 * @param {Function} getDocFn - The getDoc function from firebase/firestore
 * @param {DocumentReference} docRef - Firestore document reference
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<DocumentSnapshot>}
 */
export async function loggedGetDoc(getDocFn, docRef, collectionName) {
    const startTime = performance.now();

    try {
        const snapshot = await getDocFn(docRef);
        const duration = performance.now() - startTime;

        logFirebaseRead({
            operation: 'getDoc',
            collection: collectionName,
            documentCount: snapshot.exists() ? 1 : 0,
            query: 'Doc ID: ' + docRef.id + ' (' + Math.round(duration) + 'ms)',
            fromCache: false,
            source: 'loggedGetDoc'
        });

        return snapshot;
    } catch (error) {
        logFirebaseRead({
            operation: 'getDoc',
            collection: collectionName,
            documentCount: 0,
            query: 'ERROR: ' + error.message,
            fromCache: false,
            source: 'loggedGetDoc'
        });
        throw error;
    }
}

// ============================================
// Statistics Functions
// ============================================

/**
 * Get current statistics
 * @returns {Object} Statistics object
 */
export function getStats() {
    const sessionDuration = Date.now() - sessionStartTime;
    const sessionMinutes = Math.round(sessionDuration / 60000);

    return {
        ...stats,
        sessionDurationMs: sessionDuration,
        sessionMinutes: sessionMinutes,
        readsPerMinute: sessionMinutes > 0 ? Math.round(stats.totalReads / sessionMinutes) : stats.totalReads,
        cacheHitRate: stats.cacheHits + stats.cacheMisses > 0
            ? Math.round((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100)
            : 0,
        logCount: logs.length
    };
}

/**
 * Get logs for a specific collection
 * @param {string} collection - Collection name
 * @returns {Array} Filtered logs
 */
export function getLogsByCollection(collection) {
    return logs.filter(log => log.collection === collection);
}

/**
 * Get logs for a specific time period
 * @param {number} startMs - Start timestamp in ms
 * @param {number} endMs - End timestamp in ms (default: now)
 * @returns {Array} Filtered logs
 */
export function getLogsByPeriod(startMs, endMs = Date.now()) {
    return logs.filter(log => log.timestampMs >= startMs && log.timestampMs <= endMs);
}

/**
 * Get recent logs
 * @param {number} count - Number of logs to return
 * @returns {Array} Recent logs
 */
export function getRecentLogs(count = 50) {
    return logs.slice(-count);
}

/**
 * Get all logs
 * @returns {Array} All logs
 */
export function getAllLogs() {
    return [...logs];
}

/**
 * Get summary by collection
 * @returns {Array} Array of {collection, reads, percentage}
 */
export function getCollectionSummary() {
    const total = stats.totalReads;
    return Object.entries(stats.byCollection)
        .map(([collection, reads]) => ({
            collection,
            reads,
            percentage: total > 0 ? Math.round((reads / total) * 100) : 0
        }))
        .sort((a, b) => b.reads - a.reads);
}

/**
 * Get summary by operation type
 * @returns {Array} Array of {operation, reads, percentage}
 */
export function getOperationSummary() {
    const total = stats.totalReads;
    return Object.entries(stats.byOperation)
        .map(([operation, reads]) => ({
            operation,
            reads,
            percentage: total > 0 ? Math.round((reads / total) * 100) : 0
        }))
        .sort((a, b) => b.reads - a.reads);
}

// ============================================
// Export/Clear Functions
// ============================================

/**
 * Export logs as JSON string
 * @returns {string} JSON string of logs and stats
 */
export function exportLogs() {
    return JSON.stringify({
        exportedAt: new Date().toISOString(),
        sessionDurationMs: Date.now() - sessionStartTime,
        stats: getStats(),
        collectionSummary: getCollectionSummary(),
        operationSummary: getOperationSummary(),
        logs: logs
    }, null, 2);
}

/**
 * Export logs as CSV string
 * @returns {string} CSV string of logs
 */
export function exportLogsCSV() {
    const headers = ['timestamp', 'operation', 'collection', 'documentCount', 'query', 'fromCache', 'username', 'source'];
    const rows = logs.map(log => [
        log.timestamp,
        log.operation,
        log.collection,
        log.documentCount,
        log.query || '',
        log.fromCache,
        log.username,
        log.source || ''
    ].map(val => '"' + String(val).replace(/"/g, '""') + '"').join(','));

    return [headers.join(','), ...rows].join('\n');
}

/**
 * Clear all logs and reset stats
 */
export function clearLogs() {
    logs = [];
    stats = {
        totalReads: 0,
        byCollection: {},
        byUser: {},
        byOperation: {
            getDoc: 0,
            getDocs: 0,
            onSnapshot: 0
        },
        cacheHits: 0,
        cacheMisses: 0
    };

    try {
        sessionStorage.removeItem(LOG_STORAGE_KEY);
    } catch (e) { }

    window.dispatchEvent(new CustomEvent('firebase-log-cleared'));
    console.log('[FirebaseLogger] Logs cleared');
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize logger - restore logs from sessionStorage if available
 */
export function initFirebaseLogger() {
    try {
        const stored = sessionStorage.getItem(LOG_STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            if (data.logs) {
                logs = data.logs;
            }
            if (data.stats) {
                stats.totalReads = data.stats.totalReads || 0;
                stats.byCollection = data.stats.byCollection || {};
                stats.byUser = data.stats.byUser || {};
                stats.byOperation = data.stats.byOperation || {
                    getDoc: 0,
                    getDocs: 0,
                    onSnapshot: 0
                };
                stats.cacheHits = data.stats.cacheHits || 0;
                stats.cacheMisses = data.stats.cacheMisses || 0;
            }
            console.log('[FirebaseLogger] Restored', logs.length, 'logs from session');
        }
    } catch (e) {
        console.warn('[FirebaseLogger] Failed to restore logs:', e);
    }

    console.log('[FirebaseLogger] Initialized');
}

initFirebaseLogger();
