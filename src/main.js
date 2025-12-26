// Main Application Entry Point
// Gestão Centralizada FO - CMB

import { isAuthenticated, getSession } from './firebase/auth.js';
import { renderLoginPage } from './pages/login.js';
import { renderSidebar, setupSidebarEvents } from './components/sidebar.js';
import { renderHeader, setupHeaderEvents } from './components/header.js';
import { initAIChat, destroyAIChat } from './components/aiChat.js';
import { ROUTES, PAGE_TITLES, FO_STATUS } from './constants/index.js';

// Initialize application
async function init() {
  // Check authentication
  if (!isAuthenticated()) {
    destroyAIChat(); // Remove AI chat if logging out
    renderLoginPage();
    return;
  }

  // Get current page from URL
  const urlParams = new URLSearchParams(window.location.search);
  const currentPage = urlParams.get('page') || ROUTES.INICIAL;

  // Render main layout
  renderMainLayout(currentPage);

  // Load page content
  await loadPage(currentPage);

  // Setup event listeners
  setupSidebarEvents();
  setupHeaderEvents();

  // Initialize AI Chat (only for logged in users)
  initAIChat();
}

// Render main layout with sidebar and header
function renderMainLayout(currentPage) {
  const app = document.getElementById('app');
  const pageTitle = PAGE_TITLES[currentPage] || 'Inicial';

  app.innerHTML = `
    <div class="app-layout">
      ${renderSidebar(currentPage)}
      
      <main class="main-content">
        ${renderHeader(pageTitle)}
        
        <div class="page-content" id="page-content">
          <div style="display: flex; justify-content: center; padding: 3rem;">
            <span class="spinner spinner--lg"></span>
          </div>
        </div>
      </main>
    </div>
  `;
}

// Load page content dynamically
async function loadPage(page) {
  const pageContent = document.getElementById('page-content');

  try {
    switch (page) {
      // Página Inicial
      case ROUTES.INICIAL:
        const { renderInicialPage } = await import('./pages/inicial.js');
        await renderInicialPage();
        break;

      // Páginas de Destino (Sanções) - use sanction page template
      case ROUTES.ADVERTENCIAS:
        const { renderSanctionPage: renderAdv } = await import('./pages/sanctionPage.js');
        await renderAdv(pageContent, FO_STATUS.ADVERTENCIA, 'Advertências', FO_STATUS.CONSOLIDAR);
        break;

      case ROUTES.REPREENSOES:
        const { renderSanctionPage: renderRep } = await import('./pages/sanctionPage.js');
        await renderRep(pageContent, FO_STATUS.REPREENSAO, 'Repreensões', FO_STATUS.CONSOLIDAR);
        break;

      case ROUTES.ATIVIDADES_OE:
        const { renderSanctionPage: renderAOE } = await import('./pages/sanctionPage.js');
        await renderAOE(pageContent, FO_STATUS.ATIVIDADE_OE, 'Atividades de Orientação Educacional', FO_STATUS.CONSOLIDAR);
        break;

      case ROUTES.RETIRADAS:
        const { renderSanctionPage: renderRet } = await import('./pages/sanctionPage.js');
        await renderRet(pageContent, FO_STATUS.RETIRADA, 'Retiradas', FO_STATUS.CONSOLIDAR);
        break;

      // Gestão
      case ROUTES.CONSOLIDAR:
        const { renderConsolidarPage } = await import('./pages/consolidar.js');
        await renderConsolidarPage(pageContent);
        break;

      case ROUTES.CONCLUIR:
        const { renderConcluirPage } = await import('./pages/concluir.js');
        await renderConcluirPage(pageContent);
        break;

      case ROUTES.ENCERRADOS:
        const { renderEncerradosPage } = await import('./pages/encerrados.js');
        await renderEncerradosPage(pageContent);
        break;

      case ROUTES.GLPI:
        const { renderGLPIPage } = await import('./pages/glpi.js');
        await renderGLPIPage();
        break;

      // Relatórios
      case ROUTES.COMPORTAMENTO:
        const { renderComportamentoPage } = await import('./pages/comportamento.js');
        await renderComportamentoPage();
        break;

      case ROUTES.NOTAS_ADITAMENTO:
        const { renderNotasAditamentoPage } = await import('./pages/notasAditamento.js');
        await renderNotasAditamentoPage(pageContent);
        break;

      case ROUTES.PROCESSO_DISCIPLINAR:
        const { renderProcessoDisciplinarPage } = await import('./pages/processoDisciplinar.js');
        await renderProcessoDisciplinarPage(pageContent);
        break;

      // Configurações
      case ROUTES.DADOS_ALUNOS:
        const { renderDadosAlunosPage } = await import('./pages/dadosAlunos.js');
        await renderDadosAlunosPage();
        break;

      case ROUTES.AUDITORIA:
        const { renderAuditoriaPage } = await import('./pages/auditoria.js');
        await renderAuditoriaPage();
        break;

      case ROUTES.ESTATISTICAS:
        const { renderEstatisticasPage } = await import('./pages/estatisticas.js');
        await renderEstatisticasPage();
        break;

      case ROUTES.FALTAS_ESCOLARES:
        const { renderFaltasEscolaresPage } = await import('./pages/faltasEscolares.js');
        await renderFaltasEscolaresPage();
        break;

      case ROUTES.ADMIN:
        const { renderAdminPage } = await import('./pages/admin.js');
        await renderAdminPage();
        break;

      // Fallback
      default:
        renderNotFoundPage();
    }
  } catch (error) {
    console.error('Error loading page:', error);
    renderErrorPage(error.message);
  }
}

