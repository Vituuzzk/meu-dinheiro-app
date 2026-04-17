// app.js
import { db, auth } from './js/firebase.js';
import { loginComGoogle, logout, observarAuth } from './js/auth.js';

(function(){
    let currentUser = null;
    let usandoFirebase = false; // controle local/remoto
    // ... estado local (contas, transacoes, etc.)

    // Inicialização
    async function init() {
        carregarDadosLocais(); // sempre carrega do localStorage primeiro
        configurarMascaras();
        renderizarTudo();

        // Configura listeners de UI (botões, navegação)
        configurarListeners();

        // Tenta conectar com Firebase se houver usuário logado
        observarAuth(async (user) => {
            if (user) {
                currentUser = user;
                usandoFirebase = true;
                getEl('perfil-nome').textContent = user.displayName;
                getEl('perfil-email').textContent = user.email;
                getEl('btn-login-google').style.display = 'none';
                getEl('btn-logout').style.display = 'block';
                await carregarDadosFirebase(user.uid);
            } else {
                usandoFirebase = false;
                getEl('perfil-nome').textContent = 'Usuário Local';
                getEl('perfil-email').textContent = 'Modo offline';
                getEl('btn-login-google').style.display = 'block';
                getEl('btn-logout').style.display = 'none';
            }
        });
    }

    // Listeners
    function configurarListeners() {
        // Login
        getEl('btn-login-google').addEventListener('click', loginComGoogle);
        getEl('btn-logout').addEventListener('click', logout);
        // Toggle empréstimos
        getEl('toggle-emprestimos').addEventListener('click', () => {
            const content = getEl('emprestimos-content');
            const icon = getEl('emprestimo-toggle-icon');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '▲';
            } else {
                content.style.display = 'none';
                icon.textContent = '▼';
            }
        });
        // ... demais listeners (adicionar conta, transação, empréstimo)
    }

    init();
})();