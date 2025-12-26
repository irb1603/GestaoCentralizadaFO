// Expandable Card Component - Updated with RICM autocomplete
// Gestão Centralizada FO - CMB

import {
  SANCAO_DISCIPLINAR,
  TIPO_FATO_LABELS,
  TIPO_FATO_COLORS,
  getWhatsAppLink,
  formatPhone,
  formatDate
} from '../constants/index.js';
import {
  FALTAS_DISCIPLINARES,
  ATENUANTES,
  AGRAVANTES,
  searchItems,
  formatItem,
  add3BusinessDays
} from '../constants/ricm.js';
import { icons } from '../utils/icons.js';

/**
 * Render multiple date inputs for cumprimento days
 * @param {string|Array} datas - Single date or array of dates
 * @param {number} qtdDias - Number of days
 * @param {boolean} enabled - If inputs should be enabled
 * @returns {string} HTML string
 */
function renderDatasCumprimento(datas, qtdDias = 1, enabled = true) {
  const numDias = Math.max(1, Math.min(6, qtdDias || 1));
  let datasArray = [];

  // Parse existing dates
  if (Array.isArray(datas)) {
    datasArray = datas;
  } else if (datas && typeof datas === 'string') {
    datasArray = [datas];
  }

  const inputs = [];
  for (let i = 0; i < numDias; i++) {
    const value = datasArray[i] || '';
    inputs.push(`
      <input type="date" class="form-input form-input--sm data-cumprimento-input" 
             value="${value}" 
             data-field="datasCumprimento"
             data-index="${i}"
             ${enabled ? '' : 'disabled'}
             style="margin-bottom: 4px;">
    `);
  }

  return inputs.join('');
}

/**
 * Render an expandable card for a Fato Observado
 * @param {Object} fo - Fato Observado data
 * @param {Object} studentData - Student data (nome, turma, etc.)
 * @param {boolean} isExpanded - Initial expanded state
 * @param {Object} options - Additional options { readOnly: boolean, showDelete: boolean, showReturn: boolean, onReturnStatus: string }
 * @returns {string} HTML string
 */
