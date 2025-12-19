// Fatos Observados Page
// Gestão Centralizada FO - CMB

import { getSession, canEdit, COMPANY_NAMES } from '../firebase/auth.js';
import { getFatosObservados, updateFatoObservado, deleteFatoObservado } from '../firebase/database.js';
import { icons } from '../utils/icons.js';

let currentFilters = {
    status: '',
    tipo: ''
};

export async function renderFatosObservadosPage() {
    const pageContent = document.getElementById('page-content');
    const session = getSession();

    pageContent.innerHTML = `
    <div class="page-header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4);">
        <div>
          <h1 class="page-header__title">Fatos Observados</h1>
          <p class="page-header__subtitle">
            ${session.company ? COMPANY_NAMES[session.company] || session.company : 'Todas as Companhias'}
          </p>
        </div>
        ${canEdit() ? `
          <a href="/public-fo.html" target="_blank" class="btn btn--primary">
            ${icons.plus}
            <span>Novo FO</span>
          </a>
        ` : ''}
      </div>
    </div>
    
    <!-- Filters -->
    <div class="card" style="margin-bottom: var(--space-4);">
      <div class="card__body" style="padding: var(--space-4);">
        <div style="display: flex; gap: var(--space-4); flex-wrap: wrap; align-items: center;">
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            ${icons.filter}
            <span style="font-weight: 500;">Filtros:</span>
          </div>
          
          <select class="form-select" id="filter-status" style="width: auto; min-width: 150px;">
            <option value="">Todos os Status</option>
            <option value="pendente">Pendente</option>
            <option value="em_processo">Em Processo</option>
            <option value="concluido">Concluído</option>
          </select>
          
          <select class="form-select" id="filter-tipo" style="width: auto; min-width: 150px;">
            <option value="">Todos os Tipos</option>
            <option value="positivo">Positivo</option>
            <option value="negativo">Negativo</option>
          </select>
          
          <button class="btn btn--ghost btn--sm" id="clear-filters">
            ${icons.close}
            <span>Limpar</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- FO List -->
    <div class="card">
      <div class="card__body" id="fo-list-container" style="padding: 0;">
        <div style="display: flex; justify-content: center; padding: 3rem;">
          <span class="spinner spinner--lg"></span>
        </div>
      </div>
    </div>
  `;

    // Setup filter events
    setupFilterEvents();

    // Load FOs
    await loadFatosList();
}

