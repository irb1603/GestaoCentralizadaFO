// Firebase Logger Widget - Floating UI component
// Displays real-time Firebase read statistics

import { getStats, getCollectionSummary, exportLogs, clearLogs, getRecentLogs } from '../services/firebaseLogger.js';
import { getSession } from '../firebase/auth.js';

let isExpanded = false;
let widgetElement = null;

/**
 * Create the widget HTML
 */
function createWidgetHTML() {
    const stats = getStats();
    const collectionSummary = getCollectionSummary();

    const collectionsHTML = collectionSummary.slice(0, 5).map(c =>
        `<div class="firebase-logger-row">
            <span class="firebase-logger-collection">${c.collection}</span>
            <span class="firebase-logger-value">${c.reads} (${c.percentage}%)</span>
        </div>`
    ).join('');

    return `
        <div class="firebase-logger-widget ${isExpanded ? 'expanded' : ''}" id="firebase-logger-widget">
            <div class="firebase-logger-badge" id="firebase-logger-toggle">
                <span class="firebase-logger-icon">🔥</span>
                <span class="firebase-logger-count">${stats.totalReads}</span>
            </div>

            <div class="firebase-logger-panel" id="firebase-logger-panel">
                <div class="firebase-logger-header">
                    <h4>Firebase Reads</h4>
                    <button class="firebase-logger-close" id="firebase-logger-close">&times;</button>
                </div>

                <div class="firebase-logger-stats">
                    <div class="firebase-logger-stat">
                        <span class="firebase-logger-label">Total Reads</span>
                        <span class="firebase-logger-value firebase-logger-total">${stats.totalReads}</span>
                    </div>
                    <div class="firebase-logger-stat">
                        <span class="firebase-logger-label">Cache Hit Rate</span>
                        <span class="firebase-logger-value">${stats.cacheHitRate}%</span>
                    </div>
                    <div class="firebase-logger-stat">
                        <span class="firebase-logger-label">Session Duration</span>
                        <span class="firebase-logger-value">${stats.sessionMinutes} min</span>
                    </div>
                    <div class="firebase-logger-stat">
                        <span class="firebase-logger-label">Reads/Min</span>
                        <span class="firebase-logger-value">${stats.readsPerMinute}</span>
                    </div>
                </div>

                <div class="firebase-logger-section">
                    <h5>Top Collections</h5>
                    ${collectionsHTML || '<div class="firebase-logger-empty">No reads yet</div>'}
                </div>

                <div class="firebase-logger-actions">
                    <button class="firebase-logger-btn" id="firebase-logger-export">Export JSON</button>
                    <button class="firebase-logger-btn firebase-logger-btn-danger" id="firebase-logger-clear">Clear</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create widget styles
 */
function createStyles() {
    const styleId = 'firebase-logger-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .firebase-logger-widget {
            position: fixed;
            bottom: 100px;
            right: 20px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
        }

        .firebase-logger-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            padding: 8px 14px;
            border-radius: 20px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .firebase-logger-badge:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(255, 107, 53, 0.5);
        }

        .firebase-logger-icon {
            font-size: 16px;
        }

        .firebase-logger-count {
            font-weight: 600;
            min-width: 30px;
            text-align: center;
        }

        .firebase-logger-panel {
            display: none;
            position: absolute;
            bottom: 50px;
            right: 0;
            width: 300px;
            background: #1a1f2e;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .firebase-logger-widget.expanded .firebase-logger-panel {
            display: block;
        }

        .firebase-logger-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #252b3d;
            border-bottom: 1px solid #3a4156;
        }

        .firebase-logger-header h4 {
            margin: 0;
            color: #fff;
            font-size: 14px;
            font-weight: 600;
        }

        .firebase-logger-close {
            background: none;
            border: none;
            color: #8b95a5;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }

        .firebase-logger-close:hover {
            color: #fff;
        }

        .firebase-logger-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1px;
            background: #3a4156;
            padding: 1px;
        }

        .firebase-logger-stat {
            background: #1a1f2e;
            padding: 12px;
            text-align: center;
        }

        .firebase-logger-label {
            display: block;
            color: #8b95a5;
            font-size: 11px;
            margin-bottom: 4px;
            text-transform: uppercase;
        }

        .firebase-logger-value {
            display: block;
            color: #fff;
            font-size: 16px;
            font-weight: 600;
        }

        .firebase-logger-total {
            color: #ff6b35;
        }

        .firebase-logger-section {
            padding: 12px 16px;
            border-top: 1px solid #3a4156;
        }

        .firebase-logger-section h5 {
            margin: 0 0 8px 0;
            color: #8b95a5;
            font-size: 11px;
            text-transform: uppercase;
        }

        .firebase-logger-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            color: #fff;
        }

        .firebase-logger-collection {
            color: #8b95a5;
        }

        .firebase-logger-empty {
            color: #5a6477;
            font-style: italic;
            text-align: center;
            padding: 8px;
        }

        .firebase-logger-actions {
            display: flex;
            gap: 8px;
            padding: 12px 16px;
            border-top: 1px solid #3a4156;
        }

        .firebase-logger-btn {
            flex: 1;
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            background: #3a4156;
            color: #fff;
            transition: background 0.2s;
        }

        .firebase-logger-btn:hover {
            background: #4a5166;
        }

        .firebase-logger-btn-danger {
            background: #dc3545;
        }

        .firebase-logger-btn-danger:hover {
            background: #c82333;
        }
    `;
    document.head.appendChild(style);
}