export function renderExpandableCard(fo, studentData = {}, isExpanded = false, options = {}) {
  const { readOnly = false, showDelete = false, showReturn = false, onReturnStatus = '' } = options;
  const cardId = `fo-card-${fo.id}`;
  const tipoColor = TIPO_FATO_COLORS[fo.tipo] || 'neutral';
  const tipoLabel = TIPO_FATO_LABELS[fo.tipo] || fo.tipo;

  // Merge student info from FO with additional student data
  const student = {
    numero: fo.studentNumbers?.[0] || studentData.numero || '-',
    nome: fo.studentInfo?.[0]?.nome || studentData.nome || '-',
    turma: fo.studentInfo?.[0]?.turma || studentData.turma || '-',
    emailResponsavel: studentData.emailResponsavel || '',
    telefoneResponsavel: studentData.telefoneResponsavel || '',
    telefoneAluno: studentData.telefoneAluno || ''
  };

  // Check if sanção requires cumprimento fields
  const sancaoRequerCumprimento = ['ATIVIDADE_OE', 'RETIRADA'].includes(fo.sancaoDisciplinar);

  // Calculate termo prazo (3 business days from lançamento date)
  const termoPrazo = fo.dataLancamentoSINCOMIL ? add3BusinessDays(fo.dataLancamentoSINCOMIL) : '';

  // Determine if inputs should be disabled
  const inputDisabled = readOnly ? 'disabled' : '';

  return `
    <div class="expandable-card ${isExpanded ? 'expanded' : ''}" id="${cardId}" data-fo-id="${fo.id}">
      <!-- Card Header (always visible) -->
      <div class="expandable-card__header" onclick="toggleCard('${cardId}')">
        <div class="expandable-card__summary">
          <div class="expandable-card__main-info">
            <span class="badge badge--${tipoColor}">${tipoLabel}</span>
            <span class="expandable-card__number">${student.numero}</span>
            <span class="expandable-card__name">${student.nome}</span>
            <span class="expandable-card__turma">Turma ${student.turma}</span>
          </div>
          <div class="expandable-card__secondary-info">
            <span class="expandable-card__date">${formatDate(fo.dataFato)} ${fo.horaFato || ''}</span>
          </div>
        </div>
        <div class="expandable-card__toggle">
          ${icons.chevronDown}
        </div>
      </div>
      
      <!-- Card Body (expandable) -->
      <div class="expandable-card__body">
        <!-- Dados do Registro -->
        <div class="expandable-card__section">
          <h4 class="expandable-card__section-title">Dados do Registro</h4>
          <div class="expandable-card__grid">
            <div class="expandable-card__field expandable-card__field--full">
              <label>Descrição do Fato</label>
              <p>${fo.descricao || '-'}</p>
            </div>
            <div class="expandable-card__field">
              <label>Observador</label>
              <p>${fo.nomeObservador || '-'}</p>
            </div>
            <div class="expandable-card__field">
              <label>Data/Hora do Fato</label>
              <p>${formatDate(fo.dataFato)} ${fo.horaFato || ''}</p>
            </div>
          </div>
        </div>
        
        <!-- Contato Responsável -->
        <div class="expandable-card__section">
          <h4 class="expandable-card__section-title">Contato</h4>
          <div class="expandable-card__grid expandable-card__grid--3">
            <div class="expandable-card__field">
              <label>E-mail do Responsável</label>
              <input type="email" class="form-input form-input--sm" 
                     value="${student.emailResponsavel}" 
                     data-field="emailResponsavel" placeholder="email@exemplo.com">
            </div>
            <div class="expandable-card__field">
              <label>Tel. Responsável</label>
              <div class="expandable-card__phone-field">
                <input type="tel" class="form-input form-input--sm" 
                       value="${student.telefoneResponsavel}" 
                       data-field="telefoneResponsavel" placeholder="(61) 99999-9999">
                ${student.telefoneResponsavel ? `
                  <a href="${getWhatsAppLink(student.telefoneResponsavel)}" target="_blank" class="expandable-card__whatsapp" title="Abrir WhatsApp">
                    ${icons.whatsapp || '📱'}
                  </a>
                ` : ''}
              </div>
            </div>
            <div class="expandable-card__field">
              <label>Comunicar FO via WhatsApp</label>
              <button class="btn btn--success btn--sm expandable-card__whatsapp-btn" data-action="send-whatsapp">
                ${icons.whatsapp || '📱'} Enviar WhatsApp
              </button>
            </div>
          </div>
        </div>
        
        <!-- Processamento -->
        <div class="expandable-card__section">
          <h4 class="expandable-card__section-title">Processamento</h4>
          <div class="expandable-card__grid expandable-card__grid--4">
            <div class="expandable-card__field">
              <label>Lançamento SINCOMIL</label>
              <select class="form-select form-select--sm" data-field="lancamentoSINCOMIL" id="${cardId}-sincomil">
                <option value="">Selecione</option>
                <option value="true" ${fo.lancamentoSINCOMIL === true ? 'selected' : ''}>Sim</option>
                <option value="false" ${fo.lancamentoSINCOMIL === false ? 'selected' : ''}>Não</option>
              </select>
            </div>
            <div class="expandable-card__field">
              <label>Data do Lançamento</label>
              <input type="date" class="form-input form-input--sm" 
                     value="${fo.dataLancamentoSINCOMIL || ''}" 
                     data-field="dataLancamentoSINCOMIL"
                     id="${cardId}-dataLancamento"
                     onchange="updateTermoPrazo('${cardId}')">
            </div>
            <div class="expandable-card__field">
              <label>Termo Ciência Impresso</label>
              <select class="form-select form-select--sm" data-field="termoCienciaImpresso">
                <option value="">Selecione</option>
                <option value="true" ${fo.termoCienciaImpresso === true ? 'selected' : ''}>Sim</option>
                <option value="false" ${fo.termoCienciaImpresso === false ? 'selected' : ''}>Não</option>
              </select>
            </div>
            <div class="expandable-card__field">
              <label>Nº do FO</label>
              <input type="text" class="form-input form-input--sm" 
                     value="${fo.numeroFO || ''}" 
                     data-field="numeroFO" placeholder="Ex: 001/2024">
            </div>
          </div>
        </div>
        
        <!-- Enquadramento (Autocomplete) -->
        <div class="expandable-card__section">
          <div class="expandable-card__section-header">
            <h4 class="expandable-card__section-title" style="margin-bottom: 0;">Enquadramento (Faltas Disciplinares)</h4>
            ${!readOnly ? `
              <button type="button" class="btn btn--ghost btn--sm ai-suggest-btn" 
                      data-action="ai-suggest" 
                      data-card-id="${cardId}"
                      data-description="${(fo.descricao || '').replace(/"/g, '&quot;')}"
                      title="Sugestão de IA para Enquadramento, Atenuantes e Agravantes">
                ${icons.bot || '🤖'} Sugerir
              </button>
            ` : ''}
          </div>
          <div class="autocomplete-container" data-type="enquadramento" data-card-id="${cardId}">
            <div class="autocomplete-input-wrapper">
              <input type="text" class="form-input autocomplete-input" 
                     placeholder="Digite para buscar faltas disciplinares..." 
                     data-field-search="enquadramento" ${inputDisabled}>
              <button type="button" class="btn btn--icon btn--ghost autocomplete-toggle" 
                      data-toggle="enquadramento" title="Mostrar todas as opções">
                ${icons.chevronDown}
              </button>
            </div>
            <div class="autocomplete-dropdown"></div>
            <div class="autocomplete-selected" data-field="enquadramento" data-value="${fo.enquadramento || ''}">
              ${renderSelectedItems(fo.enquadramento, FALTAS_DISCIPLINARES)}
            </div>
          </div>
          <!-- AI Suggestion Result -->
          <div class="ai-suggestion-result hidden" id="${cardId}-ai-result">
            <div class="ai-suggestion-content"></div>
          </div>
        </div>
        
        <!-- Sanção e Atenuantes/Agravantes -->
        <div class="expandable-card__section">
          <h4 class="expandable-card__section-title">Sanção Disciplinar</h4>
          <div class="expandable-card__grid expandable-card__grid--2">
            <div class="expandable-card__field">
              <label>Termo do Prazo (3 dias úteis)</label>
              <input type="date" class="form-input form-input--sm" 
                     value="${fo.termoPrazo || termoPrazo}" 
                     data-field="termoPrazo"
                     id="${cardId}-termoPrazo"
                     readonly
                     style="background: var(--bg-tertiary);">
            </div>
            <div class="expandable-card__field">
              <label>Sanção Disciplinar</label>
              <select class="form-select form-select--sm" data-field="sancaoDisciplinar" 
                      id="${cardId}-sancao" onchange="toggleCumprimentoFields('${cardId}')">
                <option value="">Selecione</option>
                ${Object.entries(SANCAO_DISCIPLINAR).map(([key, value]) => `
                  <option value="${key}" ${fo.sancaoDisciplinar === key ? 'selected' : ''}>${value}</option>
                `).join('')}
              </select>
            </div>
          </div>
          
          <!-- Atenuantes (Autocomplete) -->
          <div class="expandable-card__field" style="margin-top: var(--space-4);">
            <label>Atenuantes</label>
            <div class="autocomplete-container" data-type="atenuantes" data-card-id="${cardId}">
              <div class="autocomplete-input-wrapper">
                <input type="text" class="form-input autocomplete-input" 
                       placeholder="Digite para buscar atenuantes..." 
                       data-field-search="atenuantes" ${inputDisabled}>
                <button type="button" class="btn btn--icon btn--ghost autocomplete-toggle" 
                        data-toggle="atenuantes" title="Mostrar todas as opções">
                  ${icons.chevronDown}
                </button>
              </div>
              <div class="autocomplete-dropdown"></div>
              <div class="autocomplete-selected" data-field="atenuante" data-value="${fo.atenuante || ''}">
                ${renderSelectedItems(fo.atenuante, ATENUANTES)}
              </div>
            </div>
          </div>
          
          <!-- Agravantes (Autocomplete) -->
          <div class="expandable-card__field" style="margin-top: var(--space-4);">
            <label>Agravantes</label>
            <div class="autocomplete-container" data-type="agravantes" data-card-id="${cardId}">
              <div class="autocomplete-input-wrapper">
                <input type="text" class="form-input autocomplete-input" 
                       placeholder="Digite para buscar agravantes..." 
                       data-field-search="agravantes" ${inputDisabled}>
                <button type="button" class="btn btn--icon btn--ghost autocomplete-toggle" 
                        data-toggle="agravantes" title="Mostrar todas as opções">
                  ${icons.chevronDown}
                </button>
              </div>
              <div class="autocomplete-dropdown"></div>
              <div class="autocomplete-selected" data-field="agravante" data-value="${fo.agravante || ''}">
                ${renderSelectedItems(fo.agravante, AGRAVANTES)}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Cumprimento (condicional) -->
        <div class="expandable-card__section" id="${cardId}-cumprimento" style="${sancaoRequerCumprimento ? '' : 'opacity: 0.5; pointer-events: none;'}">
          <h4 class="expandable-card__section-title">Cumprimento</h4>
          <div class="expandable-card__grid expandable-card__grid--2">
            <div class="expandable-card__field">
              <label>Qtd. Dias</label>
              <input type="number" class="form-input form-input--sm qtd-dias-input" 
                     value="${fo.quantidadeDias || 1}" 
                     data-field="quantidadeDias" min="1" max="6"
                     data-card-id="${cardId}"
                     ${sancaoRequerCumprimento ? '' : 'disabled'}>
            </div>
            <div class="expandable-card__field">
              <label>Datas do Cumprimento <small>(${fo.quantidadeDias || 1} dia(s))</small></label>
              <div class="datas-cumprimento-container" data-card-id="${cardId}">
                ${renderDatasCumprimento(fo.datasCumprimento || fo.dataCumprimento, fo.quantidadeDias || 1, sancaoRequerCumprimento)}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Data Adt BI -->
        <div class="expandable-card__section">
          <div class="expandable-card__grid expandable-card__grid--2">
            <div class="expandable-card__field">
              <label>Data do Adt ao BI</label>
              <input type="date" class="form-input form-input--sm" 
                     value="${fo.dataAdtBI || ''}" 
                     data-field="dataAdtBI">
            </div>
          </div>
        </div>
        
        <!-- Ações -->
        <div class="expandable-card__actions">
          ${showReturn && onReturnStatus ? `
            <button class="btn btn--secondary btn--sm" data-action="return" data-status="${onReturnStatus}" title="Retornar à etapa anterior">
              ${icons.chevronLeft || '←'} Retornar
            </button>
          ` : ''}
          
          ${showDelete ? `
            <button class="btn btn--danger btn--sm" data-action="delete" title="Excluir FO">
              ${icons.trash} Excluir
            </button>
          ` : ''}
          
          ${!readOnly ? `
            <button class="btn btn--secondary btn--sm" data-action="cancel">Cancelar</button>
            <button class="btn btn--primary btn--sm" data-action="save">Salvar Alterações</button>
          ` : ''}
          
          ${!readOnly ? `
            <div class="expandable-card__transfer">
              <button class="btn btn--warning btn--sm" data-action="concluir">Concluir</button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render selected items as tags
 */
