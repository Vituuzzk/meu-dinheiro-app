import { db, auth } from './js/firebase.js';
import { loginComGoogle, logout, observarAuth } from './js/auth.js';
import { 
  collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

(function(){
    "use strict";
    const APP_VERSION = '3.0.0';
    console.log(`🚀 Meu Dinheiro v${APP_VERSION} - Firebase + Empréstimos`);

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
    let chartInstance = null;
    let planejamentoChartInstance = null;
    let currentUser = null;

    // Helpers
    const getEl = (id) => document.getElementById(id);
    const formatarMoeda = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const converterMoedaParaFloat = (v) => {
        if (!v) return 0;
        const limpo = v.replace(/\./g, '').replace(',', '.');
        return parseFloat(limpo) || 0;
    };
    function gerarId() { return Date.now() + '-' + Math.random().toString(36); }

    // --- Firebase Carregar/Salvar ---
    async function carregarDados() {
        if (!currentUser) return;
        const userId = currentUser.uid;
        // Contas
        const contasSnap = await getDocs(query(collection(db, 'contas'), where('userId', '==', userId)));
        contas = contasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Transações
        const transSnap = await getDocs(query(collection(db, 'transacoes'), where('userId', '==', userId), orderBy('data', 'desc')));
        transacoes = transSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Empréstimos
        const empSnap = await getDocs(query(collection(db, 'emprestimos'), where('userId', '==', userId)));
        emprestimos = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Orçamentos e categorias podem vir de um doc de configurações
        const configDoc = await getDocs(query(collection(db, 'configuracoes'), where('userId', '==', userId)));
        configDoc.forEach(doc => {
            const data = doc.data();
            if (data.orcamentos) orcamentos = data.orcamentos;
            if (data.categorias) categorias = data.categorias;
        });
        atualizarTudo();
    }

    async function salvarConta(conta) {
        if (!currentUser) return;
        conta.userId = currentUser.uid;
        await addDoc(collection(db, 'contas'), conta);
    }

    async function salvarTransacao(transacao) {
        if (!currentUser) return;
        transacao.userId = currentUser.uid;
        await addDoc(collection(db, 'transacoes'), transacao);
    }

    async function salvarEmprestimo(emp) {
        if (!currentUser) return;
        emp.userId = currentUser.uid;
        await addDoc(collection(db, 'emprestimos'), emp);
    }

    // --- Cálculos (adaptados para usar os arrays) ---
    function calcularSaldoTotal() {
        let total = 0;
        contas.forEach(c => {
            if (c.tipo === 'normal' && c.incluirNoTotal) {
                const saldo = calcularSaldoConta(c.id);
                total += saldo;
            } else if (c.tipo === 'credito') {
                total -= calcularFaturaAtual(c.id);
            }
        });
        return total;
    }

    function calcularSaldoProjetado() {
        const hoje = new Date();
        const fimDoMes = new Date(anoAtual, mesAtual + 1, 0);
        let saldoFuturo = calcularSaldoTotal();
        transacoes.forEach(t => {
            const data = new Date(t.data + 'T00:00:00');
            if (data > hoje && data <= fimDoMes) {
                if (t.tipo === 'receita' && t.recebido === false) saldoFuturo += t.valor;
                else if (t.tipo === 'despesa') saldoFuturo -= t.valor;
            }
        });
        return saldoFuturo;
    }

    function calcularSaldoConta(contaId) {
        const conta = contas.find(c => c.id === contaId);
        if (!conta) return 0;
        if (conta.tipo === 'credito') return -calcularFaturaAtual(contaId);
        let saldo = conta.saldoInicial || 0;
        transacoes.forEach(t => {
            if (t.contaId === contaId) {
                if (t.tipo === 'despesa') saldo -= t.valor;
                else if (t.tipo === 'receita' && t.recebido) saldo += t.valor;
            }
        });
        return saldo;
    }

    function calcularFaturaAtual(cartaoId) {
        return transacoes.filter(t => t.contaId === cartaoId && t.tipo === 'despesa')
            .reduce((s, t) => s + t.valor, 0);
    }

    function atualizarTudo() {
        renderizarDashboard();
        renderizarTransacoesAgrupadas();
        renderizarEmprestimos();
        if (getEl('tela-planejamento').classList.contains('ativa')) renderizarPlanejamento();
    }

    // --- Renderizações ---
    function renderizarDashboard() {
        const saldoTotal = calcularSaldoTotal();
        getEl('saldo-total-valor').textContent = formatarMoeda(saldoTotal);
        getEl('saldo-projetado-valor').textContent = formatarMoeda(calcularSaldoProjetado());
        // Preencher contas, cartões, gráfico... (mantido similar, mas usando os arrays)
        // ... (código de renderização já conhecido, adaptado para Firebase)
    }

    function renderizarEmprestimos() {
        const container = getEl('lista-emprestimos');
        const empty = getEl('empty-emprestimos');
        if (emprestimos.length === 0) {
            container.innerHTML = '';
            empty.style.display = 'block';
            getEl('total-emprestado').textContent = formatarMoeda(0);
            getEl('total-a-receber').textContent = formatarMoeda(0);
            return;
        }
        empty.style.display = 'none';
        let html = '';
        let totalEmp = 0, totalRec = 0;
        emprestimos.forEach(e => {
            const valor = e.valor || 0;
            if (e.tipo === 'emprestei') totalEmp += valor;
            else totalRec += valor;
            // renderizar itens (código similar ao anterior)
        });
        container.innerHTML = html;
        getEl('total-emprestado').textContent = formatarMoeda(totalEmp);
        getEl('total-a-receber').textContent = formatarMoeda(totalRec);
    }

    // ... (outras funções: abrirModalTransacao, salvar, etc.)

    // --- Inicialização ---
    async function init() {
        // Configurar listener de auth
        observarAuth(async (user) => {
            currentUser = user;
            const telaLogin = getEl('tela-login');
            if (user) {
                telaLogin.style.display = 'none';
                getEl('perfil-nome').textContent = user.displayName || 'Usuário';
                getEl('perfil-email').textContent = user.email;
                await carregarDados();
            } else {
                telaLogin.style.display = 'flex';
                contas = []; transacoes = []; emprestimos = [];
                atualizarTudo();
            }
        });

        // Event listeners de UI
        getEl('btn-login-google').addEventListener('click', loginComGoogle);
        getEl('btn-logout').addEventListener('click', async () => {
            await logout();
        });
        // ... (demais listeners: navegação, modais, etc.)
    }

    init();
})();
