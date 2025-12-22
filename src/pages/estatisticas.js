/**
 * Statistics Dashboard Page
 * Gestão Centralizada FO - CMB
 */

import { getFatosObservados, getStudents } from '../firebase/database.js';
import { getSession } from '../firebase/auth.js';
import {
  FO_STATUS,
  TIPO_FATO,
  COMPANY_NAMES,
  formatDate,
  USER_ROLES
} from '../constants/index.js';
import { icons } from '../utils/icons.js';
import Chart from 'chart.js/auto';

let currentFilter = {
  company: 'all',
  month: 'all'
};

let charts = {}; // Store chart instances
let allFOs = [];
let allStudents = [];

/**
 * Render Statistics Page
 */
export async function renderEstatisticasPage() {
  const pageContent = document.getElementById('page-content');
  const session = getSession();

  // Inject styles if needed
  if (!document.getElementById('stats-styles')) {
    const link = document.createElement('link');
    link.id = 'stats-styles';
    link.rel = 'stylesheet';
    link.href = './src/styles/estatisticas.css';
    document.head.appendChild(link);
  }

  pageContent.innerHTML = `
    <div class="stats-dashboard">
      ${renderFilters(session)}
      
      <div id="stats-content">
        <div style="display: flex; justify-content: center; padding: 3rem;">
          <span class="spinner spinner--lg"></span>
        </div>
      </div>
    </div>
  `;

  // Initial load
  await loadData();
  setupEventListeners();
}

/**
 * Render Filters (Visible only for Admin/CA)
 */
function renderFilters(session) {
  const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.COMANDO_CA].includes(session?.role);

  if (!isAdmin) return '';

  return `
    <div class="filters-bar">
      <div class="form-group" style="margin-bottom: 0; min-width: 200px;">
        <label class="form-label">Companhia</label>
        <select id="filter-company" class="form-select">
          <option value="all">Todas as Companhias</option>
          ${Object.entries(COMPANY_NAMES).map(([key, label]) =>
    `<option value="${key}">${label}</option>`
  ).join('')}
        </select>
      </div>
    </div>
  `;
}

/**
 * Load and Process Data
 */
async function loadData() {
  try {
    const session = getSession();
    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.COMANDO_CA].includes(session?.role);

    // Fetch data
    const [fos, students] = await Promise.all([
      getFatosObservados({ limit: 1000 }), // Get reasonably large dataset
      getStudents()
    ]);

    allFOs = fos;
    allStudents = students;

    // Apply initial filter for commanders
    if (!isAdmin && session.company) {
      currentFilter.company = session.company;
    }

    renderDashboard();

  } catch (error) {
    console.error('Error loading stats:', error);
    document.getElementById('stats-content').innerHTML = `
      <div class="alert alert--danger">
        <div class="alert__icon">${icons.error}</div>
        <div class="alert__content">
          <p>Erro ao carregar estatísticas: ${error.message}</p>
        </div>
      </div>
    `;
  }
}

/**
 * Filter Data based on selection
 */
function getFilteredData() {
  let filteredFOs = allFOs;
  let filteredStudents = allStudents;

  if (currentFilter.company !== 'all') {
    filteredFOs = filteredFOs.filter(fo => fo.company === currentFilter.company);
    filteredStudents = filteredStudents.filter(s => s.company === currentFilter.company);
  }

  return { filteredFOs, filteredStudents };
}

/**
 * Render Dashboard Content
 */
