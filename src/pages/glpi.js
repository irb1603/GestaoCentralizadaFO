// GLPI Page - FOs Excluídos/Removidos
// Gestão Centralizada FO - CMB

import { getSession, getCompanyFilter } from '../firebase/auth.js';
import { db } from '../firebase/config.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import {
  COMPANY_NAMES,
  TIPO_FATO_LABELS,
  TIPO_FATO_COLORS,
  formatDate,
  FO_STATUS
} from '../constants/index.js';
import { icons } from '../utils/icons.js';

export async function renderGLPIPage() {
  const pageContent = document.getElementById('page-content');
  const companyFilter = getCompanyFilter();

  pageContent.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">GLPI - FOs Excluídos</h1>
      <p class="page-header__subtitle">
        ${companyFilter ? COMPANY_NAMES[companyFilter] || companyFilter : 'Todas as Companhias'}
      </p>
    </div>
    
    <div id="glpi-content">
      <div style="display: flex; justify-content: center; padding: 3rem;">
        <span class="spinner spinner--lg"></span>
      </div>
    </div>
  `;

  await loadGLPIFOs();
}

async function loadGLPIFOs() {
  const container = document.getElementById('glpi-content');
  const companyFilter = getCompanyFilter();

  try {
    let q;
    if (companyFilter) {
      q = query(
        collection(db, 'fatosObservados'),
        where('status', '==', 'glpi'),
        where('company', '==', companyFilter)
      );
    } else {
      q = query(
        collection(db, 'fatosObservados'),
        where('status', '==', 'glpi')
      );
    }

    const snapshot = await getDocs(q);
    const fos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by deletedAt date (newest first)
    fos.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));

    if (fos.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card__body">
            <div class="empty-state">
              <div class="empty-state__icon">${icons.folder}</div>
              <div class="empty-state__title">Nenhum FO excluído</div>
              <div class="empty-state__description">FOs excluídos da página inicial aparecerão aqui.</div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="card">
        <div class="card__body" style="padding: 0;">
          <div class="table-container" style="border: none;">
            <table class="table">
              <thead>
                <tr>
                  <th>Nº Aluno</th>
                  <th>Nome</th>
                  <th>Turma</th>
                  <th>Tipo</th>
                  <th>Data do Fato</th>
                  <th>Data Exclusão</th>
                  <th>Nº Chamado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                ${fos.map(fo => {
      const tipoColor = TIPO_FATO_COLORS[fo.tipo] || 'neutral';
      const tipoLabel = TIPO_FATO_LABELS[fo.tipo] || fo.tipo;
      return `
                  <tr data-id="${fo.id}">
                    <td><strong>${fo.studentNumbers?.[0] || '-'}</strong></td>
                    <td>${fo.studentInfo?.[0]?.nome || '-'}</td>
                    <td>${fo.studentInfo?.[0]?.turma || '-'}</td>
                    <td><span class="badge badge--${tipoColor}">${tipoLabel}</span></td>
                    <td>${formatDate(fo.dataFato)}</td>
                    <td>${fo.deletedAt ? formatDate(fo.deletedAt.split('T')[0]) : '-'}</td>
                    <td>
                      <input type="text" 
                             class="chamado-input" 
                             data-id="${fo.id}" 
                             value="${fo.numeroChamado || ''}" 
                             placeholder="Ex: 12345"
                             style="width: 100px; padding: var(--space-1) var(--space-2); border: 1px solid var(--border-light); border-radius: var(--radius-sm); font-size: var(--font-size-sm);">
                    </td>
                    <td>
                      <div style="display: flex; gap: var(--space-2);">
                        <button class="btn btn--secondary btn--sm restore-btn" data-id="${fo.id}" title="Restaurar para Pendentes">
                          ${icons.refresh} Restaurar
                        </button>
                        <button class="btn btn--ghost btn--sm delete-btn" data-id="${fo.id}" title="Excluir permanentemente" style="color: var(--color-danger-500);">
                          ${icons.trash}
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
    }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div style="margin-top: var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm);">
        Total: ${fos.length} FOs excluídos
      </div>
    `;

    setupGLPIActions();

  } catch (error) {
    console.error('Error loading GLPI:', error);
    container.innerHTML = `
      <div class="alert alert--danger">
        <div class="alert__icon">${icons.warning}</div>
        <div class="alert__content">
          <p>Erro ao carregar dados: ${error.message}</p>
        </div>
      </div>
    `;
  }
}

function setupGLPIActions() {
  // Chamado input handlers - save on blur
  document.querySelectorAll('.chamado-input').forEach(input => {
    input.addEventListener('blur', async () => {
      const foId = input.dataset.id;
      const value = input.value.trim();

      try {
        await updateDoc(doc(db, 'fatosObservados', foId), {
          numeroChamado: value,
          updatedAt: new Date().toISOString()
        });
        input.style.borderColor = 'var(--color-success-500)';
        setTimeout(() => {
          input.style.borderColor = '';
        }, 1500);
      } catch (error) {
        console.error('Error saving chamado:', error);
        input.style.borderColor = 'var(--color-danger-500)';
      }
    });

    // Also save on Enter
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    });
  });

  // Restore buttons
  document.querySelectorAll('.restore-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const foId = btn.dataset.id;

      try {
        await updateDoc(doc(db, 'fatosObservados', foId), {
          status: FO_STATUS.PENDENTE,
          restoredAt: new Date().toISOString()
        });

        showToast('FO restaurado para Pendentes', 'success');
        await loadGLPIFOs();
      } catch (error) {
        console.error('Error restoring:', error);
        showToast('Erro ao restaurar FO', 'error');
      }
    });
  });

  // Delete buttons (permanent delete)
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const foId = btn.dataset.id;

      if (!confirm('Deseja excluir este FO PERMANENTEMENTE? Esta ação não pode ser desfeita.')) {
        return;
      }

      try {
        await deleteDoc(doc(db, 'fatosObservados', foId));

        showToast('FO excluído permanentemente', 'success');
        await loadGLPIFOs();
      } catch (error) {
        console.error('Error deleting:', error);
        showToast('Erro ao excluir FO', 'error');
      }
    });
  });
}

function showToast(message, type = 'info') {
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
