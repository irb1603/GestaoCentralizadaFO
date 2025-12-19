// Email Service - Gmail API Integration
// Gestão Centralizada FO - CMB

import { db } from '../firebase/config.js';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Email service using Gmail API
 * Supports multiple accounts (one per company)
 */
class EmailService {
    constructor() {
        this.accessTokens = {}; // Cache access tokens
        this.tokenExpiry = {}; // Track token expiry
    }

    /**
     * Get email config for a company from Firestore
     * @param {string} company - Company key (2cia, 3cia, etc.)
     * @returns {Promise<Object>}
     */
    async getEmailConfig(company) {
        const docRef = doc(db, 'emailConfigs', company);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error(`Configuração de email não encontrada para ${company}`);
        }

        return docSnap.data();
    }

    /**
     * Get a valid access token (refresh if expired)
     * @param {string} company 
     * @returns {Promise<string>}
     */
    async getAccessToken(company) {
        // Check if we have a valid cached token
        const now = Date.now();
        if (this.accessTokens[company] && this.tokenExpiry[company] > now) {
            return this.accessTokens[company];
        }

        // Get config and refresh the token
        const config = await this.getEmailConfig(company);

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                refresh_token: config.refreshToken,
                grant_type: 'refresh_token',
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Erro ao renovar token: ${error.error_description || error.error}`);
        }

        const data = await response.json();

        // Cache the token (expires in 1 hour, we set 50 minutes to be safe)
        this.accessTokens[company] = data.access_token;
        this.tokenExpiry[company] = now + (50 * 60 * 1000);

        return data.access_token;
    }

    /**
     * Create email message in RFC 2822 format
     * @param {Object} options 
     * @returns {string}
     */
    createEmailMessage({ to, from, subject, body }) {
        const messageParts = [
            `From: ${from}`,
            `To: ${to}`,
            `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '',
            btoa(unescape(encodeURIComponent(body))),
        ];

        return btoa(messageParts.join('\r\n'))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    /**
     * Send a single email
     * @param {Object} options 
     * @returns {Promise<Object>}
     */
    async sendEmail({ company, to, subject, body }) {
        const config = await this.getEmailConfig(company);
        const accessToken = await this.getAccessToken(company);

        const message = this.createEmailMessage({
            to,
            from: config.email,
            subject,
            body,
        });

        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw: message }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Erro ao enviar email: ${error.error?.message || 'Erro desconhecido'}`);
        }

        const result = await response.json();

        // Log the email
        await this.logEmail({
            company,
            to,
            subject,
            status: 'sent',
            messageId: result.id,
        });

        return result;
    }

    /**
     * Send multiple emails in batch
     * @param {Array} emails - Array of { company, to, subject, body }
     * @param {Function} onProgress - Optional progress callback (current, total)
     * @returns {Promise<Array>}
     */
    async sendBatch(emails, onProgress = null) {
        const results = [];
        const total = emails.length;

        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];

            try {
                const result = await this.sendEmail(email);
                results.push({
                    success: true,
                    to: email.to,
                    messageId: result.id,
                });
            } catch (error) {
                results.push({
                    success: false,
                    to: email.to,
                    error: error.message,
                });

                // Log failed email
                await this.logEmail({
                    company: email.company,
                    to: email.to,
                    subject: email.subject,
                    status: 'failed',
                    error: error.message,
                });
            }

            if (onProgress) {
                onProgress(i + 1, total);
            }

            // Small delay between emails to avoid rate limiting
            if (i < emails.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return results;
    }

    /**
     * Log email to Firestore for auditing
     * @param {Object} emailData 
     */
    async logEmail(emailData) {
        try {
            await addDoc(collection(db, 'emailLogs'), {
                ...emailData,
                sentAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Erro ao registrar log de email:', error);
        }
    }

    /**
     * Check if email config is valid for a company
     * @param {string} company 
     * @returns {Promise<boolean>}
     */
    async isConfigured(company) {
        try {
            const config = await this.getEmailConfig(company);
            return !!(config.refreshToken && config.clientId && config.clientSecret && config.active);
        } catch {
            return false;
        }
    }

    /**
     * Test email sending
     * @param {string} company 
     * @param {string} testEmail 
     * @returns {Promise<Object>}
     */
    async testEmail(company, testEmail) {
        return this.sendEmail({
            company,
            to: testEmail,
            subject: 'Teste de Email - Gestão FO CMB',
            body: `Este é um email de teste enviado pela conta ${company}.\n\nSe você recebeu este email, a configuração está funcionando corretamente.`,
        });
    }
}

// Export singleton instance
export const emailService = new EmailService();

// Export utility functions
export { EmailService };
