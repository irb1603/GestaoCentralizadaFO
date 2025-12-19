// Dashboard Page Component
// Gestão Centralizada FO - CMB

import { getSession, COMPANY_NAMES } from '../firebase/auth.js';
import { getDashboardStats, getFatosObservados } from '../firebase/database.js';
import { icons } from '../utils/icons.js';

export async function renderDashboardPage() {
    const session = getSession();
    const pageContent = document.getElementById('page-content');

    // Show loading
    pageContent.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Dashboard</h1>
      <p class="page-header__subtitle">
        ${session.company ? COMPANY_NAMES[session.company] || session.company : 'Visão Geral - Todas as Companhias'}
      </p>
    </div>
    <div style="display: flex; justify-content: center; padding: 3rem;">
      <span class="spinner spinner--lg"></span>
    </div>
  `;

    try {
        // Get stats
        const stats = await getDashboardStats();
        const recentFOs = await getFatosObservados({ limit: 5 });

        pageContent.innerHTML = `
      <div class="page-header">
        <h1 class="page-header__title">Dashboard</h1>
        <p class="page-header__subtitle">
          ${session.company ? COMPANY_NAMES[session.company] || session.company : 'Visão Geral - Todas as Companhias'}
        </p>
      </div>
      
      <!-- Stats Grid -->
      <div class="stats-grid fade-in-up">
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--primary">
            ${icons.document}
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">${stats.total}</div>
            <div class="stat-card__label">Total de FOs</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--warning">
            ${icons.clock}
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">${stats.pendentes}</div>
            <div class="stat-card__label">Pendentes</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--primary">
            ${icons.folder}
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">${stats.emProcesso}</div>
            <div class="stat-card__label">Em Processo</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--success">
            ${icons.checkCircle}
          </div>
          <div class="stat-card__content">
            <div class="stat-card__value">${stats.concluidos}</div>
            <div class="stat-card__label">Concluídos</div>
          </div>
        </div>
      </div>
      
      <!-- Two Column Layout -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: var(--space-6);">
        
        <!-- Recent FOs -->
        <div class="card fade-in-up" style="animation-delay: 0.1s;">
          <div class="card__header">
            <h3 class="card__title">Últimos Fatos Observados</h3>
            <a href="/?page=fatos-observados" class="btn btn--ghost btn--sm">Ver todos</a>
          </div>
          <div class="card__body" style="padding: 0;">
            ${recentFOs.length > 0 ? `
              <div class="table-container" style="border: none; border-radius: 0;">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Aluno(s)</th>
                      <th>Data</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${recentFOs.map(fo => `
                      <tr>
                        <td>
                          <span class="badge badge--${fo.tipo === 'positivo' ? 'success' : 'danger'}">
                            ${fo.tipo === 'positivo' ? 'Positivo' : 'Negativo'}
                          </span>
                        </td>
                        <td>${Array.isArray(fo.studentNumbers) ? fo.studentNumbers.join(', ') : fo.studentNumbers || '-'}</td>
                        <td>${fo.dataFato || '-'}</td>
                        <td>
                          <span class="badge badge--${getStatusColor(fo.status)}">
                            ${getStatusLabel(fo.status)}
                          </span>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div class="empty-state">
                <div class="empty-state__icon">${icons.document}</div>
                <div class="empty-state__title">Nenhum FO registrado</div>
                <div class="empty-state__description">
                  Os fatos observados registrados aparecerão aqui.
                </div>
              </div>
            `}
          </div>
        </div>
        
        <!-- Quick Stats -->
        <div class="card fade-in-up" style="animation-delay: 0.2s;">
          <div class="card__header">
            <h3 class="card__title">Resumo por Tipo</h3>
          </div>
          <div class="card__body">
            <div style="display: flex; flex-direction: column; gap: var(--space-4);">
              <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); background: var(--color-success-50); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: var(--space-3);">
                  <div style="color: var(--color-success-600);">${icons.thumbsUp}</div>
                  <span style="font-weight: 500; color: var(--color-success-700);">Positivos</span>
                </div>
                <span style="font-size: var(--font-size-xl); font-weight: 700; color: var(--color-success-700);">${stats.positivos}</span>
              </div>
              
              <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); background: var(--color-danger-50); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: var(--space-3);">
                  <div style="color: var(--color-danger-600);">${icons.thumbsDown}</div>
                  <span style="font-weight: 500; color: var(--color-danger-700);">Negativos</span>
                </div>
                <span style="font-size: var(--font-size-xl); font-weight: 700; color: var(--color-danger-700);">${stats.negativos}</span>
              </div>
              
              <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); background: var(--color-primary-50); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: var(--space-3);">
                  <div style="color: var(--color-primary-600);">${icons.users}</div>
                  <span style="font-weight: 500; color: var(--color-primary-700);">Total de Alunos</span>
                </div>
                <span style="font-size: var(--font-size-xl); font-weight: 700; color: var(--color-primary-700);">${stats.totalAlunos}</span>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
        pageContent.innerHTML = `
      <div class="page-header">
        <h1 class="page-header__title">Dashboard</h1>
      </div>
      <div class="alert alert--warning">
        <div class="alert__icon">${icons.warning}</div>
        <div class="alert__content">
          <div class="alert__title">Não foi possível carregar os dados</div>
          <p>Verifique a configuração do Firebase ou tente novamente mais tarde.</p>
        </div>
      </div>
    `;
    }
}

function getStatusColor(status) {
    const colors = {
        'pendente': 'warning',
        'em_processo': 'primary',
        'concluido': 'success'
    };
    return colors[status] || 'neutral';
}

function getStatusLabel(status) {
    const labels = {
        'pendente': 'Pendente',
        'em_processo': 'Em Processo',
        'concluido': 'Concluído'
    };
    return labels[status] || status;
}
