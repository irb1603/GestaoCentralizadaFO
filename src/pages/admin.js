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
  getDoc,
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
      <button class="admin-tab" data-tab="ia">Assistente IA</button>
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
                <label class="form-label form-label--required">Senha</label>
                <input type="password" class="form-input" id="registrador-senha" placeholder="Digite a senha" required>
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
            <label class="form-label">Arquivo CSV</label>
            <input type="file" class="form-input" id="csv-file" accept=".csv,.txt" style="max-width: 400px;" disabled>
            <p style="font-size: var(--font-size-sm); color: var(--text-tertiary); margin-top: var(--space-2);">
              Selecione uma companhia primeiro
            </p>
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
    
    <!-- Tab Content: IA -->
    <div class="admin-tab-content" id="tab-ia">
      <div class="card">
        <div class="card__header">
          <h3 class="card__title">Configuração do Assistente de IA</h3>
        </div>
        <div class="card__body">
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
            Configure as API keys do Google Gemini para cada companhia. Cada companhia usa sua própria API key para distribuir o uso do tier gratuito.
          </p>
          
          <div class="alert alert--info" style="margin-bottom: var(--space-4);">
            <div class="alert__icon">${icons.info}</div>
            <div class="alert__content">
              <p><strong>Tier Gratuito:</strong> Gemini 2.5 Flash-Lite oferece 1.000 requisições/dia por API key.</p>
              <p><strong>Importante:</strong> Após criar a API key, selecione o modelo "2.5 Flash Lite" e salve as configurações.</p>
              <p>Obtenha sua API key em: <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a></p>
            </div>
          </div>
          
          <div id="ai-configs-container">
            <div style="display: flex; justify-content: center; padding: var(--space-6);">
              <span class="spinner spinner--lg"></span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- AI Logs -->
      <div class="card" style="margin-top: var(--space-6);">
        <div class="card__header">
          <h3 class="card__title">Histórico de Conversas com IA</h3>
        </div>
        <div class="card__body">
          <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
            Selecione um usuário para ver suas conversas com o assistente de IA.
          </p>
          
          <div class="form-group" style="max-width: 300px;">
            <label class="form-label">Selecionar Usuário</label>
            <select class="form-select" id="ai-logs-user">
              <option value="">Selecione um usuário...</option>
              ${users.map(u => `<option value="${u}">${u}</option>`).join('')}
            </select>
          </div>
          
          <div id="ai-logs-container" style="margin-top: var(--space-4);">
            <p style="color: var(--text-tertiary); text-align: center; padding: var(--space-4);">Selecione um usuário acima para ver o histórico.</p>
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

      .badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 600;
        font-size: 0.7rem;
      }

      .badge--success {
        background: #d1fae5;
        color: #065f46;
      }

      .badge--warning {
        background: #fef3c7;
        color: #92400e;
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

  // AI Config setup
  setupAIConfig();
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
  const companySelect = document.getElementById('csv-company');

  if (!fileInput) return;

  // Habilitar/desabilitar input de arquivo baseado na seleção de companhia
  companySelect.addEventListener('change', (e) => {
    fileInput.disabled = !e.target.value;
    if (!e.target.value) {
      fileInput.value = '';
      clearCSVPreview();
    }
  });

  fileInput.addEventListener('change', handleCSVFile);
  importBtn.addEventListener('click', importCSVToFirestore);
  clearBtn.addEventListener('click', clearCSVPreview);
}

function handleCSVFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const text = event.target.result;
      parsedCSVData = parseCSV(text);

      if (parsedCSVData.length === 0) {
        showCSVError('Nenhum dado válido encontrado no arquivo.');
        return;
      }

      // Verificar se uma companhia foi selecionada
      const company = document.getElementById('csv-company').value;
      if (!company) {
        showCSVError('Selecione uma companhia antes de carregar o arquivo.');
        return;
      }

      // Verificar duplicatas
      const duplicateInfo = await checkForDuplicates(parsedCSVData, company);

      showCSVPreview(parsedCSVData, duplicateInfo);
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

async function checkForDuplicates(students, company) {
  const duplicateInfo = {
    novos: [],
    atualizacoes: []
  };

  try {
    // Buscar documentos existentes no Firestore
    for (const student of students) {
      const docId = `${company}_${student.numero}`;
      const docRef = doc(db, 'students', docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        duplicateInfo.atualizacoes.push({
          ...student,
          dadosAntigos: docSnap.data()
        });
      } else {
        duplicateInfo.novos.push(student);
      }
    }
  } catch (error) {
    console.error('Erro ao verificar duplicatas:', error);
    // Em caso de erro, considerar todos como novos
    duplicateInfo.novos = students;
  }

  return duplicateInfo;
}

