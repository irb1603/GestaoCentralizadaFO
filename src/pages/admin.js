// Admin Page
// Gestão Centralizada FO - CMB

import { getSession, isAdmin, changePassword, getAllUsernames, USER_ACCOUNTS } from '../firebase/auth.js';
import { db } from '../firebase/config.js';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { icons } from '../utils/icons.js';

let foRegistradores = [];

export async function renderAdminPage() {
  const pageContent = document.getElementById('page-content');

  // Check permission
  if (!isAdmin()) {
    pageContent.innerHTML = `
      <div class="alert alert--danger">
        <div class="alert__icon">${icons.lock}</div>
        <div class="alert__content">
          <div class="alert__title">Acesso Negado</div>
          <p>Apenas o administrador pode acessar esta página.</p>
        </div>
      </div>
    `;
    return;
  }

  const users = getAllUsernames();

  pageContent.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Administração</h1>
      <p class="page-header__subtitle">Gerenciamento de usuários e configurações do sistema</p>
    </div>
    
    <!-- Tabs -->
    <div class="admin-tabs">
      <button class="admin-tab active" data-tab="sistema">Usuários do Sistema</button>
      <button class="admin-tab" data-tab="registradores">Registradores de FO</button>
    </div>
    
    <!-- Tab Content: Sistema -->
    <div class="admin-tab-content active" id="tab-sistema">
      <!-- Change Password Section -->
      <div class="card" style="margin-bottom: var(--space-6);">
        <div class="card__header">
          <h3 class="card__title">Alterar Senha de Usuário</h3>
        </div>
        <div class="card__body">
          <form id="change-password-form" style="max-width: 400px;">
            <div class="form-group">
              <label class="form-label form-label--required" for="target-user">Usuário</label>
              <select class="form-select" id="target-user" required>
                <option value="">Selecione o usuário</option>
                ${users.map(u => `<option value="${u}">${u}</option>`).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label form-label--required" for="new-password">Nova Senha</label>
              <input type="password" class="form-input" id="new-password" required minlength="4">
            </div>
            
            <div class="form-group">
              <label class="form-label form-label--required" for="confirm-password">Confirmar Senha</label>
              <input type="password" class="form-input" id="confirm-password" required minlength="4">
            </div>
            
            <div id="password-error" class="alert alert--danger hidden" style="margin-bottom: var(--space-4);">
              <span id="password-error-msg"></span>
            </div>
            
            <button type="submit" class="btn btn--primary" id="change-password-btn">
              ${icons.lock}
              <span>Alterar Senha</span>
            </button>
          </form>
        </div>
      </div>
      
      <!-- Users List -->
      <div class="card">
        <div class="card__header">
          <h3 class="card__title">Usuários do Sistema</h3>
        </div>
        <div class="card__body" style="padding: 0;">
          <div class="table-container" style="border: none;">
            <table class="table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Função</th>
                  <th>Companhia</th>
                  <th>Auditoria</th>
                  <th>Edição</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(username => {
    const config = USER_ACCOUNTS[username];
    return `
                  <tr>
                    <td><strong>${username}</strong></td>
                    <td>${getRoleLabel(config.role)}</td>
                    <td>${config.company ? getCompanyLabel(config.company) : 'Todas'}</td>
                    <td>
                      ${config.canViewAudit
        ? `<span class="badge badge--success">Sim</span>`
        : `<span class="badge badge--neutral">Não</span>`}
                    </td>
                    <td>
                      ${config.canEditAll || config.role !== 'comandoCA'
        ? `<span class="badge badge--success">Sim</span>`
        : `<span class="badge badge--neutral">Não</span>`}
                    </td>
                  </tr>
                `;
  }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tab Content: Registradores -->
    <div class="admin-tab-content" id="tab-registradores">
      <div class="card">
        <div class="card__header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card__title">Registradores de FO (Professores/Monitores)</h3>
          <button class="btn btn--primary" id="add-registrador-btn">
            ${icons.plus}
            <span>Novo Registrador</span>
          </button>
        </div>
        <div class="card__body">
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
            Usuários autorizados a registrar Fatos Observados na página pública. Estes são independentes dos usuários do sistema.
          </p>
          
          <!-- Add/Edit Form -->
          <div id="registrador-form-container" class="hidden" style="margin-bottom: var(--space-6); padding: var(--space-4); background: var(--bg-secondary); border-radius: var(--radius-lg);">
            <h4 style="margin-bottom: var(--space-4);" id="registrador-form-title">Novo Registrador</h4>
            <form id="registrador-form" style="display: grid; grid-template-columns: repeat(3, 1fr) auto; gap: var(--space-4); align-items: end;">
              <input type="hidden" id="registrador-id">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label form-label--required">Usuário</label>
                <input type="text" class="form-input" id="registrador-usuario" placeholder="Ex: Prof.Silva" required>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label form-label--required">Palavra Passe</label>
                <input type="text" class="form-input" id="registrador-senha" placeholder="Digite a senha" required>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Nome Completo</label>
                <input type="text" class="form-input" id="registrador-nome" placeholder="Nome do professor/monitor">
              </div>
              <div style="display: flex; gap: var(--space-2);">
                <button type="submit" class="btn btn--primary">Salvar</button>
                <button type="button" class="btn btn--secondary" id="cancel-registrador-btn">Cancelar</button>
              </div>
            </form>
          </div>
          
          <!-- Search -->
          <div style="margin-bottom: var(--space-4);">
            <div style="position: relative; max-width: 300px;">
              <input type="text" class="form-input" id="search-registrador" 
                     placeholder="Buscar registrador..." 
                     style="padding-left: 40px;">
              <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary);">
                ${icons.search}
              </span>
            </div>
          </div>
          
          <!-- List -->
          <div id="registradores-list">
            <div style="display: flex; justify-content: center; padding: var(--space-6);">
              <span class="spinner spinner--lg"></span>
            </div>
          </div>
          
          <div style="margin-top: var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm);">
            Total: <span id="registradores-count">0</span> registradores
          </div>
        </div>
      </div>
    </div>
    
    <style>
      .admin-tabs {
        display: flex;
        gap: var(--space-2);
        margin-bottom: var(--space-4);
        border-bottom: 1px solid var(--border-light);
        padding-bottom: var(--space-2);
      }
      
      .admin-tab {
        padding: var(--space-3) var(--space-5);
        border: none;
        background: transparent;
        color: var(--text-secondary);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        border-radius: var(--radius-md) var(--radius-md) 0 0;
        transition: all var(--transition-fast);
      }
      
      .admin-tab:hover {
        color: var(--text-primary);
        background: var(--bg-secondary);
      }
      
      .admin-tab.active {
        color: var(--color-primary-600);
        background: var(--color-primary-50);
        border-bottom: 2px solid var(--color-primary-600);
      }
      
      .admin-tab-content {
        display: none;
      }
      
      .admin-tab-content.active {
        display: block;
      }
      
      .registrador-item {
        display: flex;
        align-items: center;
        gap: var(--space-4);
        padding: var(--space-3);
        background: var(--bg-primary);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-md);
        margin-bottom: var(--space-2);
      }
      
      .registrador-item:hover {
        background: var(--bg-secondary);
      }
      
      .registrador-item__usuario {
        font-weight: var(--font-weight-bold);
        color: var(--color-primary-600);
        min-width: 150px;
      }
      
      .registrador-item__nome {
        flex: 1;
        color: var(--text-secondary);
      }
      
      .registrador-item__actions {
        display: flex;
        gap: var(--space-2);
      }
    </style>
  `;

  // Setup events
  setupAdminEvents();

  // Load registradores
  await loadRegistradores();
}

function setupAdminEvents() {
  // Tab switching
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Password form
  setupPasswordForm();

  // Registrador form
  const addBtn = document.getElementById('add-registrador-btn');
  const cancelBtn = document.getElementById('cancel-registrador-btn');
  const formContainer = document.getElementById('registrador-form-container');
  const form = document.getElementById('registrador-form');
  const searchInput = document.getElementById('search-registrador');

  addBtn.addEventListener('click', () => {
    document.getElementById('registrador-id').value = '';
    document.getElementById('registrador-usuario').value = '';
    document.getElementById('registrador-senha').value = '';
    document.getElementById('registrador-nome').value = '';
    document.getElementById('registrador-form-title').textContent = 'Novo Registrador';
    document.getElementById('registrador-usuario').disabled = false;
    formContainer.classList.remove('hidden');
  });

  cancelBtn.addEventListener('click', () => {
    formContainer.classList.add('hidden');
  });

  form.addEventListener('submit', handleRegistradorSubmit);

  // Search
  let debounce;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => renderRegistradores(e.target.value), 300);
  });
}

async function loadRegistradores() {
  try {
    const q = query(collection(db, 'foRegistradores'), orderBy('usuario'));
    const snapshot = await getDocs(q);
    foRegistradores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderRegistradores();
  } catch (error) {
    console.error('Error loading registradores:', error);
    document.getElementById('registradores-list').innerHTML = `
      <div class="alert alert--warning">
        <div class="alert__icon">${icons.warning}</div>
        <div class="alert__content">
          <p>Erro ao carregar registradores. ${error.message}</p>
        </div>
      </div>
    `;
  }
}

function renderRegistradores(searchTerm = '') {
  const container = document.getElementById('registradores-list');
  const countEl = document.getElementById('registradores-count');

  let filtered = foRegistradores;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = foRegistradores.filter(r =>
      r.usuario?.toLowerCase().includes(term) ||
      r.nomeCompleto?.toLowerCase().includes(term)
    );
  }

  countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-tertiary); padding: var(--space-6);">
        ${searchTerm ? 'Nenhum registrador encontrado.' : 'Nenhum registrador cadastrado.'}
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(r => `
    <div class="registrador-item" data-id="${r.id}">
      <div class="registrador-item__usuario">${r.usuario}</div>
      <div class="registrador-item__nome">${r.nomeCompleto || '-'}</div>
      <div class="registrador-item__actions">
        <button class="btn btn--secondary btn--sm edit-registrador-btn" data-id="${r.id}">
          ${icons.edit}
        </button>
        <button class="btn btn--ghost btn--sm delete-registrador-btn" data-id="${r.id}" style="color: var(--color-danger-500);">
          ${icons.trash}
        </button>
      </div>
    </div>
  `).join('');

  // Setup actions
  document.querySelectorAll('.edit-registrador-btn').forEach(btn => {
    btn.addEventListener('click', () => editRegistrador(btn.dataset.id));
  });

  document.querySelectorAll('.delete-registrador-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteRegistrador(btn.dataset.id));
  });
}

function editRegistrador(id) {
  const registrador = foRegistradores.find(r => r.id === id);
  if (!registrador) return;

  document.getElementById('registrador-id').value = id;
  document.getElementById('registrador-usuario').value = registrador.usuario || '';
  document.getElementById('registrador-senha').value = registrador.senha || '';
  document.getElementById('registrador-nome').value = registrador.nomeCompleto || '';
  document.getElementById('registrador-form-title').textContent = 'Editar Registrador';
  document.getElementById('registrador-usuario').disabled = true;
  document.getElementById('registrador-form-container').classList.remove('hidden');
}

async function deleteRegistrador(id) {
  const registrador = foRegistradores.find(r => r.id === id);
  if (!confirm(`Deseja excluir o registrador "${registrador?.usuario}"?`)) return;

  try {
    await deleteDoc(doc(db, 'foRegistradores', id));
    showToast('Registrador excluído', 'success');
    await loadRegistradores();
  } catch (error) {
    console.error('Error deleting:', error);
    showToast('Erro ao excluir', 'error');
  }
}

async function handleRegistradorSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('registrador-id').value;
  const usuario = document.getElementById('registrador-usuario').value.trim();
  const senha = document.getElementById('registrador-senha').value.trim();
  const nomeCompleto = document.getElementById('registrador-nome').value.trim();

  if (!usuario || !senha) {
    showToast('Preencha usuário e senha', 'warning');
    return;
  }

  const data = {
    usuario,
    senha,
    nomeCompleto,
    updatedAt: new Date().toISOString()
  };

  try {
    const docId = id || usuario.replace(/[^a-zA-Z0-9]/g, '_');
    if (!id) {
      data.createdAt = new Date().toISOString();
    }
    await setDoc(doc(db, 'foRegistradores', docId), data, { merge: true });

    showToast(id ? 'Registrador atualizado' : 'Registrador cadastrado', 'success');
    document.getElementById('registrador-form-container').classList.add('hidden');
    await loadRegistradores();
  } catch (error) {
    console.error('Error saving:', error);
    showToast('Erro ao salvar', 'error');
  }
}

function setupPasswordForm() {
  const form = document.getElementById('change-password-form');
  const errorDiv = document.getElementById('password-error');
  const errorMsg = document.getElementById('password-error-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const targetUser = document.getElementById('target-user').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    errorDiv.classList.add('hidden');

    if (newPassword !== confirmPassword) {
      errorMsg.textContent = 'As senhas não coincidem.';
      errorDiv.classList.remove('hidden');
      return;
    }

    if (newPassword.length < 4) {
      errorMsg.textContent = 'A senha deve ter pelo menos 4 caracteres.';
      errorDiv.classList.remove('hidden');
      return;
    }

    const btn = document.getElementById('change-password-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Alterando...';

    try {
      await changePassword(targetUser, newPassword);
      showToast('Senha alterada com sucesso!', 'success');
      form.reset();
    } catch (error) {
      errorMsg.textContent = error.message || 'Erro ao alterar senha.';
      errorDiv.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${icons.lock}<span>Alterar Senha</span>`;
    }
  });
}

function getRoleLabel(role) {
  const labels = {
    'admin': 'Administrador',
    'comandoCA': 'Comando CA',
    'commander': 'Comandante',
    'sergeant': 'Sargenteante'
  };
  return labels[role] || role;
}

function getCompanyLabel(company) {
  const labels = {
    '6cia': '6ª Cia',
    '7cia': '7ª Cia',
    '8cia': '8ª Cia',
    '9cia': '9ª Cia',
    '1cia': '1ª Cia',
    '2cia': '2ª Cia',
    '3cia': '3ª Cia'
  };
  return labels[company] || company;
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