function renderSelectedItems(value, itemsList) {
  if (!value) return '<span class="autocomplete-placeholder">Nenhum selecionado</span>';

  const ids = value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
  if (ids.length === 0) return '<span class="autocomplete-placeholder">Nenhum selecionado</span>';

  return ids.map(id => {
    const item = itemsList.find(i => i.id === id);
    if (!item) return '';
    return `<span class="autocomplete-tag" data-id="${id}">
      ${id} - ${item.texto.substring(0, 30)}${item.texto.length > 30 ? '...' : ''}
      <button type="button" class="autocomplete-tag__remove" onclick="removeAutocompleteItem(this, ${id})">×</button>
    </span>`;
  }).join('');
}

/**
 * Global function to toggle card expansion
 */
window.toggleCard = function (cardId) {
  const card = document.getElementById(cardId);
  if (card) {
    card.classList.toggle('expanded');
  }
};

/**
 * Toggle cumprimento fields based on sanção
 */
window.toggleCumprimentoFields = function (cardId) {
  const sancaoSelect = document.getElementById(`${cardId}-sancao`);
  const cumprimentoSection = document.getElementById(`${cardId}-cumprimento`);

  if (!sancaoSelect || !cumprimentoSection) return;

  const sancao = sancaoSelect.value;
  const requerCumprimento = ['ATIVIDADE_OE', 'RETIRADA'].includes(sancao);

  cumprimentoSection.style.opacity = requerCumprimento ? '1' : '0.5';
  cumprimentoSection.style.pointerEvents = requerCumprimento ? 'auto' : 'none';

  const inputs = cumprimentoSection.querySelectorAll('input');
  inputs.forEach(input => {
    input.disabled = !requerCumprimento;
  });
};

