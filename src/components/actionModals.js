// Action Modals - Initial Page Actions
// Gestão Centralizada FO - CMB

import { icons } from '../utils/icons.js';
import { generateTermoPDF } from '../utils/pdfGenerator.js';
import { generateEmailBody, getEmailSubject, EMAIL_CONFIGS } from '../utils/emailTemplates.js';
import { emailService } from '../services/emailService.js';
import { add3BusinessDays } from '../constants/ricm.js';
import { formatDate, COMPANY_NAMES, FO_STATUS } from '../constants/index.js';
import { db } from '../firebase/config.js';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { logAction } from '../services/auditLogger.js';

/**
 * Render modal HTML for action buttons
 */
export function renderActionModals() {
  return `
    <!-- Modal: Gerar Termo -->
    <div class="modal-backdrop" id="modal-termo-backdrop"></div>
    <div class="modal" id="modal-termo">
      <div class="modal__header">
        <h3 class="modal__title">Gerar Termo de Ciência</h3>
        <button class="modal__close" data-close="modal-termo">${icons.close}</button>
      </div>
      <div class="modal__body">
        <p style="margin-bottom: var(--space-4);">Selecione a data de registro para gerar os termos:</p>
        <div class="form-group">
          <label class="form-label form-label--required">Data de Registro</label>
          <input type="date" class="form-input" id="termo-data-registro">
        </div>
        <div id="termo-preview" style="margin-top: var(--space-4);"></div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--secondary" data-close="modal-termo">Cancelar</button>
        <button class="btn btn--primary" id="btn-confirmar-termo">Gerar PDFs</button>
      </div>
    </div>
    
    <!-- Modal: Enviar Sanção -->
    <div class="modal-backdrop" id="modal-sancao-backdrop"></div>
    <div class="modal modal--xl" id="modal-sancao">
      <div class="modal__header">
        <h3 class="modal__title">Enviar Sanção por E-mail ao Responsável</h3>
        <button class="modal__close" data-close="modal-sancao">${icons.close}</button>
      </div>
      <div class="modal__body">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
          <p style="margin: 0;">Selecione os FOs que deseja enviar notificação por e-mail:</p>
          <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
            <input type="checkbox" id="sancao-select-all">
            <span style="font-size: var(--font-size-sm);">Selecionar Todos</span>
          </label>
        </div>
        <div id="sancao-list" style="max-height: 350px; overflow-y: auto;"></div>
        <div id="sancao-summary" style="margin-top: var(--space-4); padding: var(--space-3); background: var(--bg-tertiary); border-radius: var(--radius-md); font-size: var(--font-size-sm);">
          <span id="sancao-count">0</span> selecionado(s)
        </div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--secondary" data-close="modal-sancao">Cancelar</button>
        <button class="btn btn--success" id="btn-confirmar-sancao" disabled>
          ${icons.externalLink} Enviar E-mails Selecionados
        </button>
      </div>
    </div>
    
    <!-- Modal: Enviar FO Positivo -->
    <div class="modal-backdrop" id="modal-positivo-backdrop"></div>
    <div class="modal modal--lg" id="modal-positivo">
      <div class="modal__header">
        <h3 class="modal__title">Enviar FO Positivo por E-mail</h3>
        <button class="modal__close" data-close="modal-positivo">${icons.close}</button>
      </div>
      <div class="modal__body">
        <p style="margin-bottom: var(--space-4);">Selecione os FOs positivos e defina se são individuais ou coletivos:</p>
        <div id="positivo-list" style="max-height: 400px; overflow-y: auto;"></div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--secondary" data-close="modal-positivo">Cancelar</button>
        <button class="btn btn--info" id="btn-confirmar-positivo">Enviar Selecionados</button>
      </div>
    </div>
    
    <!-- Modal: Aptos para Julgamento -->
    <div class="modal-backdrop" id="modal-aptos-backdrop"></div>
    <div class="modal modal--lg" id="modal-aptos">
      <div class="modal__header">
        <h3 class="modal__title">Alunos Aptos para Julgamento</h3>
        <button class="modal__close" data-close="modal-aptos">${icons.close}</button>
      </div>
      <div class="modal__body">
        <p style="margin-bottom: var(--space-4);">Alunos com prazo expirado (mais de 3 dias úteis desde o lançamento):</p>
        <div id="aptos-list" style="max-height: 400px; overflow-y: auto;"></div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--secondary" data-close="modal-aptos">Fechar</button>
        <button class="btn btn--warning" id="btn-gerar-aptos-pdf">Gerar PDF</button>
      </div>
    </div>
  `;
}

