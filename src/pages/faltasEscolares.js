/**
 * Faltas Escolares Page - Manual Entry System
 * Gestão Centralizada FO - CMB
 */

import { db } from '../firebase/config.js';
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { getSession } from '../firebase/auth.js';
import {
  COLLECTIONS,
  COMPANY_NAMES,
  USER_ROLES
} from '../constants/index.js';
import { icons } from '../utils/icons.js';
import { getStudents } from '../firebase/database.js';
import { showToast } from '../utils/toast.js';

let allStudents = [];
let historyRecords = [];
let selectedStudents = [];

/**
 * Format date value to DD/MM/YYYY string
 * Handles Firestore Timestamp, Date objects, and date strings
 */
function formatDateValue(dateVal) {
  if (!dateVal) return '-';

  let date;
  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    // Firestore Timestamp
    date = dateVal.toDate();
  } else if (dateVal instanceof Date) {
    date = dateVal;
  } else if (typeof dateVal === 'string') {
    // String date
    if (dateVal.includes('-')) {
      const parts = dateVal.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateVal;
  } else {
    return '-';
  }

  // Format Date object to DD/MM/YYYY
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Render Faltas Escolares Page
 */
export async function renderFaltasEscolaresPage() {
  const pageContent = document.getElementById('page-content');
  const session = getSession();

  // Inject styles
  if (!document.getElementById('faltas-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'faltas-styles';
    styleEl.textContent = faltasStyles;
    document.head.appendChild(styleEl);
  }

  // Load students for reference
  allStudents = await getStudents();

  // Reset state
  selectedStudents = [];

  pageContent.innerHTML = `
    <div class="faltas-page">
      <div class="page-header" style="margin-bottom: var(--space-6);">
        <h1 class="page-title">Faltas Escolares</h1>
        <p class="page-subtitle">Registro manual de faltas do dia inteiro</p>
      </div>
      
      <!-- Tabs -->
      <div class="faltas-tabs">
        <button class="faltas-tab active" data-tab="registro">
          ${icons.edit} Registrar Faltas
        </button>
        <button class="faltas-tab" data-tab="consulta">
          ${icons.search} Consultar Período
        </button>
        <button class="faltas-tab" data-tab="historico">
          ${icons.clock} Histórico
        </button>
      </div>
      
      <!-- Tab: Registro de Faltas -->
      <div id="tab-registro" class="faltas-tab-content active">
        <div class="card">
          <div class="card__header">
            <h3 class="card__title">Novo Registro de Faltas</h3>
          </div>
          <div class="card__body">
            <div class="faltas-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Data</label>
                  <input type="date" id="input-data" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group" style="flex: 2;">
                  <label class="form-label">Números dos Alunos (separados por vírgula)</label>
                  <input type="text" id="input-numeros" class="form-input" placeholder="Ex: 12001, 12002, 12003...">
                </div>
              </div>
              
              <div id="preview-container" class="preview-container" style="display: none;">
                <h4>Alunos selecionados:</h4>
                <div id="preview-list" class="preview-list"></div>
              </div>
              
              <div class="form-actions">
                <button class="btn btn--ghost" id="btn-limpar">
                  ${icons.trash} Limpar
                </button>
                <button class="btn btn--primary" id="btn-salvar" disabled>
                  ${icons.check} Salvar Registro
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tab: Consulta por Período -->
      <div id="tab-consulta" class="faltas-tab-content">
        <div class="card">
          <div class="card__header">
            <h3 class="card__title">Consultar Faltas por Período</h3>
          </div>
          <div class="card__body">
            <div class="consulta-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Data Inicial</label>
                  <input type="date" id="consulta-inicio" class="form-input">
                </div>
                <div class="form-group">
                  <label class="form-label">Data Final</label>
                  <input type="date" id="consulta-fim" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group" style="align-self: flex-end;">
                  <button class="btn btn--primary" id="btn-consultar">
                    ${icons.search} Consultar
                  </button>
                </div>
              </div>
            </div>
            
            <div id="consulta-resultado" class="consulta-resultado"></div>
          </div>
        </div>
      </div>
      
      <!-- Tab: Histórico -->
      <div id="tab-historico" class="faltas-tab-content">
        <div id="history-container" class="history-section"></div>
      </div>
    </div>
  `;

  setupEventListeners();
  loadHistory();
  setDefaultConsultaDates();
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.faltas-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.faltas-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.faltas-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');

      if (tab.dataset.tab === 'historico') {
        renderHistory();
      }
    });
  });

  // Number input - real-time parsing
  const inputNumeros = document.getElementById('input-numeros');
  let debounceTimer;
  inputNumeros.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => parseStudentNumbers(), 300);
  });

  // Clear button
  document.getElementById('btn-limpar').addEventListener('click', () => {
    selectedStudents = [];
    document.getElementById('input-numeros').value = '';
    document.getElementById('preview-container').style.display = 'none';
    document.getElementById('btn-salvar').disabled = true;
  });

  // Save button
  document.getElementById('btn-salvar').addEventListener('click', saveRecord);

  // Consulta button
  document.getElementById('btn-consultar').addEventListener('click', consultarPeriodo);
}