/**
 * Update termo prazo (3 business days from lançamento)
 */
window.updateTermoPrazo = function (cardId) {
  const dataLancamento = document.getElementById(`${cardId}-dataLancamento`)?.value;
  const termoPrazoInput = document.getElementById(`${cardId}-termoPrazo`);

  if (dataLancamento && termoPrazoInput) {
    termoPrazoInput.value = add3BusinessDays(dataLancamento);
  }
};

/**
 * Remove autocomplete item
 */
window.removeAutocompleteItem = function (button, id) {
  const container = button.closest('.autocomplete-selected');
  const currentValue = container.dataset.value || '';
  const ids = currentValue.split(',').map(i => parseInt(i.trim())).filter(i => !isNaN(i) && i !== id);
  container.dataset.value = ids.join(',');

  // Remove the tag
  button.closest('.autocomplete-tag').remove();

  // Show placeholder if empty
  if (ids.length === 0) {
    container.innerHTML = '<span class="autocomplete-placeholder">Nenhum selecionado</span>';
  }
};

/**
 * Setup autocomplete functionality
 */
export function setupAutocomplete() {
  document.querySelectorAll('.autocomplete-container').forEach(container => {
    const type = container.dataset.type;
    const input = container.querySelector('.autocomplete-input');
    const dropdown = container.querySelector('.autocomplete-dropdown');

    let items = [];
    if (type === 'enquadramento') items = FALTAS_DISCIPLINARES;
    else if (type === 'atenuantes') items = ATENUANTES;
    else if (type === 'agravantes') items = AGRAVANTES;

    input.addEventListener('input', (e) => {
      const searchTerm = e.target.value;
      const filtered = searchItems(items, searchTerm);

      if (filtered.length > 0 && searchTerm.length > 0) {
        dropdown.innerHTML = filtered.slice(0, 10).map(item => `
          <div class="autocomplete-option" data-id="${item.id}">
            <strong>${item.id}</strong> - ${item.texto}
          </div>
        `).join('');
        dropdown.classList.add('active');

        // Setup click handlers
        dropdown.querySelectorAll('.autocomplete-option').forEach(option => {
          option.addEventListener('click', () => {
            const id = parseInt(option.dataset.id);
            const selectedContainer = container.querySelector('.autocomplete-selected');
            const currentValue = selectedContainer.dataset.value || '';
            const currentIds = currentValue.split(',').map(i => parseInt(i.trim())).filter(i => !isNaN(i));

            if (!currentIds.includes(id)) {
              currentIds.push(id);
              selectedContainer.dataset.value = currentIds.join(',');

              const item = items.find(i => i.id === id);
              const tag = document.createElement('span');
              tag.className = 'autocomplete-tag';
              tag.dataset.id = id;
              tag.innerHTML = `
                ${id} - ${item.texto.substring(0, 30)}${item.texto.length > 30 ? '...' : ''}
                <button type="button" class="autocomplete-tag__remove" onclick="removeAutocompleteItem(this, ${id})">×</button>
              `;

              // Remove placeholder if exists
              const placeholder = selectedContainer.querySelector('.autocomplete-placeholder');
              if (placeholder) placeholder.remove();

              selectedContainer.appendChild(tag);
            }

            input.value = '';
            dropdown.classList.remove('active');
          });
        });
      } else {
        dropdown.classList.remove('active');
      }
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });

    // Toggle button to show all options
    const toggleBtn = container.querySelector('.autocomplete-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (dropdown.classList.contains('active')) {
          dropdown.classList.remove('active');
          return;
        }

        // Show all items
        dropdown.innerHTML = items.map(item => `
          <div class="autocomplete-option" data-id="${item.id}">
            <strong>${item.id}</strong> - ${item.texto}
          </div>
        `).join('');

        dropdown.classList.add('active');

        // Setup click handlers for options
        dropdown.querySelectorAll('.autocomplete-option').forEach(option => {
          option.addEventListener('click', () => {
            const id = parseInt(option.dataset.id);
            const selectedContainer = container.querySelector('.autocomplete-selected');
            const currentValue = selectedContainer.dataset.value || '';
            const currentIds = currentValue.split(',').map(i => parseInt(i.trim())).filter(i => !isNaN(i));

            if (!currentIds.includes(id)) {
              currentIds.push(id);
              selectedContainer.dataset.value = currentIds.join(',');

              const item = items.find(i => i.id === id);
              const tag = document.createElement('span');
              tag.className = 'autocomplete-tag';
              tag.dataset.id = id;
              tag.innerHTML = `
                ${id} - ${item.texto.substring(0, 30)}${item.texto.length > 30 ? '...' : ''}
                <button type="button" class="autocomplete-tag__remove" onclick="removeAutocompleteItem(this, ${id})">×</button>
              `;

              // Remove placeholder if exists
              const placeholder = selectedContainer.querySelector('.autocomplete-placeholder');
              if (placeholder) placeholder.remove();

              selectedContainer.appendChild(tag);
            }

            dropdown.classList.remove('active');
          });
        });
      });
    }
  });
}

