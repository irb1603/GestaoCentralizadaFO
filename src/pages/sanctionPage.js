// Sanction Page Template - Pages for each sanction type
// Gestão Centralizada FO - CMB

import { db } from '../firebase/config.js';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { renderExpandableCard, setupAutocomplete, expandableCardStyles } from '../components/expandableCard.js';
import { icons } from '../utils/icons.js';
import { FO_STATUS, FO_STATUS_LABELS, formatDate, getWhatsAppLink } from '../constants/index.js';
import { showToast } from '../utils/toast.js';
import { generateEmailBody } from '../utils/emailTemplates.js';

/**
 * Render a sanction page (Advertência, Repreensão, AOE, Retirada)
 * @param {string} status - FO_STATUS value to filter
 * @param {string} title - Page title
 * @param {string} nextStatus - Status to move to when clicking action button
 * @param {string} actionButtonText - Text for the action button
 * @param {Function} onAction - Optional callback before status change
 */
export async function renderSanctionPage(container, status, title, nextStatus, actionButtonText = 'Incluir Medida Disciplinar', onAction = null) {
  // Inject styles
  if (!document.getElementById('expandable-card-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'expandable-card-styles';
    styleEl.textContent = expandableCardStyles + sanctionPageStyles;
    document.head.appendChild(styleEl);
  }

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${title}</h1>
      <p class="page-subtitle">FOs aguardando inclusão de medida disciplinar</p>
    </div>
    
    <div class="page-loading">
      <span class="spinner"></span> Carregando...
    </div>
    
    <div id="fo-list" class="fo-list" style="display: none;"></div>
    <div id="empty-state" class="empty-state" style="display: none;">
      <p>Nenhum FO encontrado nesta categoria.</p>
    </div>
  `;

  try {
    // Query FOs with specific status
    const q = query(
      collection(db, 'fatosObservados'),
      where('status', '==', status),
      orderBy('dataFato', 'desc')
    );

    const snapshot = await getDocs(q);
    const fos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch student data
    const studentNumbers = [...new Set(fos.flatMap(fo => fo.studentNumbers || []))];
    const studentDataCache = {};

    if (studentNumbers.length > 0) {
      const studentsQuery = query(
        collection(db, 'students'),
        where('numero', 'in', studentNumbers.slice(0, 30))
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      studentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        studentDataCache[data.numero] = data;
      });
    }

    // Hide loading
    container.querySelector('.page-loading').style.display = 'none';

    // Render FOs
    const listContainer = container.querySelector('#fo-list');
    const emptyState = container.querySelector('#empty-state');

    if (fos.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    listContainer.style.display = 'block';
    listContainer.innerHTML = fos.map(fo => {
      const studentData = studentDataCache[fo.studentNumbers?.[0]] || {};
      const cardHtml = renderExpandableCard(fo, studentData, false);

      // Add action button after the card
      return `
        <div class="sanction-card-wrapper" data-fo-id="${fo.id}">
          ${cardHtml}
          <div class="sanction-action-bar">
            <button class="btn btn--primary btn--action" data-action="move-to-next" data-fo-id="${fo.id}">
              ${icons.arrowRight} ${actionButtonText}
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Setup autocomplete
    setupAutocomplete();

    // Setup WhatsApp buttons to show email content
    container.querySelectorAll('[data-action="send-whatsapp"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.expandable-card');
        const foId = card?.dataset.foId;
        const fo = fos.find(f => f.id === foId);

        if (!fo) return;

        const studentData = studentDataCache[fo.studentNumbers?.[0]] || {};
        const student = {
          numero: fo.studentNumbers?.[0] || '-',
          nome: fo.studentInfo?.[0]?.nome || studentData.nome || '-',
          turma: fo.studentInfo?.[0]?.turma || studentData.turma || '-'
        };
        const company = fo.company || fo.anoEscolar || '2cia';

        // Generate email body as WhatsApp message
        const emailBody = generateEmailBody(fo.sancaoDisciplinar, fo, student, company, { notaAtual: 10.0 });

        // Get phone number
        const phone = fo.telefoneResponsavel || studentData.telefoneResponsavel || '';

        if (!phone) {
          alert('Telefone do responsável não cadastrado.');
          return;
        }

        // Open WhatsApp with email content
        const whatsappUrl = getWhatsAppLink(phone, emailBody);
        window.open(whatsappUrl, '_blank');
      });
    });

    // Setup action buttons
    container.querySelectorAll('[data-action="move-to-next"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const foId = btn.dataset.foId;
        const fo = fos.find(f => f.id === foId);

        const confirmMessage = `Deseja mover este FO para ${FO_STATUS_LABELS[nextStatus]}?`;
        if (!confirm(confirmMessage)) return;

        try {
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner"></span> Movendo...';

          // Call optional callback before status change
          if (onAction) {
            await onAction(fo);
          }

          // Update status
          await updateDoc(doc(db, 'fatosObservados', foId), {
            status: nextStatus,
            movidoEm: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          showToast('FO movido com sucesso', 'success');

          // Remove the card from view
          const wrapper = btn.closest('.sanction-card-wrapper');
          wrapper.style.transition = 'opacity 0.3s, transform 0.3s';
          wrapper.style.opacity = '0';
          wrapper.style.transform = 'translateX(100px)';
          setTimeout(() => wrapper.remove(), 300);

          // Check if list is now empty
          if (container.querySelectorAll('.sanction-card-wrapper').length === 0) {
            listContainer.style.display = 'none';
            emptyState.style.display = 'block';
          }

        } catch (error) {
          console.error('Erro ao mover FO:', error);
          alert('Erro ao mover FO: ' + error.message);
          btn.disabled = false;
          btn.innerHTML = `${icons.arrowRight} ${actionButtonText}`;
        }
      });
    });

  } catch (error) {
    console.error('Erro ao carregar FOs:', error);
    container.querySelector('.page-loading').innerHTML = `
      <p style="color: var(--color-danger-500);">Erro ao carregar: ${error.message}</p>
    `;
  }
}

// Styles for sanction pages
const sanctionPageStyles = `
.sanction-card-wrapper {
  position: relative;
}

.sanction-action-bar {
  display: flex;
  justify-content: flex-end;
  padding: var(--space-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  margin-top: -1px;
  margin-bottom: var(--space-4);
}

.btn--action {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.btn--action svg {
  width: 16px;
  height: 16px;
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

// Export for individual pages
export { sanctionPageStyles };
