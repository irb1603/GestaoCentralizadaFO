// Public FO Registration - Main Entry Point
// Gestão Centralizada FO - CMB

import { db } from './firebase/config.js';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { COMPANY_NAMES } from './firebase/auth.js';
import { icons } from './utils/icons.js';
import {
  getCachedStudent,
  cacheStudent,
  getCachedAuth,
  cacheAuth
} from './services/cacheService.js';

// List of found students for current form
let foundStudentsList = [];

/**
 * Validate FO registrador (professor/monitor)
 * @param {string} usuario 
 * @param {string} senha 
 * @returns {Promise<Object>} Registrador data on success
 */
async function validateFORegistrador(usuario, senha) {
  // Check cache first - avoid repeated Firebase calls for same credentials
  const cachedResult = getCachedAuth(usuario, senha);
  if (cachedResult) {
    if (cachedResult.valid) {
      return cachedResult.registrador;
    } else {
      throw new Error(cachedResult.error);
    }
  }

  try {
    // First try to find in foRegistradores collection
    const q = query(
      collection(db, 'foRegistradores'),
      where('usuario', '==', usuario)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const registrador = snapshot.docs[0].data();
      if (registrador.senha === senha) {
        // Cache successful auth
        cacheAuth(usuario, senha, { valid: true, registrador });
        return registrador;
      }
      // Cache failed auth (wrong password)
      cacheAuth(usuario, senha, { valid: false, error: 'Senha incorreta' });
      throw new Error('Senha incorreta');
    }

    // Cache failed auth (user not found)
    cacheAuth(usuario, senha, { valid: false, error: 'Usuário não encontrado' });
    throw new Error('Usuário não encontrado');
  } catch (error) {
    if (error.message.includes('passe') || error.message.includes('encontrado')) {
      throw error;
    }
    // If Firebase error, allow with default validation
    console.warn('Firebase error, trying default validation:', error.message);
    throw new Error('Erro de conexão. Tente novamente.');
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  renderFOForm();
});

