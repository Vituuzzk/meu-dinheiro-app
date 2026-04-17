async function init() {
    alert("🔥 init() executado!");
    // ... resto do código
}
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
import { loginComGoogle, logout, observarAuth, handleRedirectResult } from './js/auth.js';

// Dentro do init():
async function init() {
    // Captura o resultado do redirecionamento (se o usuário acabou de voltar do Google)
    await handleRedirectResult();

    // ... resto do código (observarAuth, etc.)
}
        
        // Navegação...
    }
    init();
})();