// Componente de Item de Conta
(function(global) {
    "use strict";

    function renderizarIconeConta(nome) {
        const n = nome.toLowerCase();
        if (n.includes('nubank')) return '<i class="ibb-nubank" style="font-size:24px;"></i>';
        if (n.includes('inter')) return '<i class="ibb-inter" style="font-size:24px;"></i>';
        if (n.includes('carteira')) return '<span style="font-size:24px;">💰</span>';
        return '<span style="font-size:24px;">🏦</span>';
    }

    function criarCardConta(conta, saldo, incluirNoTotal) {
        const div = document.createElement('div');
        div.className = 'conta-item';
        div.innerHTML = `<div class="conta-info"><div class="conta-icone">${renderizarIconeConta(conta.nome)}</div><div class="conta-detalhes"><div class="nome">${conta.nome}</div><div class="subtitulo">${incluirNoTotal ? 'Incluída' : 'Não incluída'}</div></div></div><div class="conta-saldo">${Mascaras.formatarMoeda(saldo)}</div>`;
        return div;
    }

    global.CardConta = {
        renderizarIconeConta,
        criarCardConta
    };

})(window);