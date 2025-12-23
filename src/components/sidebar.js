// Sidebar Component - Updated with new menu structure
// Gestão Centralizada FO - CMB

import { getSession, logout, canViewAudit, isAdmin } from '../firebase/auth.js';
import { ROUTES, PAGE_TITLES, COMPANY_SHORT_NAMES } from '../constants/index.js';
import { icons } from '../utils/icons.js';

export function renderSidebar(activePage = 'inicial') {
  const session = getSession();
  const isConfigOpen = ['dados-alunos', 'auditoria', 'admin'].includes(activePage);

  const sidebarHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar__header">
        <div class="sidebar__logo">
          <div class="sidebar__logo-icon">
            <img src="/images/CMB.jpeg" alt="Logo CMB" style="width: 100%; height: 100%; border-radius: 8px; object-fit: contain;">
          </div>
          <div class="sidebar__logo-text">
            Gestão FO
            <span>CMB</span>
          </div>
        </div>
      </div>
      
      <nav class="sidebar__nav">
        <div class="sidebar__nav-group">
          <div class="sidebar__nav-label">Menu Principal</div>
          
          <a href="/?page=${ROUTES.INICIAL}" class="sidebar__nav-item ${activePage === ROUTES.INICIAL ? 'active' : ''}" data-page="${ROUTES.INICIAL}">
            ${icons.dashboard}
            <span>${PAGE_TITLES[ROUTES.INICIAL]}</span>
          </a>
          
          <a href="/?page=${ROUTES.ADVERTENCIAS}" class="sidebar__nav-item ${activePage === ROUTES.ADVERTENCIAS ? 'active' : ''}" data-page="${ROUTES.ADVERTENCIAS}">
            ${icons.warning}
            <span>${PAGE_TITLES[ROUTES.ADVERTENCIAS]}</span>
          </a>
          
          <a href="/?page=${ROUTES.REPREENSOES}" class="sidebar__nav-item ${activePage === ROUTES.REPREENSOES ? 'active' : ''}" data-page="${ROUTES.REPREENSOES}">
            ${icons.thumbsDown}
            <span>${PAGE_TITLES[ROUTES.REPREENSOES]}</span>
          </a>
          
          <a href="/?page=${ROUTES.ATIVIDADES_OE}" class="sidebar__nav-item ${activePage === ROUTES.ATIVIDADES_OE ? 'active' : ''}" data-page="${ROUTES.ATIVIDADES_OE}">
            ${icons.users}
            <span>${PAGE_TITLES[ROUTES.ATIVIDADES_OE]}</span>
          </a>
          
          <a href="/?page=${ROUTES.RETIRADAS}" class="sidebar__nav-item ${activePage === ROUTES.RETIRADAS ? 'active' : ''}" data-page="${ROUTES.RETIRADAS}">
            ${icons.logout}
            <span>${PAGE_TITLES[ROUTES.RETIRADAS]}</span>
          </a>
        </div>
        
        <div class="sidebar__nav-group">
          <div class="sidebar__nav-label">Gestão</div>
          
          <a href="/?page=${ROUTES.CONSOLIDAR}" class="sidebar__nav-item ${activePage === ROUTES.CONSOLIDAR ? 'active' : ''}" data-page="${ROUTES.CONSOLIDAR}">
            ${icons.folder}
            <span>${PAGE_TITLES[ROUTES.CONSOLIDAR]}</span>
          </a>
          
          <a href="/?page=${ROUTES.CONCLUIR}" class="sidebar__nav-item ${activePage === ROUTES.CONCLUIR ? 'active' : ''}" data-page="${ROUTES.CONCLUIR}">
            ${icons.checkCircle}
            <span>${PAGE_TITLES[ROUTES.CONCLUIR]}</span>
          </a>
          
          <a href="/?page=${ROUTES.ENCERRADOS}" class="sidebar__nav-item ${activePage === ROUTES.ENCERRADOS ? 'active' : ''}" data-page="${ROUTES.ENCERRADOS}">
            ${icons.check}
            <span>${PAGE_TITLES[ROUTES.ENCERRADOS]}</span>
          </a>
          
          <a href="/?page=${ROUTES.GLPI}" class="sidebar__nav-item ${activePage === ROUTES.GLPI ? 'active' : ''}" data-page="${ROUTES.GLPI}">
            ${icons.trash}
            <span>${PAGE_TITLES[ROUTES.GLPI]}</span>
          </a>
          
          <a href="/?page=${ROUTES.FALTAS_ESCOLARES}" class="sidebar__nav-item ${activePage === ROUTES.FALTAS_ESCOLARES ? 'active' : ''}" data-page="${ROUTES.FALTAS_ESCOLARES}">
            ${icons.calendar}
            <span>${PAGE_TITLES[ROUTES.FALTAS_ESCOLARES]}</span>
          </a>
        </div>
        
        <div class="sidebar__nav-group">
          <div class="sidebar__nav-label">Relatórios</div>
          
          <a href="/?page=${ROUTES.ESTATISTICAS}" class="sidebar__nav-item ${activePage === ROUTES.ESTATISTICAS ? 'active' : ''}" data-page="${ROUTES.ESTATISTICAS}">
            ${icons.chart}
            <span>${PAGE_TITLES[ROUTES.ESTATISTICAS]}</span>
          </a>

          <a href="/?page=${ROUTES.COMPORTAMENTO}" class="sidebar__nav-item ${activePage === ROUTES.COMPORTAMENTO ? 'active' : ''}" data-page="${ROUTES.COMPORTAMENTO}">
            ${icons.document}
            <span>${PAGE_TITLES[ROUTES.COMPORTAMENTO]}</span>
          </a>
          
          <a href="/?page=${ROUTES.NOTAS_ADITAMENTO}" class="sidebar__nav-item ${activePage === ROUTES.NOTAS_ADITAMENTO ? 'active' : ''}" data-page="${ROUTES.NOTAS_ADITAMENTO}">
            ${icons.edit}
            <span>Notas Aditamento</span>
          </a>
          
          <a href="/?page=${ROUTES.PROCESSO_DISCIPLINAR}" class="sidebar__nav-item ${activePage === ROUTES.PROCESSO_DISCIPLINAR ? 'active' : ''}" data-page="${ROUTES.PROCESSO_DISCIPLINAR}">
            ${icons.folder}
            <span>Proc. Disciplinar</span>
          </a>
        </div>
        
        <div class="sidebar__nav-group">
          <div class="sidebar__nav-label">Sistema</div>
          
          <!-- Configurações com submenu -->
          <div class="sidebar__nav-submenu ${isConfigOpen ? 'open' : ''}" id="config-submenu">
            <button class="sidebar__nav-item sidebar__nav-toggle" id="config-toggle">
              ${icons.settings}
              <span>Configurações</span>
              <span class="sidebar__nav-chevron">${icons.chevronDown}</span>
            </button>
            
            <div class="sidebar__submenu-items">
              <a href="/?page=${ROUTES.DADOS_ALUNOS}" class="sidebar__nav-item sidebar__nav-item--sub ${activePage === ROUTES.DADOS_ALUNOS ? 'active' : ''}" data-page="${ROUTES.DADOS_ALUNOS}">
                ${icons.users}
                <span>Dados Alunos</span>
              </a>
              
              ${canViewAudit() ? `
                <a href="/?page=${ROUTES.AUDITORIA}" class="sidebar__nav-item sidebar__nav-item--sub ${activePage === ROUTES.AUDITORIA ? 'active' : ''}" data-page="${ROUTES.AUDITORIA}">
                  ${icons.audit}
                  <span>Auditoria</span>
                </a>
              ` : ''}
              
              ${isAdmin() ? `
                <a href="/?page=${ROUTES.ADMIN}" class="sidebar__nav-item sidebar__nav-item--sub ${activePage === ROUTES.ADMIN ? 'active' : ''}" data-page="${ROUTES.ADMIN}">
                  ${icons.lock}
                  <span>Administração</span>
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      </nav>
      
      <div class="sidebar__footer">
        <div class="sidebar__user">
          ${session.company ? `
            <img 
              src="/images/companies/${session.company}.${session.company === '2cia' ? 'jpg' : 'jpeg'}" 
              alt="${COMPANY_SHORT_NAMES[session.company] || session.company}" 
              class="sidebar__company-logo"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            />
            <div class="avatar" style="display: none;">${getInitials(session.username)}</div>
          ` : `
            <div class="avatar">${getInitials(session.username)}</div>
          `}
          <div class="sidebar__user-info">
            <div class="sidebar__user-name">${session.username}</div>
            <div class="sidebar__user-role">${getRoleLabel(session.role)}${session.company ? ` • ${COMPANY_SHORT_NAMES[session.company] || session.company}` : ''}</div>
          </div>
          <button class="btn btn--icon btn--ghost" id="logout-btn" title="Sair" style="color: var(--color-gray-400);">
            ${icons.logout}
          </button>
        </div>
      </div>
    </aside>
    
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
  `;

  return sidebarHTML;
}

export function setupSidebarEvents() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const menuBtn = document.getElementById('menu-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const configToggle = document.getElementById('config-toggle');
  const configSubmenu = document.getElementById('config-submenu');

  // Mobile menu toggle
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
  }

  // Close sidebar on overlay click
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Deseja realmente sair?')) {
        logout();
      }
    });
  }

  // Config submenu toggle
  if (configToggle && configSubmenu) {
    configToggle.addEventListener('click', (e) => {
      e.preventDefault();
      configSubmenu.classList.toggle('open');
    });
  }

  // Handle nav item clicks for SPA navigation
  const navItems = document.querySelectorAll('.sidebar__nav-item:not(.sidebar__nav-toggle)');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      // Close mobile menu
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  });
}

function getInitials(username) {
  if (!username) return '?';
  const match = username.match(/([A-Za-z]).*?(\d)/);
  if (match) {
    return match[1].toUpperCase() + match[2];
  }
  return username.substring(0, 2).toUpperCase();
}

function getRoleLabel(role) {
  const labels = {
    'admin': 'Administrador',
    'comandoCA': 'Comando CA',
    'commander': 'Comandante',
    'sergeant': 'Sargenteante'
  };
  return labels[role] || role;
}
