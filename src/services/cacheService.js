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
// AGGRESSIVE OPTIMIZATION: Significantly increased TTLs to minimize Firebase reads
// Firebase free tier: 50,000 reads/day - these TTLs help stay under limit
const TTL = {
    STUDENTS: 30 * 60 * 1000,        // 30 minutes for student data (rarely changes)
    STUDENTS_LIST: 30 * 60 * 1000,   // 30 minutes for student lists (rarely changes)
    FOS: 10 * 60 * 1000,             // 10 minutes for FOs (main data)
    FOS_PENDING: 5 * 60 * 1000,      // 5 minutes for pending FOs (more dynamic)
    AUTH: 2 * 60 * 60 * 1000,        // 2 hours for auth credentials
    STATS: 15 * 60 * 1000,           // 15 minutes for statistics
    AUDIT: 5 * 60 * 1000,            // 5 minutes for audit logs
    GLOBAL: 60 * 60 * 1000,          // 1 hour for global/static data
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
// AI Data Cache Functions
// ============================================

const AI_DATA_PREFIX = 'ai_data_';

/**
 * Get cached AI data by key
 * @param {string} dataType - Type of AI data (foStats, observerRanking, etc.)
 * @param {string} company - Company filter (or 'all')
 * @returns {any|null} - Cached data or null
 */
export function getCachedAIData(dataType, company = 'all') {
    return getFromCache(AI_DATA_PREFIX + dataType + '_' + company);
}

/**
 * Cache AI data
 * @param {string} dataType - Type of AI data
 * @param {any} data - Data to cache
 * @param {string} company - Company filter (or 'all')
 * @param {number} ttl - Optional custom TTL (defaults to TTL.STATS)
 */
export function cacheAIData(dataType, data, company = 'all', ttl = null) {
    setInCache(AI_DATA_PREFIX + dataType + '_' + company, data, ttl || TTL.STATS);
}

/**
 * Invalidate AI data cache
 * @param {string} dataType - Optional specific type to invalidate
 */
export function invalidateAICache(dataType = null) {
    if (dataType) {
        clearCacheByPrefix(AI_DATA_PREFIX + dataType);
    } else {
        clearCacheByPrefix(AI_DATA_PREFIX);
    }
}

// ============================================
// localStorage Persistence (for cross-session data)
// ============================================

const LOCAL_STORAGE_PREFIX = 'cmb_persistent_';

/**
 * Get item from localStorage with expiry check
 * @param {string} key - Cache key
 * @returns {any|null} - Cached value or null
 */
export function getFromPersistentCache(key) {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
        if (stored) {
            const item = JSON.parse(stored);
            if (Date.now() < item.expiry) {
                // Also restore to memory cache for faster subsequent access
                memoryCache.set(key, item);
                return item.value;
            }
            // Expired, remove
            localStorage.removeItem(LOCAL_STORAGE_PREFIX + key);
        }
    } catch (e) {
        console.warn('Persistent cache read error:', e);
    }
    return null;
}

/**
 * Set item in localStorage with TTL
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in milliseconds
 */
export function setInPersistentCache(key, value, ttl) {
    const item = {
        value,
        expiry: Date.now() + ttl,
        cached: Date.now()
    };

    // Also set in memory cache
    memoryCache.set(key, item);

    try {
        localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify(item));
    } catch (e) {
        console.warn('Persistent cache write error:', e);
        // Try to clear old items
        clearExpiredPersistentCache();
    }
}

/**
 * Clear expired items from localStorage
 */
export function clearExpiredPersistentCache() {
    try {
        const now = Date.now();
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (now >= item.expiry) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                }
            }
        }
    } catch (e) {
        console.warn('Persistent cache cleanup error:', e);
    }
}

/**
 * Clear all persistent cache
 */
export function clearPersistentCache() {
    try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
                localStorage.removeItem(key);
            }
        }
    } catch (e) {
        console.warn('Persistent cache clear error:', e);
    }
}

// ============================================
// Global Cache Warming (Preload critical data)
// ============================================

let cacheWarmingPromise = null;
let cacheWarmed = false;

// Session storage key to persist warming state across hot-reloads
const CACHE_WARMED_SESSION_KEY = 'cmb_cache_warming_done';

