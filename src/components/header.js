// Header Component
// Gestão Centralizada FO - CMB

import { getSession, COMPANY_NAMES } from '../firebase/auth.js';
import { icons } from '../utils/icons.js';

export function renderHeader(pageTitle = 'Dashboard') {
  const session = getSession();
  const currentTheme = localStorage.getItem('theme') || 'light';
  const isDark = currentTheme === 'dark';

  return `
    <header class="header">
      <div class="header__left">
        <button class="header__menu-btn" id="menu-btn" aria-label="Menu">
          ${icons.menu}
        </button>
        <h1 class="header__title">${pageTitle}</h1>
      </div>
      
      <div class="header__right">
        ${session.company ? `
          <span class="badge badge--primary" style="padding: var(--space-2) var(--space-3);">
            ${COMPANY_NAMES[session.company] || session.company}
          </span>
        ` : ''}
        
        <button class="header__theme-btn" id="theme-toggle-btn" aria-label="Alternar tema" title="${isDark ? 'Modo claro' : 'Modo escuro'}">
          ${isDark ? icons.sun : icons.moon}
        </button>
        
        <div class="dropdown" id="user-dropdown">
          <button class="avatar" id="user-menu-btn" title="${session.username}">
            ${getInitials(session.username)}
          </button>
          <div class="dropdown__menu" id="user-menu">
            <div style="padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--border-light);">
              <div style="font-weight: 600; color: var(--text-primary);">${session.username}</div>
              <div style="font-size: var(--font-size-xs); color: var(--text-tertiary);">${getRoleLabel(session.role)}</div>
            </div>
            <a href="/?page=configuracoes" class="dropdown__item">
              ${icons.settings}
              <span>Configurações</span>
            </a>
            <div class="dropdown__divider"></div>
            <button class="dropdown__item" id="header-logout-btn">
              ${icons.logout}
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  `;
}

export function setupHeaderEvents() {
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userMenu = document.getElementById('user-menu');
  const headerLogoutBtn = document.getElementById('header-logout-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');

  // Initialize theme on load
  initTheme();

  if (userMenuBtn && userMenu) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenu.classList.toggle('active');
    });

    // Close on click outside
    document.addEventListener('click', () => {
      userMenu.classList.remove('active');
    });
  }

  if (headerLogoutBtn) {
    headerLogoutBtn.addEventListener('click', () => {
      if (confirm('Deseja realmente sair?')) {
        import('../firebase/auth.js').then(({ logout }) => logout());
      }
    });
  }

  // Theme toggle event
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      toggleTheme();
    });
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);

  // Update button icon
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.innerHTML = newTheme === 'dark' ? icons.sun : icons.moon;
    themeToggleBtn.title = newTheme === 'dark' ? 'Modo claro' : 'Modo escuro';
  }
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
    'sergeant': 'Sargenteante',
    'auxiliar': 'Auxiliar'
  };
  return labels[role] || role;
}
