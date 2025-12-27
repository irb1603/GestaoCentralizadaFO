// ===== CONFIGURAÇÃO DO REVEAL.JS =====
Reveal.initialize({
    // Configurações de navegação
    controls: true,
    controlsLayout: 'bottom-right',
    controlsBackArrows: 'faded',
    progress: true,
    slideNumber: 'c/t',
    hash: true,

    // Navegação por teclado
    keyboard: true,
    overview: true,
    center: true,
    touch: true,
    loop: false,
    rtl: false,

    // Navegação por fragmentos
    fragments: true,
    fragmentInURL: true,

    // Transições
    transition: 'slide', // none/fade/slide/convex/concave/zoom
    transitionSpeed: 'default', // default/fast/slow
    backgroundTransition: 'fade',

    // Modo de apresentação
    autoSlide: 0, // Tempo em ms (0 = desabilitado)
    autoSlideStoppable: true,
    mouseWheel: false,
    hideInactiveCursor: true,
    hideCursorTime: 3000,

    // Impressão e PDF
    pdfMaxPagesPerSlide: 1,
    pdfSeparateFragments: true,

    // Visão geral
    width: 1280,
    height: 720,
    margin: 0.1,
    minScale: 0.2,
    maxScale: 2.0,

    // Plugins
    plugins: []
});

// ===== ATALHOS DE TECLADO CUSTOMIZADOS =====
document.addEventListener('keydown', function(event) {
    // Pressione 'H' para exibir ajuda
    if (event.key === 'h' || event.key === 'H') {
        showHelp();
    }

    // Pressione 'F' para fullscreen
    if (event.key === 'f' || event.key === 'F') {
        toggleFullscreen();
    }

    // Pressione 'P' para modo apresentação (ocultar cursor)
    if (event.key === 'p' || event.key === 'P') {
        togglePresentationMode();
    }
});

// ===== FUNÇÕES AUXILIARES =====

