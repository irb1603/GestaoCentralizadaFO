/**
 * Faltas Escolares Page
 * Gestão Centralizada FO - CMB
 */

import { db } from '../firebase/config.js';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getSession } from '../firebase/auth.js';
import {
    COLLECTIONS,
    TEMPOS_AULA,
    COMPANY_NAMES,
    formatDate,
    USER_ROLES
} from '../constants/index.js';
import { icons } from '../utils/icons.js';
import { processAttendanceFile, calculateTotalFaltas } from '../services/ocrService.js';
import { getStudents } from '../firebase/database.js';

let currentData = {
    turma: '',
    data: '',
    students: []
};

let allStudents = [];
let historyRecords = [];

/**
 * Render Faltas Escolares Page
 */
export async function renderFaltasEscolaresPage() {
    const pageContent = document.getElementById('page-content');
    const session = getSession();

    // Inject styles
    if (!document.getElementById('faltas-styles')) {
        const link = document.createElement('link');
        link.id = 'faltas-styles';
        link.rel = 'stylesheet';
        link.href = './src/styles/faltas.css';
        document.head.appendChild(link);
    }

    // Load students for reference
    allStudents = await getStudents();

    pageContent.innerHTML = `
    <div class="faltas-page">
      <div class="page-header" style="margin-bottom: var(--space-6);">
        <h1 class="page-title">Faltas Escolares</h1>
        <p class="page-subtitle">Upload de lista de chamada com reconhecimento automático</p>
      </div>
      
      <!-- Filters -->
      <div class="faltas-header">
        <div class="form-group">
          <label class="form-label">Turma</label>
          <input type="text" id="input-turma" class="form-input" placeholder="Ex: 201" style="width: 100px;">
        </div>
        
        <div class="form-group">
          <label class="form-label">Data</label>
          <input type="date" id="input-data" class="form-input" value="${new Date().toISOString().split('T')[0]}">
        </div>
        
        <button class="btn btn--secondary" id="btn-load-history">
          ${icons.clock} Histórico
        </button>
      </div>
      
      <!-- Upload Zone -->
      <div class="upload-zone" id="upload-zone">
        <div class="upload-zone__icon">${icons.upload}</div>
        <div class="upload-zone__text">Arraste uma imagem ou PDF da lista de chamada</div>
        <div class="upload-zone__hint">ou clique para selecionar um arquivo</div>
        <input type="file" id="file-input" accept="image/*,.pdf" style="display: none;">
      </div>
      
      <!-- Results Container -->
      <div id="results-container"></div>
      
      <!-- History Container -->
      <div id="history-container" class="history-section" style="display: none;"></div>
    </div>
    
    <!-- Processing Overlay -->
    <div id="processing-overlay" class="processing-overlay" style="display: none;">
      <span class="spinner spinner--lg"></span>
      <div class="processing-overlay__text" id="processing-text">Processando...</div>
      <div class="processing-overlay__progress">
        <div class="processing-overlay__bar" id="processing-bar" style="width: 0%;"></div>
      </div>
    </div>
  `;

    setupEventListeners();
    loadHistory();
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const historyBtn = document.getElementById('btn-load-history');

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Click on upload zone
    uploadZone.addEventListener('click', () => fileInput.click());

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    // History button
    historyBtn.addEventListener('click', toggleHistory);
}

/**
 * Handle File Upload
 */
async function handleFileUpload(file) {
    const overlay = document.getElementById('processing-overlay');
    const progressText = document.getElementById('processing-text');
    const progressBar = document.getElementById('processing-bar');

    overlay.style.display = 'flex';

    try {
        const result = await processAttendanceFile(file, (progress) => {
            progressText.textContent = progress.status;
            progressBar.style.width = `${progress.percent}%`;
        });

        // Get turma from input or OCR result
        const turmaInput = document.getElementById('input-turma');
        currentData.turma = turmaInput.value || result.turma || '';
        currentData.data = document.getElementById('input-data').value;
        currentData.students = result.students;

        // If turma detected by OCR, update input
        if (result.turma && !turmaInput.value) {
            turmaInput.value = result.turma;
        }

        renderResultsTable();

    } catch (error) {
        console.error('Error processing file:', error);
        alert('Erro ao processar arquivo: ' + error.message);
    } finally {
        overlay.style.display = 'none';
        progressBar.style.width = '0%';
    }
}

/**
 * Render Results Table
 */
