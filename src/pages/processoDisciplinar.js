// Processo Disciplinar - Student disciplinary process management
// Gestão Centralizada FO - CMB

import { db } from '../firebase/config.js';
import { collection, query, where, getDocs, addDoc, orderBy, doc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { icons } from '../utils/icons.js';
import { FO_STATUS, COMPANY_NAMES, formatDate } from '../constants/index.js';
import { showToast } from '../utils/toast.js';
import { getSession } from '../firebase/auth.js';
import { logAction } from '../services/auditLogger.js';

/**
 * Render the Processo Disciplinar page
 */
export async function renderProcessoDisciplinarPage(container) {
  const session = getSession();

  // Inject styles
  if (!document.getElementById('processo-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'processo-styles';
    styleEl.textContent = processoStyles;
    document.head.appendChild(styleEl);
  }

  container.innerHTML = `
    <div class="page-header">
      <div class="page-header__top">
        <div>
          <h1 class="page-title">Processo Disciplinar</h1>
          <p class="page-subtitle">Gerenciar documentos e processos dos alunos</p>
        </div>
        <button class="btn btn--primary" id="btn-gerar-processo">
          ${icons.document} Gerar Processo Disciplinar
        </button>
      </div>
    </div>
    
    <div class="search-bar">
      <input type="text" id="search-aluno" placeholder="Buscar por número ou nome do aluno..." 
             style="flex: 1; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-light); border-radius: var(--radius-md);">
    </div>
    
    <div class="page-loading">
      <span class="spinner"></span> Carregando alunos...
    </div>
    
    <div id="students-list" class="students-grid" style="display: none;"></div>
    <div id="empty-state" class="empty-state" style="display: none;">
      <p>Nenhum aluno com FO encontrado.</p>
    </div>
  `;

  // Remove existing modals if any
  document.querySelectorAll('.processo-modal-container').forEach(el => el.remove());

  // Add modals to body (outside container to avoid overflow issues)
  const modalsContainer = document.createElement('div');
  modalsContainer.className = 'processo-modal-container';
  modalsContainer.innerHTML = `
    <!-- Modal Upload -->
    <div id="upload-modal" class="processo-modal">
      <div class="processo-modal__overlay"></div>
      <div class="processo-modal__content">
        <div class="processo-modal__header">
          <h3>Upload de Termo de Ciência</h3>
          <button class="processo-modal__close" data-close="upload-modal">&times;</button>
        </div>
        <div class="processo-modal__body">
          <p id="upload-modal-student"></p>
          <div class="upload-options">
            <label class="upload-option">
              <input type="file" id="file-input" accept="image/*,.pdf" style="display: none;">
              <div class="upload-option__btn">
                ${icons.upload} Escolher Arquivo
              </div>
            </label>
            <label class="upload-option">
              <input type="file" id="camera-input" accept="image/*" capture="camera" style="display: none;">
              <div class="upload-option__btn upload-option__btn--camera">
                ${icons.camera} Usar Câmera
              </div>
            </label>
          </div>
          <div id="upload-preview" class="upload-preview"></div>
        </div>
        <div class="processo-modal__footer">
          <button class="btn btn--ghost" data-close="upload-modal">Cancelar</button>
          <button class="btn btn--primary" id="btn-upload-confirm" disabled>Enviar Documento</button>
        </div>
      </div>
    </div>
    
    <!-- Modal Gerar Processo -->
    <div id="processo-modal" class="processo-modal">
      <div class="processo-modal__overlay"></div>
      <div class="processo-modal__content processo-modal__content--lg">
        <div class="processo-modal__header">
          <h3>Gerar Processo Disciplinar</h3>
          <button class="processo-modal__close" data-close="processo-modal">&times;</button>
        </div>
        <div class="processo-modal__body">
          <div class="form-group">
            <label>Número do Aluno</label>
            <div style="display: flex; gap: var(--space-2);">
              <input type="number" id="processo-aluno-input" class="form-input" placeholder="Digite o número do aluno..." style="flex: 1;">
              <button class="btn btn--secondary" id="btn-buscar-aluno">
                ${icons.search} Buscar
              </button>
            </div>
          </div>
          <div id="processo-aluno-info" style="display: none; margin-bottom: var(--space-4); padding: var(--space-3); background: var(--bg-secondary); border-radius: var(--radius-md);">
            <strong id="processo-aluno-nome"></strong>
            <span id="processo-aluno-turma" style="color: var(--text-secondary); margin-left: var(--space-2);"></span>
          </div>
          <div id="processo-fos-container" class="fos-checklist" style="display: none;">
            <label>Selecione os Fatos Observados:</label>
            <div id="processo-fos-list"></div>
          </div>
          <div id="processo-termos-container" style="display: none; margin-top: var(--space-4);">
            <label style="font-weight: var(--font-weight-semibold); display: block; margin-bottom: var(--space-2);">Termos de Ciência Anexados:</label>
            <div id="processo-termos-list"></div>
          </div>
        </div>
        <div class="processo-modal__footer">
          <button class="btn btn--ghost" data-close="processo-modal">Cancelar</button>
          <button class="btn btn--primary" id="btn-processo-generate" disabled>Gerar PDF</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalsContainer);

  // Setup modal close buttons
  modalsContainer.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close).classList.remove('active');
    });
  });
  modalsContainer.querySelectorAll('.processo-modal__overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      e.target.closest('.processo-modal').classList.remove('active');
    });
  });

  // Data storage
  let allStudents = [];
  let studentFOs = {};
  let studentTermos = {};
  let studentOutrosDocs = {};
  let selectedFile = null;
  let currentUploadStudent = null;
  let currentUploadType = 'termo'; // 'termo' or 'outros'

  try {
    // Load students with FOs
    const fosQuery = query(
      collection(db, 'fatosObservados'),
      where('status', '!=', 'pendente')
    );
    const fosSnapshot = await getDocs(fosQuery);

    // Group FOs by student
    fosSnapshot.docs.forEach(doc => {
      const fo = { id: doc.id, ...doc.data() };
      const studentNumber = fo.studentNumbers?.[0];
      if (studentNumber) {
        if (!studentFOs[studentNumber]) {
          studentFOs[studentNumber] = [];
        }
        studentFOs[studentNumber].push(fo);
      }
    });

    // Get unique student numbers
    const studentNumbers = Object.keys(studentFOs).map(n => parseInt(n));

    // Load student data
    if (studentNumbers.length > 0) {
      // Load in batches of 30
      for (let i = 0; i < studentNumbers.length; i += 30) {
        const batch = studentNumbers.slice(i, i + 30);
        const studentsQuery = query(
          collection(db, 'students'),
          where('numero', 'in', batch)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        studentsSnapshot.docs.forEach(doc => {
          allStudents.push({ id: doc.id, ...doc.data() });
        });
      }
    }

    // Load termos metadata
    const termosQuery = query(collection(db, 'termosCiencia'));
    const termosSnapshot = await getDocs(termosQuery);
    termosSnapshot.docs.forEach(doc => {
      const termo = { id: doc.id, ...doc.data() };
      if (!studentTermos[termo.studentNumber]) {
        studentTermos[termo.studentNumber] = [];
      }
      studentTermos[termo.studentNumber].push(termo);
    });

    // Load outros documentos
    const outrosQuery = query(collection(db, 'outrosDocumentos'));
    const outrosSnapshot = await getDocs(outrosQuery);
    outrosSnapshot.docs.forEach(doc => {
      const outro = { id: doc.id, ...doc.data() };
      if (!studentOutrosDocs[outro.studentNumber]) {
        studentOutrosDocs[outro.studentNumber] = [];
      }
      studentOutrosDocs[outro.studentNumber].push(outro);
    });

    // Hide loading
    container.querySelector('.page-loading').style.display = 'none';

    // Sort students by turma
    allStudents.sort((a, b) => {
      const turmaA = a.turma || '';
      const turmaB = b.turma || '';
      return turmaA.localeCompare(turmaB) || a.numero - b.numero;
    });

    // Render students
    renderStudentsList(allStudents);

    // Setup search
    const searchInput = container.querySelector('#search-aluno');
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const term = searchInput.value.toLowerCase();
        const filtered = allStudents.filter(s =>
          String(s.numero).includes(term) ||
          s.nome?.toLowerCase().includes(term)
        );
        renderStudentsList(filtered);
      }, 300);
    });

    // Setup Gerar Processo button
    container.querySelector('#btn-gerar-processo').addEventListener('click', () => {
      openProcessoModal();
    });

    // Setup file inputs
    setupFileInputs();

  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    container.querySelector('.page-loading').innerHTML = `
      <p style="color: var(--color-danger-500);">Erro ao carregar: ${error.message}</p>
    `;
  }

  // --- Helper Functions ---

  function renderStudentsList(students) {
    const listContainer = container.querySelector('#students-list');
    const emptyState = container.querySelector('#empty-state');

    if (students.length === 0) {
      listContainer.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    listContainer.style.display = 'block';

    // Group students by turma
    const byTurma = {};
    students.forEach(student => {
      const turma = student.turma || 'Sem Turma';
      if (!byTurma[turma]) {
        byTurma[turma] = [];
      }
      byTurma[turma].push(student);
    });

    // Sort turmas
    const sortedTurmas = Object.keys(byTurma).sort();

    listContainer.innerHTML = sortedTurmas.map(turma => {
      const turmaStudents = byTurma[turma];
      const totalFOs = turmaStudents.reduce((acc, s) => acc + (studentFOs[s.numero]?.length || 0), 0);
      const totalTermos = turmaStudents.reduce((acc, s) => acc + (studentTermos[s.numero]?.length || 0), 0);

      return `
        <div class="turma-section" data-turma="${turma}">
          <div class="turma-header" onclick="toggleTurmaSection('${turma}')">
            <div class="turma-header__info">
              <span class="turma-header__chevron">${icons.chevronRight}</span>
              <h3 class="turma-header__title">Turma ${turma}</h3>
              <span class="badge badge--primary">${turmaStudents.length} aluno${turmaStudents.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="turma-header__stats">
              <span class="turma-stat">${totalFOs} FOs</span>
              <span class="turma-stat">${totalTermos} Termos</span>
            </div>
          </div>
          <div class="turma-content" style="display: none;">
            <div class="students-grid">
              ${turmaStudents.map(student => {
        const fos = studentFOs[student.numero] || [];
        const termos = studentTermos[student.numero] || [];
        const outrosDocs = studentOutrosDocs[student.numero] || [];

        return `
                  <div class="student-card" data-numero="${student.numero}">
                    <div class="student-card__header">
                      <div class="student-card__number">${student.numero}</div>
                      <div class="student-card__info">
                        <div class="student-card__name">${student.nome || '-'}</div>
                        <div class="student-card__turma">Turma ${student.turma || '-'}</div>
                      </div>
                    </div>
                    
                    <div class="student-card__stats">
                      <div class="stat">
                        <span class="stat-value">${fos.length}</span>
                        <span class="stat-label">FOs</span>
                      </div>
                      <div class="stat ${termos.length > 0 ? 'stat--clickable' : ''}" ${termos.length > 0 ? `data-action="view-termos" data-numero="${student.numero}"` : ''}>
                        <span class="stat-value">${termos.length}</span>
                        <span class="stat-label">Termos</span>
                      </div>
                      <div class="stat ${outrosDocs.length > 0 ? 'stat--clickable' : ''}" ${outrosDocs.length > 0 ? `data-action="view-outros" data-numero="${student.numero}"` : ''}>
                        <span class="stat-value">${outrosDocs.length}</span>
                        <span class="stat-label">Outros Doc</span>
                      </div>
                    </div>
                    
                    ${termos.length > 0 || outrosDocs.length > 0 ? `
                      <div class="student-card__docs">
                        ${termos.length > 0 ? `
                          <div class="docs-section">
                            <span class="docs-section__label">Termos:</span>
                            <div class="docs-links">
                              ${termos.slice(0, 3).map((t, idx) => `
                                <a href="${t.fileUrl}" target="_blank" class="doc-link doc-link--termo" title="Termo ${idx + 1} - ${t.uploadedAt ? t.uploadedAt.split('T')[0] : ''}">
                                  ${icons.document} ${idx + 1}
                                </a>
                              `).join('')}
                              ${termos.length > 3 ? `<span class="docs-more" data-action="view-termos" data-numero="${student.numero}">+${termos.length - 3}</span>` : ''}
                            </div>
                          </div>
                        ` : ''}
                        ${outrosDocs.length > 0 ? `
                          <div class="docs-section">
                            <span class="docs-section__label">Outros:</span>
                            <div class="docs-links">
                              ${outrosDocs.slice(0, 3).map((d, idx) => `
                                <a href="${d.fileUrl}" target="_blank" class="doc-link doc-link--outro" title="Doc ${idx + 1} - ${d.uploadedAt ? d.uploadedAt.split('T')[0] : ''}">
                                  ${icons.document} ${idx + 1}
                                </a>
                              `).join('')}
                              ${outrosDocs.length > 3 ? `<span class="docs-more" data-action="view-outros" data-numero="${student.numero}">+${outrosDocs.length - 3}</span>` : ''}
                            </div>
                          </div>
                        ` : ''}
                      </div>
                    ` : ''}
                    
                    <div class="student-card__actions">
                      <button class="btn btn--secondary btn--sm btn-upload" data-numero="${student.numero}" data-nome="${student.nome}">
                        ${icons.upload} Upload Termo
                      </button>
                      <button class="btn btn--ghost btn--sm btn-upload-outros" data-numero="${student.numero}" data-nome="${student.nome}">
                        ${icons.upload} Upload outros
                      </button>
                    </div>
                  </div>
                `;
      }).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Setup upload buttons
    listContainer.querySelectorAll('.btn-upload').forEach(btn => {
      btn.addEventListener('click', () => {
        currentUploadStudent = {
          numero: btn.dataset.numero,
          nome: btn.dataset.nome
        };
        currentUploadType = 'termo';
        openUploadModal();
      });
    });

    // Setup outros upload buttons
    listContainer.querySelectorAll('.btn-upload-outros').forEach(btn => {
      btn.addEventListener('click', () => {
        currentUploadStudent = {
          numero: btn.dataset.numero,
          nome: btn.dataset.nome
        };
        currentUploadType = 'outros';
        openUploadModal();
      });
    });
  }

  function openUploadModal() {
    const modal = document.getElementById('upload-modal');
    const studentInfo = document.getElementById('upload-modal-student');
    const modalTitle = modal.querySelector('.processo-modal__header h3');

    // Update modal title based on type
    if (modalTitle) {
      modalTitle.textContent = currentUploadType === 'outros'
        ? 'Upload de Outro Documento'
        : 'Upload de Termo de Ciência';
    }

    studentInfo.textContent = `Aluno: ${currentUploadStudent.numero} - ${currentUploadStudent.nome}`;

    // Reset
    selectedFile = null;
    document.getElementById('upload-preview').innerHTML = '';
    document.getElementById('btn-upload-confirm').disabled = true;

    modal.classList.add('active');
  }

  function setupFileInputs() {
    const fileInput = document.getElementById('file-input');
    const cameraInput = document.getElementById('camera-input');
    const preview = document.getElementById('upload-preview');
    const confirmBtn = document.getElementById('btn-upload-confirm');

    [fileInput, cameraInput].forEach(input => {
      input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          selectedFile = file;

          // Show preview
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              preview.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
          } else {
            preview.innerHTML = `<div class="file-preview">${icons.document} ${file.name}</div>`;
          }

          confirmBtn.disabled = false;
        }
      });
    });

    // Note: Os labels já disparam automaticamente o clique no input interno
    // Não é necessário adicionar event listeners extras nos .upload-option

    // Upload confirmation
    confirmBtn.addEventListener('click', uploadTermo);
  }

  async function uploadTermo() {
    if (!selectedFile || !currentUploadStudent) return;

    const confirmBtn = document.getElementById('btn-upload-confirm');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner"></span> Enviando...';

    try {
      const storage = getStorage();
      const timestamp = Date.now();

      // Determine folder and collection based on upload type
      const isOutros = currentUploadType === 'outros';
      const folder = isOutros ? 'outros-documentos' : 'termos-ciencia';
      const collectionName = isOutros ? 'outrosDocumentos' : 'termosCiencia';
      const prefix = isOutros ? 'doc' : 'termo';

      const filename = `${folder}/${currentUploadStudent.numero}/${prefix}_${timestamp}.${selectedFile.name.split('.').pop()}`;
      const storageRef = ref(storage, filename);

      // Upload file
      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Save metadata to Firestore
      const docData = {
        studentNumber: currentUploadStudent.numero,
        fileName: selectedFile.name,
        fileUrl: downloadURL,
        uploadedAt: new Date().toISOString(),
        uploadedBy: session?.company || 'unknown'
      };

      const docRef = await addDoc(collection(db, collectionName), docData);

      // Audit Log
      await logAction('create', collectionName, docRef.id, null, docData);

      // Update local cache
      const cacheObj = isOutros ? studentOutrosDocs : studentTermos;
      if (!cacheObj[currentUploadStudent.numero]) {
        cacheObj[currentUploadStudent.numero] = [];
      }
      cacheObj[currentUploadStudent.numero].push({
        fileUrl: downloadURL,
        uploadedAt: new Date().toISOString()
      });

      const successMessage = isOutros ? 'Documento enviado com sucesso!' : 'Termo enviado com sucesso!';
      showToast(successMessage, 'success');
      document.getElementById('upload-modal').classList.remove('active');

      // Re-render
      renderStudentsList(allStudents);

    } catch (error) {
      console.error('Erro ao enviar documento:', error);
      showToast('Erro ao enviar: ' + error.message, 'error');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = 'Enviar Documento';
    }
  }

  function openProcessoModal() {
    const modal = document.getElementById('processo-modal');
    const searchInput = document.getElementById('processo-aluno-input');
    const searchBtn = document.getElementById('btn-buscar-aluno');

    // Reset
    searchInput.value = '';
    document.getElementById('processo-aluno-info').style.display = 'none';
    document.getElementById('processo-fos-container').style.display = 'none';
    document.getElementById('processo-termos-container').style.display = 'none';
    document.getElementById('btn-processo-generate').disabled = true;

    // Setup search button
    searchBtn.onclick = async () => {
      const numero = parseInt(searchInput.value);
      if (!numero) {
        showToast('Digite um número de aluno válido', 'warning');
        return;
      }

      searchBtn.disabled = true;
      searchBtn.innerHTML = '<span class="spinner spinner--sm"></span>';

      try {
        // Search for student in database
        const studentsQuery = query(
          collection(db, 'students'),
          where('numero', '==', numero)
        );
        const studentsSnapshot = await getDocs(studentsQuery);

        if (studentsSnapshot.empty) {
          showToast('Aluno não encontrado', 'warning');
          return;
        }

        const student = { id: studentsSnapshot.docs[0].id, ...studentsSnapshot.docs[0].data() };

        // Show student info
        document.getElementById('processo-aluno-nome').textContent = `${student.numero} - ${student.nome}`;
        document.getElementById('processo-aluno-turma').textContent = `Turma ${student.turma || '-'}`;
        document.getElementById('processo-aluno-info').style.display = 'block';

        // Load FOs for this student
        const fosQuery = query(
          collection(db, 'fatosObservados'),
          where('studentNumbers', 'array-contains', numero)
        );
        const fosSnapshot = await getDocs(fosQuery);
        const fos = fosSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Store in cache
        studentFOs[numero] = fos;
        if (!allStudents.find(s => s.numero === numero)) {
          allStudents.push(student);
        }

        // Load termos
        const termosQuery = query(
          collection(db, 'termosCiencia'),
          where('studentNumber', '==', String(numero))
        );
        const termosSnapshot = await getDocs(termosQuery);
        const termos = termosSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        studentTermos[numero] = termos;

        // Load FOs list
        loadStudentFOsForProcesso(numero, fos, termos);

      } catch (error) {
        console.error('Erro ao buscar aluno:', error);
        showToast('Erro ao buscar: ' + error.message, 'error');
      } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = `${icons.search} Buscar`;
      }
    };

    // Allow Enter key to search
    searchInput.onkeypress = (e) => {
      if (e.key === 'Enter') searchBtn.click();
    };

    modal.classList.add('active');
  }

  function loadStudentFOsForProcesso(studentNumber, fos, termos) {
    const fosContainer = document.getElementById('processo-fos-container');
    const fosList = document.getElementById('processo-fos-list');
    const termosContainer = document.getElementById('processo-termos-container');
    const termosList = document.getElementById('processo-termos-list');

    // FOs List
    if (!fos || fos.length === 0) {
      fosList.innerHTML = '<p style="color: var(--text-tertiary);">Nenhum FO encontrado para este aluno.</p>';
    } else {
      fosList.innerHTML = fos.map(fo => `
        <label class="fo-checkbox">
          <input type="checkbox" name="fo" value="${fo.id}" checked>
          <span>
            <strong>FO ${fo.numeroFO || fo.id.substring(0, 6)}</strong> - 
            ${formatDate(fo.dataFato)} - 
            ${fo.sancaoDisciplinar || 'Sem sanção'}
            ${fo.emailEnviadoEm ? `<span style="color: var(--color-success-600); font-size: 11px;"> ✓ Email enviado</span>` : ''}
          </span>
        </label>
      `).join('');
    }
    fosContainer.style.display = 'block';

    // Termos List
    if (termos && termos.length > 0) {
      termosList.innerHTML = termos.map((t, i) => `
        <div style="padding: var(--space-2); background: var(--bg-primary); border: 1px solid var(--border-light); border-radius: var(--radius-sm); margin-bottom: var(--space-2); display: flex; justify-content: space-between; align-items: center;">
          <span>Termo ${i + 1} - ${formatDate(t.uploadedAt)}</span>
          <a href="${t.fileUrl}" target="_blank" class="btn btn--ghost btn--sm">${icons.eye} Ver</a>
        </div>
      `).join('');
      termosContainer.style.display = 'block';
    } else {
      termosContainer.style.display = 'none';
    }

    document.getElementById('btn-processo-generate').disabled = fos.length === 0;
    document.getElementById('btn-processo-generate').onclick = () => generateProcesso(studentNumber);
  }

  async function generateProcesso(studentNumber) {
    const generateBtn = document.getElementById('btn-processo-generate');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner"></span> Gerando...';

    try {
      // Get selected FOs
      const selectedFOIds = [...document.querySelectorAll('#processo-fos-list input[type="checkbox"]:checked')]
        .map(cb => cb.value);

      const fos = (studentFOs[studentNumber] || []).filter(fo => selectedFOIds.includes(fo.id));
      const student = allStudents.find(s => s.numero === studentNumber);
      const termos = studentTermos[studentNumber] || [];

      // Generate PDF
      await generateProcessoPDF(student, fos, termos, session);

      showToast('Processo gerado com sucesso!', 'success');
      document.getElementById('processo-modal').classList.remove('active');

    } catch (error) {
      console.error('Erro ao gerar processo:', error);
      showToast('Erro ao gerar: ' + error.message, 'error');
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = 'Gerar PDF';
    }
  }
}

