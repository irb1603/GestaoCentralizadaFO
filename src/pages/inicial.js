// Página Inicial - Fatos Observados Pendentes
// Gestão Centralizada FO - CMB

import { getSession, getCompanyFilter } from '../firebase/auth.js';
import { db } from '../firebase/config.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  getDoc
} from 'firebase/firestore';
import {
  FO_STATUS,
  COMPANY_NAMES,
  COMPANY_SHORT_NAMES,
  formatDate,
  getWhatsAppLink
} from '../constants/index.js';
import { renderExpandableCard, expandableCardStyles, setupAutocomplete, setupQuantidadeDias, setupAISuggestion } from '../components/expandableCard.js';
import { renderActionModals, actionButtonsStyles, setupActionButtons } from '../components/actionModals.js';
import { icons } from '../utils/icons.js';
import { logAction } from '../services/auditLogger.js';
import {
  invalidateAICache,
  invalidateFOCache,
  getCachedFOList,
  cacheFOList,
  getCachedStudent,
  cacheStudent,
  CACHE_TTL
} from '../services/cacheService.js';

let allFOs = [];
let studentDataCache = {};

export async function renderInicialPage() {
  const pageContent = document.getElementById('page-content');
  const session = getSession();
  const companyFilter = getCompanyFilter();

  // Inject expandable card styles
  if (!document.getElementById('expandable-card-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'expandable-card-styles';
    styleEl.textContent = expandableCardStyles + actionButtonsStyles;
    document.head.appendChild(styleEl);
  }

  pageContent.innerHTML = `
    <div class="page-header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4);">
        <div>
          <h1 class="page-header__title">Fatos Observados Pendentes</h1>
          <p class="page-header__subtitle">
            ${companyFilter ? COMPANY_NAMES[companyFilter] || companyFilter : 'Todas as Companhias'}
          </p>
        </div>
        <a href="/public-fo.html" class="btn btn--primary" target="_blank">
          ${icons.plus}
          <span>Novo Registro</span>
        </a>
    </div>
    
    <!-- Action Buttons -->
    <div class="action-buttons-grid">
      <button class="action-btn action-btn--primary" id="btn-gerar-termo">
        ${icons.document}
        <span>Gerar Termo</span>
      </button>
      <button class="action-btn action-btn--success" id="btn-enviar-sancao">
        ${icons.externalLink}
        <span>Enviar Sanção</span>
      </button>
      <button class="action-btn action-btn--info" id="btn-enviar-positivo">
        ${icons.thumbsUp}
        <span>Enviar FO Positivo</span>
      </button>
      <button class="action-btn action-btn--warning" id="btn-aptos-julgamento">
        ${icons.clock}
        <span>Aptos p/ Julgamento</span>
      </button>
    </div>
    
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--warning">
          ${icons.clock}
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value" id="stat-pendentes">-</div>
          <div class="stat-card__label">Pendentes</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--danger">
          ${icons.thumbsDown}
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value" id="stat-negativos">-</div>
          <div class="stat-card__label">Negativos</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--success">
          ${icons.thumbsUp}
        </div>
        <div class="stat-card__content">
          <div class="stat-card__value" id="stat-positivos">-</div>
          <div class="stat-card__label">Positivos</div>
        </div>
      </div>
    </div>
    
    <!-- Filter -->
    <div class="card" style="margin-bottom: var(--space-4);">
      <div class="card__body" style="padding: var(--space-4);">
        <div style="display: flex; gap: var(--space-4); flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 200px; position: relative;">
            <input type="text" class="form-input" id="search-fo" 
                   placeholder="Buscar por número ou nome do aluno..." 
                   style="padding-left: 40px;">
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary);">
              ${icons.search}
            </span>
          </div>
          <select class="form-select" id="filter-tipo" style="width: auto;">
            <option value="">Todos os tipos</option>
            <option value="negativo">Negativos</option>
            <option value="positivo">Positivos</option>
          </select>
        </div>
      </div>
    </div>
    
    <!-- Cards Container -->
    <div id="fo-cards-container">
      <div style="display: flex; justify-content: center; padding: 3rem;">
        <span class="spinner spinner--lg"></span>
      </div>
    </div>
    
    ${renderActionModals()}
  `;

  // Setup events
  setupInicialEvents();

  // Load FOs
  await loadPendingFOs();
}

async function loadPendingFOs(searchTerm = '', tipoFilter = '', forceRefresh = false) {
  const container = document.getElementById('fo-cards-container');
  const companyFilter = getCompanyFilter();
  const cacheKey = companyFilter || 'all';

  try {
    // OPTIMIZATION: Try cache first (reduces Firebase reads significantly)
    let cachedFOs = !forceRefresh ? getCachedFOList(cacheKey, FO_STATUS.PENDENTE) : null;

    if (cachedFOs) {
      console.log('[Cache] Using cached pending FOs:', cachedFOs.length);
      allFOs = cachedFOs;
    } else {
      // Build query for pending FOs
      let q;
      if (companyFilter) {
        q = query(
          collection(db, 'fatosObservados'),
          where('status', '==', FO_STATUS.PENDENTE),
          where('company', '==', companyFilter)
        );
      } else {
        q = query(
          collection(db, 'fatosObservados'),
          where('status', '==', FO_STATUS.PENDENTE)
        );
      }

      const snapshot = await getDocs(q);
      allFOs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Cache the results (5 min TTL for pending FOs - more dynamic)
      cacheFOList(allFOs, cacheKey, FO_STATUS.PENDENTE);
      console.log('[Cache] Cached pending FOs:', allFOs.length);
    }

    // Sort by date (newest first)
    allFOs.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.dataFato);
      const dateB = b.createdAt?.toDate?.() || new Date(b.dataFato);
      return dateB - dateA;
    });

    // Apply filters
    let filteredFOs = allFOs;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredFOs = filteredFOs.filter(fo => {
        const studentNums = fo.studentNumbers?.join(' ') || '';
        const studentNames = (fo.studentInfo || []).map(s => s.nome).join(' ').toLowerCase();
        return studentNums.includes(term) || studentNames.includes(term);
      });
    }

    if (tipoFilter) {
      filteredFOs = filteredFOs.filter(fo => fo.tipo === tipoFilter);
    }

    // Update stats
    document.getElementById('stat-pendentes').textContent = allFOs.length;
    document.getElementById('stat-negativos').textContent = allFOs.filter(fo => fo.tipo === 'negativo').length;
    document.getElementById('stat-positivos').textContent = allFOs.filter(fo => fo.tipo === 'positivo').length;

    // Render cards
    if (filteredFOs.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card__body">
            <div class="empty-state">
              <div class="empty-state__icon">${icons.checkCircle}</div>
              <div class="empty-state__title">Nenhum FO pendente</div>
              <div class="empty-state__description">
                ${searchTerm || tipoFilter ? 'Nenhum resultado encontrado para os filtros aplicados.' : 'Todos os fatos observados foram processados.'}
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // OPTIMIZATION: Load student data with caching
    for (const fo of filteredFOs) {
      const studentNum = fo.studentNumbers?.[0];
      if (studentNum && !studentDataCache[studentNum]) {
        // Try global cache first
        const cachedStudent = getCachedStudent(studentNum);
        if (cachedStudent) {
          studentDataCache[studentNum] = cachedStudent;
        } else {
          try {
            const studentDoc = await getDoc(doc(db, 'students', String(studentNum)));
            if (studentDoc.exists()) {
              const studentData = studentDoc.data();
              studentDataCache[studentNum] = studentData;
              // Cache for future use
              cacheStudent({ ...studentData, numero: studentNum });
            }
          } catch (err) {
            console.warn('Could not load student data:', err);
          }
        }
      }
    }

    // Render cards
    container.innerHTML = filteredFOs.map(fo => {
      const studentData = studentDataCache[fo.studentNumbers?.[0]] || {};
      return renderExpandableCard(fo, studentData, false);
    }).join('');

    // Setup card actions
    setupCardActions();

    // Setup autocomplete for RICM fields
    setupAutocomplete();

    // Setup AI suggestion buttons
    setupAISuggestion();

    // Setup quantity days dynamic fields
    setupQuantidadeDias();

    // Setup action buttons (Gerar Termo, Enviar Sanção, etc.)
    setupActionButtons(allFOs, studentDataCache);

  } catch (error) {
    console.error('Error loading FOs:', error);
    container.innerHTML = `
      <div class="alert alert--danger">
        <div class="alert__icon">${icons.warning}</div>
        <div class="alert__content">
          <div class="alert__title">Erro ao carregar dados</div>
          <p>${error.message || 'Verifique a conexão com o Firebase.'}</p>
        </div>
      </div>
    `;
  }
}

