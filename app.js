import { db, auth } from './js/firebase.js';
import { loginComGoogle, logout, observarAuth } from './js/auth.js';

(function(){
    let currentUser = null;
    const getEl = (id) => document.getElementById(id);
    
    // Inicialização
    async function init() {
        // Observa auth
        observarAuth(async (user) => {
            currentUser = user;
            const telaLogin = getEl('tela-login');
            if (user) {
                telaLogin.style.display = 'none';
                getEl('perfil-nome').textContent = user.displayName || 'Usuário';
                getEl('perfil-email').textContent = user.email;
                // Carregar dados do Firestore...
            } else {
                telaLogin.style.display = 'flex';
            }
        });

        // Listener do botão de login
        getEl('btn-login-google').addEventListener('click', loginComGoogle);
        getEl('btn-logout').addEventListener('click', logout);
        
        // Navegação...
    }
    init();
})();