function showCSVPreview(data, duplicateInfo = null) {
  const preview = document.getElementById('csv-preview');
  const tbody = document.querySelector('#csv-preview-table tbody');
  const countEl = document.getElementById('csv-total-count');

  // Criar mapa de duplicatas para lookup rápido
  const updateMap = new Map();
  if (duplicateInfo) {
    duplicateInfo.atualizacoes.forEach(aluno => {
      updateMap.set(aluno.numero, true);
    });
  }

  // Renderizar tabela com indicador de status
  tbody.innerHTML = data.slice(0, 10).map(row => {
    const isDuplicate = updateMap.has(row.numero);
    const statusBadge = isDuplicate
      ? '<span class="badge badge--warning" style="font-size: 0.7rem; margin-left: 4px;">Atualização</span>'
      : '<span class="badge badge--success" style="font-size: 0.7rem; margin-left: 4px;">Novo</span>';

    return `
      <tr>
        <td>${row.numero} ${statusBadge}</td>
        <td>${row.nome}</td>
        <td>${row.turma}</td>
        <td>${row.email || '-'}</td>
        <td>${row.telefone || '-'}</td>
      </tr>
    `;
  }).join('');

  // Resumo atualizado
  let resumo = `Total: ${data.length} aluno(s)`;
  if (duplicateInfo) {
    resumo += ` | ${duplicateInfo.novos.length} novo(s), ${duplicateInfo.atualizacoes.length} atualização(ões)`;
  }
  if (data.length > 10) {
    resumo += ' (mostrando 10)';
  }

  countEl.innerHTML = resumo;

  // Remover aviso anterior se existir
  const oldWarning = preview.querySelector('.duplicate-warning');
  if (oldWarning) oldWarning.remove();

  // Adicionar aviso se houver atualizações
  if (duplicateInfo && duplicateInfo.atualizacoes.length > 0) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'alert alert--warning duplicate-warning';
    warningDiv.style.marginTop = 'var(--space-3)';
    warningDiv.innerHTML = `
      <div class="alert__content">
        <strong>⚠️ Atenção:</strong> ${duplicateInfo.atualizacoes.length} aluno(s) já existe(m) no sistema e será(ão) atualizado(s) com os novos dados.
      </div>
    `;
    preview.appendChild(warningDiv);
  }

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

// AI Configuration
const AI_COMPANIES = [
  { id: 'admin', label: 'Admin / Comando CA' },
  { id: '6cia', label: '6ª Companhia (6º Ano)' },
  { id: '7cia', label: '7ª Companhia (7º Ano)' },
  { id: '8cia', label: '8ª Companhia (8º Ano)' },
  { id: '9cia', label: '9ª Companhia (9º Ano)' },
  { id: '1cia', label: '1ª Companhia (1º Ano EM)' },
  { id: '2cia', label: '2ª Companhia (2º Ano EM)' },
  { id: '3cia', label: '3ª Companhia (3º Ano EM)' }
];

async function setupAIConfig() {
  const container = document.getElementById('ai-configs-container');
  if (!container) return;

  // Load existing configs
  await loadAIConfigs();

  // Setup AI logs user selector
  const userSelector = document.getElementById('ai-logs-user');
  if (userSelector) {
    userSelector.addEventListener('change', (e) => {
      if (e.target.value) {
        loadAILogs(e.target.value);
      } else {
        document.getElementById('ai-logs-container').innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: var(--space-4);">Selecione um usuário acima para ver o histórico.</p>';
      }
    });
  }
}