/**
 * CSS styles for action buttons
 */
export const actionButtonsStyles = `
.action-buttons-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

@media (max-width: 1024px) {
  .action-buttons-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .action-buttons-grid {
    grid-template-columns: 1fr;
  }
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: none;
  border-radius: var(--radius-lg);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: white;
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-btn--primary {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
}

.action-btn--primary:hover {
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700));
}

.action-btn--success {
  background: linear-gradient(135deg, var(--color-success-500), var(--color-success-600));
}

.action-btn--success:hover {
  background: linear-gradient(135deg, var(--color-success-600), var(--color-success-700));
}

.action-btn--info {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.action-btn--info:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

.action-btn--warning {
  background: linear-gradient(135deg, var(--color-warning-500), var(--color-warning-600));
}

.action-btn--warning:hover {
  background: linear-gradient(135deg, var(--color-warning-600), var(--color-warning-700));
}

/* Modal checkbox list */
.modal-checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}

.modal-checkbox-item label {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  cursor: pointer;
  flex: 1;
}

.modal-checkbox-item input[type="checkbox"] {
  margin-top: 2px;
}

.modal-checkbox-item__info {
  flex: 1;
}

.modal-checkbox-item__name {
  font-weight: var(--font-weight-semibold);
}

.modal-checkbox-item__details {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.modal-checkbox-item__tipo {
  display: flex;
  gap: var(--space-2);
}

.modal-checkbox-item__tipo label {
  font-size: var(--font-size-sm);
  cursor: pointer;
}

/* Aptos by turma */
.aptos-turma-group {
  margin-bottom: var(--space-4);
}

.aptos-turma-group__title {
  font-weight: var(--font-weight-bold);
  padding: var(--space-2) var(--space-3);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}

.aptos-aluno-item {
  padding: var(--space-2) var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-1);
  font-size: var(--font-size-sm);
}

/* Sancao list item */
.sancao-item {
  padding: var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 2px solid transparent;
}

.sancao-item:hover {
  background: var(--bg-tertiary);
}

.sancao-item.selected {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}

.sancao-item__name {
  font-weight: var(--font-weight-semibold);
}

.sancao-item__details {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.modal--xl {
  max-width: 900px;
  width: 95%;
}
`;

/**
 * Setup action button event handlers
 * @param {Array} allFOs - All FOs data
 * @param {Object} studentDataCache - Student data cache
 */
