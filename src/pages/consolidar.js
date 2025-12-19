// Consolidar Page - FOs pending consolidation
// Gestão Centralizada FO - CMB

import { db } from '../firebase/config.js';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { renderExpandableCard, setupAutocomplete, expandableCardStyles } from '../components/expandableCard.js';
import { icons } from '../utils/icons.js';
import { FO_STATUS, formatDate } from '../constants/index.js';
import { showToast } from '../utils/toast.js';
import { SANCAO_IMPACT, calculateSancaoVariation } from '../services/comportamentoService.js';

/**
 * Render the Consolidar page
 */
export async function renderConsolidarPage(container) {
    // Inject styles
    if (!document.getElementById('consolidar-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'consolidar-styles';
        styleEl.textContent = expandableCardStyles + consolidarStyles;
        document.head.appendChild(styleEl);
    }

    container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Consolidar</h1>
      <p class="page-subtitle">FOs aguardando consolidação e atualização de comportamento</p>
    </div>
    
    <div class="consolidar-tabs">
      <button class="tab-btn active" data-tab="negativo">FOs Negativos</button>
      <button class="tab-btn" data-tab="positivo">FOs Positivos</button>
    </div>
    
    <div class="page-loading">
      <span class="spinner"></span> Carregando...
    </div>
    
    <div id="fo-list" class="fo-list" style="display: none;"></div>
    <div id="empty-state" class="empty-state" style="display: none;">
      <p>Nenhum FO encontrado para consolidar.</p>
    </div>
  `;

    let allFOs = [];
    let studentDataCache = {};
    let currentTab = 'negativo';

    try {
        // Query FOs with status consolidar
        const q = query(
            collection(db, 'fatosObservados'),
            where('status', '==', FO_STATUS.CONSOLIDAR),
            orderBy('dataFato', 'desc')
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

        // Setup tabs
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTab = btn.dataset.tab;
                renderFOList();
            });
        });

        // Initial render
        renderFOList();

        function renderFOList() {
            const listContainer = container.querySelector('#fo-list');
            const emptyState = container.querySelector('#empty-state');

            const filteredFOs = allFOs.filter(fo => fo.tipo === currentTab);

            if (filteredFOs.length === 0) {
                listContainer.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }

            emptyState.style.display = 'none';
            listContainer.style.display = 'block';

            listContainer.innerHTML = filteredFOs.map(fo => {
                const studentData = studentDataCache[fo.studentNumbers?.[0]] || {};
                const cardHtml = renderExpandableCard(fo, studentData, false);

                // Calculate comportamento impact
                const sancaoTipo = fo.sancaoDisciplinar;
                const dias = fo.quantidadeDias || 1;
                const variacao = currentTab === 'positivo' ? 0 : calculateSancaoVariation(sancaoTipo, dias);

                const variacaoText = variacao === 0 ? 'Sem alteração' :
                    `${variacao > 0 ? '+' : ''}${variacao.toFixed(1)}`;

                const nextStatus = currentTab === 'positivo' ? FO_STATUS.ENCERRADO : FO_STATUS.CONCLUIR;
                const nextLabel = currentTab === 'positivo' ? 'Encerrados' : 'Concluir';

                return `
          <div class="consolidar-card-wrapper" data-fo-id="${fo.id}">
            ${cardHtml}
            <div class="consolidar-action-bar">
              <div class="consolidar-info">
                <span class="consolidar-info__label">Impacto no Comportamento:</span>
                <span class="consolidar-info__value ${variacao < 0 ? 'negative' : variacao > 0 ? 'positive' : ''}">${variacaoText}</span>
              </div>
              <button class="btn btn--success btn--action" data-action="consolidar" 
                      data-fo-id="${fo.id}" 
                      data-next-status="${nextStatus}"
                      data-variacao="${variacao}"
                      data-student-number="${fo.studentNumbers?.[0]}">
                ${icons.check} Consolidado
              </button>
            </div>
          </div>
        `;
            }).join('');

            // Setup autocomplete
            setupAutocomplete();

            // Setup consolidar buttons
            container.querySelectorAll('[data-action="consolidar"]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const foId = btn.dataset.foId;
                    const nextStatus = btn.dataset.nextStatus;
                    const variacao = parseFloat(btn.dataset.variacao);
                    const studentNumber = btn.dataset.studentNumber;
                    const fo = allFOs.find(f => f.id === foId);

                    let confirmMessage = `Deseja consolidar este FO?`;
                    if (variacao !== 0) {
                        confirmMessage += `\n\n⚠️ O comportamento do aluno será alterado em ${variacao > 0 ? '+' : ''}${variacao.toFixed(1)} pontos.`;
                    }

                    if (!confirm(confirmMessage)) return;

                    try {
                        btn.disabled = true;
                        btn.innerHTML = '<span class="spinner"></span> Consolidando...';

                        // Update FO status
                        await updateDoc(doc(db, 'fatosObservados', foId), {
                            status: nextStatus,
                            consolidadoEm: new Date().toISOString(),
                            variacaoComportamento: variacao,
                            updatedAt: new Date().toISOString()
                        });

                        // Update student comportamento if there's a variation
                        if (variacao !== 0 && studentNumber) {
                            await updateStudentComportamento(studentNumber, variacao);
                        }

                        showToast('FO consolidado com sucesso', 'success');

                        // Remove from allFOs and re-render
                        allFOs = allFOs.filter(f => f.id !== foId);
                        renderFOList();

                    } catch (error) {
                        console.error('Erro ao consolidar FO:', error);
                        alert('Erro ao consolidar FO: ' + error.message);
                        btn.disabled = false;
                        btn.innerHTML = `${icons.check} Consolidado`;
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

/**
 * Update student comportamento
 */
async function updateStudentComportamento(studentNumber, variacao) {
    try {
        // Get current student data
        const studentsQuery = query(
            collection(db, 'students'),
            where('numero', '==', parseInt(studentNumber))
        );
        const snapshot = await getDocs(studentsQuery);

        if (snapshot.empty) {
            console.warn('Student not found:', studentNumber);
            return;
        }

        const studentDoc = snapshot.docs[0];
        const studentData = studentDoc.data();
        const currentNota = studentData.notaComportamento || 10.0;
        const newNota = Math.max(0, Math.min(10, currentNota + variacao));

        await updateDoc(doc(db, 'students', studentDoc.id), {
            notaComportamento: parseFloat(newNota.toFixed(2)),
            ultimaAtualizacaoComportamento: new Date().toISOString()
        });

        console.log(`Updated comportamento for ${studentNumber}: ${currentNota} -> ${newNota}`);
    } catch (error) {
        console.error('Error updating comportamento:', error);
        throw error;
    }
}

// Styles
const consolidarStyles = `
.consolidar-tabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-light);
  padding-bottom: var(--space-3);
}

.tab-btn {
  padding: var(--space-2) var(--space-4);
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  background: var(--bg-tertiary);
}

.tab-btn.active {
  background: var(--color-primary-500);
  color: white;
  border-color: var(--color-primary-500);
}

.consolidar-card-wrapper {
  position: relative;
}

.consolidar-action-bar {
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

.consolidar-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.consolidar-info__label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.consolidar-info__value {
  font-weight: var(--font-weight-bold);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
}

.consolidar-info__value.negative {
  color: var(--color-danger-600);
  background: var(--color-danger-50);
}

.consolidar-info__value.positive {
  color: var(--color-success-600);
  background: var(--color-success-50);
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