function renderDashboard() {
  const { filteredFOs, filteredStudents } = getFilteredData();
  const container = document.getElementById('stats-content');

  // Process Statistics
  const stats = processStats(filteredFOs, filteredStudents);

  container.innerHTML = `
    <!-- Top Cards -->
    <div class="stats-grid">
      <div class="stats-card">
        <div class="stats-card__icon" style="color: var(--color-warning-600); background: var(--color-warning-50)">
          ${icons.warning}
        </div>
        <div class="stats-card__value">${stats.pendentes}</div>
        <div class="stats-card__label">FOs Pendentes</div>
      </div>
      
      <div class="stats-card">
        <div class="stats-card__icon" style="color: var(--color-success-600); background: var(--color-success-50)">
          ${icons.check}
        </div>
        <div class="stats-card__value">${stats.positivos}</div>
        <div class="stats-card__label">FOs Positivos</div>
      </div>
      
      <div class="stats-card">
        <div class="stats-card__icon" style="color: var(--color-danger-600); background: var(--color-danger-50)">
          ${icons.close}
        </div>
        <div class="stats-card__value">${stats.negativos}</div>
        <div class="stats-card__label">FOs Negativos</div>
      </div>
      
      <div class="stats-card">
        <div class="stats-card__icon" style="color: var(--color-neutral-600); background: var(--color-neutral-100)">
          ${icons.document}
        </div>
        <div class="stats-card__value">${stats.neutros}</div>
        <div class="stats-card__label">FOs Neutros</div>
      </div>
      
      <div class="stats-card">
        <div class="stats-card__icon" style="color: var(--color-info-600); background: var(--color-info-50)">
          ${icons.users}
        </div>
        <div class="stats-card__value">${stats.totalAlunos}</div>
        <div class="stats-card__label">Alunos Ativos</div>
      </div>
    </div>
    
    <!-- Monthly Breakdown Table -->
    <div class="card" style="margin-bottom: var(--space-4);">
      <div class="card__header">
        <h3 class="card__title">Resumo Mensal</h3>
      </div>
      <div class="card__body" style="padding: 0; overflow-x: auto;">
        <table class="table">
          <thead>
            <tr>
              <th>Mês</th>
              <th style="text-align: center;">Positivos</th>
              <th style="text-align: center;">Negativos</th>
              <th style="text-align: center;">Neutros</th>
              <th style="text-align: center;">Sanções</th>
              <th style="text-align: center;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${renderMonthlyTable(stats.monthlyBreakdown)}
          </tbody>
        </table>
      </div>
    </div>


    <!-- Charts Row 1 -->
    <div class="charts-grid">
      <div class="chart-container">
        <div class="chart-header">
          <h3 class="chart-title">Distribuição de Sanções</h3>
        </div>
        <div class="chart-wrapper">
          <canvas id="sancoesChart"></canvas>
        </div>
      </div>
      
      <div class="chart-container">
        <div class="chart-header">
          <h3 class="chart-title">Comportamento dos Alunos</h3>
        </div>
        <div class="chart-wrapper">
          <canvas id="comportamentoChart"></canvas>
        </div>
      </div>
    </div>
    
    <!-- Charts Row 2 -->
    <div class="charts-grid">
      <div class="chart-container">
        <div class="chart-header">
          <h3 class="chart-title">FOs por Turma</h3>
        </div>
        <div class="chart-wrapper">
          <canvas id="turmasChart"></canvas>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-header">
          <h3 class="chart-title">FOs por Observador (Top 10)</h3>
        </div>
        <div class="chart-wrapper">
          <canvas id="observadoresChart"></canvas>
        </div>
      </div>
    </div>
    
    <!-- Charts Row 3 -->
    <div class="chart-container" style="margin-bottom: var(--space-8);">
      <div class="chart-header">
        <h3 class="chart-title">Evolução Mensal (Lançamentos vs Julgamentos)</h3>
      </div>
      <div class="chart-wrapper">
        <canvas id="evolucaoChart"></canvas>
      </div>
    </div>

    <!-- Top Students Lists -->
    <div class="top-students-grid">
      <!-- Top Negativos -->
      <div class="analysis-section">
        <div class="analysis-header" style="border-left: 4px solid var(--color-danger-500)">
          <h3 class="analysis-title">Top 10 - Mais FOs Negativos</h3>
        </div>
        <ul class="rank-list">
          ${renderStudentRankList(stats.topNegativos, 'negativo')}
        </ul>
      </div>
      
      <!-- Top Positivos -->
      <div class="analysis-section">
        <div class="analysis-header" style="border-left: 4px solid var(--color-success-500)">
          <h3 class="analysis-title">Top 10 - Mais FOs Positivos</h3>
        </div>
        <ul class="rank-list">
          ${renderStudentRankList(stats.topPositivos, 'positivo')}
        </ul>
      </div>
    </div>
  `;

  // Init Charts
  initCharts(stats);
}

