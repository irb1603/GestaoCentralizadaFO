// AI Chat Component
// Gestão Centralizada FO - CMB

import { icons } from '../utils/icons.js';
import { chatWithAI, getSuggestedQueries, isAIConfigured } from '../services/aiService.js';
import { getSession } from '../firebase/auth.js';

let chatHistory = [];
let isOpen = false;
let isLoading = false;

/**
 * Initialize AI Chat component
 * Adds the floating button and chat container to the page
 * Only available for Admin and ComandoCA roles
 */
export function initAIChat() {
    const session = getSession();

    // Only show for logged in users
    if (!session) {
        return;
    }

    // Restrict AI Chat to Admin and ComandoCA only
    if (session.role !== 'admin' && session.role !== 'comandoCA') {
        return;
    }

    // Don't add if already exists
    if (document.getElementById('ai-chat-container')) {
        return;
    }

    // Inject styles
    injectStyles();

    // Create chat container
    const chatContainer = document.createElement('div');
    chatContainer.id = 'ai-chat-container';
    chatContainer.innerHTML = `
        <!-- Floating Button -->
        <button id="ai-chat-toggle" class="ai-chat-toggle" title="Assistente IA">
            ${icons.bot || '🤖'}
        </button>

        <!-- Chat Window -->
        <div id="ai-chat-window" class="ai-chat-window hidden">
            <div class="ai-chat-header">
                <div class="ai-chat-header-title">
                    <span class="ai-chat-icon">${icons.bot || '🤖'}</span>
                    <span>Assistente CMB</span>
                </div>
                <button class="ai-chat-close" title="Fechar">
                    ${icons.close}
                </button>
            </div>

            <div id="ai-chat-messages" class="ai-chat-messages">
                <!-- Welcome message -->
                <div class="ai-message ai-message--assistant">
                    <div class="ai-message-content">
                        Olá! Sou o Assistente do CMB. Posso ajudar com:
                        <ul>
                            <li>Estatísticas de FOs (positivos, negativos, neutros)</li>
                            <li>Ranking de observadores</li>
                            <li>FOs para aditamento</li>
                            <li>Dados de faltas escolares</li>
                            <li>Sugestão de enquadramento (RICM)</li>
                            <li>Alunos em AOE/Retirada</li>
                            <li>Estatísticas de sanções</li>
                            <li>Comportamento em queda</li>
                        </ul>
                        Como posso ajudar?
                    </div>
                </div>
            </div>

            <div class="ai-chat-suggestions" id="ai-chat-suggestions">
                <!-- Suggestions will be added here -->
            </div>

            <div class="ai-chat-input-container">
                <input type="text" id="ai-chat-input" class="ai-chat-input" 
                       placeholder="Digite sua pergunta..." 
                       autocomplete="off">
                <button id="ai-chat-send" class="ai-chat-send" title="Enviar">
                    ${icons.send || '➤'}
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(chatContainer);

    // Setup event listeners
    setupEventListeners();

    // Load suggestions
    loadSuggestions();

    // Check if AI is configured
    checkAIConfig();
}

/**
 * Check if AI is configured and show warning if not
 */
async function checkAIConfig() {
    const configured = await isAIConfigured();
    if (!configured) {
        const messagesContainer = document.getElementById('ai-chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML += `
                <div class="ai-message ai-message--system">
                    <div class="ai-message-content ai-message-content--warning">
                        ⚠️ O assistente de IA ainda não está configurado. 
                        Solicite ao administrador que configure a API key do Gemini.
                    </div>
                </div>
            `;
        }
    }
}

/**
 * Load suggestion buttons
 */
function loadSuggestions() {
    const suggestionsContainer = document.getElementById('ai-chat-suggestions');
    const suggestions = getSuggestedQueries().slice(0, 4); // Show first 4

    suggestionsContainer.innerHTML = suggestions.map(s => `
        <button class="ai-suggestion-btn" data-query="${s}">
            ${s.length > 40 ? s.substring(0, 40) + '...' : s}
        </button>
    `).join('');

    // Add click handlers
    suggestionsContainer.querySelectorAll('.ai-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.dataset.query;
            document.getElementById('ai-chat-input').value = query;
            sendMessage(query);
        });
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    const toggleBtn = document.getElementById('ai-chat-toggle');
    const closeBtn = document.querySelector('.ai-chat-close');
    const sendBtn = document.getElementById('ai-chat-send');
    const input = document.getElementById('ai-chat-input');

    // Toggle chat
    toggleBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    // Send message
    sendBtn.addEventListener('click', () => {
        const message = input.value.trim();
        if (message) {
            sendMessage(message);
        }
    });

    // Enter to send
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const message = input.value.trim();
            if (message) {
                sendMessage(message);
            }
        }
    });
}

/**
 * Toggle chat visibility
 */
function toggleChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    const toggleBtn = document.getElementById('ai-chat-toggle');

    isOpen = !isOpen;

    if (isOpen) {
        chatWindow.classList.remove('hidden');
        toggleBtn.classList.add('active');
        document.getElementById('ai-chat-input').focus();
    } else {
        chatWindow.classList.add('hidden');
        toggleBtn.classList.remove('active');
    }
}

/**
 * Send message to AI
 * @param {string} message 
 */
async function sendMessage(message) {
    if (isLoading) return;

    const messagesContainer = document.getElementById('ai-chat-messages');
    const input = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-chat-send');
    const suggestionsContainer = document.getElementById('ai-chat-suggestions');

    // Clear input
    input.value = '';

    // Hide suggestions after first message
    suggestionsContainer.style.display = 'none';

    // Add user message
    messagesContainer.innerHTML += `
        <div class="ai-message ai-message--user">
            <div class="ai-message-content">${escapeHtml(message)}</div>
        </div>
    `;

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Show loading
    isLoading = true;
    sendBtn.disabled = true;
    input.disabled = true;

    const loadingId = 'loading-' + Date.now();
    messagesContainer.innerHTML += `
        <div class="ai-message ai-message--assistant" id="${loadingId}">
            <div class="ai-message-content">
                <span class="ai-typing-indicator">
                    <span></span><span></span><span></span>
                </span>
            </div>
        </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        // Call AI service
        const response = await chatWithAI(message);

        // Remove loading
        document.getElementById(loadingId)?.remove();

        // Add AI response
        messagesContainer.innerHTML += `
            <div class="ai-message ai-message--assistant">
                <div class="ai-message-content">${formatAIResponse(response)}</div>
            </div>
        `;

        // Save to history
        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: response });

    } catch (error) {
        // Remove loading
        document.getElementById(loadingId)?.remove();

        // Show error
        messagesContainer.innerHTML += `
            <div class="ai-message ai-message--assistant">
                <div class="ai-message-content ai-message-content--error">
                    ❌ Erro: ${escapeHtml(error.message)}
                </div>
            </div>
        `;
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        input.disabled = false;
        input.focus();
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

/**
 * Format AI response with markdown-like styling
 * @param {string} text 
 * @returns {string}
 */
function formatAIResponse(text) {
    // Escape HTML first
    let formatted = escapeHtml(text);

    // Bold: **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Lists
    formatted = formatted.replace(/^- (.*?)(<br>|$)/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');

    // Numbered lists
    formatted = formatted.replace(/^\d+\. (.*?)(<br>|$)/gm, '<li>$1</li>');

    return formatted;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text 
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Inject CSS styles
 */
function injectStyles() {
    if (document.getElementById('ai-chat-styles')) return;

    const style = document.createElement('style');
    style.id = 'ai-chat-styles';
    style.textContent = `
        /* AI Chat Container */
        #ai-chat-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            font-family: var(--font-family-base, 'Inter', sans-serif);
        }

        /* Floating Toggle Button */
        .ai-chat-toggle {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--color-primary-500, #3b82f6), var(--color-primary-700, #1d4ed8));
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
            transition: all 0.3s ease;
        }

        .ai-chat-toggle:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 24px rgba(59, 130, 246, 0.5);
        }

        .ai-chat-toggle.active {
            background: linear-gradient(135deg, var(--color-danger-500, #ef4444), var(--color-danger-700, #b91c1c));
        }

        .ai-chat-toggle svg {
            width: 28px;
            height: 28px;
        }

        /* Chat Window */
        .ai-chat-window {
            position: absolute;
            bottom: 70px;
            right: 0;
            width: 380px;
            max-width: calc(100vw - 40px);
            height: 500px;
            max-height: calc(100vh - 120px);
            background: var(--bg-primary, white);
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .ai-chat-window.hidden {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            pointer-events: none;
        }

        /* Header */
        .ai-chat-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            background: linear-gradient(135deg, var(--color-primary-500, #3b82f6), var(--color-primary-700, #1d4ed8));
            color: white;
        }

        .ai-chat-header-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 16px;
        }

        .ai-chat-icon svg {
            width: 24px;
            height: 24px;
        }

        .ai-chat-close {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }

        .ai-chat-close:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .ai-chat-close svg {
            width: 18px;
            height: 18px;
        }

        /* Messages */
        .ai-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .ai-message {
            max-width: 85%;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .ai-message--user {
            align-self: flex-end;
        }

        .ai-message--assistant {
            align-self: flex-start;
        }

        .ai-message--system {
            align-self: center;
            max-width: 95%;
        }

        .ai-message-content {
            padding: 12px 16px;
            border-radius: 16px;
            font-size: 14px;
            line-height: 1.5;
        }

        .ai-message--user .ai-message-content {
            background: var(--color-primary-500, #3b82f6);
            color: white;
            border-bottom-right-radius: 4px;
        }

        .ai-message--assistant .ai-message-content {
            background: var(--bg-secondary, #f3f4f6);
            color: var(--text-primary, #1f2937);
            border-bottom-left-radius: 4px;
        }

        .ai-message-content--warning {
            background: var(--color-warning-100, #fef3c7) !important;
            color: var(--color-warning-800, #92400e) !important;
        }

        .ai-message-content--error {
            background: var(--color-danger-100, #fee2e2) !important;
            color: var(--color-danger-800, #991b1b) !important;
        }

        .ai-message-content ul {
            margin: 8px 0 0 16px;
            padding: 0;
        }

        .ai-message-content li {
            margin: 4px 0;
        }

        /* Typing Indicator */
        .ai-typing-indicator {
            display: flex;
            gap: 4px;
        }

        .ai-typing-indicator span {
            width: 8px;
            height: 8px;
            background: var(--text-tertiary, #9ca3af);
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out both;
        }

        .ai-typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .ai-typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }

        /* Suggestions */
        .ai-chat-suggestions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 8px 16px;
            border-top: 1px solid var(--border-light, #e5e7eb);
        }

        .ai-suggestion-btn {
            padding: 6px 12px;
            font-size: 12px;
            background: var(--bg-secondary, #f3f4f6);
            border: 1px solid var(--border-light, #e5e7eb);
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s;
            color: var(--text-secondary, #4b5563);
        }

        .ai-suggestion-btn:hover {
            background: var(--color-primary-50, #eff6ff);
            border-color: var(--color-primary-300, #93c5fd);
            color: var(--color-primary-700, #1d4ed8);
        }

        /* Input */
        .ai-chat-input-container {
            display: flex;
            gap: 8px;
            padding: 12px 16px;
            border-top: 1px solid var(--border-light, #e5e7eb);
            background: var(--bg-primary, white);
        }

        .ai-chat-input {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid var(--border-light, #e5e7eb);
            border-radius: 24px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }

        .ai-chat-input:focus {
            border-color: var(--color-primary-500, #3b82f6);
        }

        .ai-chat-send {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--color-primary-500, #3b82f6);
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }

        .ai-chat-send:hover:not(:disabled) {
            background: var(--color-primary-600, #2563eb);
        }

        .ai-chat-send:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .ai-chat-send svg {
            width: 18px;
            height: 18px;
        }

        /* Responsive */
        @media (max-width: 600px) {
            #ai-chat-container {
                bottom: 10px;
                right: 10px;
            }

            .ai-chat-window {
                width: calc(100vw - 20px);
                height: calc(100vh - 100px);
                bottom: 65px;
                right: -5px;
            }

            .ai-chat-toggle {
                width: 50px;
                height: 50px;
            }
        }
    `;

    document.head.appendChild(style);
}

/**
 * Destroy AI Chat (for logout)
 */
export function destroyAIChat() {
    const container = document.getElementById('ai-chat-container');
    if (container) {
        container.remove();
    }
    chatHistory = [];
    isOpen = false;
}
