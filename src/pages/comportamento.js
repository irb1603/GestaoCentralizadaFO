// Comportamento Page - Student Behavior Grades
// Gestão Centralizada FO - CMB

import { getSession, getCompanyFilter, isAdmin } from '../firebase/auth.js';
import { db } from '../firebase/config.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  setDoc,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import {
  COMPANY_NAMES,
  FO_STATUS_LABELS,
  SANCAO_DISCIPLINAR,
  formatDate
} from '../constants/index.js';
import { icons } from '../utils/icons.js';
import {
  getCachedStudentList,
  cacheStudentList,
  getCachedFOList,
  cacheFOList,
  invalidateStudentCache
} from '../services/cacheService.js';

let allStudents = [];
let studentFOs = {};
let loadedFOsForStudents = new Set(); // Track which students have FOs loaded

export async function renderComportamentoPage() {
  const pageContent = document.getElementById('page-content');
  const companyFilter = getCompanyFilter();

  pageContent.innerHTML = `
    <div class="page-header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4);">
        <div>
          <h1 class="page-header__title">Comportamento</h1>
          <p class="page-header__subtitle">
            ${companyFilter ? COMPANY_NAMES[companyFilter] || companyFilter : 'Todas as Companhias'}
          </p>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: var(--space-2);">
          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
            <input type="file" id="csv-import-input" accept=".csv" style="display: none;">
            <button class="btn btn--secondary" id="import-csv-btn">
              ${icons.upload}
              <span>Importar CSV</span>
            </button>
            <button class="btn btn--primary" id="save-all-btn">
              ${icons.check}
              <span>Salvar Todas Notas</span>
            </button>
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--text-tertiary); font-family: monospace;">
            Formato CSV: numero,nome,turma,comportamento
          </div>
        </div>
      </div>
    </div>
    
    <!-- Search -->
    <div class="card" style="margin-bottom: var(--space-4);">
      <div class="card__body" style="padding: var(--space-4);">
        <div style="display: flex; gap: var(--space-4); flex-wrap: wrap; align-items: center;">
          ${isAdmin() ? `
          <select class="form-select" id="filter-company" style="width: auto; min-width: 180px;">
            <option value="">Todas as companhias</option>
            ${Object.entries(COMPANY_NAMES).map(([key, name]) => `<option value="${key}">${name}</option>`).join('')}
          </select>
          ` : ''}
          <div style="flex: 1; min-width: 200px; position: relative;">
            <input type="text" class="form-input" id="search-aluno" 
                   placeholder="Digite o número do aluno..." 
                   style="padding-left: 40px;">
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary);">
              ${icons.search}
            </span>
          </div>
          <button class="btn btn--primary" id="search-btn">
            ${icons.search}
            <span>Buscar</span>
          </button>
          <div style="display: flex; align-items: center; gap: var(--space-2); color: var(--text-secondary); font-size: var(--font-size-sm);">
            <span id="student-count">0</span> aluno(s)
          </div>
        </div>
      </div>
    </div>
    
    <!-- Students List -->
    <div id="comportamento-container">
      <div class="card">
        <div class="card__body">
          <div class="empty-state">
            <div class="empty-state__icon">${icons.search}</div>
            <div class="empty-state__title">Buscar Aluno</div>
            <div class="empty-state__text">Digite o número do aluno para consultar seu comportamento</div>
          </div>
        </div>
      </div>
    </div>
    
    <style>
      .comportamento-card {
        background: var(--bg-primary);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-lg);
        margin-bottom: var(--space-3);
        overflow: hidden;
        transition: all var(--transition-fast);
      }
      
      .comportamento-card:hover {
        box-shadow: var(--shadow-md);
      }
      
      .comportamento-card__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-4);
        cursor: pointer;
        user-select: none;
      }
      
      .comportamento-card__header:hover {
        background: var(--bg-secondary);
      }
      
      .comportamento-card__student {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        flex: 1;
      }
      
      .comportamento-card__number {
        font-weight: var(--font-weight-bold);
        font-size: var(--font-size-lg);
        color: var(--color-primary-600);
        min-width: 60px;
      }
      
      .comportamento-card__name {
        font-weight: var(--font-weight-medium);
        color: var(--text-primary);
        flex: 1;
      }
      
      .comportamento-card__turma {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        background: var(--bg-secondary);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
      }
      
      .comportamento-card__grade {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }
      
      .comportamento-card__grade-label {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
      }
      
      .comportamento-card__grade-input {
        width: 70px;
        text-align: center;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
        padding: var(--space-2);
        border-radius: var(--radius-md);
      }
      
      .comportamento-card__grade-input.grade-high {
        background: var(--color-success-100);
        border-color: var(--color-success-500);
        color: var(--color-success-700);
      }
      
      .comportamento-card__grade-input.grade-medium {
        background: var(--color-warning-100);
        border-color: var(--color-warning-500);
        color: var(--color-warning-700);
      }
      
      .comportamento-card__grade-input.grade-low {
        background: var(--color-danger-100);
        border-color: var(--color-danger-500);
        color: var(--color-danger-700);
      }
      
      .comportamento-card__toggle {
        transition: transform var(--transition-fast);
        color: var(--text-tertiary);
      }
      
      .comportamento-card.expanded .comportamento-card__toggle {
        transform: rotate(180deg);
      }
      
      .comportamento-card__body {
        display: none;
        padding: var(--space-4);
        border-top: 1px solid var(--border-light);
        background: var(--bg-secondary);
      }
      
      .comportamento-card.expanded .comportamento-card__body {
        display: block;
      }
      
      .sanction-history {
        margin-top: var(--space-3);
      }
      
      .sanction-history__title {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--text-secondary);
        margin-bottom: var(--space-3);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      
      .sanction-item {
        display: flex;
        align-items: flex-start;
        gap: var(--space-3);
        padding: var(--space-3);
        background: var(--bg-primary);
        border-radius: var(--radius-md);
        margin-bottom: var(--space-2);
        border-left: 3px solid var(--color-danger-500);
      }
      
      .sanction-item--positive {
        border-left-color: var(--color-success-500);
      }
      
      .sanction-item__date {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        min-width: 80px;
      }
      
      .sanction-item__type {
        font-weight: var(--font-weight-medium);
        color: var(--text-primary);
      }
      
      .sanction-item__desc {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        flex: 1;
      }
      
      .no-sanctions {
        text-align: center;
        color: var(--text-tertiary);
        padding: var(--space-4);
      }
    </style>
  `;

  // Setup events
  setupComportamentoEvents();

  // DON'T load data automatically - wait for turma selection
  // This reduces initial reads from ~2600 to 0
}

