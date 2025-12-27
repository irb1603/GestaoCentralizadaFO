// Cache Service - Global Caching for Firebase Optimization
// Gestão Centralizada FO - CMB

/**
 * A centralized caching service to reduce Firebase reads by storing
 * frequently accessed data in memory and sessionStorage.
 * 
 * Features:
 * - In-memory cache with TTL (Time To Live)
 * - Persistent cache in sessionStorage for page reloads
 * - Type-specific caching for students, FOs, and auth data
 * - Cache invalidation by type or specific keys
 */

// Default TTL values (in milliseconds)
const TTL = {
    STUDENTS: 10 * 60 * 1000,        // 10 minutes for student data
    STUDENTS_LIST: 5 * 60 * 1000,    // 5 minutes for student lists
    FOS: 2 * 60 * 1000,              // 2 minutes for FOs (changes more frequently)
    AUTH: 60 * 60 * 1000,            // 1 hour for auth credentials
    STATS: 5 * 60 * 1000,            // 5 minutes for statistics
    AUDIT: 1 * 60 * 1000,            // 1 minute for audit logs
};

// Cache storage
const memoryCache = new Map();

// Storage key prefix
const STORAGE_PREFIX = 'cmb_cache_';

/**
 * Get item from cache
 * @param {string} key - Cache key
 * @returns {any|null} - Cached value or null if not found/expired
 */
export function getFromCache(key) {
    // Try memory cache first
    const memItem = memoryCache.get(key);
    if (memItem) {
        if (Date.now() < memItem.expiry) {
            return memItem.value;
        }
        // Expired, remove from cache
        memoryCache.delete(key);
    }

    // Try sessionStorage
    try {
        const stored = sessionStorage.getItem(STORAGE_PREFIX + key);
        if (stored) {
            const item = JSON.parse(stored);
            if (Date.now() < item.expiry) {
                // Restore to memory cache
                memoryCache.set(key, item);
                return item.value;
            }
            // Expired, remove from storage
            sessionStorage.removeItem(STORAGE_PREFIX + key);
        }
    } catch (e) {
        console.warn('Cache read error:', e);
    }

    return null;
}

/**
 * Set item in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in milliseconds
 * @param {boolean} persist - If true, also store in sessionStorage
 */
export function setInCache(key, value, ttl, persist = true) {
    const item = {
        value,
        expiry: Date.now() + ttl,
        cached: Date.now()
    };

    memoryCache.set(key, item);

    if (persist) {
        try {
            sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(item));
        } catch (e) {
            // Storage might be full, clear old items
            console.warn('Cache write error, clearing old items:', e);
            clearExpiredCache();
        }
    }
}

/**
 * Remove item from cache
 * @param {string} key - Cache key
 */
export function removeFromCache(key) {
    memoryCache.delete(key);
    try {
        sessionStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) {
        // Ignore removal errors
    }
}

/**
 * Clear all cache items matching a prefix
 * @param {string} prefix - Key prefix to match
 */
export function clearCacheByPrefix(prefix) {
    // Clear from memory
    for (const key of memoryCache.keys()) {
        if (key.startsWith(prefix)) {
            memoryCache.delete(key);
        }
    }

    // Clear from sessionStorage
    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX + prefix)) {
                sessionStorage.removeItem(key);
            }
        }
    } catch (e) {
        console.warn('Cache clear error:', e);
    }
}

/**
 * Clear expired items from cache
 */
export function clearExpiredCache() {
    const now = Date.now();

    // Clear from memory
    for (const [key, item] of memoryCache.entries()) {
        if (now >= item.expiry) {
            memoryCache.delete(key);
        }
    }

    // Clear from sessionStorage
    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                try {
                    const item = JSON.parse(sessionStorage.getItem(key));
                    if (now >= item.expiry) {
                        sessionStorage.removeItem(key);
                    }
                } catch (e) {
                    // Invalid item, remove it
                    sessionStorage.removeItem(key);
                }
            }
        }
    } catch (e) {
        console.warn('Cache cleanup error:', e);
    }
}

/**
 * Clear all cache
 */
export function clearAllCache() {
    memoryCache.clear();

    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                sessionStorage.removeItem(key);
            }
        }
    } catch (e) {
        console.warn('Cache clear all error:', e);
    }
}

// ============================================
// Student-specific cache functions
// ============================================

const STUDENT_PREFIX = 'student_';
const STUDENTS_LIST_KEY = 'students_list_';

/**
 * Get a single student from cache by number
 * @param {number|string} numero - Student number
 * @returns {Object|null} - Student data or null
 */
export function getCachedStudent(numero) {
    return getFromCache(STUDENT_PREFIX + numero);
}

/**
 * Cache a single student
 * @param {Object} student - Student data (must have numero property)
 */