/**
 * Update widget display
 */
function updateWidget() {
    if (!widgetElement) return;

    const stats = getStats();
    const countEl = widgetElement.querySelector('.firebase-logger-count');
    if (countEl) {
        countEl.textContent = stats.totalReads;
    }

    if (isExpanded) {
        const collectionSummary = getCollectionSummary();

        const totalEl = widgetElement.querySelector('.firebase-logger-total');
        if (totalEl) totalEl.textContent = stats.totalReads;

        const statsEls = widgetElement.querySelectorAll('.firebase-logger-stat .firebase-logger-value');
        if (statsEls[1]) statsEls[1].textContent = stats.cacheHitRate + '%';
        if (statsEls[2]) statsEls[2].textContent = stats.sessionMinutes + ' min';
        if (statsEls[3]) statsEls[3].textContent = stats.readsPerMinute;

        const section = widgetElement.querySelector('.firebase-logger-section');
        if (section) {
            const collectionsHTML = collectionSummary.slice(0, 5).map(c =>
                `<div class="firebase-logger-row">
                    <span class="firebase-logger-collection">${c.collection}</span>
                    <span class="firebase-logger-value">${c.reads} (${c.percentage}%)</span>
                </div>`
            ).join('') || '<div class="firebase-logger-empty">No reads yet</div>';

            section.innerHTML = '<h5>Top Collections</h5>' + collectionsHTML;
        }
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    if (!widgetElement) return;

    const toggle = widgetElement.querySelector('#firebase-logger-toggle');
    const close = widgetElement.querySelector('#firebase-logger-close');
    const exportBtn = widgetElement.querySelector('#firebase-logger-export');
    const clearBtn = widgetElement.querySelector('#firebase-logger-clear');

    if (toggle) {
        toggle.addEventListener('click', () => {
            isExpanded = !isExpanded;
            widgetElement.classList.toggle('expanded', isExpanded);
            if (isExpanded) updateWidget();
        });
    }

    if (close) {
        close.addEventListener('click', (e) => {
            e.stopPropagation();
            isExpanded = false;
            widgetElement.classList.remove('expanded');
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = exportLogs();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'firebase-logs-' + new Date().toISOString().slice(0, 10) + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Limpar todos os logs?')) {
                clearLogs();
                updateWidget();
            }
        });
    }

    // Listen for firebase-log events
    window.addEventListener('firebase-log', updateWidget);
    window.addEventListener('firebase-log-cleared', updateWidget);
}

/**
 * Render the Firebase Logger Widget
 * Only visible for admin users
 */
export function renderFirebaseLoggerWidget() {
    const session = getSession();
    if (!session || session.role !== 'admin') {
        return; // Only show for admin
    }

    // Remove existing widget
    const existing = document.getElementById('firebase-logger-widget');
    if (existing) {
        existing.remove();
    }

    createStyles();

    const container = document.createElement('div');
    container.innerHTML = createWidgetHTML();
    widgetElement = container.firstElementChild;
    document.body.appendChild(widgetElement);

    setupEventListeners();
}

/**
 * Remove the widget
 */
export function removeFirebaseLoggerWidget() {
    if (widgetElement) {
        widgetElement.remove();
        widgetElement = null;
    }
}