async function loadAIConfigs() {
  const container = document.getElementById('ai-configs-container');

  try {
    // Load existing configs from Firebase
    const configs = {};
    const snapshot = await getDocs(collection(db, 'aiConfigs'));
    snapshot.forEach(doc => {
      configs[doc.id] = doc.data();
    });

    // Render config form for each company
    container.innerHTML = `
      <form id="ai-configs-form">
        <div style="display: grid; gap: var(--space-4);">
          ${AI_COMPANIES.map(company => `
            <div style="display: grid; grid-template-columns: 200px 1fr 150px auto; gap: var(--space-3); align-items: center; padding: var(--space-3); background: var(--bg-secondary); border-radius: var(--radius-md);">
              <label style="font-weight: var(--font-weight-medium);">${company.label}</label>
              <input type="password" 
                     class="form-input ai-api-key" 
                     id="ai-key-${company.id}" 
                     data-company="${company.id}"
                     placeholder="Cole a API key aqui..."
                     value="${configs[company.id]?.apiKey || ''}"
                     style="font-family: monospace;">
              <select class="form-select ai-model" id="ai-model-${company.id}" data-company="${company.id}">
                <option value="gemini-2.0-flash" ${configs[company.id]?.model === 'gemini-2.0-flash' || !configs[company.id]?.model ? 'selected' : ''}>2.0 Flash (1500/dia - Recomendado)</option>
                <option value="gemini-2.5-flash-lite" ${configs[company.id]?.model === 'gemini-2.5-flash-lite' ? 'selected' : ''}>2.5 Flash Lite (1000/dia)</option>
                <option value="gemini-2.5-flash" ${configs[company.id]?.model === 'gemini-2.5-flash' ? 'selected' : ''}>2.5 Flash (250/dia)</option>
                <option value="gemini-2.5-pro" ${configs[company.id]?.model === 'gemini-2.5-pro' ? 'selected' : ''}>2.5 Pro (100/dia - Avançado)</option>
              </select>
              <span class="ai-config-status" id="ai-status-${company.id}">
                ${configs[company.id]?.apiKey ? '✅' : '❌'}
              </span>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top: var(--space-4); display: flex; gap: var(--space-3);">
          <button type="submit" class="btn btn--primary">
            ${icons.check} Salvar Configurações
          </button>
          <button type="button" class="btn btn--secondary" id="test-ai-btn">
            ${icons.refresh} Testar Conexão
          </button>
        </div>
      </form>
    `;

    // Setup form events
    const form = document.getElementById('ai-configs-form');
    form.addEventListener('submit', saveAIConfigs);

    const testBtn = document.getElementById('test-ai-btn');
    testBtn.addEventListener('click', testAIConnection);

  } catch (error) {
    console.error('Error loading AI configs:', error);
    container.innerHTML = `
      <div class="alert alert--danger">
        <div class="alert__icon">${icons.warning}</div>
        <div class="alert__content">Erro ao carregar configurações: ${error.message}</div>
      </div>
    `;
  }
}

async function saveAIConfigs(e) {
  e.preventDefault();

  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Salvando...';

  try {
    for (const company of AI_COMPANIES) {
      const apiKey = document.getElementById(`ai-key-${company.id}`).value.trim();
      const model = document.getElementById(`ai-model-${company.id}`).value;

      const data = {
        apiKey,
        model,
        enabled: !!apiKey,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'aiConfigs', company.id), data, { merge: true });

      // Update status
      document.getElementById(`ai-status-${company.id}`).textContent = apiKey ? '✅' : '❌';
    }

    showToast('Configurações salvas com sucesso!', 'success');
  } catch (error) {
    console.error('Error saving AI configs:', error);
    showToast('Erro ao salvar: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icons.check} Salvar Configurações`;
  }
}

async function testAIConnection() {
  const btn = document.getElementById('test-ai-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Testando...';

  // Test admin key first
  const adminKey = document.getElementById('ai-key-admin').value.trim();
  const adminModel = document.getElementById('ai-model-admin').value;

  if (!adminKey) {
    showToast('Insira a API key do Admin para testar', 'warning');
    btn.disabled = false;
    btn.innerHTML = `${icons.refresh} Testar Conexão`;
    return;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${adminModel}:generateContent?key=${adminKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Diga apenas: Conexão OK' }] }],
        generationConfig: { maxOutputTokens: 50 }
      })
    });

    if (response.ok) {
      showToast('✅ Conexão com Gemini OK!', 'success');
    } else {
      const error = await response.json();
      showToast('❌ Erro: ' + (error.error?.message || 'Falha na conexão'), 'error');
    }
  } catch (error) {
    showToast('❌ Erro de rede: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${icons.refresh} Testar Conexão`;
  }
}

async function loadAILogs(selectedUser) {
  const container = document.getElementById('ai-logs-container');
  container.innerHTML = '<div style="display: flex; justify-content: center; padding: var(--space-4);"><span class="spinner"></span></div>';

  try {
    // Query logs filtered by user
    const q = query(
      collection(db, 'aiConversations'),
      where('username', '==', selectedUser),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.slice(0, 50).map(doc => ({ id: doc.id, ...doc.data() }));

    if (logs.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-tertiary); padding: var(--space-6);">
          Nenhuma conversa registrada ainda.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-container" style="max-height: 400px; overflow-y: auto;">
        <table class="table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Usuário</th>
              <th>Cia</th>
              <th>Pergunta</th>
              <th style="width: 100px;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(log => `
              <tr>
                <td style="white-space: nowrap; font-size: 0.75rem;">${formatLogDate(log.timestamp)}</td>
                <td><strong>${log.username || '-'}</strong></td>
                <td>${log.company || 'Admin'}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${(log.query || '').replace(/"/g, '&quot;')}">${log.query || '-'}</td>
                <td>
                  <button class="btn btn--ghost btn--sm view-ai-log-btn" data-id="${log.id}" title="Ver conversa">
                    ${icons.eye}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Setup view buttons
    container.querySelectorAll('.view-ai-log-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const log = logs.find(l => l.id === btn.dataset.id);
        if (log) {
          alert(`PERGUNTA:\n${log.query}\n\nRESPOSTA:\n${log.response}`);
        }
      });
    });

  } catch (error) {
    console.error('Error loading AI logs:', error);
    container.innerHTML = `
      <div class="alert alert--danger">
        <div class="alert__icon">${icons.warning}</div>
        <div class="alert__content">Erro ao carregar histórico: ${error.message}</div>
      </div>
    `;
  }
}

function formatLogDate(timestamp) {
  if (!timestamp) return '-';

  let date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    date = new Date(timestamp);
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