export function setupActionButtons(allFOs, studentDataCache) {
  // Setup modal close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.close;
      document.getElementById(modalId).classList.remove('active');
      document.getElementById(`${modalId}-backdrop`).classList.remove('active');
    });
  });

  // Setup backdrop close
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', () => {
      const modalId = backdrop.id.replace('-backdrop', '');
      document.getElementById(modalId).classList.remove('active');
      backdrop.classList.remove('active');
    });
  });

  // Gerar Termo button
  document.getElementById('btn-gerar-termo')?.addEventListener('click', () => {
    openModal('modal-termo');
    document.getElementById('termo-data-registro').value = new Date().toISOString().split('T')[0];
    updateTermoPreview(allFOs, studentDataCache);
  });

  // Termo data change
  document.getElementById('termo-data-registro')?.addEventListener('change', () => {
    updateTermoPreview(allFOs, studentDataCache);
  });

  // Confirmar Termo
  document.getElementById('btn-confirmar-termo')?.addEventListener('click', () => {
    const dataRegistro = document.getElementById('termo-data-registro').value;
    const fosFiltered = allFOs.filter(fo => fo.dataRegistro === dataRegistro);

    if (fosFiltered.length === 0) {
      alert('Nenhum FO encontrado para essa data.');
      return;
    }

    fosFiltered.forEach((fo, index) => {
      const studentData = studentDataCache[fo.studentNumbers?.[0]] || {};
      setTimeout(() => {
        generateTermoPDF(fo, studentData);
      }, index * 500);
    });

    closeModal('modal-termo');
  });

  // Enviar Sanção button
  document.getElementById('btn-enviar-sancao')?.addEventListener('click', () => {
    openModal('modal-sancao');
    updateSancaoList(allFOs, studentDataCache);
  });

  // Confirmar Sanção - send batch via Gmail API
  document.getElementById('btn-confirmar-sancao')?.addEventListener('click', async () => {
    const selectedCheckboxes = document.querySelectorAll('.sancao-checkbox:checked');

    if (selectedCheckboxes.length === 0) {
      alert('Selecione pelo menos uma sanção.');
      return;
    }

    // Confirmation dialog
    const confirmMessage = `Você está prestes a enviar ${selectedCheckboxes.length} e-mail(s) para os responsáveis.\n\nDeseja continuar?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    // Show loading
    const btn = document.getElementById('btn-confirmar-sancao');
    const originalText = btn.innerHTML;
    btn.disabled = true;

    const emailsToSend = [];
    const studentDataCache = window._studentDataCache || {};

    // Prepare emails
    selectedCheckboxes.forEach(checkbox => {
      const index = parseInt(checkbox.dataset.index);
      const fo = window._sancaoFOs[index];
      const cachedStudent = studentDataCache[fo.studentNumbers?.[0]] || {};

      const student = {
        numero: fo.studentNumbers?.[0] || '-',
        nome: fo.studentInfo?.[0]?.nome || cachedStudent.nome || '-',
        turma: fo.studentInfo?.[0]?.turma || cachedStudent.turma || '-'
      };

      const toEmail = fo.emailResponsavel || cachedStudent.emailResponsavel || cachedStudent.email || '';
      const company = fo.company || fo.anoEscolar || '2cia';

      if (toEmail) {
        const emailBody = generateEmailBody(fo.sancaoDisciplinar, fo, student, company, { notaAtual: 10.0 });
        const emailSubject = getEmailSubject(fo.sancaoDisciplinar, student.numero);

        emailsToSend.push({
          company,
          to: toEmail,
          subject: emailSubject,
          body: emailBody,
          foId: fo.id,
          studentName: student.nome,
          sancaoTipo: fo.sancaoDisciplinar,
          tipoFO: fo.tipo // 'positivo' or 'negativo'
        });
      }
    });

    if (emailsToSend.length === 0) {
      alert('Nenhum dos selecionados possui e-mail cadastrado.');
      btn.disabled = false;
      btn.innerHTML = originalText;
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      // Check if email config exists for the company
      const company = emailsToSend[0]?.company || '2cia';
      const isConfigured = await emailService.isConfigured(company);

      if (!isConfigured) {
        throw new Error(`A conta de email para ${company} não está configurada.`);
      }

      // Send emails with progress
      for (let i = 0; i < emailsToSend.length; i++) {
        const email = emailsToSend[i];
        btn.innerHTML = `<span class="spinner"></span> Enviando ${i + 1}/${emailsToSend.length}...`;

        try {
          await emailService.sendEmail({
            company: email.company,
            to: email.to,
            subject: email.subject,
            body: email.body
          });

          // Update FO status after successful send
          const newStatus = getStatusAfterEmail(email.sancaoTipo, email.tipoFO);

          const docRef = doc(db, 'fatosObservados', email.foId);
          const previousDoc = await getDoc(docRef);
          const previousData = previousDoc.exists() ? previousDoc.data() : null;

          const updateData = {
            status: newStatus,
            emailEnviadoEm: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          await updateDoc(docRef, updateData);

          // Audit Log
          if (previousData) {
            await logAction('update', 'fatosObservados', email.foId, previousData, { ...previousData, ...updateData });
          }

          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`${email.studentName}: ${error.message}`);
        }

        // Small delay between emails
        if (i < emailsToSend.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Show result
      let resultMessage = `✅ ${successCount} e-mail(s) enviado(s) com sucesso!`;
      if (errorCount > 0) {
        resultMessage += `\n\n❌ ${errorCount} erro(s):\n${errors.join('\n')}`;
      }
      alert(resultMessage);

      if (successCount > 0) {
        closeModal('modal-sancao');
      }

    } catch (error) {
      console.error('Erro ao enviar emails:', error);
      alert(`❌ Erro: ${error.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });

  // Enviar FO Positivo button
  document.getElementById('btn-enviar-positivo')?.addEventListener('click', () => {
    openModal('modal-positivo');
    updatePositivoList(allFOs);
  });

  // Confirmar Positivo
  document.getElementById('btn-confirmar-positivo')?.addEventListener('click', () => {
    const selected = document.querySelectorAll('#positivo-list input[type="checkbox"]:checked');
    if (selected.length === 0) {
      alert('Selecione pelo menos um FO positivo.');
      return;
    }

    alert(`${selected.length} FO(s) positivo(s) selecionado(s) para envio. Integração de e-mail será implementada.`);
    closeModal('modal-positivo');
  });

  // Aptos para Julgamento button
  document.getElementById('btn-aptos-julgamento')?.addEventListener('click', () => {
    openModal('modal-aptos');
    updateAptosList(allFOs, studentDataCache);
  });

  // Gerar PDF Aptos
  document.getElementById('btn-gerar-aptos-pdf')?.addEventListener('click', () => {
    const aptosData = getAptosData(allFOs, studentDataCache);
    if (Object.keys(aptosData).length === 0) {
      alert('Nenhum aluno apto para julgamento.');
      return;
    }

    generateAptosPDF(aptosData);
    closeModal('modal-aptos');
  });
}

