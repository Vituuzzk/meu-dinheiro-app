// app.js - Versão Mínima de Teste
import { db, auth } from './js/services/firebase.js';
import { loginComGoogle, logout, observarAuth, handleRedirectResult } from './js/services/auth.js';

alert("✅ Módulos Firebase e Auth carregados!");

// Verifica os módulos globais
setTimeout(() => {
    const modulos = ['Mascaras', 'Modal', 'CardConta', 'ChipCategoria', 'Principal', 'Transacoes', 'Planejamento', 'Perfil', 'Backup', 'Calculos'];
    let faltando = [];
    modulos.forEach(m => {
        if (typeof window[m] === 'undefined') faltando.push(m);
    });
    if (faltando.length > 0) {
        alert("❌ Módulos faltando: " + faltando.join(', '));
    } else {
        alert("✅ Todos os módulos carregados! Estrutura OK.");
    }
}, 500);