function setupInicialEvents() {
  const searchInput = document.getElementById('search-fo');
  const tipoFilter = document.getElementById('filter-tipo');

  // Search with debounce
  let debounce;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        loadPendingFOs(e.target.value, tipoFilter.value);
      }, 300);
    });
  }

  // Type filter
  if (tipoFilter) {
    tipoFilter.addEventListener('change', (e) => {
      loadPendingFOs(searchInput.value, e.target.value);
    });
  }
}

function setupCardActions() {
  // Save buttons
  document.querySelectorAll('[data-action="save"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.expandable-card');
      const foId = card.dataset.foId;
      await saveCardChanges(foId, card);
    });
  });

  // Cancel buttons
  document.querySelectorAll('[data-action="cancel"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.expandable-card');
      card.classList.remove('expanded');
    });
  });

  // Transfer buttons
  document.querySelectorAll('[data-action="transfer"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.expandable-card');
      const foId = card.dataset.foId;
      const transferTo = card.querySelector('[data-field="transferTo"]').value;

      if (!transferTo) {
        showToast('Selecione um destino para transferir', 'warning');
        return;
      }

      await transferFO(foId, transferTo);
    });
  });

  // WhatsApp buttons
  document.querySelectorAll('[data-action="send-whatsapp"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.expandable-card');
      const telInput = card.querySelector('[data-field="telefoneResponsavel"]');
      const phone = telInput?.value;

      if (!phone) {
        showToast('Preencha o telefone do responsável', 'warning');
        return;
      }

      // Get FO info for message
      const foId = card.dataset.foId;
      const fo = allFOs.find(f => f.id === foId);
      const studentName = fo?.studentInfo?.[0]?.nome || 'Aluno(a)';
      const numeroFO = fo?.numeroFO || foId;
      const descricao = fo?.descricao || '';

      const message = `Foi registrado um novo Fato Observado para o(a) aluno(a): ${studentName}.

Detalhes: Nr do FO ${numeroFO} - Descrição do fato: ${descricao}`;

      window.open(getWhatsAppLink(phone, message), '_blank');
    });
  });

  // Concluir buttons
  document.querySelectorAll('[data-action="concluir"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.expandable-card');
      const foId = card.dataset.foId;

      // Confirmation dialog
      if (!confirm('Deseja realmente enviar este FO para Concluir?\n\nEle será movido para a página de Conclusão.')) {
        return;
      }

      await transferFO(foId, FO_STATUS.CONCLUIR);
    });
  });

  // Delete buttons (move to GLPI)
  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.expandable-card');
      const foId = card.dataset.foId;

      if (confirm('Deseja realmente excluir este FO? Ele será movido para a página GLPI.')) {
        await deleteFO(foId);
      }
    });
  });
}