/**
 * Setup quantity days input to dynamically update date fields
 */
export function setupQuantidadeDias() {
  document.querySelectorAll('.qtd-dias-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const cardId = input.dataset.cardId;
      const container = document.querySelector(`.datas-cumprimento-container[data-card-id="${cardId}"]`);

      if (!container) return;

      const newQtd = Math.max(1, Math.min(6, parseInt(e.target.value) || 1));
      e.target.value = newQtd;

      // Get current dates
      const currentDates = [];
      container.querySelectorAll('.data-cumprimento-input').forEach(dateInput => {
        if (dateInput.value) currentDates.push(dateInput.value);
      });

      // Regenerate date inputs
      container.innerHTML = renderDatasCumprimentoInternal(currentDates, newQtd, true);

      // Update label
      const labelSmall = container.closest('.expandable-card__field')?.querySelector('small');
      if (labelSmall) labelSmall.textContent = `(${newQtd} dia(s))`;
    });
  });
}

/**
 * Internal render function for date inputs
 */
function renderDatasCumprimentoInternal(datasArray, numDias, enabled) {
  const inputs = [];
  for (let i = 0; i < numDias; i++) {
    const value = datasArray[i] || '';
    inputs.push(`
      <input type="date" class="form-input form-input--sm data-cumprimento-input" 
             value="${value}" 
             data-field="datasCumprimento"
             data-index="${i}"
             ${enabled ? '' : 'disabled'}
             style="margin-bottom: 4px;">
    `);
  }
  return inputs.join('');
}

