// Componente de Chip de Categoria
(function(global) {
    "use strict";

    function criarChipCategoria(categoria, isAtivo, onClick) {
        const chip = document.createElement('span');
        chip.className = `categoria-chip ${isAtivo ? 'ativo' : ''}`;
        chip.innerHTML = `<i data-lucide="${categoria.icone}"></i> ${categoria.nome}`;
        chip.addEventListener('click', onClick);
        return chip;
    }

    function renderizarChipsCategorias(container, categorias, categoriaSelecionada, onSelect) {
        container.innerHTML = '';
        categorias.forEach(cat => {
            const chip = criarChipCategoria(cat, categoriaSelecionada === cat.nome, () => onSelect(cat.nome));
            container.appendChild(chip);
        });
        lucide.createIcons();
    }

    global.ChipCategoria = {
        criarChipCategoria,
        renderizarChipsCategorias
    };

})(window);