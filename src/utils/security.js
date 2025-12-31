// Security Utilities
// Gestão Centralizada FO - CMB
//
// IMPORTANT: Use these functions to prevent XSS and other injection attacks

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for HTML insertion
 */
export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);

    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    return str.replace(/[&<>"'`=/]/g, char => htmlEscapes[char]);
}

/**
 * Escape string for use in HTML attributes (more strict)
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for attribute values
 */
export function escapeAttribute(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);

    // Escape all non-alphanumeric characters
    return str.replace(/[^a-zA-Z0-9]/g, char => {
        return '&#' + char.charCodeAt(0) + ';';
    });
}

/**
 * Escape string for use in JavaScript string literals
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for JS strings
 */
export function escapeJs(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);

    return str
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e');
}

/**
 * Sanitize user input by removing potentially dangerous content
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeInput(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);

    // Remove script tags and event handlers
    return str
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, 'data-blocked:')
        .trim();
}

/**
 * Validate that a string is a safe ID (alphanumeric + dash + underscore)
 * @param {string} id - ID to validate
 * @returns {boolean} - True if safe
 */
export function isSafeId(id) {
    if (typeof id !== 'string') return false;
    return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Generate a safe ID from a string
 * @param {string} str - String to convert to ID
 * @returns {string} - Safe ID
 */
export function toSafeId(str) {
    if (str === null || str === undefined) return '';
    if (typeof str !== 'string') str = String(str);

    return str
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 50);
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid format
 */
export function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    // RFC 5322 compliant email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate phone number format (Brazilian)
 * @param {string} phone - Phone to validate
 * @returns {boolean} - True if valid format
 */
export function isValidPhone(phone) {
    if (typeof phone !== 'string') return false;
    // Remove non-numeric characters for validation
    const cleaned = phone.replace(/\D/g, '');
    // Brazilian phone: 10-11 digits (with area code)
    return cleaned.length >= 10 && cleaned.length <= 11;
}

/**
 * Create a safe onclick handler string
 * @param {string} funcName - Function name to call
 * @param {...string} args - Arguments (will be escaped)
 * @returns {string} - Safe onclick attribute value
 */
export function safeOnclick(funcName, ...args) {
    const escapedArgs = args.map(arg => `'${escapeJs(String(arg))}'`).join(', ');
    return `${funcName}(${escapedArgs})`;
}

/**
 * Hash a string using SHA-256 (for non-sensitive hashing)
 * Note: For passwords, use proper backend hashing with salt
 * @param {string} str - String to hash
 * @returns {Promise<string>} - Hex hash
 */
export async function sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a cryptographically secure random ID
 * @param {number} length - Length of ID (default 16)
 * @returns {string} - Random hex string
 */
export function generateSecureId(length = 16) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