async function loadFatosList() {
    const container = document.getElementById('fo-list-container');

    try {
        const fos = await getFatosObservados(currentFilters);

        if (fos.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">${icons.document}</div>
          <div class="empty-state__title">Nenhum FO encontrado</div>
          <div class="empty-state__description">
            ${currentFilters.status || currentFilters.tipo
                    ? 'Tente ajustar os filtros para ver mais resultados.'
                    : 'Os fatos observados registrados aparecerão aqui.'}
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
              <th>Tipo</th>
              <th>Aluno(s)</th>
              <th>Data/Hora</th>
              <th>Descrição</th>
              <th>Observador</th>
              <th>Status</th>
              ${canEdit() ? '<th>Ações</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${fos.map(fo => renderFORow(fo)).join('')}
          </tbody>
        </table>
      </div>
    `;

        // Setup action events
        setupActionEvents();

    } catch (error) {
        console.error('Error loading FOs:', error);
        container.innerHTML = `
      <div class="alert alert--warning" style="margin: var(--space-4);">
        <div class="alert__icon">${icons.warning}</div>
        <div class="alert__content">
          <div class="alert__title">Erro ao carregar dados</div>
          <p>Verifique a configuração do Firebase.</p>
        </div>
      </div>
    `;
    }
}

function renderFORow(fo) {
    const studentNumbers = Array.isArray(fo.studentNumbers)
        ? fo.studentNumbers.join(', ')
        : fo.studentNumbers || '-';

    const descricao = fo.descricao
        ? (fo.descricao.length > 50 ? fo.descricao.substring(0, 50) + '...' : fo.descricao)
        : '-';

    return `
    <tr data-id="${fo.id}">
      <td>
        <span class="badge badge--${fo.tipo === 'positivo' ? 'success' : 'danger'}">
          ${fo.tipo === 'positivo' ? 'Positivo' : 'Negativo'}
        </span>
      </td>
      <td><strong>${studentNumbers}</strong></td>
      <td>
        <div style="font-size: var(--font-size-sm);">
          <div>${fo.dataFato || '-'}</div>
          <div style="color: var(--text-tertiary);">${fo.horaFato || ''}</div>
        </div>
      </td>
      <td style="max-width: 200px;">
        <span title="${fo.descricao || ''}">${descricao}</span>
      </td>
      <td style="font-size: var(--font-size-sm);">${fo.nomeObservador || '-'}</td>
      <td>
        ${canEdit() ? `
          <select class="form-select status-select" data-id="${fo.id}" style="padding: var(--space-2); font-size: var(--font-size-xs);">
            <option value="pendente" ${fo.status === 'pendente' ? 'selected' : ''}>Pendente</option>
            <option value="em_processo" ${fo.status === 'em_processo' ? 'selected' : ''}>Em Processo</option>
            <option value="concluido" ${fo.status === 'concluido' ? 'selected' : ''}>Concluído</option>
          </select>
        ` : `
          <span class="badge badge--${getStatusColor(fo.status)}">
            ${getStatusLabel(fo.status)}
          </span>
        `}
      </td>
      ${canEdit() ? `
        <td>
          <div style="display: flex; gap: var(--space-2);">
            <button class="btn btn--icon btn--ghost view-btn" data-id="${fo.id}" title="Ver detalhes">
              ${icons.eye}
            </button>
            <button class="btn btn--icon btn--ghost delete-btn" data-id="${fo.id}" title="Excluir" style="color: var(--color-danger-500);">
              ${icons.trash}
            </button>
          </div>
        </td>
      ` : ''}
    </tr>
  `;
}

function setupFilterEvents() {
    const statusFilter = document.getElementById('filter-status');
    const tipoFilter = document.getElementById('filter-tipo');
    const clearBtn = document.getElementById('clear-filters');

    statusFilter.addEventListener('change', (e) => {
        currentFilters.status = e.target.value;
        loadFatosList();
    });

    tipoFilter.addEventListener('change', (e) => {
        currentFilters.tipo = e.target.value;
        loadFatosList();
    });

    clearBtn.addEventListener('click', () => {
        currentFilters = { status: '', tipo: '' };
        statusFilter.value = '';
        tipoFilter.value = '';
        loadFatosList();
    });
}

function setupActionEvents() {
    // Status change
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const foId = e.target.dataset.id;
            const newStatus = e.target.value;

            try {
                await updateFatoObservado(foId, { status: newStatus });
                showToast('Status atualizado com sucesso', 'success');
            } catch (error) {
                console.error('Error updating status:', error);
                showToast('Erro ao atualizar status', 'error');
            }
        });
    });

    // Delete
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const foId = e.currentTarget.dataset.id;

            if (confirm('Deseja realmente excluir este FO?')) {
                try {
                    await deleteFatoObservado(foId);
                    showToast('FO excluído com sucesso', 'success');
                    loadFatosList();
                } catch (error) {
                    console.error('Error deleting FO:', error);
                    showToast('Erro ao excluir FO', 'error');
                }
            }
        });
    });
}

function getStatusColor(status) {
    const colors = { 'pendente': 'warning', 'em_processo': 'primary', 'concluido': 'success' };
    return colors[status] || 'neutral';
}

function getStatusLabel(status) {
    const labels = { 'pendente': 'Pendente', 'em_processo': 'Em Processo', 'concluido': 'Concluído' };
    return labels[status] || status;
}

function showToast(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}