/**
 * Process raw data into statistics
 */
function processStats(fos, students) {
  // 1. Basic Counts
  const pendentes = fos.filter(fo => fo.status === FO_STATUS.PENDENTE).length;
  const positivos = fos.filter(fo => fo.tipo === TIPO_FATO.POSITIVO).length;
  const negativos = fos.filter(fo => fo.tipo === TIPO_FATO.NEGATIVO).length;
  const neutros = fos.filter(fo => fo.tipo === TIPO_FATO.NEUTRO).length;

  // 2. Sanctions Distribution
  const sancoes = {
    advertencia: fos.filter(fo => fo.status === FO_STATUS.ADVERTENCIA || fo.status === FO_STATUS.REPREENSAO || fo.status === FO_STATUS.ATIVIDADE_OE || fo.status === FO_STATUS.RETIRADA).length, // Grouping 'Active Sanctions pages'
    justificados: fos.filter(fo => fo.sancaoDisciplinar === 'JUSTIFICADO').length,
    neutros: fos.filter(fo => fo.tipo === TIPO_FATO.NEUTRO).length,
    concluidos: fos.filter(fo => fo.status === FO_STATUS.CONCLUIR || fo.status === FO_STATUS.ENCERRADO).length
  };

  // Specific Sanction Counts for Chart
  const sancoesTypes = {
    'Advertência': fos.filter(fo => fo.sancaoDisciplinar === 'ADVERTENCIA' || fo.status === FO_STATUS.ADVERTENCIA).length,
    'Repreensão': fos.filter(fo => fo.sancaoDisciplinar === 'REPREENSAO' || fo.status === FO_STATUS.REPREENSAO).length,
    'AOE': fos.filter(fo => fo.sancaoDisciplinar === 'ATIVIDADE_OE' || fo.status === FO_STATUS.ATIVIDADE_OE).length,
    'Retirada': fos.filter(fo => fo.sancaoDisciplinar === 'RETIRADA' || fo.status === FO_STATUS.RETIRADA).length,
    'Justificado': sancoes.justificados
  };

  // 3. Behavior Zones
  const comportamento = {
    'Excepcional (10)': students.filter(s => (s.notaComportamento || 10) === 10).length,
    'Ótimo (9-9.9)': students.filter(s => { const n = s.notaComportamento || 10; return n >= 9 && n < 10; }).length,
    'Bom (6-8.9)': students.filter(s => { const n = s.notaComportamento || 10; return n >= 6 && n < 9; }).length,
    'Regular (5-5.9)': students.filter(s => { const n = s.notaComportamento || 10; return n >= 5 && n < 6; }).length,
    'Insuficiente (3-4.9)': students.filter(s => { const n = s.notaComportamento || 10; return n >= 3 && n < 5; }).length,
    'Mau (< 3)': students.filter(s => { const n = s.notaComportamento || 10; return n < 3; }).length
  };

  // 4. Monthly Evolution
  const months = {};
  fos.forEach(fo => {
    // Registered Month
    if (fo.createdAt?.toDate) {
      const date = fo.createdAt.toDate();
      const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
      if (!months[key]) months[key] = { registered: 0, judged: 0, label: key, date: date };
      months[key].registered++;
    }

    // Judged Month (Sent Email)
    if (fo.emailEnviadoEm) {
      const date = new Date(fo.emailEnviadoEm);
      const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
      if (!months[key]) months[key] = { registered: 0, judged: 0, label: key, date: date };
      months[key].judged++;
    }
  });

  const monthlyData = Object.values(months).sort((a, b) => a.date - b.date);

  // 5. Top Students
  // Count FOs per student
  const studentStats = {};
  fos.forEach(fo => {
    if (!studentStats[fo.studentNumber]) {
      studentStats[fo.studentNumber] = {
        negativos: 0,
        positivos: 0,
        student: students.find(s => s.numero == fo.studentNumber) || { nome: 'Aluno Desconhecido', numero: fo.studentNumber, turma: '?' }
      };
    }
    if (fo.tipo === TIPO_FATO.NEGATIVO) studentStats[fo.studentNumber].negativos++;
    if (fo.tipo === TIPO_FATO.POSITIVO) studentStats[fo.studentNumber].positivos++;
  });

  const topNegativos = Object.values(studentStats)
    .sort((a, b) => b.negativos - a.negativos)
    .slice(0, 10)
    .filter(s => s.negativos > 0);

  const topPositivos = Object.values(studentStats)
    .sort((a, b) => b.positivos - a.positivos)
    .slice(0, 10)
    .filter(s => s.positivos > 0);

  // 6. Turmas Stats
  const turmas = {};
  fos.forEach(fo => {
    const student = students.find(s => s.numero == fo.studentNumber);
    const turma = student?.turma || 'Não Identificada';
    if (!turmas[turma]) turmas[turma] = 0;
    turmas[turma]++;
  });
  const turmasData = Object.entries(turmas)
    .sort((a, b) => b[1] - a[1]) // Sort by count desc
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  // 7. Observadores Stats
  const observadores = {};
  fos.forEach(fo => {
    const obs = fo.registradoPor || 'Anônimo';
    if (!observadores[obs]) observadores[obs] = 0;
    observadores[obs]++;
  });
  const observadoresData = Object.entries(observadores)
    .sort((a, b) => b[1] - a[1]) // Sort by count desc
    .slice(0, 10) // Top 10
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  // 8. Monthly Breakdown by Type
  const monthlyBreakdown = {};
  fos.forEach(fo => {
    let date = null;
    if (fo.createdAt?.toDate) {
      date = fo.createdAt.toDate();
    } else if (fo.createdAt) {
      date = new Date(fo.createdAt);
    }
    if (!date) return;

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = new Date(date.getFullYear(), date.getMonth(), 1)
      .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

    if (!monthlyBreakdown[monthKey]) {
      monthlyBreakdown[monthKey] = {
        label: monthLabel,
        positivos: 0,
        negativos: 0,
        neutros: 0,
        sancoes: 0,
        total: 0
      };
    }

    monthlyBreakdown[monthKey].total++;

    if (fo.tipo === TIPO_FATO.POSITIVO) monthlyBreakdown[monthKey].positivos++;
    if (fo.tipo === TIPO_FATO.NEGATIVO) monthlyBreakdown[monthKey].negativos++;
    if (fo.tipo === TIPO_FATO.NEUTRO) monthlyBreakdown[monthKey].neutros++;

    // Count sanctions
    if (fo.sancaoDisciplinar && fo.sancaoDisciplinar !== 'JUSTIFICADO') {
      monthlyBreakdown[monthKey].sancoes++;
    }
  });

  // Sort by month
  const sortedMonthlyBreakdown = Object.entries(monthlyBreakdown)
    .sort((a, b) => b[0].localeCompare(a[0])) // Most recent first
    .map(([key, value]) => value);

  return {
    totalAlunos: students.length,
    pendentes,
    positivos,
    negativos,
    neutros,
    sancoesTypes,
    comportamento,
    monthlyData,
    monthlyBreakdown: sortedMonthlyBreakdown,
    topNegativos,
    topPositivos,
    turmasData,
    observadoresData
  };
}