/**
 * Setup AI Suggestion buttons
 */
export function setupAISuggestion() {
  document.querySelectorAll('.ai-suggest-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const cardId = btn.dataset.cardId;
      const description = btn.dataset.description;
      const resultContainer = document.getElementById(`${cardId}-ai-result`);
      const contentDiv = resultContainer?.querySelector('.ai-suggestion-content');

      if (!resultContainer || !contentDiv) return;

      // Show loading
      resultContainer.classList.remove('hidden');
      contentDiv.innerHTML = `
        <div class="ai-suggestion-loading">
          <span class="spinner"></span>
          <span>Analisando descrição com IA...</span>
        </div>
      `;

      btn.disabled = true;

      try {
        // Dynamically import AI service
        const { chatWithAI, isAIConfigured } = await import('../services/aiService.js');

        // Check if AI is configured
        const configured = await isAIConfigured();
        if (!configured) {
          contentDiv.innerHTML = `
            <p style="color: var(--color-warning-700);">
              ⚠️ O assistente de IA não está configurado. 
              Solicite ao administrador que configure a API key do Gemini na página Admin.
            </p>
          `;
          return;
        }

        if (!description || description.trim() === '') {
          contentDiv.innerHTML = `
            <p style="color: var(--color-warning-700);">
              ⚠️ A descrição do fato está vazia. Preencha a descrição para obter sugestões.
            </p>
          `;
          return;
        }

        // Create specific prompt for enquadramento suggestion
        const prompt = `Com base na seguinte descrição de um fato observado, sugira:
1. O número do enquadramento (falta disciplinar) mais adequado do RICM
2. Possíveis agravantes aplicáveis
3. Possíveis atenuantes aplicáveis
4. Classificação provável da falta (leve/média/grave)

Descrição do fato: "${description}"

Responda de forma concisa e direta, citando os números dos artigos.`;

        const response = await chatWithAI(prompt);

        // Format and display response
        contentDiv.innerHTML = formatAISuggestionResponse(response);

      } catch (error) {
        console.error('AI Suggestion Error:', error);
        contentDiv.innerHTML = `
          <p style="color: var(--color-danger-700);">
            ❌ Erro ao obter sugestão: ${error.message}
          </p>
        `;
      } finally {
        btn.disabled = false;
      }
    });
  });
}

