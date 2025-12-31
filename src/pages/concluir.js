// Concluir Page - FOs pending conclusion
// Gestão Centralizada FO - CMB

import { db } from '../firebase/config.js';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { renderExpandableCard, setupAutocomplete, expandableCardStyles } from '../components/expandableCard.js';
import { icons } from '../utils/icons.js';
import { FO_STATUS, formatDate } from '../constants/index.js';
import { showToast } from '../utils/toast.js';
import { isAdmin } from '../firebase/auth.js';

/**
 * Render the Concluir page
 */
export async function renderConcluirPage(container) {
  const userIsAdmin = isAdmin();

  // Inject styles
  if (!document.getElementById('concluir-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'concluir-styles';
    styleEl.textContent = expandableCardStyles + concluirStyles;
    document.head.appendChild(styleEl);
  }

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Concluir</h1>
      <p class="page-subtitle">FOs com medidas disciplinares consolidadas aguardando conclusão</p>
    </div>
    
    <div class="page-loading">
      <span class="spinner"></span> Carregando...
    </div>
    
    <div id="fo-list" class="fo-list" style="display: none;"></div>
    <div id="empty-state" class="empty-state" style="display: none;">
      <p>Nenhum FO aguardando conclusão.</p>
    </div>
  `;

  try {
    // Query FOs with status concluir
    const q = query(
      collection(db, 'fatosObservados'),
      where('status', '==', FO_STATUS.CONCLUIR),
      orderBy('dataFato', 'desc')
    );

    const snapshot = await getDocs(q);
    let fos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
    renderFOList();

    function renderFOList() {
      const listContainer = container.querySelector('#fo-list');
      const emptyState = container.querySelector('#empty-state');

      if (fos.length === 0) {
        listContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
      }

      emptyState.style.display = 'none';
      listContainer.style.display = 'block';

      listContainer.innerHTML = fos.map(fo => {
        const studentData = studentDataCache[fo.studentNumbers?.[0]] || {};
        // Pass options: readOnly for non-admin, showDelete only for admin, showReturn with previous status
        const cardOptions = {
          readOnly: !userIsAdmin,
          showDelete: userIsAdmin,
          showReturn: true,
          onReturnStatus: FO_STATUS.CONSOLIDAR
        };
        const cardHtml = renderExpandableCard(fo, studentData, false, cardOptions);

        return `
          <div class="concluir-card-wrapper" data-fo-id="${fo.id}">
            ${cardHtml}
            <div class="concluir-action-bar">
              <div class="concluir-info">
                <span class="badge badge--success">Comportamento atualizado</span>
                ${fo.variacaoComportamento ? `<span class="variacao">(${fo.variacaoComportamento > 0 ? '+' : ''}${fo.variacaoComportamento.toFixed(1)})</span>` : ''}
              </div>
              <button class="btn btn--primary btn--action" data-action="concluir" data-fo-id="${fo.id}">
                ${icons.check} Concluído
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Setup autocomplete
      setupAutocomplete();

      // Setup concluir buttons
      container.querySelectorAll('[data-action="concluir"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const foId = btn.dataset.foId;

          const confirmMessage = `Deseja marcar este FO como concluído?\n\nO FO será movido para Encerrados.`;
          if (!confirm(confirmMessage)) return;

          try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Movendo...';

            // Update FO status
            await updateDoc(doc(db, 'fatosObservados', foId), {
              status: FO_STATUS.ENCERRADO,
              concluidoEm: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });

            showToast('FO concluído e movido para Encerrados', 'success');

            // Remove from list and re-render
            fos = fos.filter(f => f.id !== foId);
            renderFOList();

          } catch (error) {
            console.error('Erro ao concluir FO:', error);
            showToast('Erro ao concluir FO: ' + error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = `${icons.check} Concluído`;
          }
        });
      });

      // Setup return buttons (back to Consolidar)
      container.querySelectorAll('[data-action="return"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const card = btn.closest('.expandable-card');
          const foId = card?.dataset.foId;
          if (!foId) return;

          if (!confirm('Deseja retornar este FO para a etapa anterior (Consolidar)?')) return;

          try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Retornando...';

            await updateDoc(doc(db, 'fatosObservados', foId), {
              status: FO_STATUS.CONSOLIDAR,
              updatedAt: new Date().toISOString()
            });

            showToast('FO retornado para Consolidar', 'success');
            fos = fos.filter(f => f.id !== foId);
            renderFOList();

          } catch (error) {
            console.error('Erro ao retornar FO:', error);
            showToast('Erro ao retornar FO', 'error');
            btn.disabled = false;
          }
        });
      });

      // Setup delete buttons (admin only)
      container.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const card = btn.closest('.expandable-card');
          const foId = card?.dataset.foId;
          if (!foId) return;

          if (!confirm('⚠️ ATENÇÃO: Esta ação é irreversível!\n\nDeseja realmente EXCLUIR este FO permanentemente?')) return;

          try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Excluindo...';

            await deleteDoc(doc(db, 'fatosObservados', foId));

            showToast('FO excluído permanentemente', 'success');
            fos = fos.filter(f => f.id !== foId);
            renderFOList();

          } catch (error) {
            console.error('Erro ao excluir FO:', error);
            showToast('Erro ao excluir FO', 'error');
            btn.disabled = false;
          }
        });
      });
    }

  } catch (error) {
    console.error('Erro ao carregar FOs:', error);
    container.querySelector('.page-loading').innerHTML = `
      <p style="color: var(--color-danger-500);">Erro ao carregar: ${error.message}</p>
    `;
  }
}

// Styles
const concluirStyles = `
.concluir-card-wrapper {
  position: relative;
}

.concluir-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  margin-top: -1px;
  margin-bottom: var(--space-4);
}

.concluir-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.variacao {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
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