function renderResultsTable() {
    const container = document.getElementById('results-container');
    const periods = Object.values(TEMPOS_AULA);

    if (currentData.students.length === 0) {
        container.innerHTML = `
      <div class="alert alert--warning">
        <div class="alert__icon">${icons.warning}</div>
        <div class="alert__content">
          <p>Nenhum aluno foi reconhecido na imagem. Verifique se a imagem está nítida e tente novamente.</p>
        </div>
      </div>
    `;
        return;
    }

    container.innerHTML = `
    <div class="card" style="margin-bottom: var(--space-6);">
      <div class="card__header">
        <h3 class="card__title">Resultado do Reconhecimento</h3>
        <span class="badge badge--info">${currentData.students.length} alunos</span>
      </div>
      <div class="card__body">
        <p class="text-sm text-secondary" style="margin-bottom: var(--space-4);">
          Clique nas células para alternar entre Presença (P) e Falta (F). Marque a caixa "Justificada" se a falta foi justificada.
        </p>
        
        <div class="attendance-table-wrapper">
          <table class="attendance-table">
            <thead>
              <tr>
                <th style="width: 50px;">Nº</th>
                <th style="text-align: left;">Nome</th>
                ${periods.map(p => `<th class="tempo-col">${p.label.replace(' Tempo', 'T').replace('Formatura', 'Form')}</th>`).join('')}
                <th style="width: 70px;">Total</th>
                <th style="width: 80px;">Justif.</th>
              </tr>
            </thead>
            <tbody>
              ${currentData.students.map((student, idx) => renderStudentRow(student, idx)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <div class="faltas-actions">
      <button class="btn btn--ghost" id="btn-clear">
        ${icons.trash} Limpar
      </button>
      <button class="btn btn--primary" id="btn-save">
        ${icons.check} Salvar Registro
      </button>
    </div>
  `;

    // Setup cell click handlers
    setupTableInteractions();
}

/**
 * Render Student Row
 */
function renderStudentRow(student, index) {
    const periods = Object.values(TEMPOS_AULA);
    const totalFaltas = calculateTotalFaltas(student.tempos);

    let totalClass = 'total-faltas--zero';
    if (totalFaltas > 0 && totalFaltas <= 3) totalClass = 'total-faltas--low';
    if (totalFaltas > 3) totalClass = 'total-faltas--high';

    return `
    <tr data-index="${index}">
      <td class="student-number">${student.numero}</td>
      <td class="student-name">${student.nomeGuerra}</td>
      ${periods.map(p => {
        const value = student.tempos[p.key];
        const cellClass = value === 'F' ? 'attendance-cell--absent' : 'attendance-cell--present';
        return `
          <td>
            <div class="attendance-cell ${cellClass}" data-period="${p.key}" data-index="${index}">
              ${value}
            </div>
          </td>
        `;
    }).join('')}
      <td>
        <span class="total-faltas ${totalClass}" data-index="${index}">${totalFaltas}</span>
      </td>
      <td>
        <div class="justified-toggle">
          <input type="checkbox" ${student.justificada ? 'checked' : ''} data-index="${index}" class="justified-checkbox">
        </div>
      </td>
    </tr>
  `;
}

/**
 * Setup Table Interactions
 */
function setupTableInteractions() {
    // Attendance cell clicks
    document.querySelectorAll('.attendance-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            const index = parseInt(cell.dataset.index);
            const period = cell.dataset.period;

            // Toggle P/F
            const currentValue = currentData.students[index].tempos[period];
            const newValue = currentValue === 'P' ? 'F' : 'P';
            currentData.students[index].tempos[period] = newValue;

            // Update cell
            cell.textContent = newValue;
            cell.classList.toggle('attendance-cell--present', newValue === 'P');
            cell.classList.toggle('attendance-cell--absent', newValue === 'F');

            // Update total
            updateStudentTotal(index);
        });
    });

    // Justified checkboxes
    document.querySelectorAll('.justified-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const index = parseInt(checkbox.dataset.index);
            currentData.students[index].justificada = checkbox.checked;
        });
    });

    // Save button
    document.getElementById('btn-save').addEventListener('click', saveRecord);

    // Clear button
    document.getElementById('btn-clear').addEventListener('click', () => {
        currentData.students = [];
        document.getElementById('results-container').innerHTML = '';
    });
}

/**
 * Update Student Total
 */
function updateStudentTotal(index) {
    const totalFaltas = calculateTotalFaltas(currentData.students[index].tempos);
    const totalSpan = document.querySelector(`.total-faltas[data-index="${index}"]`);

    totalSpan.textContent = totalFaltas;
    totalSpan.className = 'total-faltas';

    if (totalFaltas === 0) totalSpan.classList.add('total-faltas--zero');
    else if (totalFaltas <= 3) totalSpan.classList.add('total-faltas--low');
    else totalSpan.classList.add('total-faltas--high');
}