function renderFOForm() {
  const app = document.getElementById('fo-app');

  app.innerHTML = `
    <div class="fo-page">
      <div class="fo-container">
        <!-- Header -->
        <div class="fo-header">
          <div class="fo-header__logos">
            <img src="/images/CMB.jpeg" alt="Logo CMB" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">
          </div>
          <div class="fo-header__title">
            <h1>Formulário de Ocorrência CMB</h1>
          </div>
          <div class="fo-header__logos">
            <img src="/images/CMB.jpeg" alt="Logo CMB" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;">
          </div>
        </div>
        
        <!-- Form -->
        <div class="fo-form">
          <!-- Instructions -->
          <div class="fo-instructions">
            <div class="fo-instructions__title">
              ${icons.info}
              <span>Instruções</span>
            </div>
            <ul class="fo-instructions__list">
              <li>Para múltiplos alunos, separe os números por vírgula COM ESPAÇO (ex: 123, 456)</li>
              <li>Os dados do aluno serão preenchidos automaticamente</li>
              <li>Verifique se os números estão corretos antes de enviar</li>
              <li>Caso seja selecionado Fato observado Neutro, este fato não irá gerar nenhum tipo de sanção disciplinar ao aluno, mas ficará registrado em suas alterações</li>
            </ul>
          </div>
          
          <form id="fo-registration-form">
            <!-- Ano Escolar -->
            <div class="form-group">
              <label class="form-label form-label--required" for="ano-escolar">Ano Escolar:</label>
              <select class="form-select" id="ano-escolar" name="anoEscolar" required>
                <option value="">Selecione o ano</option>
                ${Object.entries(COMPANY_NAMES).map(([key, name]) => `
                  <option value="${key}">${name}</option>
                `).join('')}
              </select>
            </div>
            
            <!-- Número do(s) Aluno(s) -->
            <div class="form-group">
              <label class="form-label form-label--required" for="aluno-numeros">Número do(s) Aluno(s):</label>
              <input type="text" class="form-input" id="aluno-numeros" name="studentNumbers" 
                     placeholder="Digite o número do aluno ou múltiplos números separados por vírgula" required>
              <p class="form-hint">Ex: 123 ou 123, 456, 789</p>
              
              <!-- Students Preview -->
              <div id="students-preview" class="students-preview" style="display: none; margin-top: var(--space-3);"></div>
            </div>
            
            <!-- Fato Observado -->
            <div class="form-group">
              <label class="form-label form-label--required">Fato Observado:</label>
              <div class="fo-tipo-group">
                <label class="fo-tipo-radio fo-tipo-radio--positivo">
                  <input type="radio" name="tipo" value="positivo" required>
                  <span>Positivo</span>
                </label>
                <label class="fo-tipo-radio fo-tipo-radio--negativo">
                  <input type="radio" name="tipo" value="negativo" required>
                  <span>Negativo</span>
                </label>
                <label class="fo-tipo-radio fo-tipo-radio--neutro">
                  <input type="radio" name="tipo" value="neutro" required>
                  <span>Neutro</span>
                </label>
              </div>
            </div>

            <!-- Data e Hora -->
            <div class="fo-form__row">
              <div class="form-group">
                <label class="form-label form-label--required" for="data-fato">Data do Fato:</label>
                <input type="date" class="form-input" id="data-fato" name="dataFato" required>
              </div>
              
              <div class="form-group">
                <label class="form-label form-label--required" for="hora-fato">Hora do Fato:</label>
                <input type="time" class="form-input" id="hora-fato" name="horaFato" required>
              </div>
            </div>
            
            <!-- Descrição -->
            <div class="form-group">
              <label class="form-label form-label--required" for="descricao">Descrição do Fato:</label>
              <textarea class="form-textarea" id="descricao" name="descricao" 
                        placeholder="Descreva detalhadamente o fato observado..." required></textarea>
            </div>
            
            <!-- Nome do Observador -->
            <div class="form-group">
              <label class="form-label form-label--required" for="observador">Nome do Observador:</label>
              <input type="text" class="form-input" id="observador" name="nomeObservador" 
                     placeholder="Digite o nome do observador" required>
            </div>
            
            <!-- Autenticação -->
            <div class="fo-auth-section">
              <div class="fo-auth-section__title" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  ${icons.lock}
                  <span>Autenticação</span>
                </div>
                <a href="#" id="first-access-link" style="font-size: 0.85rem; color: var(--color-primary-600); text-decoration: underline;">
                  1º Acesso? Cadastre-se
                </a>
              </div>
              
              <div class="fo-form__row">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label form-label--required" for="auth-usuario">Usuário:</label>
                  <input type="text" class="form-input" id="auth-usuario" name="authUsuario" 
                         placeholder="Ex: Cmt6cia, Sgte7cia" required autocomplete="username">
                </div>
                
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label form-label--required" for="auth-senha">Senha:</label>
                  <input type="password" class="form-input" id="auth-senha" name="authSenha" 
                         placeholder="Digite a senha do usuário" required autocomplete="current-password">
                </div>
              </div>
            </div>
            
            <!-- Error Message -->
            <div id="form-error" class="alert alert--danger hidden" style="margin-top: var(--space-4);">
              <div class="alert__icon">${icons.warning}</div>
              <div class="alert__content">
                <span id="form-error-message"></span>
              </div>
            </div>
            
            <!-- Actions -->
            <div class="fo-actions">
              <button type="button" class="fo-btn fo-btn--clear" id="clear-btn">
                ${icons.refresh}
                <span>Limpar Formulário</span>
              </button>
              
              <button type="button" class="fo-btn fo-btn--pdf" id="pdf-btn">
                ${icons.download}
                <span>Gerar PDF</span>
              </button>
              
              <button type="submit" class="fo-btn fo-btn--submit" id="submit-btn">
                ${icons.check}
                <span>Registrar Ocorrência</span>
              </button>
            </div>
          </form>
          
          <!-- Success Message (hidden initially) -->
          <div id="success-message" class="fo-success hidden">
            <div class="fo-success__icon">
              ${icons.checkCircle}
            </div>
            <h3 class="fo-success__title">Dados Enviados com Sucesso!</h3>
            <p class="fo-success__message">Sua ocorrência foi registrada com sucesso no sistema.</p>
            <button class="btn btn--primary" id="new-fo-btn">
              ${icons.plus}
              <span>Registrar Nova Ocorrência</span>
            </button>
          </div>
        </div>
        
        <!-- Back Link -->
        <div class="fo-back-link">
          <a href="/">← Voltar para o Sistema</a>
        </div>
      </div>
      
      <!-- First Access Modal -->
      <div id="first-access-modal" class="fo-modal hidden">
        <div class="fo-modal__overlay"></div>
        <div class="fo-modal__content">
          <div class="fo-modal__header">
            <h3>1º Acesso - Cadastro de Usuário</h3>
            <button type="button" class="fo-modal__close" id="close-modal-btn">×</button>
          </div>
          <div class="fo-modal__body">
            <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
              Cadastre seu usuário e senha para poder registrar Fatos Observados. <br>
              <strong>Atenção:</strong> O administrador irá visualizar seu cadastro.
            </p>
            
            <form id="first-access-form">
              <div class="form-group">
                <label class="form-label form-label--required">Usuário</label>
                <input type="text" class="form-input" id="new-usuario" placeholder="Ex: Prof.Silva" required>
                <p style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 4px;">Escolha um nome de usuário único</p>
              </div>
              
              <div class="form-group">
                <label class="form-label form-label--required">Senha</label>
                <input type="password" class="form-input" id="new-senha" placeholder="Crie uma senha" required minlength="4">
              </div>
              
              <div class="form-group">
                <label class="form-label form-label--required">Confirmar Senha</label>
                <input type="password" class="form-input" id="confirm-senha" placeholder="Confirme a senha" required minlength="4">
              </div>
              
              <div class="form-group">
                <label class="form-label">Nome Completo</label>
                <input type="text" class="form-input" id="new-nome" placeholder="Seu nome completo">
              </div>
              
              <div id="register-error" class="alert alert--danger hidden" style="margin-bottom: var(--space-4);">
                <span id="register-error-message"></span>
              </div>
              
              <div id="register-success" class="alert alert--success hidden" style="margin-bottom: var(--space-4);">
                <span>Cadastro realizado com sucesso! Você já pode usar seu usuário e senha.</span>
              </div>
              
              <div style="display: flex; gap: var(--space-3); justify-content: flex-end;">
                <button type="button" class="btn btn--ghost" id="cancel-register-btn">Cancelar</button>
                <button type="submit" class="btn btn--primary" id="register-btn">
                  ${icons.check} Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      
      <style>
        .fo-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fo-modal.hidden {
          display: none;
        }
        .fo-modal__overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
        }
        .fo-modal__content {
          position: relative;
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 450px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .fo-modal__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-light);
        }
        .fo-modal__header h3 {
          margin: 0;
          font-size: 1.1rem;
        }
        .fo-modal__close {
          border: none;
          background: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 0;
          line-height: 1;
        }
        .fo-modal__body {
          padding: 20px;
        }
      </style>
    </div>
  `;

  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('data-fato').value = today;

  // Set default time to current time
  const now = new Date();
  const time = now.toTimeString().slice(0, 5);
  document.getElementById('hora-fato').value = time;

  // Setup form events
  setupFOFormEvents();
}

