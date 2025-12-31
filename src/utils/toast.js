// Toast Notifications Utility
// Gestão Centralizada FO - CMB

import { escapeHtml } from './security.js';

/**
 * Show a toast notification
 * SECURITY: Message is escaped to prevent XSS
 * @param {string} message - Message to display
 * @param {string} type - Type: 'info', 'success', 'warning', 'error'
 */
export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    // SECURITY: Escape HTML to prevent XSS
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Inject toast styles if not already present
if (!document.getElementById('toast-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'toast-styles';
    styleEl.textContent = `
    .toast-container {
      position: fixed;
      bottom: var(--space-4, 1rem);
      right: var(--space-4, 1rem);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 0.5rem);
    }
    
    .toast {
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      border-radius: var(--radius-md, 0.5rem);
      background: var(--bg-primary, white);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: toast-in 0.3s ease;
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      font-size: var(--font-size-sm, 0.875rem);
    }
    
    @keyframes toast-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    .toast--success {
      background: var(--color-success-50, #dcfce7);
      color: var(--color-success-700, #15803d);
      border-left: 4px solid var(--color-success-500, #22c55e);
    }
    
    .toast--error {
      background: var(--color-danger-50, #fef2f2);
      color: var(--color-danger-700, #b91c1c);
      border-left: 4px solid var(--color-danger-500, #ef4444);
    }
    
    .toast--warning {
      background: var(--color-warning-50, #fffbeb);
      color: var(--color-warning-700, #a16207);
      border-left: 4px solid var(--color-warning-500, #f59e0b);
    }
    
    .toast--info {
      background: var(--color-primary-50, #eff6ff);
      color: var(--color-primary-700, #1d4ed8);
      border-left: 4px solid var(--color-primary-500, #3b82f6);
    }
  `;
    document.head.appendChild(styleEl);
}