// Render destination page (for transferred FOs)
async function renderDestinationPage(status, title) {
  const pageContent = document.getElementById('page-content');
  const { icons } = await import('./utils/icons.js');
  const { db } = await import('./firebase/config.js');
  const { collection, getDocs, query, where } = await import('firebase/firestore');
  const { getCompanyFilter } = await import('./firebase/auth.js');
  const { COMPANY_NAMES, formatDate, TIPO_FATO_LABELS, TIPO_FATO_COLORS } = await import('./constants/index.js');

  const companyFilter = getCompanyFilter();

  pageContent.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">${title}</h1>
      <p class="page-header__subtitle">${companyFilter ? COMPANY_NAMES[companyFilter] : 'Todas as Companhias'}</p>
    </div>
    <div id="destination-content">
      <div style="display: flex; justify-content: center; padding: 3rem;">
        <span class="spinner spinner--lg"></span>
      </div>
    </div>
  `;

  try {
    let q;
    if (companyFilter) {
      q = query(
        collection(db, 'fatosObservados'),
        where('status', '==', status),
        where('company', '==', companyFilter)
      );
    } else {
      q = query(
        collection(db, 'fatosObservados'),
        where('status', '==', status)
      );
    }

    const snapshot = await getDocs(q);
    const fos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const container = document.getElementById('destination-content');

    if (fos.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card__body">
            <div class="empty-state">
              <div class="empty-state__icon">${icons.folder}</div>
              <div class="empty-state__title">Nenhum registro</div>
              <div class="empty-state__description">Nenhum FO com status "${title}" encontrado.</div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Nº Aluno</th>
              <th>Nome</th>
              <th>Turma</th>
              <th>Tipo</th>
              <th>Data</th>
              <th>Nº FO</th>
              <th>Qtd. Dias</th>
            </tr>
          </thead>
          <tbody>
            ${fos.map(fo => {
      const tipoColor = TIPO_FATO_COLORS[fo.tipo] || 'neutral';
      const tipoLabel = TIPO_FATO_LABELS[fo.tipo] || fo.tipo;
      return `
              <tr>
                <td><strong>${fo.studentNumbers?.[0] || '-'}</strong></td>
                <td>${fo.studentInfo?.[0]?.nome || '-'}</td>
                <td>${fo.studentInfo?.[0]?.turma || '-'}</td>
                <td><span class="badge badge--${tipoColor}">${tipoLabel}</span></td>
                <td>${formatDate(fo.dataFato)}</td>
                <td>${fo.numeroFO || '-'}</td>
                <td>${fo.quantidadeDias || '-'}</td>
              </tr>
            `;
    }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error('Error loading destination:', error);
    document.getElementById('destination-content').innerHTML = `
      <div class="alert alert--danger">
        <div class="alert__icon">${icons.warning}</div>
        <div class="alert__content">
          <p>Erro ao carregar dados: ${error.message}</p>
        </div>
      </div>
    `;
  }
}

// Coming soon placeholder
function renderComingSoonPage(title, description) {
  const pageContent = document.getElementById('page-content');

  pageContent.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">${title}</h1>
    </div>
    <div class="card">
      <div class="card__body">
        <div class="empty-state">
          <div class="empty-state__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="empty-state__title">Em Desenvolvimento</div>
          <div class="empty-state__description">${description}</div>
        </div>
      </div>
    </div>
  `;
}

// Not found page
function renderNotFoundPage() {
  const pageContent = document.getElementById('page-content');

  pageContent.innerHTML = `
    <div class="card">
      <div class="card__body">
        <div class="empty-state">
          <div class="empty-state__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="empty-state__title">Página não encontrada</div>
          <div class="empty-state__description">A página que você está procurando não existe.</div>
          <a href="/?page=${ROUTES.INICIAL}" class="btn btn--primary">Voltar ao Início</a>
        </div>
      </div>
    </div>
  `;
}

// Error page
function renderErrorPage(message) {
  const pageContent = document.getElementById('page-content');

  pageContent.innerHTML = `
    <div class="alert alert--danger">
      <div class="alert__icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      </div>
      <div class="alert__content">
        <div class="alert__title">Erro ao carregar página</div>
        <p>${message || 'Ocorreu um erro inesperado.'}</p>
      </div>
    </div>
  `;
}

// Handle browser navigation
window.addEventListener('popstate', () => {
  if (isAuthenticated()) {
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = urlParams.get('page') || ROUTES.INICIAL;
    renderMainLayout(currentPage);
    loadPage(currentPage);
    setupSidebarEvents();
    setupHeaderEvents();
  }
});

// Start application
document.addEventListener('DOMContentLoaded', init);
