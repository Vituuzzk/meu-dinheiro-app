// Tela de Perfil
(function(global) {
    "use strict";

    function atualizarPerfilUI(user, getEl) {
        const perfilNome = getEl('perfil-nome');
        const perfilEmail = getEl('perfil-email');
        const btnLogin = getEl('btn-login-google');
        const btnLogout = getEl('btn-logout');
        
        if (user) {
            if (perfilNome) perfilNome.textContent = user.displayName || 'Usuário';
            if (perfilEmail) perfilEmail.textContent = user.email;
            if (btnLogin) btnLogin.style.display = 'none';
            if (btnLogout) btnLogout.style.display = 'block';
        } else {
            if (perfilNome) perfilNome.textContent = 'Usuário Local';
            if (perfilEmail) perfilEmail.textContent = 'Modo offline';
            if (btnLogin) btnLogin.style.display = 'block';
            if (btnLogout) btnLogout.style.display = 'none';
        }
    }

    global.Perfil = { atualizarPerfilUI };

})(window);