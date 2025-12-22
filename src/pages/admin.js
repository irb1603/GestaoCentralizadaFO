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
      <button class="admin-tab" data-tab="alunos">Dados dos Alunos</button>
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
    
    <!-- Tab Content: Alunos -->
    <div class="admin-tab-content" id="tab-alunos">
      <div class="card">
        <div class="card__header">
          <h3 class="card__title">Importar Alunos via CSV</h3>
        </div>
        <div class="card__body">
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
            Faça upload de um arquivo CSV com os dados dos alunos. O arquivo deve ter as colunas: 
            <strong>numero</strong>, <strong>nome</strong>, <strong>turma</strong>, <strong>email</strong>, <strong>telefone</strong> (separados por vírgula ou ponto e vírgula).
          </p>
          
          <div style="background: var(--bg-secondary); padding: var(--space-4); border-radius: var(--radius-lg); margin-bottom: var(--space-4);">
            <p style="font-size: var(--font-size-sm); margin-bottom: var(--space-2);"><strong>Exemplo de formato CSV:</strong></p>
            <pre style="background: var(--bg-primary); padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--font-size-sm); overflow-x: auto;">numero;nome;turma;email;telefone
20044;TRINDADE;201M;responsavel@email.com;61999998888
20130;GABRIEL SARMENTO;201M;pai@email.com;61988887777
20131;PEDRO MARIANO;201M;mae@email.com;61977776666</pre>
          </div>
          
          <div class="form-group">
            <label class="form-label">Companhia para os alunos importados</label>
            <select class="form-select" id="csv-company" style="max-width: 300px;">
              <option value="6cia">6ª Companhia (6º Ano)</option>
              <option value="7cia">7ª Companhia (7º Ano)</option>
              <option value="8cia">8ª Companhia (8º Ano)</option>
              <option value="9cia">9ª Companhia (9º Ano)</option>
              <option value="1cia">1ª Companhia (1º Ano EM)</option>
              <option value="2cia">2ª Companhia (2º Ano EM)</option>
              <option value="3cia">3ª Companhia (3º Ano EM)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Arquivo CSV</label>
            <input type="file" class="form-input" id="csv-file" accept=".csv,.txt" style="max-width: 400px;">
          </div>
          
          <div id="csv-preview" style="display: none; margin-bottom: var(--space-4);">
            <h4 style="margin-bottom: var(--space-2);">Pré-visualização (primeiros 10 alunos):</h4>
            <div class="table-container" style="max-height: 300px; overflow-y: auto;">
              <table class="table" id="csv-preview-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Nome</th>
                    <th>Turma</th>
                    <th>Email</th>
                    <th>Telefone</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
            <p id="csv-total-count" style="margin-top: var(--space-2); color: var(--text-secondary);"></p>
          </div>
          
          <div id="csv-error" class="alert alert--danger hidden" style="margin-bottom: var(--space-4);">
            <div class="alert__content">
              <span id="csv-error-msg"></span>
            </div>
          </div>
          
          <div style="display: flex; gap: var(--space-3);">
            <button class="btn btn--primary" id="csv-import-btn" disabled>
              ${icons.upload} Importar Alunos
            </button>
            <button class="btn btn--ghost" id="csv-clear-btn" style="display: none;">
              Limpar
            </button>
          </div>
          
          <div id="csv-result" class="hidden" style="margin-top: var(--space-4);"></div>
        </div>
      </div>

      <!-- Remover Alunos em Lote -->
      <div class="card" style="margin-top: var(--space-6);">
        <div class="card__header">
          <h3 class="card__title">Remover Alunos em Lote</h3>
        </div>
        <div class="card__body">
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
            Remova alunos do sistema por turma ou selecionando individualmente.
          </p>

          <!-- Remover por Turma -->
          <div style="margin-bottom: var(--space-6); padding: var(--space-4); border: 1px solid var(--border-light); border-radius: var(--radius-lg);">
            <h4 style="margin-bottom: var(--space-3); color: var(--text-primary);">Remover por Turma</h4>

            <div class="form-group">
              <label class="form-label">Companhia</label>
              <select class="form-select" id="delete-company" style="max-width: 300px;">
                <option value="">Selecione uma companhia</option>
                <option value="6cia">6ª Companhia (6º Ano)</option>
                <option value="7cia">7ª Companhia (7º Ano)</option>
                <option value="8cia">8ª Companhia (8º Ano)</option>
                <option value="9cia">9ª Companhia (9º Ano)</option>
                <option value="1cia">1ª Companhia (1º Ano EM)</option>
                <option value="2cia">2ª Companhia (2º Ano EM)</option>
                <option value="3cia">3ª Companhia (3º Ano EM)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Turma</label>
              <select class="form-select" id="delete-turma" style="max-width: 300px;" disabled>
                <option value="">Primeiro selecione uma companhia</option>
              </select>
            </div>

            <div id="delete-turma-preview" style="display: none; margin: var(--space-4) 0; padding: var(--space-3); background: var(--bg-secondary); border-radius: var(--radius-md);">
              <p style="margin-bottom: var(--space-2);"><strong>Alunos que serão removidos:</strong></p>
              <p id="delete-turma-count" style="color: var(--text-secondary);"></p>
            </div>

            <button class="btn btn--danger" id="delete-turma-btn" disabled>
              ${icons.trash} Remover Turma
            </button>
          </div>

          <!-- Remover por Seleção -->
          <div style="padding: var(--space-4); border: 1px solid var(--border-light); border-radius: var(--radius-lg);">
            <h4 style="margin-bottom: var(--space-3); color: var(--text-primary);">Remover por Seleção</h4>

            <div class="form-group">
              <label class="form-label">Buscar alunos</label>
              <div style="display: flex; gap: var(--space-2); max-width: 500px;">
                <input type="text" class="form-input" id="search-student" placeholder="Digite o nome ou número do aluno...">
                <button class="btn btn--secondary" id="search-student-btn">
                  ${icons.search || '🔍'} Buscar
                </button>
              </div>
            </div>

            <div id="students-list" style="display: none; margin: var(--space-4) 0;">
              <div class="table-container" style="max-height: 400px; overflow-y: auto;">
                <table class="table">
                  <thead>
                    <tr>
                      <th style="width: 50px;">
                        <input type="checkbox" id="select-all-students">
                      </th>
                      <th>Número</th>
                      <th>Nome</th>
                      <th>Turma</th>
                      <th>Companhia</th>
                    </tr>
                  </thead>
                  <tbody id="students-list-body"></tbody>
                </table>
              </div>

              <div style="margin-top: var(--space-4); display: flex; align-items: center; justify-content: space-between;">
                <p id="selected-count" style="color: var(--text-secondary);">Nenhum aluno selecionado</p>
                <button class="btn btn--danger" id="delete-selected-btn" disabled>
                  ${icons.trash} Remover Selecionados
                </button>
              </div>
            </div>
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

  // CSV Import setup
  setupCSVImport();

  // Bulk Delete setup
  setupBulkDelete();
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