/**
 * Generate Processo Disciplinar PDF
 */
async function generateProcessoPDF(student, fos, termos, session) {
  const now = new Date();
  const formattedDate = formatDate(now.toISOString().split('T')[0]);
  const comandante = session?.nome || 'Comandante de Companhia';
  const posto = session?.posto || 'Cap';
  const companhia = session?.company ? COMPANY_NAMES[session.company] : '2ª Companhia de Alunos';

  // Build HTML content
  const fosHtml = fos.map(fo => `
    <div class="fo-section">
      <h3>Fato Observado Nº ${fo.numeroFO || fo.id.substring(0, 8)}</h3>
      <table class="info-table">
        <tr><td><strong>Data do Fato:</strong></td><td>${formatDate(fo.dataFato)}</td></tr>
        <tr><td><strong>Observador:</strong></td><td>${fo.nomeObservador || '-'}</td></tr>
        <tr><td><strong>Descrição:</strong></td><td>${fo.descricao || '-'}</td></tr>
        <tr><td><strong>Enquadramento:</strong></td><td>${fo.enquadramento || '-'}</td></tr>
        <tr><td><strong>Sanção Aplicada:</strong></td><td>${fo.sancaoDisciplinar || '-'}</td></tr>
        ${fo.quantidadeDias ? `<tr><td><strong>Dias:</strong></td><td>${fo.quantidadeDias}</td></tr>` : ''}
        ${fo.datasCumprimento ? `<tr><td><strong>Datas Cumprimento:</strong></td><td>${Array.isArray(fo.datasCumprimento) ? fo.datasCumprimento.map(d => formatDate(d)).join(', ') : fo.datasCumprimento}</td></tr>` : ''}
      </table>
      
      ${fo.emailEnviadoEm ? `
        <div class="email-info">
          <h4>📧 Comunicação ao Responsável</h4>
          <table class="info-table">
            <tr><td><strong>E-mail Enviado em:</strong></td><td>${formatDate(fo.emailEnviadoEm)} às ${new Date(fo.emailEnviadoEm).toLocaleTimeString('pt-BR')}</td></tr>
            ${fo.emailDestinatario ? `<tr><td><strong>Destinatário:</strong></td><td>${fo.emailDestinatario}</td></tr>` : ''}
            <tr><td><strong>Status:</strong></td><td style="color: green;">✓ Enviado com sucesso</td></tr>
          </table>
        </div>
      ` : '<p class="no-email"><em>E-mail de comunicação não enviado.</em></p>'}
      
      ${fo.dataAdtBI ? `
        <div class="nota-info">
          <h4>📋 Nota para Aditamento</h4>
          <table class="info-table">
            <tr><td><strong>Data Adt BI:</strong></td><td>${formatDate(fo.dataAdtBI)}</td></tr>
            ${fo.numeroAdtBI ? `<tr><td><strong>Número Adt BI:</strong></td><td>${fo.numeroAdtBI}</td></tr>` : ''}
          </table>
        </div>
      ` : '<p class="no-nota"><em>Nota para Aditamento não gerada.</em></p>'}
    </div>
  `).join('<hr class="section-divider">');

  const termosHtml = termos.length > 0 ? termos.map((t, i) => `
    <div class="termo-section">
      <h4>Termo de Ciência ${i + 1}</h4>
      <p>Anexado em: ${formatDate(t.uploadedAt)}</p>
      <p><a href="${t.fileUrl}" target="_blank">Ver documento</a></p>
    </div>
  `).join('') : '<p class="no-termos">Nenhum termo de ciência anexado.</p>';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Processo Disciplinar - ${student.numero}</title>
      <style>
        @page { size: A4; margin: 2cm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { font-size: 14pt; margin-bottom: 5px; }
        .student-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .student-info h2 { font-size: 14pt; margin-bottom: 10px; }
        .info-table { width: 100%; border-collapse: collapse; }
        .info-table td { padding: 5px 10px; border: 1px solid #ddd; }
        .fo-section { margin: 20px 0; page-break-inside: avoid; }
        .fo-section h3 { font-size: 13pt; margin-bottom: 10px; color: #333; }
        .section-divider { border: none; border-top: 1px dashed #999; margin: 20px 0; }
        .termos-section { margin-top: 30px; }
        .termos-section h3 { margin-bottom: 15px; }
        .termo-section { padding: 10px; background: #f9f9f9; margin-bottom: 10px; }
        .no-termos { color: #999; font-style: italic; }
        .signature-section { margin-top: 50px; border-top: 2px solid #000; padding-top: 20px; }
        .signature-box { text-align: center; margin-top: 50px; }
        .signature-line { width: 300px; border-top: 1px solid #000; margin: 60px auto 10px; }
        .electronic-signature { background: #f0f0f0; padding: 15px; border: 1px solid #ddd; margin-top: 30px; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>MINISTÉRIO DA DEFESA – EXÉRCITO BRASILEIRO</h1>
        <h1>COLÉGIO MILITAR DE BRASÍLIA</h1>
        <h1>${companhia}</h1>
        <h1>PROCESSO DISCIPLINAR</h1>
      </div>
      
      <div class="student-info">
        <h2>Dados do Aluno</h2>
        <table class="info-table">
          <tr><td><strong>Número:</strong></td><td>${student.numero}</td></tr>
          <tr><td><strong>Nome:</strong></td><td>${student.nome}</td></tr>
          <tr><td><strong>Turma:</strong></td><td>${student.turma}</td></tr>
        </table>
      </div>
      
      <h2>Fatos Observados</h2>
      ${fosHtml}
      
      <div class="termos-section">
        <h3>Termos de Ciência</h3>
        ${termosHtml}
      </div>
      
      <div class="signature-section">
        <div class="electronic-signature">
          <strong>Assinatura Eletrônica</strong><br>
          Documento gerado em: ${formattedDate} às ${now.toLocaleTimeString('pt-BR')}<br>
          Responsável: ${posto} ${comandante}<br>
          Unidade: ${companhia}
        </div>
        
        <div class="signature-box">
          <div class="signature-line"></div>
          <p><strong>${posto} ${comandante}</strong></p>
          <p>Comandante da ${companhia}</p>
        </div>
      </div>
      
      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

// Global function to toggle turma sections
window.toggleTurmaSection = function (turma) {
  const section = document.querySelector(`.turma-section[data-turma="${turma}"]`);
  if (!section) return;

  const content = section.querySelector('.turma-content');
  const chevron = section.querySelector('.turma-header__chevron');

  if (content.style.display === 'none') {
    content.style.display = 'block';
    if (chevron) chevron.style.transform = 'rotate(90deg)';
  } else {
    content.style.display = 'none';
    if (chevron) chevron.style.transform = '';
  }
};

// Styles
const processoStyles = `
.page-header__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.search-bar {
  margin-bottom: var(--space-4);
}

/* Turma Section Styles */
.turma-section {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
  overflow: hidden;
}

.turma-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: var(--bg-secondary);
  cursor: pointer;
  user-select: none;
}

.turma-header:hover {
  background: var(--bg-tertiary);
}

.turma-header__info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.turma-header__chevron {
  transition: transform 0.2s;
  color: var(--text-tertiary);
}

.turma-header__chevron svg {
  width: 20px;
  height: 20px;
}

.turma-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.turma-header__stats {
  display: flex;
  gap: var(--space-4);
}

.turma-stat {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.turma-content {
  padding: var(--space-4);
}

.students-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.student-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: all var(--transition-fast);
}

.student-card:hover {
  box-shadow: var(--shadow-md);
}

.student-card__header {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.student-card__number {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-600);
  min-width: 60px;
}

.student-card__name {
  font-weight: var(--font-weight-semibold);
}

.student-card__turma {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.student-card__stats {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.student-card__termos {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.termo-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--color-primary-100);
  color: var(--color-primary-600);
  border-radius: var(--radius-sm);
}

.termo-link svg { width: 16px; height: 16px; }

.termo-more {
  display: flex;
  align-items: center;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

/* Clickable stats */
.stat--clickable {
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.stat--clickable:hover {
  background: var(--bg-primary);
}

/* Documents section */
.student-card__docs {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  padding: var(--space-2);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.docs-section {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.docs-section__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  min-width: 50px;
}

.docs-links {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  align-items: center;
}

.doc-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-sm);
  text-decoration: none;
  transition: all 0.2s;
}

.doc-link svg {
  width: 12px;
  height: 12px;
}

.doc-link--termo {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
}

.doc-link--termo:hover {
  background: var(--color-primary-200);
}

.doc-link--outro {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

.doc-link--outro:hover {
  background: var(--color-success-200);
}

.docs-more {
  font-size: var(--font-size-xs);
  color: var(--color-primary-600);
  cursor: pointer;
  padding: var(--space-1);
}

.docs-more:hover {
  text-decoration: underline;
}

.student-card__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

/* Modal - rendered outside container to avoid overflow issues */
.processo-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.processo-modal.active { display: flex; }

.processo-modal__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
}

.processo-modal__content {
  position: relative;
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.processo-modal__content--lg { max-width: 700px; }

.processo-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;
}

.processo-modal__header h3 { margin: 0; font-size: 18px; }

.processo-modal__close {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #666;
  line-height: 1;
}

.processo-modal__close:hover { color: #000; }

.processo-modal__body { padding: 20px; }

.processo-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #e5e5e5;
}

/* Upload */
.upload-options {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.upload-option {
  flex: 1;
  cursor: pointer;
}

.upload-option__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 2px dashed var(--border-light);
  border-radius: var(--radius-md);
  text-align: center;
  transition: all var(--transition-fast);
}

.upload-option__btn:hover {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}

.upload-option__btn--camera {
  border-color: var(--color-success-300);
}

.upload-option__btn--camera:hover {
  border-color: var(--color-success-500);
  background: var(--color-success-50);
}

.upload-preview {
  max-height: 200px;
  overflow: hidden;
  border-radius: var(--radius-md);
}

.upload-preview img {
  width: 100%;
  height: auto;
  object-fit: contain;
}

.file-preview {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

/* FOs Checklist */
.fos-checklist {
  margin-top: var(--space-4);
}

.fos-checklist label:first-child {
  display: block;
  margin-bottom: var(--space-2);
  font-weight: var(--font-weight-semibold);
}

.fo-checkbox {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2);
  border-bottom: 1px solid var(--border-light);
}

.fo-checkbox input {
  margin-top: 4px;
}

.empty-state {
  text-align: center;
  padding: var(--space-8);
  color: var(--text-tertiary);
}

.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-8);
  color: var(--text-secondary);
}
`;
