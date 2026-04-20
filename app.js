// DIAGNÓSTICO - app.js
import { db, auth } from './services/firebase.js';
import { loginComGoogle, logout, observarAuth, handleRedirectResult } from './services/auth.js';
import { 
  collection, addDoc, getDocs, query, where, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

alert("✅ 1. app.js carregado (módulo Firebase importado)");

(function(){
    "use strict";
    const APP_VERSION = '3.2.0';
    console.log(`🚀 Meu Dinheiro v${APP_VERSION}`);

    alert("✅ 2. IIFE iniciado");

    // Verifica se os módulos globais existem
    alert(`📦 Módulos:\nMascaras: ${typeof Mascaras}\nModal: ${typeof Modal}\nPrincipal: ${typeof Principal}\nTransacoes: ${typeof Transacoes}\nPlanejamento: ${typeof Planejamento}\nPerfil: ${typeof Perfil}\nBackup: ${typeof Backup}\nCalculos: ${typeof Calculos}`);

    // Se algum for 'undefined', o problema está no carregamento dos scripts no index.html
    if (typeof Mascaras === 'undefined') {
        alert("❌ ERRO: Mascaras não carregado. Verifique js/utils/mascaras.js");
        return;
    }
    if (typeof Modal === 'undefined') {
        alert("❌ ERRO: Modal não carregado.");
        return;
    }
    // ... (adicione para os outros se quiser)

    alert("✅ 3. Todos os módulos carregados");

    // Estado global
    let contas = [];
    let transacoes = [];
    let emprestimos = [];
    let orcamentos = {};
    let categorias = [
        { nome: 'Alimentação', icone: 'utensils', cor: '#f97316' },
        { nome: 'Transporte', icone: 'car', cor: '#3b82f6' },
        { nome: 'Lazer', icone: 'popcorn', cor: '#10b981' },
        { nome: 'Contas', icone: 'file-text', cor: '#8b5cf6' },
        { nome: 'Salário', icone: 'briefcase', cor: '#ec4899' },
        { nome: 'Freelance', icone: 'laptop', cor: '#94a3b8' },
        { nome: 'Saúde', icone: 'heart-pulse', cor: '#ef4444' },
        { nome: 'Educação', icone: 'book-open', cor: '#14b8a6' }
    ];
    let mesAtual = new Date().getMonth();
    let anoAtual = new Date().getFullYear();
    let categoriaSelecionada = 'Alimentação';
    let tipoTransacaoAtual = 'receita';
    let currentUser = null;
    let usandoFirebase = false;
    let anoAnteriorSelecao = anoAtual;
    let mesAnteriorSelecao = mesAtual;

    const getEl = (id) => {
        const el = document.getElementById(id);
        if (!el) console.warn(`Elemento #${id} não encontrado`);
        return el;
    };

    const { formatarMoeda, converterMoedaParaFloat, configurarMascaras } = Mascaras;
    const { abrirModal, fecharModal } = Modal;
    const { renderizarIconeConta } = CardConta;
    const { renderizarChipsCategorias } = ChipCategoria;
    const { renderizarDashboard } = Principal;
    const { renderizarTransacoesAgrupadas } = Transacoes;
    const { renderizarPlanejamento } = Planejamento;
    const { atualizarPerfilUI } = Perfil;
    const { exportarBackup, importarBackup, exportarParaCSV } = Backup;
    const { 
        calcularSaldoTotal, calcularSaldoProjetado, calcularReceitasMes, 
        calcularDespesasMes, calcularSaldoConta, calcularFaturaAtual, calcularGastosPorCategoria 
    } = Calculos;

    alert("✅ 4. Desestruturação concluída");

    function gerarId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 9); }

    // Persistência Local
    function carregarLocal() {
        contas = JSON.parse(localStorage.getItem('contas')) || [];
        transacoes = JSON.parse(localStorage.getItem('transacoes')) || [];
        emprestimos = JSON.parse(localStorage.getItem('emprestimos')) || [];
        orcamentos = JSON.parse(localStorage.getItem('orcamentos')) || {};
        const cats = localStorage.getItem('categorias');
        if (cats) categorias = JSON.parse(cats);
        if (contas.length === 0) {
            contas.push({ id: gerarId(), nome: 'Carteira', tipo: 'normal', saldoInicial: 0, incluirNoTotal: true });
            salvarLocal();
        }
    }
    function salvarLocal() {
        localStorage.setItem('contas', JSON.stringify(contas));
        localStorage.setItem('transacoes', JSON.stringify(transacoes));
        localStorage.setItem('emprestimos', JSON.stringify(emprestimos));
        localStorage.setItem('orcamentos', JSON.stringify(orcamentos));
        localStorage.setItem('categorias', JSON.stringify(categorias));
    }

    // Firebase (resumido)
    async function carregarFirebase(userId) { /* ... */ }
    async function salvarContaFirebase(conta) { /* ... */ }
    async function salvarTransacaoFirebase(trans) { /* ... */ }
    async function salvarEmprestimoFirebase(emp) { /* ... */ }

    function atualizarCabecalho() { /* ... */ }
    function atualizarTudo() { /* ... */ }
    function configurarListeners() { /* ... */ }

    async function init() {
        alert("✅ 5. init() iniciado");
        await handleRedirectResult();
        carregarLocal();
        configurarMascaras();
        alert("✅ 6. Máscaras configuradas");
        atualizarTudo();
        alert("✅ 7. atualizarTudo() executado");
        configurarListeners();
        alert("✅ 8. Listeners configurados");

        observarAuth(async (user) => {
            currentUser = user;
            usandoFirebase = !!user;
            atualizarPerfilUI(user, getEl);
            if (user) {
                await carregarFirebase(user.uid);
            } else {
                carregarLocal();
                atualizarTudo();
            }
        });

        getEl('btn-login-google').addEventListener('click', loginComGoogle);
        getEl('btn-logout').addEventListener('click', () => logout());

        getEl('mes-anterior-seta').addEventListener('click', () => navegarMes(-1));
        getEl('mes-proximo-seta').addEventListener('click', () => navegarMes(1));
        getEl('mes-transacoes-anterior').addEventListener('click', () => navegarMes(-1));
        getEl('mes-transacoes-proximo').addEventListener('click', () => navegarMes(1));
        alert("✅ 9. init() concluído com sucesso!");
    }

    function navegarMes(delta) { /* ... */ }

    init();
})();