// CSV Import functionality
let parsedCSVData = [];

function setupCSVImport() {
  const fileInput = document.getElementById('csv-file');
  const importBtn = document.getElementById('csv-import-btn');
  const clearBtn = document.getElementById('csv-clear-btn');

  if (!fileInput) return;

  fileInput.addEventListener('change', handleCSVFile);
  importBtn.addEventListener('click', importCSVToFirestore);
  clearBtn.addEventListener('click', clearCSVPreview);
}

function handleCSVFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const text = event.target.result;
      parsedCSVData = parseCSV(text);

      if (parsedCSVData.length === 0) {
        showCSVError('Nenhum dado válido encontrado no arquivo.');
        return;
      }

      showCSVPreview(parsedCSVData);
      document.getElementById('csv-import-btn').disabled = false;
      document.getElementById('csv-clear-btn').style.display = 'inline-flex';
      document.getElementById('csv-error').classList.add('hidden');

    } catch (error) {
      showCSVError('Erro ao processar arquivo: ' + error.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  const data = [];

  // Detect separator (comma or semicolon)
  const firstLine = lines[0];
  const separator = firstLine.includes(';') ? ';' : ',';

  // Check if first line is header
  const hasHeader = firstLine.toLowerCase().includes('numero') ||
    firstLine.toLowerCase().includes('nome') ||
    firstLine.toLowerCase().includes('turma');

  const startIndex = hasHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(separator).map(p => p.trim().replace(/^["']|["']$/g, ''));

    if (parts.length >= 2) {
      const numero = parseInt(parts[0]);
      const nome = parts[1];
      const turma = parts[2] || '';
      const email = parts[3] || '';
      const telefone = parts[4] || '';

      if (!isNaN(numero) && nome) {
        data.push({ numero, nome, turma, email, telefone });
      }
    }
  }

  return data;
}

function showCSVPreview(data) {
  const preview = document.getElementById('csv-preview');
  const tbody = document.querySelector('#csv-preview-table tbody');
  const countEl = document.getElementById('csv-total-count');

  // Show first 10 rows
  tbody.innerHTML = data.slice(0, 10).map(row => `
    <tr>
      <td>${row.numero}</td>
      <td>${row.nome}</td>
      <td>${row.turma}</td>
      <td>${row.email || '-'}</td>
      <td>${row.telefone || '-'}</td>
    </tr>
  `).join('');

  countEl.textContent = `Total: ${data.length} alunos${data.length > 10 ? ' (mostrando 10)' : ''}`;
  preview.style.display = 'block';
}

function showCSVError(message) {
  const errorDiv = document.getElementById('csv-error');
  document.getElementById('csv-error-msg').textContent = message;
  errorDiv.classList.remove('hidden');
  document.getElementById('csv-import-btn').disabled = true;
}

function clearCSVPreview() {
  parsedCSVData = [];
  document.getElementById('csv-file').value = '';
  document.getElementById('csv-preview').style.display = 'none';
  document.getElementById('csv-import-btn').disabled = true;
  document.getElementById('csv-clear-btn').style.display = 'none';
  document.getElementById('csv-error').classList.add('hidden');
  document.getElementById('csv-result').classList.add('hidden');
}

async function importCSVToFirestore() {
  if (parsedCSVData.length === 0) return;

  const company = document.getElementById('csv-company').value;
  const importBtn = document.getElementById('csv-import-btn');
  const resultDiv = document.getElementById('csv-result');

  importBtn.disabled = true;
  importBtn.innerHTML = '<span class="spinner"></span> Importando...';

  let success = 0;
  let errors = 0;

  try {
    for (const aluno of parsedCSVData) {
      try {
        const docId = `${company}_${aluno.numero}`;
        await setDoc(doc(db, 'students', docId), {
          numero: aluno.numero,
          nome: aluno.nome,
          turma: aluno.turma,
          emailResponsavel: aluno.email,
          telResponsavel: aluno.telefone,
          company: company,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        success++;
      } catch (err) {
        console.error('Error importing:', aluno, err);
        errors++;
      }
    }

    resultDiv.innerHTML = `
      <div class="alert alert--success">
        <div class="alert__content">
          <strong>Importação concluída!</strong><br>
          ✅ ${success} alunos importados com sucesso${errors > 0 ? `<br>❌ ${errors} erros` : ''}
        </div>
      </div>
    `;
    resultDiv.classList.remove('hidden');

    showToast(`${success} alunos importados!`, 'success');
    clearCSVPreview();

  } catch (error) {
    showCSVError('Erro na importação: ' + error.message);
  } finally {
    importBtn.disabled = false;
    importBtn.innerHTML = `${icons.upload} Importar Alunos`;
  }
}

// Bulk Delete functionality
let allStudentsCache = [];
let turmasCache = {};

function setupBulkDelete() {
  const deleteCompanySelect = document.getElementById('delete-company');
  const deleteTurmaSelect = document.getElementById('delete-turma');
  const deleteTurmaBtn = document.getElementById('delete-turma-btn');
  const searchStudentBtn = document.getElementById('search-student-btn');
  const searchStudentInput = document.getElementById('search-student');
  const selectAllCheckbox = document.getElementById('select-all-students');
  const deleteSelectedBtn = document.getElementById('delete-selected-btn');

  if (!deleteCompanySelect) return;

  // Load all students
  loadAllStudents();

  // Delete by Turma: Company change
  deleteCompanySelect.addEventListener('change', async (e) => {
    const company = e.target.value;
    deleteTurmaSelect.disabled = true;
    deleteTurmaSelect.innerHTML = '<option value="">Carregando...</option>';
    deleteTurmaBtn.disabled = true;
    document.getElementById('delete-turma-preview').style.display = 'none';

    if (!company) {
      deleteTurmaSelect.innerHTML = '<option value="">Primeiro selecione uma companhia</option>';
      return;
    }

    // Get turmas for this company
    const turmas = await getTurmasByCompany(company);
    deleteTurmaSelect.innerHTML = '<option value="">Selecione uma turma</option>' +
      turmas.map(t => `<option value="${t}">${t}</option>`).join('');
    deleteTurmaSelect.disabled = false;
  });

  // Delete by Turma: Turma change
  deleteTurmaSelect.addEventListener('change', async (e) => {
    const company = deleteCompanySelect.value;
    const turma = e.target.value;

    if (!turma) {
      document.getElementById('delete-turma-preview').style.display = 'none';
      deleteTurmaBtn.disabled = true;
      return;
    }

    // Show preview
    const students = allStudentsCache.filter(s => s.company === company && s.turma === turma);
    document.getElementById('delete-turma-count').textContent = `${students.length} aluno(s) - ${students.map(s => s.nome).join(', ')}`;
    document.getElementById('delete-turma-preview').style.display = 'block';
    deleteTurmaBtn.disabled = false;
  });

  // Delete by Turma: Delete button
  deleteTurmaBtn.addEventListener('click', async () => {
    const company = deleteCompanySelect.value;
    const turma = deleteTurmaSelect.value;

    if (!confirm(`Tem certeza que deseja remover todos os alunos da turma ${turma}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    deleteTurmaBtn.disabled = true;
    deleteTurmaBtn.innerHTML = '<span class="spinner"></span> Removendo...';

    try {
      const students = allStudentsCache.filter(s => s.company === company && s.turma === turma);
      let success = 0;

      for (const student of students) {
        try {
          await deleteDoc(doc(db, 'students', student.id));
          success++;
        } catch (err) {
          console.error('Error deleting student:', student, err);
        }
      }

      showToast(`${success} aluno(s) removido(s) com sucesso!`, 'success');

      // Reset
      deleteCompanySelect.value = '';
      deleteTurmaSelect.innerHTML = '<option value="">Primeiro selecione uma companhia</option>';
      deleteTurmaSelect.disabled = true;
      document.getElementById('delete-turma-preview').style.display = 'none';
      deleteTurmaBtn.disabled = true;

      // Reload students
      await loadAllStudents();

    } catch (error) {
      showToast('Erro ao remover alunos: ' + error.message, 'error');
    } finally {
      deleteTurmaBtn.disabled = false;
      deleteTurmaBtn.innerHTML = `${icons.trash} Remover Turma`;
    }
  });

  // Search students
  const performSearch = async () => {
    const searchTerm = searchStudentInput.value.trim().toLowerCase();
    if (!searchTerm) {
      showToast('Digite algo para buscar', 'warning');
      return;
    }

    const results = allStudentsCache.filter(s =>
      s.nome.toLowerCase().includes(searchTerm) ||
      s.numero.toString().includes(searchTerm)
    );

    renderStudentsList(results);
  };

  searchStudentBtn.addEventListener('click', performSearch);
  searchStudentInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  // Select all checkbox
  selectAllCheckbox.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    checkboxes.forEach(cb => cb.checked = e.target.checked);
    updateSelectedCount();
  });

  // Delete selected button
  deleteSelectedBtn.addEventListener('click', async () => {
    const selectedIds = Array.from(document.querySelectorAll('.student-checkbox:checked'))
      .map(cb => cb.dataset.studentId);

    if (selectedIds.length === 0) {
      showToast('Nenhum aluno selecionado', 'warning');
      return;
    }

    if (!confirm(`Tem certeza que deseja remover ${selectedIds.length} aluno(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    deleteSelectedBtn.disabled = true;
    deleteSelectedBtn.innerHTML = '<span class="spinner"></span> Removendo...';

    try {
      let success = 0;

      for (const id of selectedIds) {
        try {
          await deleteDoc(doc(db, 'students', id));
          success++;
        } catch (err) {
          console.error('Error deleting student:', id, err);
        }
      }

      showToast(`${success} aluno(s) removido(s) com sucesso!`, 'success');

      // Reload students
      await loadAllStudents();

      // Clear list
      document.getElementById('students-list').style.display = 'none';
      searchStudentInput.value = '';

    } catch (error) {
      showToast('Erro ao remover alunos: ' + error.message, 'error');
    } finally {
      deleteSelectedBtn.disabled = false;
      deleteSelectedBtn.innerHTML = `${icons.trash} Remover Selecionados`;
    }
  });
}

async function loadAllStudents() {
  try {
    const snapshot = await getDocs(collection(db, 'students'));
    allStudentsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Build turmas cache
    turmasCache = {};
    allStudentsCache.forEach(s => {
      if (s.company && s.turma) {
        if (!turmasCache[s.company]) {
          turmasCache[s.company] = new Set();
        }
        turmasCache[s.company].add(s.turma);
      }
    });

    // Convert sets to sorted arrays
    Object.keys(turmasCache).forEach(company => {
      turmasCache[company] = Array.from(turmasCache[company]).sort();
    });
  } catch (error) {
    console.error('Error loading students:', error);
  }
}

async function getTurmasByCompany(company) {
  return turmasCache[company] || [];
}

function renderStudentsList(students) {
  const listContainer = document.getElementById('students-list');
  const tbody = document.getElementById('students-list-body');

  if (students.length === 0) {
    showToast('Nenhum aluno encontrado', 'info');
    listContainer.style.display = 'none';
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr>
      <td>
        <input type="checkbox" class="student-checkbox" data-student-id="${s.id}" onchange="updateSelectedCount()">
      </td>
      <td>${s.numero}</td>
      <td>${s.nome}</td>
      <td>${s.turma || '-'}</td>
      <td>${s.company || '-'}</td>
    </tr>
  `).join('');

  listContainer.style.display = 'block';
  document.getElementById('select-all-students').checked = false;
  updateSelectedCount();
}

function updateSelectedCount() {
  const count = document.querySelectorAll('.student-checkbox:checked').length;
  const countEl = document.getElementById('selected-count');
  const deleteBtn = document.getElementById('delete-selected-btn');

  countEl.textContent = count === 0 ? 'Nenhum aluno selecionado' : `${count} aluno(s) selecionado(s)`;
  deleteBtn.disabled = count === 0;
}

// Make updateSelectedCount globally accessible
window.updateSelectedCount = updateSelectedCount;