/**
 * Format AI response for display
 */
function formatAISuggestionResponse(text) {
  // Basic formatting
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/^\d+\.\s/gm, '<br><strong>•</strong> ');

  return `
    <div style="margin-bottom: var(--space-2);">
      <strong style="color: var(--color-primary-700);">🤖 Sugestão da IA:</strong>
    </div>
    <div>${formatted}</div>
    <div style="margin-top: var(--space-2); font-size: var(--font-size-xs); color: var(--text-tertiary);">
      <em>Esta é apenas uma sugestão. Confirme os artigos no RICM.</em>
    </div>
  `;
}

/**
 * CSS for expandable cards
 */
export const expandableCardStyles = `
.expandable-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-3);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.expandable-card:hover {
  box-shadow: var(--shadow-md);
}

.expandable-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  cursor: pointer;
  user-select: none;
}

.expandable-card__header:hover {
  background: var(--bg-secondary);
}

.expandable-card__summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
}

.expandable-card__main-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.expandable-card__number {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  color: var(--text-primary);
}

.expandable-card__name {
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.expandable-card__turma {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.expandable-card__secondary-info {
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
}

.expandable-card__toggle {
  transition: transform var(--transition-fast);
}

.expandable-card.expanded .expandable-card__toggle {
  transform: rotate(180deg);
}

.expandable-card__body {
  display: none;
  padding: var(--space-4);
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
}

.expandable-card.expanded .expandable-card__body {
  display: block;
}

.expandable-card__section {
  margin-bottom: var(--space-5);
}

.expandable-card__section:last-child {
  margin-bottom: 0;
}

.expandable-card__section-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-light);
}

.expandable-card__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-light);
}

.ai-suggest-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-primary-600);
  font-size: var(--font-size-xs);
  text-transform: none;
}

.ai-suggest-btn:hover {
  background: var(--color-primary-50);
}

.ai-suggestion-result {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: linear-gradient(135deg, var(--color-primary-50), var(--bg-secondary));
  border: 1px solid var(--color-primary-200);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.ai-suggestion-result.hidden {
  display: none;
}

.ai-suggestion-content {
  line-height: 1.6;
}

.ai-suggestion-content strong {
  color: var(--color-primary-700);
}

.ai-suggestion-loading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
}

.expandable-card__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.expandable-card__grid--2 {
  grid-template-columns: repeat(2, 1fr);
}

.expandable-card__grid--3 {
  grid-template-columns: repeat(3, 1fr);
}

.expandable-card__grid--4 {
  grid-template-columns: repeat(4, 1fr);
}

.expandable-card__field--full {
  grid-column: 1 / -1;
}

@media (max-width: 768px) {
  .expandable-card__grid,
  .expandable-card__grid--2,
  .expandable-card__grid--3,
  .expandable-card__grid--4 {
    grid-template-columns: 1fr;
  }
}

.expandable-card__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.expandable-card__field label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
}

.expandable-card__field p {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  margin: 0;
}

.expandable-card__phone-field {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.expandable-card__whatsapp {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #25D366;
  color: white;
  border-radius: var(--radius-md);
  text-decoration: none;
  flex-shrink: 0;
}

.expandable-card__whatsapp:hover {
  background: #128C7E;
}

.expandable-card__whatsapp-btn {
  background: #25D366 !important;
  border-color: #25D366 !important;
}

.expandable-card__whatsapp-btn:hover {
  background: #128C7E !important;
  border-color: #128C7E !important;
}

.expandable-card__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-light);
  margin-top: var(--space-4);
  flex-wrap: wrap;
}

.expandable-card__transfer {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.form-input--sm,
.form-select--sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
}

/* Autocomplete Styles */
.autocomplete-container {
  position: relative;
}

.autocomplete-input-wrapper {
  display: flex;
  gap: 0;
}

.autocomplete-input-wrapper .autocomplete-input {
  flex: 1;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.autocomplete-toggle {
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  border-left: none;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-medium);
}

.autocomplete-toggle:hover {
  background: var(--bg-secondary);
}

.autocomplete-toggle svg {
  width: 16px;
  height: 16px;
}

.autocomplete-more {
  padding: var(--space-3);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--text-tertiary);
  font-style: italic;
  background: var(--bg-secondary);
}

.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-md);
  max-height: 250px;
  overflow-y: auto;
  z-index: 100;
  display: none;
  box-shadow: var(--shadow-lg);
}

.autocomplete-dropdown.active {
  display: block;
}

.autocomplete-option {
  padding: var(--space-3);
  cursor: pointer;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--border-light);
}

.autocomplete-option:last-child {
  border-bottom: none;
}

.autocomplete-option:hover {
  background: var(--bg-secondary);
}

.autocomplete-option strong {
  color: var(--color-primary-600);
}

.autocomplete-selected {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
  min-height: 32px;
}

.autocomplete-placeholder {
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  font-style: italic;
}

.autocomplete-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  max-width: 300px;
}

.autocomplete-tag__remove {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-primary-600);
  padding: 0;
  line-height: 1;
}

.autocomplete-tag__remove:hover {
  color: var(--color-danger-500);
}
`;
