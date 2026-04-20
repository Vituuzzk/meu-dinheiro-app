// DETETIVE DE MÓDULOS - app.js
alert("🟢 1. app.js carregado");

try {
    import { db, auth } from './services/firebase.js';
    alert("✅ Firebase importado");
} catch(e) { alert("❌ Firebase: " + e.message); }

try {
    import { loginComGoogle, logout, observarAuth, handleRedirectResult } from './services/auth.js';
    alert("✅ Auth importado");
} catch(e) { alert("❌ Auth: " + e.message); }

setTimeout(() => {
    alert("📦 Verificando módulos globais...");
    const modulos = ['Mascaras', 'Modal', 'CardConta', 'ChipCategoria', 'Principal', 'Transacoes', 'Planejamento', 'Perfil', 'Backup', 'Calculos'];
    let faltando = [];
    modulos.forEach(m => {
        if (typeof window[m] === 'undefined') faltando.push(m);
    });
    if (faltando.length > 0) {
        alert("❌ Módulos faltando: " + faltando.join(', '));
    } else {
        alert("✅ Todos os módulos globais carregados!");
    }
}, 1000);