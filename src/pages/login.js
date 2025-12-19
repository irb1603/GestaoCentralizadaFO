// Login Page Component
// Gestão Centralizada FO - CMB

import { login } from '../firebase/auth.js';
import { icons } from '../utils/icons.js';

export function renderLoginPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="login-page">
      <div class="login-card fade-in">
        <div class="login-card__header">
          <div class="login-card__logo">
            <img src="/images/CMB.jpeg" alt="Logo CMB" style="width: 100%; height: 100%; border-radius: 12px; object-fit: cover;">
          </div>
          <h1 class="login-card__title">Gestão Centralizada FO</h1>
          <p class="login-card__subtitle">Colégio Militar de Brasília</p>
        </div>
        
        <div class="login-card__body">
          <form id="login-form">
            <div class="form-group">
              <label class="form-label form-label--required" for="username">Usuário</label>
              <input type="text" class="form-input" id="username" name="username" 
                     placeholder="Ex: Cmt6cia, Sgte7cia, Admin" required autocomplete="username">
            </div>
            
            <div class="form-group">
              <label class="form-label form-label--required" for="password">Senha</label>
              <input type="password" class="form-input" id="password" name="password" 
                     placeholder="Digite sua senha" required>
            </div>
            
            <div id="login-error" class="alert alert--danger hidden">
              <div class="alert__icon">${icons.warning}</div>
              <div class="alert__content">
                <span id="login-error-message"></span>
              </div>
            </div>
            
            <button type="submit" class="btn btn--primary btn--lg" style="width: 100%;" id="login-btn">
              ${icons.lock}
              <span>Entrar</span>
            </button>
          </form>
        </div>
        
        <div class="login-card__footer">
          <a href="/public-fo.html" class="login-card__fo-link">
            ${icons.externalLink}
            <span>Registrar Fato Observado</span>
          </a>
        </div>
      </div>
    </div>
  `;

  // Setup form handler
  setupLoginForm();
}

function setupLoginForm() {
  const form = document.getElementById('login-form');
  const errorDiv = document.getElementById('login-error');
  const errorMessage = document.getElementById('login-error-message');
  const loginBtn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Hide any previous error
    errorDiv.classList.add('hidden');

    // Show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = `<span class="spinner"></span><span>Entrando...</span>`;

    try {
      await login(username, password);

      // Redirect to dashboard
      window.location.href = '/?page=dashboard';
    } catch (error) {
      // Show error
      errorMessage.textContent = error.message || 'Erro ao fazer login';
      errorDiv.classList.remove('hidden');

      // Reset button
      loginBtn.disabled = false;
      loginBtn.innerHTML = `${icons.lock}<span>Entrar</span>`;
    }
  });
}