/**
 * Set default consultation dates (last 30 days)
 */
function setDefaultConsultaDates() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  document.getElementById('consulta-inicio').value = inicioMes.toISOString().split('T')[0];
}

/**
 * Parse student numbers from input
 */
function parseStudentNumbers() {
  const input = document.getElementById('input-numeros').value;
  const previewContainer = document.getElementById('preview-container');
  const previewList = document.getElementById('preview-list');
  const saveBtn = document.getElementById('btn-salvar');

  // Parse numbers from input
  const numbers = input
    .split(/[,;\s]+/)
    .map(n => parseInt(n.trim()))
    .filter(n => !isNaN(n) && n > 0);

  // Find matching students
  selectedStudents = [];
  const notFound = [];

  numbers.forEach(num => {
    const student = allStudents.find(s => s.numero === num);
    if (student) {
      if (!selectedStudents.find(s => s.numero === num)) {
        selectedStudents.push(student);
      }
    } else {
      notFound.push(num);
    }
  });

  // Update preview
  if (selectedStudents.length > 0 || notFound.length > 0) {
    previewContainer.style.display = 'block';

    let html = '';

    if (selectedStudents.length > 0) {
      html += `<div class="preview-found">`;
      html += selectedStudents.map(s => `
                <div class="preview-student">
                    <span class="preview-student__number">${s.numero}</span>
                    <span class="preview-student__name">${s.nome || s.nomeGuerra || 'N/A'}</span>
                    <span class="preview-student__turma">Turma ${s.turma || '-'}</span>
                </div>
            `).join('');
      html += `</div>`;
    }

    if (notFound.length > 0) {
      html += `<div class="preview-notfound">
                <span class="preview-notfound__label">${icons.warning} Não encontrados:</span>
                <span>${notFound.join(', ')}</span>
            </div>`;
    }

    previewList.innerHTML = html;
    saveBtn.disabled = selectedStudents.length === 0;
  } else {
    previewContainer.style.display = 'none';
    saveBtn.disabled = true;
  }
}

/**
 * Save attendance record
 */