/**
 * Initialize Charts using Chart.js
 */
function initCharts(stats) {
  // Destroy existing charts
  Object.values(charts).forEach(chart => chart.destroy());

  // 1. Sanções Chart
  const ctxSancoes = document.getElementById('sancoesChart');
  charts.sancoes = new Chart(ctxSancoes, {
    type: 'doughnut',
    data: {
      labels: Object.keys(stats.sancoesTypes),
      datasets: [{
        data: Object.values(stats.sancoesTypes),
        backgroundColor: [
          '#EF4444', // Advertência (Red)
          '#B91C1C', // Repreensão (Dark Red)
          '#F59E0B', // AOE (Amber)
          '#7F1D1D', // Retirada (Very Dark Red)
          '#10B981'  // Justificado (Green)
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // 2. Comportamento Chart
  const ctxComp = document.getElementById('comportamentoChart');
  charts.comportamento = new Chart(ctxComp, {
    type: 'pie',
    data: {
      labels: Object.keys(stats.comportamento),
      datasets: [{
        data: Object.values(stats.comportamento),
        backgroundColor: [
          '#3B82F6', // Excepcional (Blue)
          '#60A5FA', // Ótimo (Light Blue)
          '#34D399', // Bom (Green)
          '#FBBF24', // Regular (Yellow)
          '#F87171', // Insuficiente (Red)
          '#991B1B'  // Mau (Dark Red)
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });

  // 3. Evolution Chart
  const ctxEvo = document.getElementById('evolucaoChart');
  charts.evolucao = new Chart(ctxEvo, {
    type: 'line',
    data: {
      labels: stats.monthlyData.map(d => d.label),
      datasets: [
        {
          label: 'Registros (FOs)',
          data: stats.monthlyData.map(d => d.registered),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Julgamentos (Sanções)',
          data: stats.monthlyData.map(d => d.judged),
          borderColor: '#10B981',
          fill: false,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // 4. Turmas Chart
  charts.turmas = new Chart(document.getElementById('turmasChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(stats.turmasData),
      datasets: [{
        label: 'Total de FOs',
        data: Object.values(stats.turmasData),
        backgroundColor: '#8B5CF6' // Purple
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // 5. Observadores Chart (Horizontal Bar)
  charts.observadores = new Chart(document.getElementById('observadoresChart'), {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels: Object.keys(stats.observadoresData),
      datasets: [{
        label: 'Total de Registros',
        data: Object.values(stats.observadoresData),
        backgroundColor: '#EC4899' // Pink
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

/**
 * Render Student Rank List Item
 */
function renderStudentRankList(list, type) {
  if (list.length === 0) {
    return `
      <li class="rank-item" style="justify-content: center; color: var(--text-tertiary);">
        Nenhum registro encontrado
      </li>
    `;
  }

  return list.map((item, index) => `
    <li class="rank-item">
      <div class="rank-info">
        <span class="rank-position">#${index + 1}</span>
        <div class="rank-details">
          <span class="rank-name">${item.student.nome}</span>
          <span class="rank-meta">Nº ${item.student.numero} • Turma ${item.student.turma}</span>
        </div>
      </div>
      <span class="rank-value">${type === 'negativo' ? item.negativos : item.positivos}</span>
    </li>
  `).join('');
}

/**
 * Render Monthly Breakdown Table
 */
function renderMonthlyTable(data) {
  if (!data || data.length === 0) {
    return `<tr><td colspan="6" style="text-align: center; color: var(--text-tertiary);">Nenhum dado disponível</td></tr>`;
  }

  return data.map(row => `
    <tr>
      <td><strong>${row.label}</strong></td>
      <td style="text-align: center; color: var(--color-success-600);">${row.positivos}</td>
      <td style="text-align: center; color: var(--color-danger-600);">${row.negativos}</td>
      <td style="text-align: center; color: var(--text-secondary);">${row.neutros}</td>
      <td style="text-align: center; color: var(--color-warning-600);">${row.sancoes}</td>
      <td style="text-align: center;"><strong>${row.total}</strong></td>
    </tr>
  `).join('');
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  const companyFilter = document.getElementById('filter-company');
  if (companyFilter) {
    companyFilter.addEventListener('change', (e) => {
      currentFilter.company = e.target.value;
      renderDashboard();
    });
  }
}