async function loadComportamentoData(studentNumber = '') {
  const container = document.getElementById('comportamento-container');
  const countEl = document.getElementById('student-count');
  const companyFilter = getCompanyFilter();
  const adminCompanySelect = document.getElementById('filter-company');
  const selectedCompany = adminCompanySelect?.value || companyFilter;

  // Require student number to search
  if (!studentNumber || studentNumber.trim() === '') {
    container.innerHTML = `
      <div class="card">
        <div class="card__body">
          <div class="empty-state">
            <div class="empty-state__icon">${icons.search}</div>
            <div class="empty-state__title">Buscar Aluno</div>
            <div class="empty-state__text">Digite o número do aluno para consultar seu comportamento</div>
          </div>
        </div>
      </div>
    `;
    countEl.textContent = '0';
    return;
  }

  // Show loading
  container.innerHTML = `
    <div style="display: flex; justify-content: center; padding: 3rem;">
      <span class="spinner spinner--lg"></span>
    </div>
  `;

  try {
    // Query by student number - VERY efficient: just 1 read!
    let constraints = [where('numero', '==', parseInt(studentNumber))];

    if (selectedCompany) {
      constraints.push(where('company', '==', selectedCompany));
    }

    const q = query(collection(db, 'students'), ...constraints);
    const snapshot = await getDocs(q);
    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    allStudents = students;
    countEl.textContent = students.length;

    if (students.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card__body">
            <div class="empty-state">
              <div class="empty-state__icon">${icons.users}</div>
              <div class="empty-state__title">Aluno não encontrado</div>
              <div class="empty-state__text">Verifique o número e tente novamente</div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Render cards
    container.innerHTML = students.map(student => renderComportamentoCard(student)).join('');

    // Setup card events
    setupCardEvents();

  } catch (error) {
    console.error('Error loading data:', error);
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

async function loadStudentFOs() {
  // This function is now used only for background loading
  // Individual student FOs are loaded on-demand
  const companyFilter = getCompanyFilter();
  const cacheKey = companyFilter || 'all';

  try {
    // Try cache first
    let fos = getCachedFOList(cacheKey, 'all');

    if (!fos) {
      let q;
      if (companyFilter) {
        q = query(collection(db, 'fatosObservados'), where('company', '==', companyFilter));
      } else {
        q = query(collection(db, 'fatosObservados'));
      }

      const snapshot = await getDocs(q);
      fos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Cache the results
      cacheFOList(fos, cacheKey, 'all');
    }

    // Group by student number
    studentFOs = {};
    for (const fo of fos) {
      for (const numero of (fo.studentNumbers || [])) {
        if (!studentFOs[numero]) {
          studentFOs[numero] = [];
        }
        studentFOs[numero].push(fo);
        loadedFOsForStudents.add(numero);
      }
    }

    // Sort each student's FOs by date
    for (const numero in studentFOs) {
      studentFOs[numero].sort((a, b) => new Date(b.dataFato) - new Date(a.dataFato));
    }

  } catch (error) {
    console.error('Error loading FOs:', error);
  }
}

// Load FOs for a specific student on demand
async function loadStudentFOsOnDemand(studentNumber) {
  if (loadedFOsForStudents.has(studentNumber)) {
    return studentFOs[studentNumber] || [];
  }

  try {
    const q = query(
      collection(db, 'fatosObservados'),
      where('studentNumbers', 'array-contains', studentNumber)
    );

    const snapshot = await getDocs(q);
    const fos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by date
    fos.sort((a, b) => new Date(b.dataFato) - new Date(a.dataFato));

    studentFOs[studentNumber] = fos;
    loadedFOsForStudents.add(studentNumber);

    return fos;
  } catch (error) {
    console.error('Error loading FOs for student:', studentNumber, error);
    return [];
  }
}

function renderComportamentoCard(student) {
  // Get or default grade to 10
  const grade = student.notaComportamento ?? 10;
  const gradeClass = grade >= 8 ? 'grade-high' : grade >= 5 ? 'grade-medium' : 'grade-low';

  // DON'T pre-load FO count - will be loaded when card is expanded
  // This saves significant Firebase reads

  return `
    <div class="comportamento-card" data-id="${student.id}" data-numero="${student.numero}">
      <div class="comportamento-card__header" onclick="toggleComportamentoCard('${student.id}', ${student.numero})">
        <div class="comportamento-card__student">
          <span class="comportamento-card__number">${student.numero}</span>
          <span class="comportamento-card__name">${student.nome || '-'}</span>
          <span class="comportamento-card__turma">${student.turma || '-'}</span>
        </div>
        
        <div class="comportamento-card__grade" onclick="event.stopPropagation()">
          <span class="comportamento-card__grade-label">Nota:</span>
          <input type="number" class="form-input comportamento-card__grade-input ${gradeClass}"
                 value="${grade}" min="0" max="10" step="0.1"
                 data-id="${student.id}" data-field="notaComportamento"
                 onchange="updateGradeClass(this)">
        </div>
        
        <div class="comportamento-card__toggle">
          ${icons.chevronDown}
        </div>
      </div>
      
      <div class="comportamento-card__body" id="card-body-${student.id}">
        <div class="sanction-history">
          <div class="sanction-history__title">Histórico de Sanções</div>
          <div class="fo-history-content" id="fo-history-${student.numero}">
            <div style="text-align: center; padding: var(--space-3);">
              <span class="spinner"></span>
              <span style="margin-left: 8px; color: var(--text-tertiary);">Carregando...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function setupComportamentoEvents() {
  const searchInput = document.getElementById('search-aluno');
  const searchBtn = document.getElementById('search-btn');
  const saveAllBtn = document.getElementById('save-all-btn');
  const importCsvBtn = document.getElementById('import-csv-btn');
  const csvImportInput = document.getElementById('csv-import-input');

  // Search button click
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      loadComportamentoData(searchInput.value.trim());
    });
  }

  // Enter key on search input
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        loadComportamentoData(searchInput.value.trim());
      }
    });
  }

  // Save all
  if (saveAllBtn) {
    saveAllBtn.addEventListener('click', saveAllGrades);
  }

  // CSV Import
  if (importCsvBtn && csvImportInput) {
    importCsvBtn.addEventListener('click', () => {
      csvImportInput.click();
    });

    csvImportInput.addEventListener('change', handleCsvImport);
  }
}

async function handleCsvImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const importBtn = document.getElementById('import-csv-btn');
  importBtn.disabled = true;
  importBtn.innerHTML = '<span class="spinner"></span> Importando...';

  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV vazio ou sem dados');
    }

    // Parse header
    const header = lines[0].toLowerCase().split(/[;,]/).map(h => h.trim());
    const numeroIdx = header.findIndex(h => h.includes('numero') || h.includes('número'));
    const dataIdx = header.findIndex(h => h.includes('data') || h.includes('consolidacao') || h.includes('consolidação'));
    const notaIdx = header.findIndex(h => h.includes('nota') || h.includes('comportamento'));

    if (numeroIdx === -1 || notaIdx === -1) {
      throw new Error('CSV deve conter colunas: numero e nota (ou notaComportamento)');
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each line
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(/[;,]/).map(v => v.trim());
      const numero = parseInt(values[numeroIdx]);
      const nota = parseFloat(values[notaIdx].replace(',', '.'));
      const dataConsolidacao = dataIdx !== -1 ? parseDate(values[dataIdx]) : null;

      if (isNaN(numero) || isNaN(nota)) {
        errorCount++;
        continue;
      }

      // Find student by numero
      const student = allStudents.find(s => s.numero === numero);
      if (student) {
        try {
          const updateData = {
            notaComportamento: nota,
            updatedAt: new Date().toISOString()
          };
          if (dataConsolidacao) {
            updateData.dataConsolidacao = dataConsolidacao;
          }
          await updateDoc(doc(db, 'students', student.id), updateData);
          successCount++;
        } catch (e) {
          console.error('Error updating student:', numero, e);
          errorCount++;
        }
      } else {
        errorCount++;
      }
    }

    showToast(`Importação concluída: ${successCount} atualizados, ${errorCount} erros`, 'success');

    // Reload data
    await loadComportamentoData();

  } catch (error) {
    console.error('CSV Import error:', error);
    showToast('Erro ao importar CSV: ' + error.message, 'error');
  } finally {
    importBtn.disabled = false;
    importBtn.innerHTML = `${icons.upload} <span>Importar CSV</span>`;
    event.target.value = ''; // Reset file input
  }
}

function parseDate(dateStr) {
  if (!dateStr) return null;

  // Try DD/MM/YYYY format
  const brMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  // Try YYYY-MM-DD format
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return dateStr;
  }

  return null;
}

function setupCardEvents() {
  // Card toggle is handled by onclick in HTML
}

// Global functions
window.toggleComportamentoCard = async function (studentId, studentNumber) {
  const card = document.querySelector(`.comportamento-card[data-id="${studentId}"]`);
  if (card) {
    const wasExpanded = card.classList.contains('expanded');
    card.classList.toggle('expanded');

    // If expanding and FOs not loaded yet, load them
    if (!wasExpanded && studentNumber) {
      const historyContainer = document.getElementById(`fo-history-${studentNumber}`);
      if (historyContainer && !loadedFOsForStudents.has(studentNumber)) {
        // Load FOs on demand
        const fos = await loadStudentFOsOnDemand(studentNumber);
        historyContainer.innerHTML = renderFOHistory(fos);
      } else if (historyContainer && studentFOs[studentNumber]) {
        // Already loaded, just render
        historyContainer.innerHTML = renderFOHistory(studentFOs[studentNumber] || []);
      }
    }
  }
};

// Render FO history HTML
function renderFOHistory(fos) {
  if (fos.length === 0) {
    return `
      <div class="no-sanctions">
        ${icons.checkCircle}
        <p>Nenhum registro de ocorrência para este aluno.</p>
      </div>
    `;
  }

  return fos.map(fo => {
    const isPositive = fo.tipo === 'positivo';
    const sancao = fo.sancaoDisciplinar ? SANCAO_DISCIPLINAR[fo.sancaoDisciplinar] : FO_STATUS_LABELS[fo.status] || fo.status;

    return `
      <div class="sanction-item ${isPositive ? 'sanction-item--positive' : ''}">
        <div class="sanction-item__date">${formatDate(fo.dataFato)}</div>
        <div>
          <div class="sanction-item__type">
            ${isPositive ? '✓ Positivo' : sancao}
            ${fo.quantidadeDias ? ` (${fo.quantidadeDias} dias)` : ''}
          </div>
          <div class="sanction-item__desc">${fo.descricao || '-'}</div>
        </div>
      </div>
    `;
  }).join('');
}

window.updateGradeClass = function (input) {
  const value = parseFloat(input.value);
  input.classList.remove('grade-high', 'grade-medium', 'grade-low');

  if (value >= 8) {
    input.classList.add('grade-high');
  } else if (value >= 5) {
    input.classList.add('grade-medium');
  } else {
    input.classList.add('grade-low');
  }
};

async function saveAllGrades() {
  const saveBtn = document.getElementById('save-all-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner"></span> Salvando...';

  try {
    const gradeInputs = document.querySelectorAll('[data-field="notaComportamento"]');

    // Use batch writes for efficiency - up to 500 operations per batch
    const batchSize = 500;
    const grades = [];

    for (const input of gradeInputs) {
      const studentId = input.dataset.id;
      const grade = parseFloat(input.value);

      if (!isNaN(grade)) {
        grades.push({ studentId, grade });
      }
    }

    // Process in batches
    let processed = 0;
    for (let i = 0; i < grades.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchItems = grades.slice(i, i + batchSize);

      for (const { studentId, grade } of batchItems) {
        const docRef = doc(db, 'students', studentId);
        batch.update(docRef, {
          notaComportamento: grade,
          updatedAt: new Date().toISOString()
        });
      }

      await batch.commit();
      processed += batchItems.length;
    }

    // Invalidate student cache after batch update
    invalidateStudentCache();

    showToast(`${processed} notas salvas com sucesso!`, 'success');

  } catch (error) {
    console.error('Error saving grades:', error);
    showToast('Erro ao salvar notas', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `${icons.check} <span>Salvar Todas Notas</span>`;
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