async function saveCardChanges(foId, card) {
  const updates = {};

  // Collect all field values from inputs and selects
  card.querySelectorAll('[data-field]').forEach(element => {
    const field = element.dataset.field;

    // Skip datasCumprimento - we'll handle it separately
    if (field === 'datasCumprimento') return;

    let value;

    // Check if it's an autocomplete container (has data-value)
    if (element.dataset.value !== undefined) {
      value = element.dataset.value || '';
    } else {
      value = element.value;
    }

    // Handle boolean selects
    if (value === 'true') value = true;
    else if (value === 'false') value = false;

    // Handle numbers
    if (element.type === 'number' && value !== '') {
      value = parseInt(value);
    }

    updates[field] = value;
  });

  // Collect multiple cumprimento dates
  const datasCumprimento = [];
  card.querySelectorAll('.data-cumprimento-input').forEach(input => {
    if (input.value) {
      datasCumprimento.push(input.value);
    }
  });
  if (datasCumprimento.length > 0) {
    updates.datasCumprimento = datasCumprimento;
    // Also set single date field for backward compatibility
    updates.dataCumprimento = datasCumprimento.join(', ');
  }

  try {
    const saveBtn = card.querySelector('[data-action="save"]');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span>';

    // Get previous data for audit
    const docRef = doc(db, 'fatosObservados', foId);
    const previousDoc = await getDoc(docRef);
    const previousData = previousDoc.exists() ? previousDoc.data() : null;

    const newData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(docRef, newData);

    // Audit Log
    if (previousData) {
      // Merge with previous data to have complete context
      const fullNewData = { ...previousData, ...newData };
      await logAction('update', 'fatosObservados', foId, previousData, fullNewData);
    }

    // Invalidate caches
    invalidateFOCache(foId);
    invalidateAICache(); // Invalidate all AI cached data

    showToast('Alterações salvas com sucesso', 'success');
    card.classList.remove('expanded');

    // Refresh the list (force refresh to get latest from Firebase)
    const searchInput = document.getElementById('search-fo');
    const tipoFilter = document.getElementById('filter-tipo');
    await loadPendingFOs(searchInput?.value || '', tipoFilter?.value || '', true);

  } catch (error) {
    console.error('Error saving:', error);
    showToast('Erro ao salvar alterações', 'error');
  }
}