export function cacheStudent(student) {
    if (student && student.numero) {
        setInCache(STUDENT_PREFIX + student.numero, student, TTL.STUDENTS);
    }
}

/**
 * Cache multiple students
 * @param {Array} students - Array of student objects
 */
export function cacheStudents(students) {
    if (!Array.isArray(students)) return;

    for (const student of students) {
        cacheStudent(student);
    }
}

/**
 * Get cached student list for a company
 * @param {string} company - Company filter (or 'all')
 * @returns {Array|null} - Student list or null
 */
export function getCachedStudentList(company = 'all') {
    return getFromCache(STUDENTS_LIST_KEY + company);
}

/**
 * Cache student list for a company
 * @param {Array} students - Array of students
 * @param {string} company - Company filter (or 'all')
 */
export function cacheStudentList(students, company = 'all') {
    setInCache(STUDENTS_LIST_KEY + company, students, TTL.STUDENTS_LIST);
    // Also cache individual students
    cacheStudents(students);
}

/**
 * Invalidate student cache (after updates)
 * @param {number|string} numero - Optional specific student to invalidate
 */
export function invalidateStudentCache(numero = null) {
    if (numero) {
        removeFromCache(STUDENT_PREFIX + numero);
    }
    // Always clear the list cache as it might be outdated
    clearCacheByPrefix(STUDENTS_LIST_KEY);
}

// ============================================
// FO-specific cache functions
// ============================================

const FO_PREFIX = 'fo_';
const FOS_LIST_KEY = 'fos_list_';

/**
 * Get cached FO by ID
 * @param {string} foId - FO document ID
 * @returns {Object|null} - FO data or null
 */
export function getCachedFO(foId) {
    return getFromCache(FO_PREFIX + foId);
}

/**
 * Cache a single FO
 * @param {Object} fo - FO data (must have id property)
 */
export function cacheFO(fo) {
    if (fo && fo.id) {
        setInCache(FO_PREFIX + fo.id, fo, TTL.FOS);
    }
}

/**
 * Get cached FO list for a company
 * @param {string} company - Company filter (or 'all')
 * @param {string} status - Optional status filter
 * @returns {Array|null} - FO list or null
 */
export function getCachedFOList(company = 'all', status = 'all') {
    return getFromCache(FOS_LIST_KEY + company + '_' + status);
}

/**
 * Cache FO list
 * @param {Array} fos - Array of FOs
 * @param {string} company - Company filter (or 'all')
 * @param {string} status - Optional status filter
 */
export function cacheFOList(fos, company = 'all', status = 'all') {
    setInCache(FOS_LIST_KEY + company + '_' + status, fos, TTL.FOS);
    // Also cache individual FOs
    for (const fo of fos) {
        cacheFO(fo);
    }
}

/**
 * Invalidate FO cache (after updates)
 * @param {string} foId - Optional specific FO to invalidate
 */
export function invalidateFOCache(foId = null) {
    if (foId) {
        removeFromCache(FO_PREFIX + foId);
    }
    // Always clear the list cache as it might be outdated
    clearCacheByPrefix(FOS_LIST_KEY);
}

// ============================================
// Auth-specific cache functions
// ============================================

const AUTH_PREFIX = 'auth_';

/**
 * Get cached auth validation result
 * @param {string} usuario - Username
 * @param {string} senha - Password (hashed for key)
 * @returns {Object|null} - Auth result or null
 */
export function getCachedAuth(usuario, senha) {
    // Use a simple hash for the password in the key
    const key = AUTH_PREFIX + usuario + '_' + simpleHash(senha);
    return getFromCache(key);
}

/**
 * Cache auth validation result
 * @param {string} usuario - Username
 * @param {string} senha - Password
 * @param {Object} result - Auth validation result
 */
export function cacheAuth(usuario, senha, result) {
    const key = AUTH_PREFIX + usuario + '_' + simpleHash(senha);
    setInCache(key, result, TTL.AUTH);
}

/**
 * Simple hash function for password (NOT cryptographically secure, just for cache keys)
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

// ============================================
// Stats cache functions
// ============================================

const STATS_KEY = 'stats_';

/**
 * Get cached statistics
 * @param {string} company - Company filter (or 'all')
 * @returns {Object|null} - Stats data or null
 */
export function getCachedStats(company = 'all') {
    return getFromCache(STATS_KEY + company);
}

/**
 * Cache statistics
 * @param {Object} stats - Statistics data
 * @param {string} company - Company filter (or 'all')
 */
export function cacheStats(stats, company = 'all') {
    setInCache(STATS_KEY + company, stats, TTL.STATS);
}

/**
 * Invalidate stats cache
 */
export function invalidateStatsCache() {
    clearCacheByPrefix(STATS_KEY);
}

// ============================================
// Utility exports
// ============================================

export const CACHE_TTL = TTL;

// Initialize by clearing expired items
clearExpiredCache();
