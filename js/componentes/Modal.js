// Componente Modal (Base)
(function(global) {
    "use strict";

    function abrirModal(modalOverlay) {
        modalOverlay.style.display = 'flex';
        setTimeout(() => modalOverlay.classList.add('ativo'), 10);
    }

    function fecharModal(modalOverlay) {
        modalOverlay.classList.remove('ativo');
        setTimeout(() => modalOverlay.style.display = 'none', 300);
    }

    global.Modal = {
        abrirModal,
        fecharModal
    };

})(window);