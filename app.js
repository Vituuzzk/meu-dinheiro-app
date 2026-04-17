import { db, auth } from './js/firebase.js';
import { loginComGoogle, logout, observarAuth } from './js/auth.js';
import { 
  collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, Timestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

(function(){
    "use strict";
    const APP_VERSION = '3.0.0';
    console.log(`🚀 Meu Dinheiro v${APP_VERSION} - Firebase + Empréstimos`);

    // ---------- ESTADO GLOBAL ----------
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

    // ---------- HELPERS ----------
    const getEl = (id) => document.getElementById(id);
    const formatarMoeda = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const converterMoedaParaFloat = (v) => {
        if (!v) return 0;
        const limpo = v.replace(/\./g, '').replace(',', '.');
        return parseFloat(limpo) || 0;
    };
    function gerarId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 9); }
    function aplicarMascaraMoeda(e) {
        let v = e.target.value.replace(/[^\d,]/g, '');
        const partes = v.split(',');
        if (partes.length > 2) v = partes[0] + ',' + partes.slice(1).join('');
        e.target.value = v;
    }
    function configurarMascaras() {
        document.querySelectorAll('.moeda').forEach(i => {
            i.addEventListener('input', aplicarMascaraMoeda);
            i.addEventListener('blur', (e) => {
                if (e.target.value) {
                    let numero = parseFloat(e.target.value.replace(',', '.'));
                    if (!isNaN(numero)) e.target.value = numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
            });
        });
    }

    // ---------- FIREBASE CARREGAR / SALVAR ----------
    async function carregarDados() {
        if (!currentUser) return;
        const userId = currentUser.uid;
        try {
            // Contas
            const contasSnap = await getDocs(query(collection(db, 'contas'), where('userId', '==', userId)));
            contas = contasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Transações
            const transSnap = await getDocs(query(collection(db, 'transacoes'), where('userId', '==', userId), orderBy('data', 'desc')));
            transacoes = transSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Empréstimos
            const empSnap = await getDocs(query(collection(db, 'emprestimos'), where('userId', '==', userId)));
            emprestimos = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Configurações (orcamentos, categorias)
            const configSnap = await getDocs(query(collection(db, 'configuracoes'), where('userId', '==', userId)));
            configSnap.forEach(doc => {
                const data = doc.data();
                if (data.orcamentos) orcamentos = data.orcamentos;
                if (data.categorias) categorias = data.categorias;
            });
        } catch(e) { console.warn("Erro ao carregar:", e); }
        atualizarTudo();
    }

    async function salvarConfiguracoes() {
        if (!currentUser) return;
        const userId = currentUser.uid;
        const configRef = collection(db, 'configuracoes');
        const existing = await getDocs(query(configRef, where('userId', '==', userId)));
        const data = { userId, orcamentos, categorias };
        if (!existing.empty) {
            await updateDoc(doc(db, 'configuracoes', existing.docs[0].id), data);
        } else {
            await addDoc(configRef, data);
        }
    }

    // ---------- CÁLCULOS ----------
    function calcularSaldoConta(contaId) {
        const conta = contas.find(c => c.id === contaId);
        if (!conta) return 0;
        if (conta.tipo === 'credito') return -calcularFaturaAtual(contaId);
        let saldo = conta.saldoInicial || 0;
        transacoes.forEach(t => {
            if (t.contaId === contaId) {
                if (t.tipo === 'despesa') saldo -= t.valor;
                else if (t.tipo === 'receita' && t.recebido !== false) saldo += t.valor;
            }
        });
        return saldo;
    }

    function calcularFaturaAtual(cartaoId) {
        return transacoes.filter(t => t.contaId === cartaoId && t.tipo === 'despesa')
            .reduce((s, t) => s + t.valor, 0);
    }

    function calcularSaldoTotal() {
        let total = 0;
        contas.forEach(c => {
            if (c.tipo === 'normal' && c.incluirNoTotal) total += calcularSaldoConta(c.id);
            else if (c.tipo === 'credito') total -= calcularFaturaAtual(c.id);
        });
        return total;
    }

    function calcularSaldoProjetado() {
        const hoje = new Date();
        const fimDoMes = new Date(anoAtual, mesAtual + 1, 0);
        let saldo = calcularSaldoTotal();
        transacoes.forEach(t => {
            const data = new Date(t.data + 'T00:00:00');
            if (data > hoje && data <= fimDoMes) {
                if (t.tipo === 'receita' && t.recebido === false) saldo += t.valor;
                else if (t.tipo === 'despesa') saldo -= t.valor;
            }
        });
        return saldo;
    }

    function calcularReceitasMes() {
        return transacoes.filter(t => {
            if (t.tipo !== 'receita') return false;
            const d = new Date(t.data + 'T00:00:00');
            return d.getMonth() === mesAtual && d.getFullYear() === anoAtual && t.recebido !== false;
        }).reduce((s, t) => s + t.valor, 0);
    }

    function calcularDespesasMes() {
        return transacoes.filter(t => {
            if (t.tipo !== 'despesa') return false;
            const d = new Date(t.data + 'T00:00:00');
            return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        }).reduce((s, t) => s + t.valor, 0);
    }

    // ---------- RENDERIZAÇÕES ----------
    function renderizarDashboard() {
        const saldoTotal = calcularSaldoTotal();
        getEl('saldo-total-valor').textContent = formatarMoeda(saldoTotal);
        getEl('saldo-projetado-valor').textContent = formatarMoeda(calcularSaldoProjetado());
        getEl('total-receitas-mes').textContent = formatarMoeda(calcularReceitasMes());
        getEl('total-despesas-mes').textContent = formatarMoeda(calcularDespesasMes());
        // ... (renderizar contas, cartões e gráfico - código extenso mas similar ao anterior)
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
            const valor = e.valorPrincipal || 0;
            if (e.tipo === 'emprestei') totalEmp += valor;
            else totalRec += valor;
            // Geração de parcelas com juros simples (calculado no modal)
            html += `<div class="emprestimo-item">...${e.nome} - ${formatarMoeda(valor)}...</div>`;
        });
        container.innerHTML = html;
        getEl('total-emprestado').textContent = formatarMoeda(totalEmp);
        getEl('total-a-receber').textContent = formatarMoeda(totalRec);
    }

    function renderizarTransacoesAgrupadas() {
        // ... (agrupamento por data)
    }

    function renderizarPlanejamento() {
        // ... (orçamentos)
    }

    function atualizarTudo() {
        renderizarDashboard();
        renderizarTransacoesAgrupadas();
        renderizarEmprestimos();
        if (getEl('tela-planejamento').classList.contains('ativa')) renderizarPlanejamento();
    }

    // ---------- MODAIS E LISTENERS (continua na Parte 2) ----------
    // ...
    // ---------- INICIALIZAÇÃO ----------
    async function init() {
        configurarMascaras();
        
        // Auth
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

        // Event Listeners principais
        getEl('btn-login-google').addEventListener('click', loginComGoogle);
        getEl('btn-logout').addEventListener('click', async () => { await logout(); });
        
        // Modal Empréstimo
        getEl('btn-adicionar-emprestimo').addEventListener('click', () => {
            getEl('modal-emprestimo').style.display = 'flex';
            getEl('emp-data').valueAsDate = new Date();
        });
        getEl('fechar-modal-emprestimo').addEventListener('click', () => {
            getEl('modal-emprestimo').style.display = 'none';
        });
        getEl('salvar-emprestimo').addEventListener('click', async () => {
            const nome = getEl('emp-nome').value;
            const tipo = getEl('emp-tipo').value;
            const valor = converterMoedaParaFloat(getEl('emp-valor').value);
            const juros = parseFloat(getEl('emp-juros').value) / 100;
            const parcelas = parseInt(getEl('emp-parcelas').value);
            const dataBase = new Date(getEl('emp-data').value);
            
            // Cálculo de parcelas com juros simples
            const valorComJuros = valor * (1 + juros);
            const valorParcela = valorComJuros / parcelas;
            const parcelasArray = [];
            for (let i = 0; i < parcelas; i++) {
                const vencimento = new Date(dataBase);
                vencimento.setMonth(vencimento.getMonth() + i);
                parcelasArray.push({
                    numero: i + 1,
                    valor: valorParcela,
                    vencimento: vencimento.toISOString().split('T')[0],
                    status: 'pendente'
                });
            }
            
            const novo = {
                id: gerarId(),
                nome,
                tipo,
                valorPrincipal: valor,
                juros: juros * 100,
                parcelas: parcelasArray,
                dataCriacao: new Date().toISOString()
            };
            await addDoc(collection(db, 'emprestimos'), { ...novo, userId: currentUser.uid });
            emprestimos.push(novo);
            renderizarEmprestimos();
            getEl('modal-emprestimo').style.display = 'none';
        });

        // Navegação entre telas
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const telaId = item.dataset.tela;
                document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
                getEl(`tela-${telaId}`).classList.add('ativa');
                document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('ativo'));
                item.classList.add('ativo');
                if (telaId === 'principal') renderizarDashboard();
                if (telaId === 'emprestimos') renderizarEmprestimos();
                if (telaId === 'planejamento') renderizarPlanejamento();
            });
        });

        // FAB
        getEl('fab-adicionar').addEventListener('click', () => {
            getEl('modal-transacao').style.display = 'flex';
        });

        // Iniciar máscaras
        configurarMascaras();
    }

    init();
})();