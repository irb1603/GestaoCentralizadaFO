// Dados Alunos Page - Student Data Management with Photo
// Gestão Centralizada FO - CMB

import { getSession, canEdit, isAdmin, getCompanyFilter } from '../firebase/auth.js';
import { db } from '../firebase/config.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  query,
  where
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  COMPANY_NAMES,
  COMPANY_SHORT_NAMES,
  getWhatsAppLink,
  formatPhone
} from '../constants/index.js';
import { icons } from '../utils/icons.js';
import {
  getCachedStudentList,
  cacheStudentList,
  invalidateStudentCache
} from '../services/cacheService.js';

let allStudents = [];
let currentEditStudent = null;

export async function renderDadosAlunosPage() {
  const pageContent = document.getElementById('page-content');
  const session = getSession();
  const companyFilter = getCompanyFilter();

  pageContent.innerHTML = `
    <div class="page-header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4);">
        <div>
          <h1 class="page-header__title">Dados dos Alunos</h1>
          <p class="page-header__subtitle">
            ${companyFilter ? COMPANY_NAMES[companyFilter] || companyFilter : 'Todas as Companhias'}
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
    
    <!-- Search and Filter -->
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
    
    <!-- Students Grid -->
    <div id="students-grid" class="students-grid">
      <div style="grid-column: 1 / -1;">
        <div class="card">
          <div class="card__body">
            <div class="empty-state">
              <div class="empty-state__icon">${icons.search}</div>
              <div class="empty-state__title">Buscar Aluno</div>
              <div class="empty-state__text">Digite o número do aluno para visualizar seus dados</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Edit Modal -->
    <div class="modal-backdrop" id="aluno-modal-backdrop"></div>
    <div class="modal modal--lg" id="aluno-modal">
      <div class="modal__header">
        <h3 class="modal__title" id="modal-title">Editar Aluno</h3>
        <button class="modal__close" id="modal-close">${icons.close}</button>
      </div>
      <div class="modal__body">
        <form id="aluno-form">
          <input type="hidden" id="aluno-id">
          
          <div style="display: grid; grid-template-columns: 150px 1fr; gap: var(--space-6);">
            <!-- Photo Section -->
            <div class="student-photo-section">
              <div class="student-photo-preview" id="photo-preview">
                <div class="student-photo-placeholder">
                  ${icons.camera}
                  <span>Foto</span>
                </div>
              </div>
              <label class="btn btn--secondary btn--sm" style="width: 100%; margin-top: var(--space-2);">
                ${icons.upload}
                <span>Upload</span>
                <input type="file" id="photo-input" accept="image/*" style="display: none;">
              </label>
            </div>
            
            <!-- Form Fields -->
            <div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                <div class="form-group">
                  <label class="form-label form-label--required" for="aluno-numero">Número</label>
                  <input type="number" class="form-input" id="aluno-numero" required>
                </div>
                
                <div class="form-group">
                  <label class="form-label form-label--required" for="aluno-turma">Turma</label>
                  <input type="text" class="form-input" id="aluno-turma" placeholder="Ex: 601, 702" required>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label form-label--required" for="aluno-nome">Nome Completo</label>
                <input type="text" class="form-input" id="aluno-nome" required>
              </div>
              
              <div class="form-group">
                <label class="form-label" for="aluno-email">E-mail do Responsável</label>
                <input type="email" class="form-input" id="aluno-email" placeholder="responsavel@email.com">
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                <div class="form-group">
                  <label class="form-label" for="aluno-tel-resp">Telefone do Responsável</label>
                  <input type="tel" class="form-input" id="aluno-tel-resp" placeholder="(61) 99999-9999">
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="aluno-tel-aluno">Telefone do Aluno</label>
                  <input type="tel" class="form-input" id="aluno-tel-aluno" placeholder="(61) 99999-9999">
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn--secondary" id="modal-cancel">Cancelar</button>
        <button type="submit" form="aluno-form" class="btn btn--primary" id="modal-save">Salvar</button>
      </div>
    </div>
    
    <style>
      .students-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: var(--space-4);
      }
      
      .student-card {
        background: var(--bg-primary);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-lg);
        padding: var(--space-4);
        display: flex;
        gap: var(--space-4);
        transition: all var(--transition-fast);
      }
      
      .student-card:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
      }
      
      .student-card__photo {
        width: 80px;
        height: 80px;
        border-radius: var(--radius-lg);
        background: var(--bg-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
      }
      
      .student-card__photo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .student-card__photo-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-1);
        color: var(--text-tertiary);
        font-size: var(--font-size-xs);
      }
      
      .student-card__info {
        flex: 1;
        min-width: 0;
      }
      
      .student-card__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: var(--space-2);
      }
      
      .student-card__number {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
        color: var(--color-primary-600);
      }
      
      .student-card__turma {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        background: var(--bg-secondary);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-sm);
      }
      
      .student-card__name {
        font-weight: var(--font-weight-medium);
        color: var(--text-primary);
        margin-bottom: var(--space-2);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .student-card__contact {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        font-size: var(--font-size-sm);
      }
      
      .student-card__phone {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        color: var(--text-secondary);
      }
      
      .student-card__whatsapp {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: #25D366;
        color: white;
        border-radius: var(--radius-md);
        text-decoration: none;
        flex-shrink: 0;
      }
      
      .student-card__whatsapp:hover {
        background: #128C7E;
      }
      
      .student-card__whatsapp svg {
        width: 16px;
        height: 16px;
      }
      
      .student-card__actions {
        display: flex;
        gap: var(--space-2);
        margin-top: var(--space-3);
        padding-top: var(--space-3);
        border-top: 1px solid var(--border-light);
      }
      
      .student-photo-section {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      
      .student-photo-preview {
        width: 150px;
        height: 150px;
        border-radius: var(--radius-lg);
        background: var(--bg-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border: 2px dashed var(--border-medium);
      }
      
      .student-photo-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .student-photo-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-2);
        color: var(--text-tertiary);
      }
      
      .student-photo-placeholder svg {
        width: 32px;
        height: 32px;
      }
      
      .modal--lg {
        max-width: 700px;
      }
    </style>
  `;

  // Setup events
  setupDadosAlunosEvents();

  // DON'T load data automatically - wait for search
  // This reduces initial reads from ~2600 to 0
}