/**
 * Save Record to Firestore
 */
async function saveRecord() {
    const turma = document.getElementById('input-turma').value;
    const data = document.getElementById('input-data').value;

    if (!turma) {
        alert('Por favor, informe a turma.');
        return;
    }

    if (!data) {
        alert('Por favor, informe a data.');
        return;
    }

    if (currentData.students.length === 0) {
        alert('Nenhum aluno para salvar.');
        return;
    }

    const session = getSession();

    try {
        const record = {
            turma,
            data: new Date(data + 'T12:00:00'),
            company: session.company || null,
            registradoPor: session.username,
            createdAt: serverTimestamp(),
            alunos: currentData.students.map(s => ({
                numero: s.numero,
                nomeGuerra: s.nomeGuerra,
                tempos: s.tempos,
                totalFaltas: calculateTotalFaltas(s.tempos),
                justificada: s.justificada
            }))
        };

        await addDoc(collection(db, COLLECTIONS.FALTAS), record);

        alert('Registro salvo com sucesso!');
        currentData.students = [];
        document.getElementById('results-container').innerHTML = '';
        loadHistory();

    } catch (error) {
        console.error('Error saving record:', error);
        alert('Erro ao salvar: ' + error.message);
    }
}

/**
 * Load History
 */
async function loadHistory() {
    try {
        const session = getSession();
        let q;

        if (session.role === USER_ROLES.COMMANDER && session.company) {
            q = query(
                collection(db, COLLECTIONS.FALTAS),
                where('company', '==', session.company),
                orderBy('data', 'desc')
            );
        } else {
            q = query(
                collection(db, COLLECTIONS.FALTAS),
                orderBy('data', 'desc')
            );
        }

        const snapshot = await getDocs(q);
        historyRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error('Error loading history:', error);
    }
}

/**
 * Toggle History View
 */
function toggleHistory() {
    const container = document.getElementById('history-container');

    if (container.style.display === 'none') {
        container.style.display = 'block';
        renderHistory();
    } else {
        container.style.display = 'none';
    }
}

/**
 * Render History
 */
function renderHistory() {
    const container = document.getElementById('history-container');

    if (historyRecords.length === 0) {
        container.innerHTML = `
      <h3 style="margin-bottom: var(--space-4);">Histórico de Registros</h3>
      <p class="text-secondary">Nenhum registro encontrado.</p>
    `;
        return;
    }

    container.innerHTML = `
    <h3 style="margin-bottom: var(--space-4);">Histórico de Registros</h3>
    <div class="history-list">
      ${historyRecords.map(record => {
        const totalAlunos = record.alunos?.length || 0;
        const totalFaltas = record.alunos?.reduce((sum, a) => sum + (a.totalFaltas || 0), 0) || 0;
        const dataStr = record.data?.toDate ? formatDate(record.data.toDate()) : record.data;

        return `
          <div class="history-card" data-id="${record.id}">
            <div class="history-card__date">${dataStr}</div>
            <div class="history-card__turma">Turma ${record.turma}</div>
            <div class="history-card__stats">
              <span class="history-card__stat">
                ${icons.users} ${totalAlunos} alunos
              </span>
              <span class="history-card__stat" style="color: var(--color-danger-500);">
                ${icons.close} ${totalFaltas} faltas
              </span>
            </div>
          </div>
        `;
    }).join('')}
    </div>
  `;

    // Add click handlers for history cards
    container.querySelectorAll('.history-card').forEach(card => {
        card.addEventListener('click', () => {
            const recordId = card.dataset.id;
            viewHistoryRecord(recordId);
        });
    });
}

/**
 * View History Record
 */
function viewHistoryRecord(recordId) {
    const record = historyRecords.find(r => r.id === recordId);
    if (!record) return;

    // Populate current data
    document.getElementById('input-turma').value = record.turma;

    const dataValue = record.data?.toDate ? record.data.toDate().toISOString().split('T')[0] : record.data;
    document.getElementById('input-data').value = dataValue;

    currentData.turma = record.turma;
    currentData.data = dataValue;
    currentData.students = record.alunos.map(a => ({
        numero: a.numero,
        nomeGuerra: a.nomeGuerra,
        tempos: a.tempos,
        justificada: a.justificada
    }));

    renderResultsTable();

    // Hide history
    document.getElementById('history-container').style.display = 'none';
}
