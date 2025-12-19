// Auditoria Page
// Gestão Centralizada FO - CMB

import { getSession, canViewAudit, COMPANY_NAMES } from '../firebase/auth.js';
import { getAuditLogs } from '../firebase/database.js';
import { formatAction, formatCollectionName, parseStoredData } from '../services/auditLogger.js';
import { icons } from '../utils/icons.js';

export async function renderAuditoriaPage() {
  const pageContent = document.getElementById('page-content');
  const session = getSession();

  // Check permission
  if (!canViewAudit()) {
    pageContent.innerHTML = `
      <div class="alert alert--danger">
        <div class="alert__icon">${icons.lock}</div>
        <div class="alert__content">
          <div class="alert__title">Acesso Negado</div>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    `;
    return;
  }

  pageContent.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Auditoria</h1>
      <p class="page-header__subtitle">
        Registro de todas as ações realizadas no sistema
        ${session.role === 'commander' ? `- ${COMPANY_NAMES[session.company] || session.company}` : ''}
      </p>
    </div>
    
    <!-- Filters -->
    <div class="card" style="margin-bottom: var(--space-4);">
      <div class="card__body" style="padding: var(--space-4);">
        <div style="display: flex; gap: var(--space-4); flex-wrap: wrap; align-items: center;">
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            ${icons.filter}
            <span style="font-weight: 500;">Filtros:</span>
          </div>
          
          <select class="form-select" id="filter-action" style="width: auto; min-width: 150px;">
            <option value="">Todas as Ações</option>
            <option value="create">Criação</option>
            <option value="update">Edição</option>
            <option value="delete">Exclusão</option>
          </select>
          
          <button class="btn btn--ghost btn--sm" id="refresh-logs">
            ${icons.refresh}
            <span>Atualizar</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Audit Logs -->
    <div class="card">
      <div class="card__body" id="audit-list-container" style="padding: 0;">
        <div style="display: flex; justify-content: center; padding: 3rem;">
          <span class="spinner spinner--lg"></span>
        </div>
      </div>
    </div>
  `;

  // Setup events
  setupAuditEvents();

  // Load audit logs
  await loadAuditLogs();
}

let currentFilter = '';

async function loadAuditLogs() {
  const container = document.getElementById('audit-list-container');

  try {
    const logs = await getAuditLogs({
      action: currentFilter || undefined,
      limit: 100
    });

    if (logs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">${icons.audit}</div>
          <div class="empty-state__title">Nenhum registro encontrado</div>
          <div class="empty-state__description">
            As ações realizadas no sistema serão registradas aqui.
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-container" style="border: none;">
        <table class="table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Ação</th>
              <th>Tipo</th>
              <th>Usuário</th>
              <th>Companhia</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(log => renderAuditRow(log)).join('')}
          </tbody>
        </table>
      </div>
    `;

  } catch (error) {
    console.error('Error loading audit logs:', error);
    container.innerHTML = `
      <div class="alert alert--warning" style="margin: var(--space-4);">
        <div class="alert__icon">${icons.warning}</div>
        <div class="alert__content">
          <div class="alert__title">Erro ao carregar registros</div>
          <p>${error.message}</p>
          ${error.message.includes('index') ? '<p><small>Este erro geralmente indica falta de índice no Firestore. Verifique o console para o link de criação.</small></p>' : ''}
        </div>
      </div>
    `;
  }
}

function renderAuditRow(log) {
  const action = formatAction(log.action);
  const collection = formatCollectionName(log.collection);

  // Format timestamp
  let timestamp = '-';
  if (log.timestamp) {
    const date = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
    timestamp = date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return `
    <tr>
      <td style="white-space: nowrap;">
        <div style="font-size: var(--font-size-sm);">
          ${timestamp}
        </div>
      </td>
      <td>
        <span class="badge badge--${action.color}">
          ${action.label}
        </span>
      </td>
      <td>${collection}</td>
      <td>
        <strong>${log.userName || log.userId || '-'}</strong>
      </td>
      <td>
        ${log.company ? `
          <span class="badge badge--neutral">${COMPANY_NAMES[log.company] || log.company}</span>
        ` : '-'}
      </td>
      <td>
        <button class="btn btn--ghost btn--sm view-details-btn" 
                data-previous="${encodeURIComponent(log.previousData || '')}"
                data-new="${encodeURIComponent(log.newData || '')}">
          ${icons.eye}
          <span>Ver</span>
        </button>
      </td>
    </tr>
  `;
}

function setupAuditEvents() {
  const filterSelect = document.getElementById('filter-action');
  const refreshBtn = document.getElementById('refresh-logs');

  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      loadAuditLogs();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadAuditLogs();
    });
  }

  // View details (using event delegation)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-details-btn');
    if (btn) {
      const previousData = parseStoredData(decodeURIComponent(btn.dataset.previous));
      const newData = parseStoredData(decodeURIComponent(btn.dataset.new));
      showDetailsModal(previousData, newData);
    }
  });
}

function showDetailsModal(previousData, newData) {
  // Create modal dynamically
  const existingModal = document.getElementById('details-modal');
  if (existingModal) existingModal.remove();

  const existingBackdrop = document.getElementById('details-backdrop');
  if (existingBackdrop) existingBackdrop.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'details-backdrop';
  backdrop.className = 'modal-backdrop active';

  const modal = document.createElement('div');
  modal.id = 'details-modal';
  modal.className = 'modal active';
  modal.style.maxWidth = '600px';

  modal.innerHTML = `
    <div class="modal__header">
      <h3 class="modal__title">Detalhes da Alteração</h3>
      <button class="modal__close" id="details-close">${icons.close}</button>
    </div>
    <div class="modal__body" style="max-height: 400px; overflow-y: auto;">
      ${previousData ? `
        <div style="margin-bottom: var(--space-4);">
          <h4 style="color: var(--color-danger-600); margin-bottom: var(--space-2);">Dados Anteriores:</h4>
          <pre style="background: var(--bg-tertiary); padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--font-size-xs); overflow-x: auto;">${JSON.stringify(previousData, null, 2)}</pre>
        </div>
      ` : ''}
      ${newData ? `
        <div>
          <h4 style="color: var(--color-success-600); margin-bottom: var(--space-2);">Dados Novos:</h4>
          <pre style="background: var(--bg-tertiary); padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--font-size-xs); overflow-x: auto;">${JSON.stringify(newData, null, 2)}</pre>
        </div>
      ` : ''}
      ${!previousData && !newData ? '<p style="color: var(--text-tertiary);">Nenhum detalhe disponível.</p>' : ''}
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  // Close handlers
  const closeModal = () => {
    backdrop.remove();
    modal.remove();
  };

  document.getElementById('details-close').addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
}