async function loadStudentsData(studentNumber = '', forceRefresh = false) {
  const container = document.getElementById('students-grid');
  const countEl = document.getElementById('student-count');
  const companyFilter = getCompanyFilter();
  const adminCompanySelect = document.getElementById('filter-company');
  const selectedCompany = adminCompanySelect?.value || companyFilter;

  // Require student number to search
  if (!studentNumber || studentNumber.trim() === '') {
    container.innerHTML = `
      <div style="grid-column: 1 / -1;">
        <div class="card">
          <div class="card__body">
            <div class="empty-state">
              <div class="empty-state__icon">${icons.search}</div>
              <div class="empty-state__title">Buscar Aluno</div>
              <div class="empty-state__text">Digite o número do aluno para visualizar seus dados</div>
            </div>
          </div>
        </div>
      </div>
    `;
    countEl.textContent = '0';
    return;
  }

  // Show loading
  container.innerHTML = `
    <div style="display: flex; justify-content: center; padding: 3rem; grid-column: 1 / -1;">
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
        <div style="grid-column: 1 / -1;">
          <div class="card">
            <div class="card__body">
              <div class="empty-state">
                <div class="empty-state__icon">${icons.users}</div>
                <div class="empty-state__title">Aluno não encontrado</div>
                <div class="empty-state__text">Verifique o número e tente novamente</div>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Render student cards
    container.innerHTML = students.map(student => renderStudentCard(student)).join('');

    // Setup card actions
    setupCardActions();

  } catch (error) {
    console.error('Error loading students:', error);
    container.innerHTML = `
      <div style="grid-column: 1 / -1;">
        <div class="alert alert--danger">
          <div class="alert__icon">${icons.warning}</div>
          <div class="alert__content">
            <p>Erro ao carregar dados: ${error.message}</p>
          </div>
        </div>
      </div>
    `;
  }
}

function renderStudentCard(student) {
  const hasPhoto = student.fotoUrl;
  const telResp = student.telefoneResponsavel || '';
  const telAluno = student.telefoneAluno || '';

  return `
    <div class="student-card" data-id="${student.id}">
      <div class="student-card__photo">
        ${hasPhoto ? `
          <img src="${student.fotoUrl}" alt="${student.nome}" loading="lazy">
        ` : `
          <div class="student-card__photo-placeholder">
            ${icons.users}
          </div>
        `}
      </div>
      
      <div class="student-card__info">
        <div class="student-card__header">
          <span class="student-card__number">${student.numero}</span>
          <span class="student-card__turma">${student.turma || '-'}</span>
        </div>
        
        <div class="student-card__name" title="${student.nome}">${student.nome || '-'}</div>
        
        <div class="student-card__contact">
          ${student.emailResponsavel ? `
            <div style="color: var(--text-secondary); font-size: var(--font-size-xs); overflow: hidden; text-overflow: ellipsis;">
              ${student.emailResponsavel}
            </div>
          ` : ''}
          
          ${telResp ? `
            <div class="student-card__phone">
              <span>Resp: ${formatPhone(telResp)}</span>
              <a href="${getWhatsAppLink(telResp)}" target="_blank" class="student-card__whatsapp" title="WhatsApp Responsável">
                ${icons.whatsapp}
              </a>
            </div>
          ` : ''}
          
          ${telAluno ? `
            <div class="student-card__phone">
              <span>Aluno: ${formatPhone(telAluno)}</span>
              <a href="${getWhatsAppLink(telAluno)}" target="_blank" class="student-card__whatsapp" title="WhatsApp Aluno">
                ${icons.whatsapp}
              </a>
            </div>
          ` : ''}
        </div>
        
        ${canEdit() ? `
          <div class="student-card__actions">
            <button class="btn btn--secondary btn--sm edit-btn" data-id="${student.id}">
              ${icons.edit} Editar
            </button>
            <button class="btn btn--ghost btn--sm delete-btn" data-id="${student.id}" style="color: var(--color-danger-500);">
              ${icons.trash}
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function setupDadosAlunosEvents() {
  const searchInput = document.getElementById('search-aluno');
  const searchBtn = document.getElementById('search-btn');
  const addBtn = document.getElementById('add-aluno-btn');
  const modal = document.getElementById('aluno-modal');
  const backdrop = document.getElementById('aluno-modal-backdrop');
  const closeBtn = document.getElementById('modal-close');
  const cancelBtn = document.getElementById('modal-cancel');
  const form = document.getElementById('aluno-form');
  const photoInput = document.getElementById('photo-input');

  // Search button click
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      loadStudentsData(searchInput.value.trim());
    });
  }

  // Enter key on search input
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        loadStudentsData(searchInput.value.trim());
      }
    });
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

  // Photo preview
  if (photoInput) {
    photoInput.addEventListener('change', handlePhotoChange);
  }
}

function setupCardActions() {
  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const student = allStudents.find(s => s.id === id);
      if (student) openModal(student);
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const student = allStudents.find(s => s.id === id);

      if (confirm(`Deseja realmente excluir o aluno ${student?.nome || id}?`)) {
        try {
          await deleteDoc(doc(db, 'students', id));
          invalidateStudentCache(student?.numero); // Invalidate cache
          showToast('Aluno excluído com sucesso', 'success');
          loadStudentsData(document.getElementById('search-aluno')?.value || '', true);
        } catch (error) {
          console.error('Error deleting:', error);
          showToast('Erro ao excluir aluno', 'error');
        }
      }
    });
  });
}

function openModal(student = null) {
  currentEditStudent = student;
  const modal = document.getElementById('aluno-modal');
  const backdrop = document.getElementById('aluno-modal-backdrop');
  const title = document.getElementById('modal-title');
  const photoPreview = document.getElementById('photo-preview');

  // Reset form
  document.getElementById('aluno-id').value = student?.id || '';
  document.getElementById('aluno-numero').value = student?.numero || '';
  document.getElementById('aluno-turma').value = student?.turma || '';
  document.getElementById('aluno-nome').value = student?.nome || '';
  document.getElementById('aluno-email').value = student?.emailResponsavel || '';
  document.getElementById('aluno-tel-resp').value = student?.telefoneResponsavel || '';
  document.getElementById('aluno-tel-aluno').value = student?.telefoneAluno || '';

  // Photo preview
  if (student?.fotoUrl) {
    photoPreview.innerHTML = `<img src="${student.fotoUrl}" alt="${student.nome}">`;
  } else {
    photoPreview.innerHTML = `
      <div class="student-photo-placeholder">
        ${icons.camera}
        <span>Foto</span>
      </div>
    `;
  }

  // Disable numero field if editing
  document.getElementById('aluno-numero').disabled = !!student;

  title.textContent = student ? 'Editar Aluno' : 'Novo Aluno';

  modal.classList.add('active');
  backdrop.classList.add('active');
}

function closeModal() {
  document.getElementById('aluno-modal').classList.remove('active');
  document.getElementById('aluno-modal-backdrop').classList.remove('active');
  document.getElementById('aluno-numero').disabled = false;
  currentEditStudent = null;
}

function handlePhotoChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const photoPreview = document.getElementById('photo-preview');
    photoPreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
  };
  reader.readAsDataURL(file);
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('aluno-id').value;
  const numero = parseInt(document.getElementById('aluno-numero').value);
  const turma = document.getElementById('aluno-turma').value.trim();
  const nome = document.getElementById('aluno-nome').value.trim().toUpperCase();
  const emailResponsavel = document.getElementById('aluno-email').value.trim();
  const telefoneResponsavel = document.getElementById('aluno-tel-resp').value.trim();
  const telefoneAluno = document.getElementById('aluno-tel-aluno').value.trim();

  // Get company from turma
  const turmaPrefix = turma.charAt(0);
  const companyMap = { '6': '6cia', '7': '7cia', '8': '8cia', '9': '9cia', '1': '1cia', '2': '2cia', '3': '3cia' };
  const company = companyMap[turmaPrefix] || '';

  const data = {
    numero,
    turma,
    nome,
    company,
    emailResponsavel,
    telefoneResponsavel,
    telefoneAluno,
    updatedAt: new Date().toISOString()
  };

  // Keep existing photo URL if not changed
  if (currentEditStudent?.fotoUrl) {
    data.fotoUrl = currentEditStudent.fotoUrl;
  }

  const saveBtn = document.getElementById('modal-save');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner"></span> Salvando...';

  try {
    // Handle photo upload to Firebase Storage (not Base64)
    const photoInput = document.getElementById('photo-input');
    if (photoInput.files[0]) {
      const file = photoInput.files[0];

      // Compress image before upload
      const compressedFile = await compressImage(file, 800, 0.7);

      // Upload to Firebase Storage
      const storage = getStorage();
      const filename = `fotos-alunos/${numero}/foto_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, compressedFile);
      data.fotoUrl = await getDownloadURL(storageRef);
    }

    const docId = id || String(numero);
    await setDoc(doc(db, 'students', docId), data, { merge: true });

    invalidateStudentCache(numero); // Invalidate cache
    showToast(id ? 'Aluno atualizado com sucesso' : 'Aluno cadastrado com sucesso', 'success');
    closeModal();
    loadStudentsData(document.getElementById('search-aluno')?.value || '', true);
  } catch (error) {
    console.error('Error saving:', error);
    showToast('Erro ao salvar aluno', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Salvar';
  }
}

/**
 * Compress image before upload to reduce storage and bandwidth
 * @param {File} file - Original image file
 * @param {number} maxSize - Maximum width/height in pixels
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<Blob>} - Compressed image blob
 */
async function compressImage(file, maxSize = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
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
