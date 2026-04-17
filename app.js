// app.js - Versão de Diagnóstico
(function(){
    "use strict";
    console.log("🟡 Modo Diagnóstico Ativado");

    const getEl = (id) => document.getElementById(id);

    function init() {
        alert("✅ init() executado com sucesso!");

        // Testa os botões da tela principal
        const verTodas = getEl('ver-todas-contas');
        if (verTodas) {
            verTodas.addEventListener('click', (e) => {
                e.preventDefault();
                alert("👀 'Ver todas' clicado!");
            });
        } else {
            alert("❌ ERRO: Botão 'ver-todas-contas' não encontrado!");
        }

        const adicionarConta = getEl('adicionar-conta-principal');
        if (adicionarConta) {
            adicionarConta.addEventListener('click', (e) => {
                e.preventDefault();
                alert("➕ 'Adicionar conta' clicado!");
            });
        } else {
            alert("❌ ERRO: Botão 'adicionar-conta-principal' não encontrado!");
        }

        // Testa o botão flutuante (FAB)
        const fab = getEl('fab-adicionar');
        if (fab) {
            fab.addEventListener('click', () => {
                alert("➕➕ FAB clicado!");
            });
        } else {
            alert("❌ ERRO: FAB não encontrado!");
        }

        // Testa a navegação do menu inferior
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                alert(`📱 Menu: ${item.dataset.tela}`);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();