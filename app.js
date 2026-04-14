// ---------- TEMA ESCURO ----------
const btnToggleTema = document.getElementById('btn-toggle-tema');

// Função para aplicar o tema
function aplicarTema(escuro) {
    if (escuro) {
        document.body.classList.add('dark-theme');
        btnToggleTema.innerHTML = '☀️ Alternar para Tema Claro';
        btnToggleTema.style.background = '#f59e0b';
    } else {
        document.body.classList.remove('dark-theme');
        btnToggleTema.innerHTML = '🌙 Alternar para Tema Escuro';
        btnToggleTema.style.background = '#6b7280';
    }
    localStorage.setItem('temaEscuro', escuro);
    
    // Recriar gráfico se existir (para adaptar cores)
    if (chartInstance) {
        const canvas = document.getElementById('grafico-categorias');
        if (canvas.style.display !== 'none') {
            const tipo = chartInstance.config.type;
            const dados = chartInstance.data;
            const opcoes = chartInstance.options;
            chartInstance.destroy();
            chartInstance = new Chart(ctx, { type: tipo, data: dados, options: opcoes });
        }
    }
}

// Verifica preferência salva
const temaSalvo = localStorage.getItem('temaEscuro') === 'true';
aplicarTema(temaSalvo);

// Evento do botão
btnToggleTema.addEventListener('click', () => {
    const estaEscuro = document.body.classList.contains('dark-theme');
    aplicarTema(!estaEscuro);
});