async function saveRecord() {
  const data = document.getElementById('input-data').value;

  if (!data) {
    showToast('Por favor, informe a data.', 'warning');
    return;
  }

  if (selectedStudents.length === 0) {
    showToast('Nenhum aluno selecionado.', 'warning');
    return;
  }

  const session = getSession();
  const saveBtn = document.getElementById('btn-salvar');

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner"></span> Salvando...';

  try {
    const record = {
      data: Timestamp.fromDate(new Date(data + 'T12:00:00')),
      company: session.company || null,
      registradoPor: session.username,
      createdAt: serverTimestamp(),
      alunos: selectedStudents.map(s => ({
        numero: s.numero,
        nome: s.nome || s.nomeGuerra || '',
        turma: s.turma || '',
        justificada: false
      }))
    };

    await addDoc(collection(db, COLLECTIONS.FALTAS), record);

    showToast(`Registro salvo com ${selectedStudents.length} aluno(s)!`, 'success');

    // Reset form
    selectedStudents = [];
    document.getElementById('input-numeros').value = '';
    document.getElementById('preview-container').style.display = 'none';

    // Reload history
    await loadHistory();

  } catch (error) {
    console.error('Error saving record:', error);
    showToast('Erro ao salvar: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `${icons.check} Salvar Registro`;
  }
}

/**
 * Load History
 */
async function loadHistory() {
  try {
    const session = getSession();
    let q;

    // Simple query without orderBy to avoid index requirements
    if (session.role === USER_ROLES.COMMANDER && session.company) {
      q = query(
        collection(db, COLLECTIONS.FALTAS),
        where('company', '==', session.company)
      );
    } else {
      q = query(collection(db, COLLECTIONS.FALTAS));
    }

    const snapshot = await getDocs(q);
    historyRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort on client side by date descending
    historyRecords.sort((a, b) => {
      const dateA = a.data?.toDate ? a.data.toDate() : new Date(a.data);
      const dateB = b.data?.toDate ? b.data.toDate() : new Date(b.data);
      return dateB - dateA;
    });

  } catch (error) {
    console.error('Error loading history:', error);
    showToast('Erro ao carregar histórico: ' + error.message, 'error');
  }
}

/**
 * Render History
 */
function renderHistory() {
  const container = document.getElementById('history-container');

  if (historyRecords.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="card__body">
          <p class="text-secondary" style="text-align: center;">Nenhum registro encontrado.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="history-list">
      ${historyRecords.map(record => {
    const totalAlunos = record.alunos?.length || 0;
    const dataStr = formatDateValue(record.data);

    return `
          <div class="history-card" data-id="${record.id}">
            <div class="history-card__main">
              <div class="history-card__date">${dataStr}</div>
              <div class="history-card__info">
                <span class="history-card__stat">
                  ${icons.users} ${totalAlunos} aluno${totalAlunos !== 1 ? 's' : ''} com falta
                </span>
              </div>
            </div>
            <button class="btn btn--ghost btn--sm btn-expand" data-id="${record.id}">
              ${icons.chevronRight} Detalhes
            </button>
          </div>
          <div class="history-detail" id="detail-${record.id}" style="display: none;">
            ${renderHistoryDetail(record)}
          </div>
        `;
  }).join('')}
    </div>
  `;

  // Add expand button handlers
  container.querySelectorAll('.btn-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const detail = document.getElementById(`detail-${btn.dataset.id}`);
      const isOpen = detail.style.display !== 'none';
      detail.style.display = isOpen ? 'none' : 'block';
      btn.innerHTML = isOpen ? `${icons.chevronRight} Detalhes` : `${icons.chevronDown} Ocultar`;
    });
  });

  // Add justify checkbox handlers
  container.querySelectorAll('.justify-checkbox').forEach(cb => {
    cb.addEventListener('change', async () => {
      const recordId = cb.dataset.record;
      const studentNum = parseInt(cb.dataset.student);
      const justified = cb.checked;

      await updateJustification(recordId, studentNum, justified);
    });
  });
}

/**
 * Render history detail for a record
 */
function renderHistoryDetail(record) {
  if (!record.alunos || record.alunos.length === 0) {
    return '<p class="text-secondary">Nenhum aluno neste registro.</p>';
  }

  return `
    <table class="detail-table">
      <thead>
        <tr>
          <th>Número</th>
          <th>Nome</th>
          <th>Turma</th>
          <th>Justificada</th>
        </tr>
      </thead>
      <tbody>
        ${record.alunos.map(a => `
          <tr>
            <td>${a.numero}</td>
            <td>${a.nome || '-'}</td>
            <td>${a.turma || '-'}</td>
            <td>
              <label class="justify-toggle">
                <input type="checkbox" class="justify-checkbox" 
                       data-record="${record.id}" 
                       data-student="${a.numero}"
                       ${a.justificada ? 'checked' : ''}>
                <span class="justify-toggle__indicator"></span>
              </label>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Update justification for a student in a record
 */
async function updateJustification(recordId, studentNumber, justified) {
  try {
    const record = historyRecords.find(r => r.id === recordId);
    if (!record) return;

    const alunos = record.alunos.map(a => {
      if (a.numero === studentNumber) {
        return { ...a, justificada: justified };
      }
      return a;
    });

    await updateDoc(doc(db, COLLECTIONS.FALTAS, recordId), { alunos });

    // Update local cache
    record.alunos = alunos;

    showToast(justified ? 'Falta justificada!' : 'Justificativa removida.', 'success');

  } catch (error) {
    console.error('Error updating justification:', error);
    showToast('Erro ao atualizar: ' + error.message, 'error');
  }
}

/**
 * Consult absences by period
 */
async function consultarPeriodo() {
  const inicio = document.getElementById('consulta-inicio').value;
  const fim = document.getElementById('consulta-fim').value;
  const container = document.getElementById('consulta-resultado');

  if (!inicio || !fim) {
    showToast('Selecione as datas de início e fim.', 'warning');
    return;
  }

  container.innerHTML = '<div class="loading"><span class="spinner"></span> Consultando...</div>';

  try {
    const session = getSession();
    const startDate = new Date(inicio + 'T00:00:00');
    const endDate = new Date(fim + 'T23:59:59');

    // Simple query without multiple where clauses to avoid index requirements
    let q;
    if (session.role === USER_ROLES.COMMANDER && session.company) {
      q = query(
        collection(db, COLLECTIONS.FALTAS),
        where('company', '==', session.company)
      );
    } else {
      q = query(collection(db, COLLECTIONS.FALTAS));
    }

    const snapshot = await getDocs(q);
    let records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter by date on client side
    records = records.filter(record => {
      const recordDate = record.data?.toDate ? record.data.toDate() : new Date(record.data);
      return recordDate >= startDate && recordDate <= endDate;
    });

    // Aggregate absences by student
    const studentAbsences = {};

    records.forEach(record => {
      (record.alunos || []).forEach(aluno => {
        if (!studentAbsences[aluno.numero]) {
          studentAbsences[aluno.numero] = {
            numero: aluno.numero,
            nome: aluno.nome || '',
            turma: aluno.turma || '',
            totalFaltas: 0,
            faltasJustificadas: 0,
            datas: []
          };
        }
        studentAbsences[aluno.numero].totalFaltas++;
        if (aluno.justificada) {
          studentAbsences[aluno.numero].faltasJustificadas++;
        }
        const dataStr = formatDateValue(record.data);
        studentAbsences[aluno.numero].datas.push({
          data: dataStr,
          justificada: aluno.justificada
        });
      });
    });

    // Convert to array and sort by total absences
    const sortedStudents = Object.values(studentAbsences)
      .sort((a, b) => b.totalFaltas - a.totalFaltas);

    if (sortedStudents.length === 0) {
      container.innerHTML = `
        <div class="alert alert--info">
          <div class="alert__icon">${icons.info}</div>
          <div class="alert__content">
            <p>Nenhuma falta registrada no período selecionado.</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="consulta-summary">
        <div class="summary-stat">
          <span class="summary-stat__value">${sortedStudents.length}</span>
          <span class="summary-stat__label">Alunos</span>
        </div>
        <div class="summary-stat">
          <span class="summary-stat__value">${sortedStudents.reduce((sum, s) => sum + s.totalFaltas, 0)}</span>
          <span class="summary-stat__label">Total de Faltas</span>
        </div>
        <div class="summary-stat summary-stat--danger">
          <span class="summary-stat__value">${sortedStudents.filter(s => s.totalFaltas >= 10).length}</span>
          <span class="summary-stat__label">Com 10+ Faltas</span>
        </div>
      </div>
      
      <table class="consulta-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Nome</th>
            <th>Turma</th>
            <th>Faltas</th>
            <th>Justificadas</th>
          </tr>
        </thead>
        <tbody>
          ${sortedStudents.map(s => {
      const isHighRisk = s.totalFaltas >= 10;
      return `
              <tr class="${isHighRisk ? 'high-risk' : ''}">
                <td>${s.numero}</td>
                <td class="${isHighRisk ? 'text-danger' : ''}">${s.nome || '-'}</td>
                <td>${s.turma || '-'}</td>
                <td><strong>${s.totalFaltas}</strong></td>
                <td>${s.faltasJustificadas}</td>
              </tr>
            `;
    }).join('')}
        </tbody>
      </table>
    `;

  } catch (error) {
    console.error('Error consulting period:', error);
    container.innerHTML = `
      <div class="alert alert--danger">
        <div class="alert__icon">${icons.warning}</div>
        <div class="alert__content">
          <p>Erro ao consultar: ${error.message}</p>
        </div>
      </div>
    `;
  }
}

/**
 * Styles
 */
const faltasStyles = `
  .faltas-page {
    max-width: 1000px;
    margin: 0 auto;
  }
  
  .faltas-tabs {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    border-bottom: 1px solid var(--border-light);
    padding-bottom: var(--space-2);
  }
  
  .faltas-tab {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: var(--text-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: all 0.2s;
  }
  
  .faltas-tab:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
  
  .faltas-tab.active {
    background: var(--color-primary-100);
    color: var(--color-primary-600);
  }
  
  .faltas-tab-content {
    display: none;
  }
  
  .faltas-tab-content.active {
    display: block;
  }
  
  .faltas-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  
  .form-row {
    display: flex;
    gap: var(--space-4);
    flex-wrap: wrap;
  }
  
  .form-row .form-group {
    flex: 1;
    min-width: 150px;
  }
  
  .preview-container {
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }
  
  .preview-container h4 {
    margin: 0 0 var(--space-3) 0;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }
  
  .preview-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .preview-found {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  
  .preview-student {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
  }
  
  .preview-student__number {
    font-weight: var(--font-weight-bold);
    color: var(--color-primary-600);
  }
  
  .preview-student__name {
    color: var(--text-primary);
  }
  
  .preview-student__turma {
    font-size: var(--text-xs);
    color: var(--text-tertiary);
  }
  
  .preview-notfound {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding: var(--space-2);
    background: var(--color-warning-50);
    border-radius: var(--radius-sm);
    color: var(--color-warning-700);
    font-size: var(--text-sm);
  }
  
  .preview-notfound__label {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-weight: var(--font-weight-medium);
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border-light);
  }
  
  .history-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .history-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
  }
  
  .history-card__main {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
  
  .history-card__date {
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
  }
  
  .history-card__info {
    display: flex;
    gap: var(--space-3);
  }
  
  .history-card__stat {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }
  
  .history-detail {
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    padding: var(--space-4);
    margin-top: -2px;
  }
  
  .detail-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .detail-table th,
  .detail-table td {
    padding: var(--space-2) var(--space-3);
    text-align: left;
    border-bottom: 1px solid var(--border-light);
  }
  
  .detail-table th {
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
    text-transform: uppercase;
  }
  
  .justify-toggle {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
  }
  
  .justify-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .justify-toggle__indicator {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--border-medium);
    transition: 0.3s;
    border-radius: 22px;
  }
  
  .justify-toggle__indicator:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
  
  .justify-toggle input:checked + .justify-toggle__indicator {
    background-color: var(--color-success-500);
  }
  
  .justify-toggle input:checked + .justify-toggle__indicator:before {
    transform: translateX(18px);
  }
  
  .consulta-form {
    margin-bottom: var(--space-4);
  }
  
  .consulta-summary {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
    padding: var(--space-4);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
  }
  
  .summary-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-2) var(--space-4);
  }
  
  .summary-stat__value {
    font-size: var(--text-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
  }
  
  .summary-stat__label {
    font-size: var(--text-xs);
    color: var(--text-secondary);
  }
  
  .summary-stat--danger .summary-stat__value {
    color: var(--color-danger-500);
  }
  
  .consulta-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .consulta-table th,
  .consulta-table td {
    padding: var(--space-2) var(--space-3);
    text-align: left;
    border-bottom: 1px solid var(--border-light);
  }
  
  .consulta-table th {
    font-size: var(--text-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--text-secondary);
    text-transform: uppercase;
    background: var(--bg-secondary);
  }
  
  .consulta-table tr.high-risk {
    background: var(--color-danger-50);
  }
  
  .text-danger {
    color: var(--color-danger-600) !important;
    font-weight: var(--font-weight-bold);
  }
  
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-6);
    color: var(--text-secondary);
  }
`;