// Mostrar ajuda
function showHelp() {
    const helpModal = document.createElement('div');
    helpModal.id = 'help-modal';
    helpModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
        font-family: 'Segoe UI', sans-serif;
    `;

    helpModal.innerHTML = `
        <div style="background: #1a472a; padding: 40px; border-radius: 20px; max-width: 600px; border: 3px solid #d4af37;">
            <h2 style="color: #d4af37; margin-bottom: 30px; text-align: center;">⌨️ Atalhos de Teclado</h2>
            <div style="display: grid; grid-template-columns: 150px 1fr; gap: 15px; font-size: 1.1em;">
                <div style="text-align: right; color: #d4af37; font-weight: bold;">← / →</div>
                <div>Navegar entre slides</div>

                <div style="text-align: right; color: #d4af37; font-weight: bold;">↑ / ↓</div>
                <div>Navegar slides verticais</div>

                <div style="text-align: right; color: #d4af37; font-weight: bold;">ESC / O</div>
                <div>Visão geral (Overview)</div>

                <div style="text-align: right; color: #d4af37; font-weight: bold;">Home / End</div>
                <div>Primeiro / Último slide</div>

                <div style="text-align: right; color: #d4af37; font-weight: bold;">F</div>
                <div>Alternar tela cheia</div>

                <div style="text-align: right; color: #d4af37; font-weight: bold;">P</div>
                <div>Modo apresentação</div>

                <div style="text-align: right; color: #d4af37; font-weight: bold;">H</div>
                <div>Mostrar esta ajuda</div>

                <div style="text-align: right; color: #d4af37; font-weight: bold;">S</div>
                <div>Modo notas do palestrante</div>

                <div style="text-align: right; color: #d4af37; font-weight: bold;">B / .</div>
                <div>Pausar (tela preta)</div>
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <button onclick="closeHelp()" style="
                    background: #d4af37;
                    color: #000;
                    border: none;
                    padding: 12px 30px;
                    font-size: 1.1em;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: bold;
                ">Fechar (ESC)</button>
            </div>
        </div>
    `;

    document.body.appendChild(helpModal);

    // Fechar com ESC
    const escapeListener = function(e) {
        if (e.key === 'Escape') {
            closeHelp();
            document.removeEventListener('keydown', escapeListener);
        }
    };
    document.addEventListener('keydown', escapeListener);

    // Fechar ao clicar fora
    helpModal.addEventListener('click', function(e) {
        if (e.target === helpModal) {
            closeHelp();
        }
    });
}

// Fechar ajuda
function closeHelp() {
    const modal = document.getElementById('help-modal');
    if (modal) {
        modal.remove();
    }
}

// Alternar tela cheia
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Modo apresentação
let presentationMode = false;
function togglePresentationMode() {
    presentationMode = !presentationMode;

    if (presentationMode) {
        document.body.style.cursor = 'none';
        showNotification('Modo Apresentação ATIVADO (pressione P novamente para desativar)');
    } else {
        document.body.style.cursor = 'default';
        showNotification('Modo Apresentação DESATIVADO');
    }
}

// Mostrar notificação
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #d4af37;
        color: #000;
        padding: 15px 30px;
        border-radius: 25px;
        font-weight: bold;
        z-index: 9999;
        font-size: 1.1em;
        animation: fadeInOut 3s ease-in-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Adicionar animação de fade
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        10% { opacity: 1; transform: translateX(-50%) translateY(0); }
        90% { opacity: 1; transform: translateX(-50%) translateY(0); }
        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(style);

// ===== RASTREAMENTO DE PROGRESSO =====
Reveal.on('slidechanged', event => {
    // Salvar progresso no localStorage
    localStorage.setItem('treinamento-fo-progress', JSON.stringify({
        indexh: event.indexh,
        indexv: event.indexv,
        timestamp: new Date().toISOString()
    }));
});

// Restaurar progresso ao carregar
window.addEventListener('load', () => {
    const saved = localStorage.getItem('treinamento-fo-progress');
    if (saved) {
        try {
            const progress = JSON.parse(saved);
            // Perguntar se quer continuar de onde parou
            const continueFromSaved = confirm(
                `Deseja continuar do slide ${progress.indexh + 1} onde parou na última vez?\n\n` +
                `Última visualização: ${new Date(progress.timestamp).toLocaleString('pt-BR')}`
            );

            if (continueFromSaved) {
                Reveal.slide(progress.indexh, progress.indexv);
            }
        } catch (e) {
            console.error('Erro ao restaurar progresso:', e);
        }
    }
});

// ===== CONTADOR DE TEMPO =====
let startTime = Date.now();
let sessionTime = 0;

function updateSessionTime() {
    sessionTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(sessionTime / 60);
    const seconds = sessionTime % 60;

    // Salvar tempo de sessão
    localStorage.setItem('treinamento-fo-time', sessionTime);
}

setInterval(updateSessionTime, 1000);

// Mostrar tempo total ao finalizar
Reveal.on('slidechanged', event => {
    const totalSlides = Reveal.getTotalSlides();
    const currentSlide = Reveal.getIndices().h;

    // Último slide
    if (currentSlide === totalSlides - 1) {
        setTimeout(() => {
            const minutes = Math.floor(sessionTime / 60);
            const seconds = sessionTime % 60;
            showNotification(`Parabéns! Treinamento concluído em ${minutes}min ${seconds}s`);
        }, 1000);
    }
});

// ===== INDICADOR DE SLIDES COM VÍDEO =====
window.addEventListener('load', () => {
    // Adicionar indicador visual aos slides com vídeo
    const videoSlides = document.querySelectorAll('[data-background-color="#2c3e50"]');
    videoSlides.forEach(slide => {
        const indicator = document.createElement('div');
        indicator.innerHTML = '🎥';
        indicator.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            font-size: 2em;
            z-index: 100;
        `;
        slide.appendChild(indicator);
    });
});

// ===== PRINT SLIDES =====
function printSlides() {
    window.print();
}

// ===== EXPORTAR PROGRESSO =====
function exportProgress() {
    const progress = {
        lastSlide: Reveal.getIndices(),
        totalTime: sessionTime,
        completed: Reveal.getIndices().h === Reveal.getTotalSlides() - 1,
        date: new Date().toISOString()
    };

    const dataStr = JSON.stringify(progress, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `treinamento-fo-progresso-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    showNotification('Progresso exportado com sucesso!');
}

// ===== BOTÃO DE AJUDA FIXO =====
const helpButton = document.createElement('button');
helpButton.innerHTML = '❓';
helpButton.title = 'Ajuda (H)';
helpButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #d4af37;
    color: #000;
    border: none;
    font-size: 1.5em;
    cursor: pointer;
    z-index: 9998;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    transition: transform 0.2s;
`;

helpButton.addEventListener('mouseenter', () => {
    helpButton.style.transform = 'scale(1.1)';
});

helpButton.addEventListener('mouseleave', () => {
    helpButton.style.transform = 'scale(1)';
});

helpButton.addEventListener('click', showHelp);
document.body.appendChild(helpButton);

// ===== MENSAGEM DE BOAS-VINDAS =====
window.addEventListener('load', () => {
    setTimeout(() => {
        showNotification('Bem-vindo ao Treinamento de FO! Pressione H para ajuda.');
    }, 500);
});

// ===== LOG DE DESENVOLVIMENTO =====
console.log('%c🎓 Sistema de Treinamento de FO - CMB', 'font-size: 20px; color: #d4af37; font-weight: bold;');
console.log('%cVersão: 1.0.0', 'color: #4caf50;');
console.log('%cPressione H para ver os atalhos disponíveis', 'color: #2196f3;');