/**
 * Determine the new FO status after email is sent
 * @param {string} sancaoTipo - Type of sanction (JUSTIFICADO, ADVERTENCIA, etc.)
 * @param {string} tipoFO - Type of FO ('positivo' or 'negativo')
 * @returns {string} New status
 */
function getStatusAfterEmail(sancaoTipo, tipoFO) {
  // FO Positivo goes directly to consolidar
  if (tipoFO === 'positivo') {
    return FO_STATUS.CONSOLIDAR;
  }

  // Justificado goes to concluir (not encerrado)
  if (sancaoTipo === 'JUSTIFICADO') {
    return FO_STATUS.CONCLUIR;
  }

  // Map sanção to status
  const sancaoToStatus = {
    'ADVERTENCIA': FO_STATUS.ADVERTENCIA,
    'REPREENSAO': FO_STATUS.REPREENSAO,
    'ATIVIDADE_OE': FO_STATUS.ATIVIDADE_OE,
    'RETIRADA': FO_STATUS.RETIRADA
  };

  return sancaoToStatus[sancaoTipo] || FO_STATUS.PENDENTE;
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
  document.getElementById(`${modalId}-backdrop`).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  document.getElementById(`${modalId}-backdrop`).classList.remove('active');
}

function updateTermoPreview(allFOs, studentDataCache) {
  const dataRegistro = document.getElementById('termo-data-registro').value;
  const preview = document.getElementById('termo-preview');

  const fosFiltered = allFOs.filter(fo => fo.dataRegistro === dataRegistro);

  if (fosFiltered.length === 0) {
    preview.innerHTML = `<p style="color: var(--text-tertiary);">Nenhum FO encontrado para essa data.</p>`;
    return;
  }

  preview.innerHTML = `
    <p style="color: var(--text-secondary); margin-bottom: var(--space-2);">
      <strong>${fosFiltered.length}</strong> FO(s) encontrado(s):
    </p>
    <ul style="font-size: var(--font-size-sm); color: var(--text-secondary);">
      ${fosFiltered.map(fo => {
    const student = fo.studentInfo?.[0] || studentDataCache[fo.studentNumbers?.[0]] || {};
    return `<li>${fo.studentNumbers?.[0]} - ${student.nome || '-'} (${fo.tipo})</li>`;
  }).join('')}
    </ul>
  `;
}

