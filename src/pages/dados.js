// Dados Page - Student Data Management
// Gestão Centralizada FO - CMB

import { getSession, canEdit, isAdmin, COMPANY_NAMES } from '../firebase/auth.js';
import {
    getStudentsGroupedByTurma,
    getStudentsByCompany,
    addStudent,
    updateStudent,
    deleteStudent,
    importStudentsFromCSV,
    getCompanyFromTurma,
    getAnoEscolarFromTurma
} from '../services/dataService.js';
import { icons } from '../utils/icons.js';

let allStudents = [];
let expandedTurmas = new Set();

export async function renderDadosPage() {
    const pageContent = document.getElementById('page-content');
    const session = getSession();

    pageContent.innerHTML = `
    <div class="page-header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4);">
        <div>
          <h1 class="page-header__title">Dados dos Alunos</h1>
          <p class="page-header__subtitle">
            ${session.company ? COMPANY_NAMES[session.company] || session.company : 'Todas as Companhias'}
          </p>
        </div>
        <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
          ${isAdmin() ? `
            <label class="btn btn--secondary" style="cursor: pointer;">
              ${icons.download}
              <span>Importar CSV</span>
              <input type="file" id="csv-import" accept=".csv" style="display: none;">
            </label>
          ` : ''}
          ${canEdit() ? `
            <button class="btn btn--primary" id="add-aluno-btn">
              ${icons.plus}
              <span>Novo Aluno</span>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
    
    <!-- Search -->
    <div class="card" style="margin-bottom: var(--space-4);">
      <div class="card__body" style="padding: var(--space-4);">
        <div style="display: flex; gap: var(--space-4); flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 250px; position: relative;">
            <input type="text" class="form-input" id="search-aluno" 
                   placeholder="Buscar por número, nome ou turma..." 
                   style="padding-left: 40px;">
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary);">
              ${icons.search}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-2); color: var(--text-secondary); font-size: var(--font-size-sm);">
            <span id="student-count">0</span> alunos
          </div>
        </div>
      </div>
    </div>
    
    <!-- Students by Turma -->
    <div id="students-container">
      <div style="display: flex; justify-content: center; padding: 3rem;">
        <span class="spinner spinner--lg"></span>
      </div>
    </div>
    
    <!-- Add/Edit Modal -->
    <div class="modal-backdrop" id="aluno-modal-backdrop"></div>
    <div class="modal" id="aluno-modal">
      <div class="modal__header">
        <h3 class="modal__title" id="modal-title">Novo Aluno</h3>
        <button class="modal__close" id="modal-close">${icons.close}</button>
      </div>
      <div class="modal__body">
        <form id="aluno-form">
          <input type="hidden" id="aluno-id">
          
          <div class="form-group">
            <label class="form-label form-label--required" for="aluno-numero">Número</label>
            <input type="number" class="form-input" id="aluno-numero" required>
          </div>
          
          <div class="form-group">
            <label class="form-label form-label--required" for="aluno-nome">Nome Completo</label>
            <input type="text" class="form-input" id="aluno-nome" required>
          </div>
          
          <div class="form-group">
            <label class="form-label form-label--required" for="aluno-turma">Turma</label>
            <input type="text" class="form-input" id="aluno-turma" 
                   placeholder="Ex: 601, 702, 803" required 
                   pattern="[1-9][0-9]{2}" title="Formato: 3 dígitos (ex: 601, 702)">
            <p class="form-hint">A companhia será definida automaticamente pela turma</p>
          </div>
          
          <div class="form-group">
            <label class="form-label" for="aluno-tel">Telefone do Responsável</label>
            <input type="tel" class="form-input" id="aluno-tel" placeholder="(61) 99999-9999">
          </div>
        </form>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn--secondary" id="modal-cancel">Cancelar</button>
        <button type="submit" form="aluno-form" class="btn btn--primary" id="modal-save">Salvar</button>
      </div>
    </div>
  `;

    // Setup events
    setupDadosEvents();

    // Load students
    await loadStudentsData();
}

async function loadStudentsData(searchTerm = '') {
    const container = document.getElementById('students-container');
    const countEl = document.getElementById('student-count');

    try {
        // Load all students for current user's company
        allStudents = await getStudentsByCompany();

        let filteredStudents = allStudents;

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredStudents = allStudents.filter(s =>
                String(s.numero).includes(term) ||
                s.nome?.toLowerCase().includes(term) ||
                String(s.turma).includes(term)
            );
        }

        // Update count
        countEl.textContent = filteredStudents.length;

        if (filteredStudents.length === 0) {
            container.innerHTML = `
        <div class="card">
          <div class="card__body">
            <div class="empty-state">
              <div class="empty-state__icon">${icons.users}</div>
              <div class="empty-state__title">Nenhum aluno encontrado</div>
              <div class="empty-state__description">
                ${searchTerm ? 'Tente uma busca diferente.' : 'Importe um arquivo CSV ou adicione alunos manualmente.'}
              </div>
            </div>
          </div>
        </div>
      `;
            return;
        }

        // Group by turma
        const grouped = {};
        for (const student of filteredStudents) {
            const turma = student.turma || 'Sem Turma';
            if (!grouped[turma]) {
                grouped[turma] = [];
            }
            grouped[turma].push(student);
        }

        // Sort turmas
        const sortedTurmas = Object.keys(grouped).sort();

        // Render turma groups
        container.innerHTML = sortedTurmas.map(turma => {
            const students = grouped[turma];
            const isExpanded = expandedTurmas.has(turma) || searchTerm;
            const anoEscolar = getAnoEscolarFromTurma(turma);

            return `
        <div class="card" style="margin-bottom: var(--space-3);">
          <div class="card__header turma-header" data-turma="${turma}" 
               style="cursor: pointer; user-select: none;">
            <div style="display: flex; align-items: center; gap: var(--space-3);">
              <span class="turma-chevron" style="transition: transform 0.2s; ${isExpanded ? 'transform: rotate(90deg);' : ''}">
                ${icons.chevronRight}
              </span>
              <div>
                <h3 class="card__title" style="margin: 0;">Turma ${turma}</h3>
                <span style="font-size: var(--font-size-sm); color: var(--text-secondary);">
                  ${anoEscolar} • ${students.length} aluno${students.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <span class="badge badge--primary">${students.length}</span>
          </div>
          
          <div class="turma-content" data-turma="${turma}" style="${isExpanded ? '' : 'display: none;'}">
            <div class="card__body" style="padding: 0;">
              <div class="table-container" style="border: none;">
                <table class="table">
                  <thead>
                    <tr>
                      <th style="width: 100px;">Número</th>
                      <th>Nome</th>
                      <th style="width: 120px;">Turma</th>
                      ${canEdit() ? '<th style="width: 100px;">Ações</th>' : ''}
                    </tr>
                  </thead>
                  <tbody>
                    ${students.map(s => `
                      <tr data-id="${s.id}">
                        <td><strong>${s.numero}</strong></td>
                        <td>${s.nome || '-'}</td>
                        <td>${s.turma || '-'}</td>
                        ${canEdit() ? `
                          <td>
                            <div style="display: flex; gap: var(--space-2);">
                              <button class="btn btn--icon btn--ghost edit-btn" data-id="${s.id}" title="Editar">
                                ${icons.edit}
                              </button>
                              <button class="btn btn--icon btn--ghost delete-btn" data-id="${s.id}" title="Excluir" style="color: var(--color-danger-500);">
                                ${icons.trash}
                              </button>
                            </div>
                          </td>
                        ` : ''}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
        }).join('');

        // Setup turma toggle events
        setupTurmaToggle();
        setupRowActions();

    } catch (error) {
        console.error('Error loading students:', error);
        container.innerHTML = `
      <div class="alert alert--warning">
        <div class="alert__icon">${icons.warning}</div>
        <div class="alert__content">
          <div class="alert__title">Erro ao carregar dados</div>
          <p>Verifique a configuração do Firebase ou importe dados via CSV.</p>
        </div>
      </div>
    `;
    }
}

function setupDadosEvents() {
    const searchInput = document.getElementById('search-aluno');
    const csvInput = document.getElementById('csv-import');
    const addBtn = document.getElementById('add-aluno-btn');
    const modal = document.getElementById('aluno-modal');
    const backdrop = document.getElementById('aluno-modal-backdrop');
    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('modal-cancel');
    const form = document.getElementById('aluno-form');

    // Search
    if (searchInput) {
        let debounce;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(() => loadStudentsData(e.target.value), 300);
        });
    }

    // CSV Import
    if (csvInput) {
        csvInput.addEventListener('change', handleCSVImport);
    }

    // Add button
    if (addBtn) {
        addBtn.addEventListener('click', () => openModal());
    }

    // Modal close
    [closeBtn, cancelBtn, backdrop].forEach(el => {
        if (el) el.addEventListener('click', closeModal);
    });

    // Form submit
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

function setupTurmaToggle() {
    document.querySelectorAll('.turma-header').forEach(header => {
        header.addEventListener('click', () => {
            const turma = header.dataset.turma;
            const content = document.querySelector(`.turma-content[data-turma="${turma}"]`);
            const chevron = header.querySelector('.turma-chevron');

            if (content.style.display === 'none') {
                content.style.display = '';
                chevron.style.transform = 'rotate(90deg)';
                expandedTurmas.add(turma);
            } else {
                content.style.display = 'none';
                chevron.style.transform = '';
                expandedTurmas.delete(turma);
            }
        });
    });
}

function setupRowActions() {
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            const student = allStudents.find(s => s.id === id);
            if (student) openModal(student);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            const student = allStudents.find(s => s.id === id);

            if (confirm(`Deseja realmente excluir o aluno ${student?.nome || id}?`)) {
                try {
                    await deleteStudent(id);
                    showToast('Aluno excluído com sucesso', 'success');
                    loadStudentsData(document.getElementById('search-aluno').value);
                } catch (error) {
                    console.error('Error deleting:', error);
                    showToast('Erro ao excluir aluno', 'error');
                }
            }
        });
    });
}

async function handleCSVImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
        const csvContent = event.target.result;

        if (confirm(`Deseja importar os dados do arquivo ${file.name}? Isso pode substituir dados existentes.`)) {
            showToast('Importando dados...', 'info');

            try {
                const result = await importStudentsFromCSV(csvContent);
                showToast(`Importação concluída: ${result.imported} alunos`, 'success');
                loadStudentsData();
            } catch (error) {
                console.error('Import error:', error);
                showToast('Erro ao importar dados', 'error');
            }
        }
    };

    reader.readAsText(file, 'UTF-8');
    e.target.value = ''; // Reset input
}

function openModal(student = null) {
    const modal = document.getElementById('aluno-modal');
    const backdrop = document.getElementById('aluno-modal-backdrop');
    const title = document.getElementById('modal-title');
    const session = getSession();

    // Reset form
    document.getElementById('aluno-id').value = student?.id || '';
    document.getElementById('aluno-numero').value = student?.numero || '';
    document.getElementById('aluno-nome').value = student?.nome || '';
    document.getElementById('aluno-turma').value = student?.turma || '';
    document.getElementById('aluno-tel').value = student?.telResponsavel || '';

    // If editing, disable numero field
    document.getElementById('aluno-numero').disabled = !!student;

    title.textContent = student ? 'Editar Aluno' : 'Novo Aluno';

    modal.classList.add('active');
    backdrop.classList.add('active');
}

function closeModal() {
    document.getElementById('aluno-modal').classList.remove('active');
    document.getElementById('aluno-modal-backdrop').classList.remove('active');
    document.getElementById('aluno-numero').disabled = false;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const session = getSession();
    const id = document.getElementById('aluno-id').value;
    const numero = parseInt(document.getElementById('aluno-numero').value);
    const nome = document.getElementById('aluno-nome').value.trim().toUpperCase();
    const turma = document.getElementById('aluno-turma').value.trim();
    const telResponsavel = document.getElementById('aluno-tel').value.trim();

    // Validate turma matches user's company (if not admin)
    const company = getCompanyFromTurma(turma);
    if (session.company && company !== session.company) {
        showToast(`Turma inválida para sua companhia`, 'error');
        return;
    }

    const data = {
        numero,
        nome,
        turma,
        telResponsavel,
        company,
        anoEscolar: getAnoEscolarFromTurma(turma)
    };

    const saveBtn = document.getElementById('modal-save');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Salvando...';

    try {
        if (id) {
            await updateStudent(id, data);
            showToast('Aluno atualizado com sucesso', 'success');
        } else {
            await addStudent(data);
            showToast('Aluno cadastrado com sucesso', 'success');
        }

        closeModal();
        loadStudentsData(document.getElementById('search-aluno').value);
    } catch (error) {
        console.error('Error saving:', error);
        showToast('Erro ao salvar aluno', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Salvar';
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