async function transferFO(foId, newStatus) {
  try {
    const docRef = doc(db, 'fatosObservados', foId);

    // Get previous data
    const previousDoc = await getDoc(docRef);
    const previousData = previousDoc.exists() ? previousDoc.data() : null;

    const updates = {
      status: newStatus,
      transferredAt: new Date().toISOString()
    };

    await updateDoc(docRef, updates);

    // Audit Log
    if (previousData) {
      await logAction('update', 'fatosObservados', foId, previousData, { ...previousData, ...updates });
    }

    // Invalidate caches
    invalidateFOCache(foId);
    invalidateAICache();

    showToast('FO transferido com sucesso', 'success');

    // Refresh the list (force refresh after mutation)
    const searchInput = document.getElementById('search-fo');
    const tipoFilter = document.getElementById('filter-tipo');
    await loadPendingFOs(searchInput?.value || '', tipoFilter?.value || '', true);

  } catch (error) {
    console.error('Error transferring:', error);
    showToast('Erro ao transferir FO', 'error');
  }
}

async function deleteFO(foId) {
  try {
    const docRef = doc(db, 'fatosObservados', foId);

    // Get previous data
    const previousDoc = await getDoc(docRef);
    const previousData = previousDoc.exists() ? previousDoc.data() : null;

    const updates = {
      status: 'glpi',
      deletedAt: new Date().toISOString()
    };

    await updateDoc(docRef, updates);

    // Audit Log
    if (previousData) {
      await logAction('delete', 'fatosObservados', foId, previousData, { ...previousData, ...updates });
    }

    // Invalidate caches
    invalidateFOCache(foId);
    invalidateAICache();

    showToast('FO movido para GLPI', 'success');

    // Refresh the list (force refresh after mutation)
    const searchInput = document.getElementById('search-fo');
    const tipoFilter = document.getElementById('filter-tipo');
    await loadPendingFOs(searchInput?.value || '', tipoFilter?.value || '', true);

  } catch (error) {
    console.error('Error deleting:', error);
    showToast('Erro ao excluir FO', 'error');
  }
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