function updateSancaoList(allFOs, studentDataCache = {}) {
  const container = document.getElementById('sancao-list');

  // Include all sanções (including Justificado)
  const fosWithSancao = allFOs.filter(fo => fo.sancaoDisciplinar);

  if (fosWithSancao.length === 0) {
    container.innerHTML = `<p style="color: var(--text-tertiary); text-align: center;">Nenhuma sanção cadastrada.</p>`;
    updateSancaoCount(0);
    return;
  }

  // Store FOs and cache for later use
  window._sancaoFOs = fosWithSancao;
  window._studentDataCache = studentDataCache;

  container.innerHTML = fosWithSancao.map((fo, index) => {
    const cachedStudent = studentDataCache[fo.studentNumbers?.[0]] || {};
    const studentName = fo.studentInfo?.[0]?.nome || cachedStudent.nome || '-';
    const studentEmail = fo.emailResponsavel || cachedStudent.emailResponsavel || cachedStudent.email || '';
    const hasEmail = !!studentEmail;

    return `
    <div class="modal-checkbox-item ${!hasEmail ? 'no-email' : ''}" data-index="${index}" data-id="${fo.id}">
      <label style="display: flex; align-items: flex-start; gap: var(--space-3); cursor: pointer; flex: 1;">
        <input type="checkbox" class="sancao-checkbox" data-index="${index}" ${!hasEmail ? 'disabled' : ''}>
        <div class="modal-checkbox-item__info">
          <div class="modal-checkbox-item__name">${fo.studentNumbers?.[0]} - ${studentName}</div>
          <div class="modal-checkbox-item__details">
            ${fo.sancaoDisciplinar} | ${formatDate(fo.dataFato)}
            ${!hasEmail ? '<span style="color: var(--color-danger-500);"> (Sem e-mail)</span>' : ''}
          </div>
        </div>
      </label>
    </div>
  `;
  }).join('');

  // Setup checkbox change handlers
  container.querySelectorAll('.sancao-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateSancaoCount();
    });
  });

  // Setup select all
  const selectAllCheckbox = document.getElementById('sancao-select-all');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      container.querySelectorAll('.sancao-checkbox:not([disabled])').forEach(cb => {
        cb.checked = isChecked;
      });
      updateSancaoCount();
    });
  }

  updateSancaoCount();
}

function updateSancaoCount() {
  const selectedCount = document.querySelectorAll('.sancao-checkbox:checked').length;
  const countSpan = document.getElementById('sancao-count');
  const confirmBtn = document.getElementById('btn-confirmar-sancao');

  if (countSpan) {
    countSpan.textContent = selectedCount;
  }

  if (confirmBtn) {
    confirmBtn.disabled = selectedCount === 0;
  }
}

function showEmailPreview(fo, previewContainer, studentDataCache = {}) {
  const studentNumber = fo.studentNumbers?.[0];
  const cachedStudent = studentDataCache[studentNumber] || {};

  const student = {
    numero: studentNumber || '-',
    nome: fo.studentInfo?.[0]?.nome || cachedStudent.nome || '-',
    turma: fo.studentInfo?.[0]?.turma || cachedStudent.turma || '-',
    emailResponsavel: fo.emailResponsavel || cachedStudent.emailResponsavel || cachedStudent.email || ''
  };

  const company = fo.company || fo.anoEscolar || '2cia';
  const sancaoTipo = fo.sancaoDisciplinar;

  // Generate email content
  const emailBody = generateEmailBody(sancaoTipo, fo, student, company, { notaAtual: 10.0 });
  const emailSubject = getEmailSubject(sancaoTipo, student.numero);
  const emailConfig = EMAIL_CONFIGS[company] || EMAIL_CONFIGS['2cia'];

  // Store for send button
  window._selectedSancaoEmail = {
    fo,
    student,
    company,
    body: emailBody,
    subject: emailSubject,
    fromEmail: emailConfig.email,
    toEmail: student.emailResponsavel
  };

  previewContainer.innerHTML = `
    <div style="margin-bottom: var(--space-3); padding-bottom: var(--space-3); border-bottom: 1px solid var(--border-light);">
      <strong>De:</strong> ${emailConfig.email}<br>
      <strong>Para:</strong> ${student.emailResponsavel || '<span style="color: var(--color-danger-500);">Sem e-mail cadastrado</span>'}<br>
      <strong>Assunto:</strong> ${emailSubject}
    </div>
    <div style="color: var(--text-primary);">${emailBody}</div>
  `;
}

