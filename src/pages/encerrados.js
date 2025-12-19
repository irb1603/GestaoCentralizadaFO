// Encerrados Page - Completed FOs
// Gestão Centralizada FO - CMB

import { db } from '../firebase/config.js';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { renderExpandableCard, setupAutocomplete, expandableCardStyles } from '../components/expandableCard.js';
import { getSession } from '../firebase/auth.js';
import { icons } from '../utils/icons.js';
import { FO_STATUS, formatDate } from '../constants/index.js';
import { showToast } from '../utils/toast.js';

/**
 * Render the Encerrados page
 */
export async function renderEncerradosPage(container) {
    const session = getSession();
    const isAdmin = session?.role === 'admin';

    // Inject styles
    if (!document.getElementById('encerrados-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'encerrados-styles';
        styleEl.textContent = expandableCardStyles + encerradosStyles;
        document.head.appendChild(styleEl);
    }

    container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Encerrados</h1>
      <p class="page-subtitle">FOs concluídos e arquivados ${isAdmin ? '<span class="badge badge--primary">Modo Admin - Edição Permitida</span>' : ''}</p>
    </div>
    
    <div class="search-bar" style="margin-bottom: var(--space-4);">
      <input type="text" id="search-encerrados" placeholder="Buscar por número ou nome do aluno..." 
             style="flex: 1; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-light); border-radius: var(--radius-md);">
    </div>
    
    <div class="page-loading">
      <span class="spinner"></span> Carregando...
    </div>
    
    <div id="fo-list" class="fo-list" style="display: none;"></div>
    <div id="empty-state" class="empty-state" style="display: none;">
      <p>Nenhum FO encerrado encontrado.</p>
    </div>
  `;

    let allFOs = [];
    let studentDataCache = {};

    try {
        // Query FOs with status encerrado
        const q = query(
            collection(db, 'fatosObservados'),
            where('status', '==', FO_STATUS.ENCERRADO),
            orderBy('updatedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        allFOs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch student data
        const studentNumbers = [...new Set(allFOs.flatMap(fo => fo.studentNumbers || []))];

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

        // Initial render
        renderFOList(allFOs);

        // Setup search
        const searchInput = container.querySelector('#search-encerrados');
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const term = searchInput.value.toLowerCase();
                const filtered = allFOs.filter(fo => {
                    const studentNumber = String(fo.studentNumbers?.[0] || '');
                    const studentName = fo.studentInfo?.[0]?.nome || studentDataCache[fo.studentNumbers?.[0]]?.nome || '';
                    return studentNumber.includes(term) || studentName.toLowerCase().includes(term);
                });
                renderFOList(filtered);
            }, 300);
        });

        function renderFOList(fos) {
            const listContainer = container.querySelector('#fo-list');
            const emptyState = container.querySelector('#empty-state');

            if (fos.length === 0) {
                listContainer.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }

            emptyState.style.display = 'none';
            listContainer.style.display = 'block';

            // Pass isReadOnly=true to lock fields (except for admin)
            const isReadOnly = !isAdmin;

            listContainer.innerHTML = fos.map(fo => {
                const studentData = studentDataCache[fo.studentNumbers?.[0]] || {};
                const cardHtml = renderExpandableCard(fo, studentData, isReadOnly);

                return `
          <div class="encerrado-card-wrapper ${isReadOnly ? 'readonly' : ''}" data-fo-id="${fo.id}">
            ${cardHtml}
            ${isReadOnly ? `
              <div class="readonly-overlay">
                <span class="readonly-badge">${icons.lock} Somente Leitura</span>
              </div>
            ` : ''}
          </div>
        `;
            }).join('');

            // Setup autocomplete only if admin
            if (isAdmin) {
                setupAutocomplete();
            }
        }

    } catch (error) {
        console.error('Erro ao carregar FOs:', error);
        container.querySelector('.page-loading').innerHTML = `
      <p style="color: var(--color-danger-500);">Erro ao carregar: ${error.message}</p>
    `;
    }
}

// Styles
const encerradosStyles = `
.encerrado-card-wrapper {
  position: relative;
  margin-bottom: var(--space-4);
}

.encerrado-card-wrapper.readonly .card {
  opacity: 0.85;
}

.encerrado-card-wrapper.readonly input,
.encerrado-card-wrapper.readonly select,
.encerrado-card-wrapper.readonly textarea,
.encerrado-card-wrapper.readonly button:not(.expand-btn) {
  pointer-events: none;
  opacity: 0.7;
}

.readonly-overlay {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  z-index: 10;
}

.readonly-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--color-neutral-100);
  color: var(--color-neutral-600);
  font-size: var(--font-size-xs);
  border-radius: var(--radius-sm);
}

.readonly-badge svg {
  width: 12px;
  height: 12px;
}

.search-bar {
  display: flex;
  gap: var(--space-3);
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