/**
 * Preload critical data into cache on app start
 * This reduces Firebase reads by loading common data once
 * OPTIMIZED: Uses sessionStorage to prevent duplicate warming during hot-reload
 * @param {Function} getStudentsFn - Function to get students
 * @param {Function} getFOsFn - Function to get FOs
 * @param {string} companyFilter - Company filter or null
 */
export async function warmCache(getStudentsFn, getFOsFn, companyFilter) {
    // Prevent duplicate warming (in-memory check)
    if (cacheWarmingPromise) {
        console.log('[Cache] Warming already in progress, waiting...');
        return cacheWarmingPromise;
    }

    // Check sessionStorage to prevent warming during hot-reload
    // This persists across module reloads in development
    try {
        const sessionWarmed = sessionStorage.getItem(CACHE_WARMED_SESSION_KEY);
        if (sessionWarmed) {
            const warmedTime = parseInt(sessionWarmed);
            const elapsed = Date.now() - warmedTime;
            // Only skip if warmed less than 5 minutes ago
            if (elapsed < 5 * 60 * 1000) {
                console.log('[Cache] Already warmed this session, skipping');
                cacheWarmed = true;
                return;
            }
        }
    } catch (e) {
        // sessionStorage might not be available
    }

    if (cacheWarmed) {
        console.log('[Cache] Already warmed, skipping');
        return;
    }

    console.log('[Cache] Warming cache for company:', companyFilter || 'all');

    cacheWarmingPromise = (async () => {
        try {
            const cacheKey = companyFilter || 'all';

            // Check if we already have fresh data in cache
            const cachedStudents = getCachedStudentList(cacheKey);
            const cachedFOs = getCachedFOList(cacheKey, 'all');

            const promises = [];

            // Only fetch if not cached
            if (!cachedStudents && getStudentsFn) {
                console.log('[Cache] Preloading students...');
                promises.push(
                    getStudentsFn().then(students => {
                        cacheStudentList(students, cacheKey);
                        console.log(`[Cache] Cached ${students.length} students`);
                    }).catch(e => console.warn('[Cache] Failed to preload students:', e))
                );
            } else if (cachedStudents) {
                console.log('[Cache] Students already cached');
            }

            if (!cachedFOs && getFOsFn) {
                console.log('[Cache] Preloading FOs...');
                promises.push(
                    getFOsFn().then(fos => {
                        cacheFOList(fos, cacheKey, 'all');
                        console.log(`[Cache] Cached ${fos.length} FOs`);
                    }).catch(e => console.warn('[Cache] Failed to preload FOs:', e))
                );
            } else if (cachedFOs) {
                console.log('[Cache] FOs already cached');
            }

            await Promise.all(promises);
            cacheWarmed = true;

            // Save to sessionStorage to prevent warming during hot-reload
            try {
                sessionStorage.setItem(CACHE_WARMED_SESSION_KEY, Date.now().toString());
            } catch (e) {
                // sessionStorage might not be available
            }

            console.log('[Cache] Warming complete');

        } catch (error) {
            console.error('[Cache] Warming failed:', error);
        } finally {
            cacheWarmingPromise = null;
        }
    })();

    return cacheWarmingPromise;
}

/**
 * Check if cache is warmed
 * @returns {boolean}
 */
export function isCacheWarmed() {
    return cacheWarmed;
}

/**
 * Reset cache warmed state (for logout)
 */
export function resetCacheWarmedState() {
    cacheWarmed = false;
    cacheWarmingPromise = null;
}

// ============================================
// Cache Statistics (for debugging/monitoring)
// ============================================

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
    let memoryItems = 0;
    let sessionItems = 0;
    let persistentItems = 0;

    // Count memory cache items
    memoryItems = memoryCache.size;

    // Count sessionStorage items
    try {
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                sessionItems++;
            }
        }
    } catch (e) { }

    // Count localStorage items
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(LOCAL_STORAGE_PREFIX)) {
                persistentItems++;
            }
        }
    } catch (e) { }

    return {
        memoryItems,
        sessionItems,
        persistentItems,
        totalItems: memoryItems + sessionItems + persistentItems,
        cacheWarmed
    };
}

// ============================================
// Utility exports
// ============================================

export const CACHE_TTL = TTL;

// Initialize by clearing expired items
clearExpiredCache();
clearExpiredPersistentCache();
