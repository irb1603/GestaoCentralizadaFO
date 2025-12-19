// Public FO Registration - Main Entry Point
// Gestão Centralizada FO - CMB

import { db } from './firebase/config.js';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { COMPANY_NAMES } from './firebase/auth.js';
import { icons } from './utils/icons.js';

// Cache for student lookups
let studentCache = new Map();
let foundStudentsList = [];

/**
 * Validate FO registrador (professor/monitor)
 * @param {string} usuario 
 * @param {string} senha 
 * @returns {Promise<Object>} Registrador data on success
 */
async function validateFORegistrador(usuario, senha) {
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
        return registrador;
      }
      throw new Error('Palavra passe incorreta');
    }

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
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #1e3a8a, #1e40af); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
              ${icons.logo}
            </div>
          </div>
          <div class="fo-header__title">
            <h1>Formulário de Ocorrência CMB</h1>
          </div>
          <div class="fo-header__logos">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #059669, #047857); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
              ${icons.logo}
            </div>
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
              <div class="fo-auth-section__title">
                ${icons.lock}
                <span>Autenticação</span>
              </div>
              
              <div class="fo-form__row">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label form-label--required" for="auth-usuario">Usuário:</label>
                  <input type="text" class="form-input" id="auth-usuario" name="authUsuario" 
                         placeholder="Ex: Cmt6cia, Sgte7cia" required autocomplete="username">
                </div>
                
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label form-label--required" for="auth-senha">Palavra Passe:</label>
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
  // Check cache first
  if (studentCache.has(numero)) {
    return studentCache.get(numero);
  }

  try {
    const docRef = doc(db, 'students', String(numero));
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const student = { id: docSnap.id, ...docSnap.data() };
      studentCache.set(numero, student);
      return student;
    }

    studentCache.set(numero, null);
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

  // Lookup each student
  const results = [];
  for (const numero of numbers) {
    const student = await lookupStudent(numero);
    results.push({ numero, student });
  }

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

  // Student numbers lookup with debounce
  let lookupTimeout;
  studentNumbersInput.addEventListener('input', (e) => {
    clearTimeout(lookupTimeout);
    lookupTimeout = setTimeout(() => {
      updateStudentsPreview(e.target.value);
    }, 500);
  });

  // Also lookup on blur
  studentNumbersInput.addEventListener('blur', (e) => {
    clearTimeout(lookupTimeout);
    updateStudentsPreview(e.target.value);
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

      // Build student info for the record
      const studentInfo = foundStudentsList.map(s => ({
        numero: s.numero,
        nome: s.nome,
        turma: s.turma
      }));

      // Prepare data
      const foData = {
        anoEscolar,
        company: anoEscolar, // Same as anoEscolar for filtering
        studentNumbers,
        studentInfo, // Include found student details
        tipo,
        dataFato,
        horaFato,
        descricao,
        nomeObservador,
        registradoPor: authUsuario,
        status: tipo === 'neutro' ? 'encerrado' : 'pendente',
        dataRegistro: new Date().toISOString().split('T')[0], // Data do registro no sistema
        tipoFO: 'individual', // individual ou coletivo (default individual)
        createdAt: serverTimestamp()
      };

      // Save to Firestore
      await addDoc(collection(db, 'fatosObservados'), foData);

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
}