function updatePositivoList(allFOs) {
  const container = document.getElementById('positivo-list');
  const fosPositivos = allFOs.filter(fo => fo.tipo === 'positivo');

  if (fosPositivos.length === 0) {
    container.innerHTML = `<p style="color: var(--text-tertiary); text-align: center;">Nenhum FO positivo encontrado.</p>`;
    return;
  }

  container.innerHTML = fosPositivos.map(fo => `
    <div class="modal-checkbox-item">
      <label>
        <input type="checkbox" data-id="${fo.id}">
        <div class="modal-checkbox-item__info">
          <div class="modal-checkbox-item__name">${fo.studentNumbers?.[0]} - ${fo.studentInfo?.[0]?.nome || '-'}</div>
          <div class="modal-checkbox-item__details">${fo.descricao?.substring(0, 50) || '-'}...</div>
        </div>
      </label>
      <div class="modal-checkbox-item__tipo">
        <label><input type="radio" name="tipo-${fo.id}" value="individual" checked> Individual</label>
        <label><input type="radio" name="tipo-${fo.id}" value="coletivo"> Coletivo</label>
      </div>
    </div>
  `).join('');
}

function getAptosData(allFOs, studentDataCache) {
  const today = new Date();
  const aptosData = {};

  allFOs.forEach(fo => {
    if (!fo.dataLancamentoSINCOMIL) return;

    const prazoDate = new Date(add3BusinessDays(fo.dataLancamentoSINCOMIL));
    if (today > prazoDate) {
      const turma = fo.studentInfo?.[0]?.turma || 'Sem Turma';
      if (!aptosData[turma]) {
        aptosData[turma] = [];
      }
      aptosData[turma].push({
        numero: fo.studentNumbers?.[0],
        nome: fo.studentInfo?.[0]?.nome || studentDataCache[fo.studentNumbers?.[0]]?.nome || '-',
        dataLancamento: fo.dataLancamentoSINCOMIL,
        prazo: add3BusinessDays(fo.dataLancamentoSINCOMIL)
      });
    }
  });

  return aptosData;
}

function updateAptosList(allFOs, studentDataCache) {
  const container = document.getElementById('aptos-list');
  const aptosData = getAptosData(allFOs, studentDataCache);

  const turmas = Object.keys(aptosData).sort();

  if (turmas.length === 0) {
    container.innerHTML = `<p style="color: var(--text-tertiary); text-align: center;">Nenhum aluno com prazo expirado.</p>`;
    return;
  }

  container.innerHTML = turmas.map(turma => `
    <div class="aptos-turma-group">
      <div class="aptos-turma-group__title">Turma ${turma} (${aptosData[turma].length} aluno(s))</div>
      ${aptosData[turma].map(aluno => `
        <div class="aptos-aluno-item">
          <strong>${aluno.numero}</strong> - ${aluno.nome} 
          <span style="color: var(--text-tertiary);">(Prazo: ${formatDate(aluno.prazo)})</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function generateAptosPDF(aptosData) {
  const turmas = Object.keys(aptosData).sort();
  const ano = new Date().getFullYear();
  const hoje = formatDate(new Date().toISOString().split('T')[0]);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Aptos para Julgamento</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; padding: 20px; }
        h1 { text-align: center; font-size: 14pt; margin-bottom: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .turma { margin-bottom: 20px; }
        .turma-title { font-weight: bold; background: #f0f0f0; padding: 8px; margin-bottom: 10px; }
        .aluno { padding: 5px 10px; border-bottom: 1px solid #eee; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <div class="header">
        <strong>COLÉGIO MILITAR DE BRASÍLIA</strong><br>
        Alunos Aptos para Julgamento<br>
        Data: ${hoje}
      </div>
      
      ${turmas.map(turma => `
        <div class="turma">
          <div class="turma-title">Turma ${turma}</div>
          ${aptosData[turma].map(aluno => `
            <div class="aluno">${aluno.numero} - ${aluno.nome} (Prazo: ${formatDate(aluno.prazo)})</div>
          `).join('')}
        </div>
      `).join('')}
      
      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
