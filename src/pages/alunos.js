// Alunos Page
// Gestão Centralizada FO - CMB

import { getSession, canEdit, isAdmin, COMPANY_NAMES } from '../firebase/auth.js';
import { getStudents, addStudent, updateStudent, deleteStudent } from '../firebase/database.js';
import { icons } from '../utils/icons.js';

export async function renderAlunosPage() {
    const pageContent = document.getElementById('page-content');
    const session = getSession();

    pageContent.innerHTML = `
    <div class="page-header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4);">
        <div>
          <h1 class="page-header__title">Alunos</h1>
          <p class="page-header__subtitle">
            ${session.company ? COMPANY_NAMES[session.company] || session.company : 'Todas as Companhias'}
          </p>
        </div>
        ${canEdit() ? `
          <button class="btn btn--primary" id="add-aluno-btn">
            ${icons.plus}
            <span>Novo Aluno</span>
          </button>
        ` : ''}
      </div>
    </div>
    
    <!-- Search -->
    <div class="card" style="margin-bottom: var(--space-4);">
      <div class="card__body" style="padding: var(--space-4);">
        <div style="display: flex; gap: var(--space-4); flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 200px; position: relative;">
            <input type="text" class="form-input" id="search-aluno" 
                   placeholder="Buscar por número ou nome..." 
                   style="padding-left: 40px;">
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary);">
              ${icons.search}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Students List -->
    <div class="card">
      <div class="card__body" id="alunos-list-container" style="padding: 0;">
        <div style="display: flex; justify-content: center; padding: 3rem;">
          <span class="spinner spinner--lg"></span>
        </div>
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
            <label class="form-label form-label--required" for="aluno-company">Companhia</label>
            <select class="form-select" id="aluno-company" required ${!isAdmin() && session.company ? 'disabled' : ''}>
              ${Object.entries(COMPANY_NAMES).map(([key, name]) => `
                <option value="${key}" ${session.company === key ? 'selected' : ''}>${name}</option>
              `).join('')}
            </select>
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
    setupAlunosEvents();

    // Load students
    await loadAlunosList();
}

let allStudents = [];

async function loadAlunosList(searchTerm = '') {
    const container = document.getElementById('alunos-list-container');

    try {
        if (allStudents.length === 0) {
            allStudents = await getStudents();
        }

        let students = allStudents;

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            students = students.filter(s =>
                s.numero?.toString().includes(term) ||
                s.nome?.toLowerCase().includes(term)
            );
        }

        if (students.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">${icons.users}</div>
          <div class="empty-state__title">Nenhum aluno encontrado</div>
          <div class="empty-state__description">
            ${searchTerm ? 'Tente uma busca diferente.' : 'Cadastre alunos para começar.'}
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
              <th>Número</th>
              <th>Nome</th>
              <th>Companhia</th>
              <th>Tel. Responsável</th>
              ${canEdit() ? '<th>Ações</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${students.map(s => `
              <tr data-id="${s.id}">
                <td><strong>${s.numero}</strong></td>
                <td>${s.nome || '-'}</td>
                <td>
                  <span class="badge badge--primary">${COMPANY_NAMES[s.company] || s.company}</span>
                </td>
                <td>${s.telResponsavel || '-'}</td>
                ${canEdit() ? `
                  <td>
                    <div style="display: flex; gap: var(--space-2);">
                      <button class="btn btn--icon btn--ghost edit-aluno-btn" data-id="${s.id}" title="Editar">
                        ${icons.edit}
                      </button>
                      <button class="btn btn--icon btn--ghost delete-aluno-btn" data-id="${s.id}" title="Excluir" style="color: var(--color-danger-500);">
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
    `;

        // Setup row action events
        setupRowEvents();

    } catch (error) {
        console.error('Error loading students:', error);
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

function setupAlunosEvents() {
    const searchInput = document.getElementById('search-aluno');
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
            debounce = setTimeout(() => loadAlunosList(e.target.value), 300);
        });
    }

    // Add button
    if (addBtn) {
        addBtn.addEventListener('click', () => openModal());
    }

    // Close modal
    [closeBtn, cancelBtn, backdrop].forEach(el => {
        if (el) el.addEventListener('click', closeModal);
    });

    // Form submit
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

function setupRowEvents() {
    // Edit buttons
    document.querySelectorAll('.edit-aluno-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const student = allStudents.find(s => s.id === id);
            if (student) openModal(student);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-aluno-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;

            if (confirm('Deseja realmente excluir este aluno?')) {
                try {
                    await deleteStudent(id);
                    allStudents = allStudents.filter(s => s.id !== id);
                    loadAlunosList();
                    showToast('Aluno excluído com sucesso', 'success');
                } catch (error) {
                    console.error('Error deleting student:', error);
                    showToast('Erro ao excluir aluno', 'error');
                }
            }
        });
    });
}

function openModal(student = null) {
    const modal = document.getElementById('aluno-modal');
    const backdrop = document.getElementById('aluno-modal-backdrop');
    const title = document.getElementById('modal-title');

    // Reset form
    document.getElementById('aluno-id').value = student?.id || '';
    document.getElementById('aluno-numero').value = student?.numero || '';
    document.getElementById('aluno-nome').value = student?.nome || '';
    document.getElementById('aluno-company').value = student?.company || getSession().company || '6cia';
    document.getElementById('aluno-tel').value = student?.telResponsavel || '';

    title.textContent = student ? 'Editar Aluno' : 'Novo Aluno';

    modal.classList.add('active');
    backdrop.classList.add('active');
}

function closeModal() {
    document.getElementById('aluno-modal').classList.remove('active');
    document.getElementById('aluno-modal-backdrop').classList.remove('active');
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('aluno-id').value;
    const data = {
        numero: parseInt(document.getElementById('aluno-numero').value),
        nome: document.getElementById('aluno-nome').value,
        company: document.getElementById('aluno-company').value,
        telResponsavel: document.getElementById('aluno-tel').value
    };

    const saveBtn = document.getElementById('modal-save');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Salvando...';

    try {
        if (id) {
            await updateStudent(id, data);
            const idx = allStudents.findIndex(s => s.id === id);
            if (idx >= 0) allStudents[idx] = { ...allStudents[idx], ...data };
            showToast('Aluno atualizado com sucesso', 'success');
        } else {
            const newStudent = await addStudent(data);
            allStudents.push(newStudent);
            showToast('Aluno cadastrado com sucesso', 'success');
        }

        closeModal();
        loadAlunosList();
    } catch (error) {
        console.error('Error saving student:', error);
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
