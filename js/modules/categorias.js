// Módulo de Gerenciamento de Categorias
(function(global) {
    "use strict";

    // Categorias padrão
    const CATEGORIAS_PADRAO = [
        { nome: 'Alimentação', icone: '🍔', cor: '#f97316' },
        { nome: 'Transporte', icone: '🚗', cor: '#3b82f6' },
        { nome: 'Lazer', icone: '🎉', cor: '#10b981' },
        { nome: 'Contas', icone: '📄', cor: '#8b5cf6' },
        { nome: 'Salário', icone: '💼', cor: '#ec4899' },
        { nome: 'Freelance', icone: '💻', cor: '#94a3b8' },
        { nome: 'Saúde', icone: '🏥', cor: '#ef4444' },
        { nome: 'Educação', icone: '📚', cor: '#14b8a6' }
    ];

    function carregarCategorias() {
        const salvas = localStorage.getItem('categorias');
        return salvas ? JSON.parse(salvas) : [...CATEGORIAS_PADRAO];
    }

    function salvarCategorias(categorias) {
        localStorage.setItem('categorias', JSON.stringify(categorias));
    }

    function renderizarChipsCategorias(container, categorias, categoriaSelecionada, callback) {
        if (!container) return;
        container.innerHTML = '';
        categorias.forEach(cat => {
            const chip = document.createElement('span');
            chip.className = `categoria-chip ${categoriaSelecionada === cat.nome ? 'ativo' : ''}`;
            chip.innerHTML = `${cat.icone} ${cat.nome}`;
            chip.dataset.categoria = cat.nome;
            chip.addEventListener('click', () => {
                callback(cat.nome);
                renderizarChipsCategorias(container, categorias, cat.nome, callback);
            });
            container.appendChild(chip);
        });
    }

    global.Categorias = {
        CATEGORIAS_PADRAO,
        carregarCategorias,
        salvarCategorias,
        renderizarChipsCategorias
    };

})(window);