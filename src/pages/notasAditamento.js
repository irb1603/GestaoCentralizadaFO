// Notas para Aditamento - Generate BI documents
// Gestão Centralizada FO - CMB

import { db } from '../firebase/config.js';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { icons } from '../utils/icons.js';
import { FO_STATUS, COMPANY_NAMES, formatDate, USER_ROLES } from '../constants/index.js';
import { generateAdtPDF } from '../utils/pdfGenerator.js';
import { showToast } from '../utils/toast.js';
import { getSession } from '../firebase/auth.js';

/**
 * Render the Notas Aditamento page
 */
export async function renderNotasAditamentoPage(container) {
  const session = getSession();

  // Inject styles
  if (!document.getElementById('notas-adt-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'notas-adt-styles';
    styleEl.textContent = notasAdtStyles;
    document.head.appendChild(styleEl);
  }

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Notas para Aditamento ao BI</h1>
      <p class="page-subtitle">Gerar documentos de sanções por data</p>
    </div>
    
    <div class="page-loading">
      <span class="spinner"></span> Carregando datas...
    </div>
    
    <div id="dates-list" class="dates-list" style="display: none;"></div>
    <div id="empty-state" class="empty-state" style="display: none;">
      <p>Nenhuma data de aditamento encontrada.</p>
      <p class="text-muted">As sanções precisam ter o campo "Data do Adt ao BI" preenchido.</p>
    </div>
  `;

  try {
    // Query FOs with dataAdtBI filled and status encerrado or concluir
    // Filter for sanctions: Repreensão, AOE, Retirada
    const q = query(
      collection(db, 'fatosObservados'),
      where('dataAdtBI', '!=', null)
    );

    const snapshot = await getDocs(q);
    let allFOs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Apply company filter for commanders and sergeants
    const isCompanyUser = [USER_ROLES.COMMANDER, USER_ROLES.SERGEANT].includes(session?.role);
    if (isCompanyUser && session?.company) {
      allFOs = allFOs.filter(fo => fo.company === session.company);
    }

    // Filter for relevant sanctions and statuses
    // Include all stages from sanction pages through encerrado
    const sanctionTypes = ['REPREENSAO', 'ATIVIDADE_OE', 'RETIRADA'];
    const validStatuses = [
      FO_STATUS.REPREENSAO,
      FO_STATUS.ATIVIDADE_OE,
      FO_STATUS.RETIRADA,
      FO_STATUS.CONSOLIDAR,
      FO_STATUS.CONCLUIR,
      FO_STATUS.ENCERRADO
    ];

    const filteredFOs = allFOs.filter(fo =>
      fo.dataAdtBI &&
      sanctionTypes.includes(fo.sancaoDisciplinar) &&
      validStatuses.includes(fo.status)
    );

    // Group by date
    const fosByDate = {};
    filteredFOs.forEach(fo => {
      const date = fo.dataAdtBI;
      if (!fosByDate[date]) {
        fosByDate[date] = [];
      }
      fosByDate[date].push(fo);
    });

    // Sort dates descending
    const sortedDates = Object.keys(fosByDate).sort((a, b) => new Date(b) - new Date(a));

    // Hide loading
    container.querySelector('.page-loading').style.display = 'none';

    // Render
    const listContainer = container.querySelector('#dates-list');
    const emptyState = container.querySelector('#empty-state');

    if (sortedDates.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    listContainer.style.display = 'grid';
    listContainer.innerHTML = sortedDates.map(date => {
      const fos = fosByDate[date];
      const repreensaoCount = fos.filter(f => f.sancaoDisciplinar === 'REPREENSAO').length;
      const aoeCount = fos.filter(f => f.sancaoDisciplinar === 'ATIVIDADE_OE').length;
      const retiradaCount = fos.filter(f => f.sancaoDisciplinar === 'RETIRADA').length;

      return `
        <div class="date-card" data-date="${date}">
          <div class="date-card__header">
            <div class="date-card__date">${formatDate(date)}</div>
            <span class="badge badge--primary">${fos.length} sanções</span>
          </div>
          
          <div class="date-card__stats">
            ${repreensaoCount > 0 ? `<div class="stat"><span class="stat-value">${repreensaoCount}</span> Repreensão</div>` : ''}
            ${aoeCount > 0 ? `<div class="stat"><span class="stat-value">${aoeCount}</span> AOE</div>` : ''}
            ${retiradaCount > 0 ? `<div class="stat"><span class="stat-value">${retiradaCount}</span> Retirada</div>` : ''}
          </div>
          
          <button class="btn btn--primary btn--block generate-pdf-btn" data-date="${date}">
            ${icons.download} Gerar PDF
          </button>
        </div>
      `;
    }).join('');

    // Setup click handlers
    container.querySelectorAll('.generate-pdf-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const date = btn.dataset.date;
        const fos = fosByDate[date];

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Gerando...';

        try {
          await generateAdtPDF(fos, date);
          showToast('PDF gerado com sucesso!', 'success');
        } catch (error) {
          console.error('Erro ao gerar PDF:', error);
          showToast('Erro ao gerar PDF', 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = `${icons.download} Gerar PDF`;
        }
      });
    });

  } catch (error) {
    console.error('Erro ao carregar datas:', error);
    container.querySelector('.page-loading').innerHTML = `
      <p style="color: var(--color-danger-500);">Erro ao carregar: ${error.message}</p>
    `;
  }
}

// Styles
const notasAdtStyles = `
.dates-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.date-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: all var(--transition-fast);
}

.date-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-300);
}

.date-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.date-card__date {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.date-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.stat {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.stat-value {
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.btn--block {
  width: 100%;
  justify-content: center;
}

.empty-state {
  text-align: center;
  padding: var(--space-8);
  color: var(--text-tertiary);
}

.text-muted {
  font-size: var(--font-size-sm);
  margin-top: var(--space-2);
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