async function lookupStudent(numero) {
  // Check persistent cache first (survives page reloads)
  const cached = getCachedStudent(numero);
  if (cached !== null) {
    // If cached as "not found", return null
    if (cached.notFound) {
      return null;
    }
    return cached;
  }

  try {
    const docRef = doc(db, 'students', String(numero));
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const student = { id: docSnap.id, ...docSnap.data() };
      // Cache in persistent storage
      cacheStudent(student);
      return student;
    }

    // Cache "not found" result to avoid repeated lookups
    cacheStudent({ numero, notFound: true });
    return null;
  } catch (error) {
    console.error('Error looking up student:', error);
    return null;
  }
}

async function updateStudentsPreview(numbersString) {
  const preview = document.getElementById('students-preview');

  if (!numbersString || !numbersString.trim()) {
    preview.style.display = 'none';
    foundStudentsList = [];
    return;
  }

  // Parse numbers
  const numbers = numbersString
    .split(',')
    .map(n => parseInt(n.trim()))
    .filter(n => !isNaN(n));

  if (numbers.length === 0) {
    preview.style.display = 'none';
    foundStudentsList = [];
    return;
  }

  // Show loading
  preview.style.display = 'block';
  preview.innerHTML = '<span class="spinner"></span><span style="margin-left: 8px;">Buscando alunos...</span>';

  // Lookup all students in PARALLEL (much faster than sequential)
  const studentPromises = numbers.map(async (numero) => {
    const student = await lookupStudent(numero);
    return { numero, student };
  });

  const results = await Promise.all(studentPromises);

  foundStudentsList = results.filter(r => r.student).map(r => r.student);

  // Render results
  if (results.length > 0) {
    preview.innerHTML = `
      <div style="background: var(--bg-secondary); border-radius: var(--radius-md); overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: var(--font-size-sm);">
          <thead style="background: var(--bg-tertiary);">
            <tr>
              <th style="text-align: left; padding: 8px 12px;">Número</th>
              <th style="text-align: left; padding: 8px 12px;">Nome</th>
              <th style="text-align: left; padding: 8px 12px;">Turma</th>
              <th style="text-align: center; padding: 8px 12px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr style="border-top: 1px solid var(--border-light);">
                <td style="padding: 8px 12px; font-weight: 600;">${r.numero}</td>
                <td style="padding: 8px 12px;">${r.student?.nome || '-'}</td>
                <td style="padding: 8px 12px;">${r.student?.turma || '-'}</td>
                <td style="padding: 8px 12px; text-align: center;">
                  ${r.student
        ? '<span class="badge badge--success">Encontrado</span>'
        : '<span class="badge badge--danger">Não encontrado</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    preview.style.display = 'none';
  }
}

function setupFOFormEvents() {
  const form = document.getElementById('fo-registration-form');
  const clearBtn = document.getElementById('clear-btn');
  const pdfBtn = document.getElementById('pdf-btn');
  const newFOBtn = document.getElementById('new-fo-btn');
  const errorDiv = document.getElementById('form-error');
  const errorMsg = document.getElementById('form-error-message');
  const successDiv = document.getElementById('success-message');
  const submitBtn = document.getElementById('submit-btn');
  const studentNumbersInput = document.getElementById('aluno-numeros');

  // Student numbers lookup with debounce (1000ms to reduce Firebase calls)
  let lookupTimeout;
  studentNumbersInput.addEventListener('input', (e) => {
    clearTimeout(lookupTimeout);
    lookupTimeout = setTimeout(() => {
      updateStudentsPreview(e.target.value);
    }, 1000); // Increased from 500ms to reduce queries during typing
  });

  // Also lookup on blur - but only if we don't have results yet
  let lastLookupValue = '';
  studentNumbersInput.addEventListener('blur', (e) => {
    clearTimeout(lookupTimeout);
    const currentValue = e.target.value.trim();
    // Only do lookup if value changed and we don't have matching results
    if (currentValue && currentValue !== lastLookupValue) {
      lastLookupValue = currentValue;
      updateStudentsPreview(currentValue);
    }
  });

  // Clear form
  clearBtn.addEventListener('click', () => {
    form.reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('data-fato').value = today;
    const now = new Date();
    document.getElementById('hora-fato').value = now.toTimeString().slice(0, 5);
    errorDiv.classList.add('hidden');
    document.getElementById('students-preview').style.display = 'none';
    foundStudentsList = [];
  });

  // Generate PDF (placeholder for now)
  pdfBtn.addEventListener('click', () => {
    alert('Funcionalidade de geração de PDF em desenvolvimento.');
  });

  // New FO button (after success)
  newFOBtn.addEventListener('click', () => {
    successDiv.classList.add('hidden');
    form.classList.remove('hidden');
    form.reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('data-fato').value = today;
    const now = new Date();
    document.getElementById('hora-fato').value = now.toTimeString().slice(0, 5);
    document.getElementById('students-preview').style.display = 'none';
    foundStudentsList = [];
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Hide previous error
    errorDiv.classList.add('hidden');

    // Get form data
    const formData = new FormData(form);
    const anoEscolar = formData.get('anoEscolar');
    const studentNumbersRaw = formData.get('studentNumbers');
    const tipo = formData.get('tipo');
    const dataFato = formData.get('dataFato');
    const horaFato = formData.get('horaFato');
    const descricao = formData.get('descricao');
    const nomeObservador = formData.get('nomeObservador');
    const authUsuario = formData.get('authUsuario');
    const authSenha = formData.get('authSenha');

    // Parse student numbers
    const studentNumbers = studentNumbersRaw
      .split(',')
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n));

    if (studentNumbers.length === 0) {
      errorMsg.textContent = 'Por favor, insira números de alunos válidos.';
      errorDiv.classList.remove('hidden');
      return;
    }

    // Show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span><span>Enviando...</span>';

    try {
      // Verify authentication against foRegistradores
      const registrador = await validateFORegistrador(authUsuario, authSenha);

      // Create a separate FO for EACH student
      // This ensures each student has their own FO record with the same fact details
      const studentsToProcess = foundStudentsList.length > 0
        ? foundStudentsList
        : studentNumbers.map(num => ({ numero: num, nome: null, turma: null }));

      if (studentsToProcess.length === 0) {
        throw new Error('Nenhum aluno encontrado para registrar.');
      }

      // Save one FO per student using BATCH WRITE (more efficient)
      const batch = writeBatch(db);

      for (const student of studentsToProcess) {
        const foData = {
          anoEscolar,
          company: anoEscolar, // Same as anoEscolar for filtering
          studentNumbers: [student.numero], // Only this student's number
          studentInfo: [{  // Only this student's info
            numero: student.numero,
            nome: student.nome || 'Não encontrado',
            turma: student.turma || '-'
          }],
          tipo,
          dataFato,
          horaFato,
          descricao,
          nomeObservador,
          registradoPor: authUsuario,
          status: 'pendente', // All FOs start as pendente, including neutral ones
          dataRegistro: new Date().toISOString().split('T')[0], // Data do registro no sistema
          tipoFO: 'individual',
          createdAt: serverTimestamp(),
          updatedAt: new Date().toISOString() // Required for encerrados page ordering
        };

        // Create a new document reference for each FO
        const newDocRef = doc(collection(db, 'fatosObservados'));
        batch.set(newDocRef, foData);
      }

      // Commit all FOs in a single batch operation
      await batch.commit();

      // Show success
      form.classList.add('hidden');
      successDiv.classList.remove('hidden');

    } catch (error) {
      console.error('Error submitting FO:', error);

      if (error.message.includes('Senha') || error.message.includes('Usuário')) {
        errorMsg.textContent = error.message;
      } else if (error.code === 'unavailable' || error.message.includes('Firebase')) {
        errorMsg.textContent = 'Erro de conexão com o servidor. Por favor, tente novamente.';
      } else {
        errorMsg.textContent = 'Erro ao registrar ocorrência. Tente novamente.';
      }

      errorDiv.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `${icons.check}<span>Registrar Ocorrência</span>`;
    }
  });

  // First Access Modal Events
  setupFirstAccessModal();
}

/**
 * Setup First Access Modal events
 */
function setupFirstAccessModal() {
  const modal = document.getElementById('first-access-modal');
  const firstAccessLink = document.getElementById('first-access-link');
  const closeBtn = document.getElementById('close-modal-btn');
  const cancelBtn = document.getElementById('cancel-register-btn');
  const overlay = modal.querySelector('.fo-modal__overlay');
  const registerForm = document.getElementById('first-access-form');
  const errorDiv = document.getElementById('register-error');
  const errorMsg = document.getElementById('register-error-message');
  const successDiv = document.getElementById('register-success');

  // Open modal
  firstAccessLink.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    registerForm.reset();
  });

  // Close modal functions
  const closeModal = () => {
    modal.classList.add('hidden');
    registerForm.reset();
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
  };

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  // Registration form submit
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usuario = document.getElementById('new-usuario').value.trim();
    const senha = document.getElementById('new-senha').value.trim();
    const confirmSenha = document.getElementById('confirm-senha').value.trim();
    const nomeCompleto = document.getElementById('new-nome').value.trim();

    // Hide previous messages
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    // Validate passwords match
    if (senha !== confirmSenha) {
      errorMsg.textContent = 'As senhas não coincidem.';
      errorDiv.classList.remove('hidden');
      return;
    }

    if (senha.length < 4) {
      errorMsg.textContent = 'A senha deve ter pelo menos 4 caracteres.';
      errorDiv.classList.remove('hidden');
      return;
    }

    const registerBtn = document.getElementById('register-btn');
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span class="spinner"></span> Cadastrando...';

    try {
      // Check if user already exists
      const q = query(
        collection(db, 'foRegistradores'),
        where('usuario', '==', usuario)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        errorMsg.textContent = 'Este usuário já está cadastrado. Use outro nome de usuário.';
        errorDiv.classList.remove('hidden');
        return;
      }

      // Save new registrador
      const docId = usuario.replace(/[^a-zA-Z0-9]/g, '_');
      await setDoc(doc(db, 'foRegistradores', docId), {
        usuario,
        senha,
        nomeCompleto: nomeCompleto || usuario,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        autoCadastro: true // Flag to identify self-registered users
      });

      // Show success
      successDiv.classList.remove('hidden');
      registerForm.reset();

      // Auto-fill the login fields
      document.getElementById('auth-usuario').value = usuario;
      document.getElementById('auth-senha').value = senha;

      // Close modal after 2 seconds
      setTimeout(() => {
        closeModal();
      }, 2000);

    } catch (error) {
      console.error('Error registering:', error);
      errorMsg.textContent = 'Erro ao cadastrar. Tente novamente.';
      errorDiv.classList.remove('hidden');
    } finally {
      registerBtn.disabled = false;
      registerBtn.innerHTML = `${icons.check} Cadastrar`;
    }
  });
}
