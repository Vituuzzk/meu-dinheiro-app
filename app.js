(function(){
    "use strict";
    const APP_VERSION = '2.2.0';
    console.log(`🚀 Meu Dinheiro v${APP_VERSION} iniciado`);

    // ---------- ESTADO ----------
    let contas = [];
    let transacoes = [];
    let mesAtual = new Date().getMonth();
    let anoAtual = new Date().getFullYear();
    let categorias = Categorias.carregarCategorias();
    let chartInstance = null;
    let anoAnteriorSelecao = anoAtual;
    let mesAnteriorSelecao = mesAtual;

    // ---------- ELEMENTOS ----------
    const getEl = (id) => document.getElementById(id);
    const elementos = {
        anoAtualTitulo: getEl('ano-atual-titulo'),
        mesTransacoesTitulo: getEl('mes-transacoes-titulo'),
        saldoTotalValor: getEl('saldo-total-valor'),
        totalReceitasMes: getEl('total-receitas-mes'),
        totalDespesasMes: getEl('total-despesas-mes'),
        listaContasResumo: getEl('lista-contas-resumo'),
        totalContasResumo: getEl('total-contas-resumo'),
        cartoesResumoContainer: getEl('cartoes-resumo-container'),
        ctx: getEl('grafico-categorias')?.getContext('2d'),
        emptyDespesas: getEl('empty-despesas'),
        modalOverlay: getEl('modal-contas'),
        camposContaNormal: getEl('campos-conta-normal'),
        camposCartaoCredito: getEl('campos-cartao-credito')
    };

    // ---------- UTILITÁRIOS ----------
    const { converterMoedaParaFloat, formatarMoeda, configurarMascaras } = Mascaras;
    function gerarId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 9); }

    // Ícones de bancos
    function getIconeBanco(nome) {
        const n = nome.toLowerCase();
        if (n.includes('nubank')) return 'ibb-nubank';
        if (n.includes('inter')) return 'ibb-inter';
        if (n.includes('itaú') || n.includes('itau')) return 'ibb-itau';
        if (n.includes('bradesco')) return 'ibb-bradesco';
        if (n.includes('santander')) return 'ibb-santander';
        if (n.includes('caixa')) return 'ibb-caixa';
        if (n.includes('carteira')) return '💰';
        return '🏦';
    }
    function renderizarIconeConta(nome) {
        const icone = getIconeBanco(nome);
        return icone.startsWith('ibb-') ? `<i class="${icone}" style="font-size: 24px;"></i>` : `<span style="font-size: 24px;">${icone}</span>`;
    }

    // ---------- PERSISTÊNCIA ----------
    function carregarDados() {
        try {
            contas = JSON.parse(localStorage.getItem('contas')) || [];
            transacoes = JSON.parse(localStorage.getItem('transacoes')) || [];
        } catch(e) { contas = []; transacoes = []; }
        transacoes.forEach(t => { if (t.tipo === 'receita' && t.recebido === undefined) t.recebido = true; });
        salvarTransacoes();
        if (contas.length === 0) {
            contas.push({ id: gerarId(), nome: 'Carteira', tipo: 'normal', saldoInicial: 0, incluirNoTotal: true });
            salvarContas();
        }
    }
    function salvarContas() { localStorage.setItem('contas', JSON.stringify(contas)); }
    function salvarTransacoes() { localStorage.setItem('transacoes', JSON.stringify(transacoes)); }

    // ---------- CÁLCULOS ----------
    function getDataLimite() { return new Date(anoAtual, mesAtual + 1, 0); }
    function calcularFaturaAtual(cartaoId) {
        return transacoes.filter(t => t.tipo === 'despesa' && t.contaId === cartaoId).reduce((s, t) => s + t.valor, 0);
    }
    function calcularSaldoConta(contaId) {
        const conta = contas.find(c => c.id === contaId);
        if (!conta) return 0;
        if (conta.tipo === 'credito') return -calcularFaturaAtual(contaId);
        const dataLimite = getDataLimite();
        let saldo = conta.saldoInicial;
        transacoes.forEach(t => {
            const dataTransacao = new Date(t.data + 'T00:00:00');
            if (dataTransacao > dataLimite) return;
            if (t.tipo === 'despesa' && t.contaId === contaId) saldo -= t.valor;
            else if (t.tipo === 'receita' && t.contaId === contaId) {
                const foiRecebida = (t.recebido !== undefined) ? t.recebido : true;
                if (foiRecebida) saldo += t.valor;
            } else if (t.tipo === 'transferencia') {
                if (t.contaOrigemId === contaId) saldo -= t.valor;
                if (t.contaDestinoId === contaId) saldo += t.valor;
            }
        });
        return saldo;
    }
    function calcularSaldoTotal() {
        let total = 0;
        contas.forEach(c => {
            if (c.tipo === 'normal' && c.incluirNoTotal) total += calcularSaldoConta(c.id);
            else if (c.tipo === 'credito') total -= calcularFaturaAtual(c.id);
        });
        return total;
    }
    function calcularReceitasMes() {
        return transacoes.filter(t => {
            if (t.tipo !== 'receita') return false;
            const d = new Date(t.data + 'T00:00:00');
            return d.getMonth() === mesAtual && d.getFullYear() === anoAtual && (t.recebido !== undefined ? t.recebido : true);
        }).reduce((s, t) => s + t.valor, 0);
    }
    function calcularDespesasMes() {
        return transacoes.filter(t => {
            if (t.tipo !== 'despesa') return false;
            const d = new Date(t.data + 'T00:00:00');
            return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        }).reduce((s, t) => s + t.valor, 0);
    }

    // ---------- AÇÕES ----------
    function excluirConta(id) {
        contas = contas.filter(c => c.id !== id);
        transacoes = transacoes.filter(t => t.contaId !== id && t.contaOrigemId !== id && t.contaDestinoId !== id);
        salvarContas(); salvarTransacoes();
    }

    function atualizarTudo() {
        UI.atualizarCabecalho(anoAtual, mesAtual);
        UI.renderizarDashboard({ contas, transacoes, mesAtual, anoAtual, calcularSaldoTotal, calcularReceitasMes, calcularDespesasMes, calcularSaldoConta, calcularFaturaAtual, renderizarIconeConta, chartInstance }, { ...elementos, chartInstance });
        UI.renderizarTransacoesAgrupadas({ contas, transacoes, mesAtual, anoAtual });
    }

    // ---------- INIT ----------
    function init() {
        carregarDados();
        configurarMascaras();
        UI.atualizarCabecalho(anoAtual, mesAtual);
        UI.renderizarDashboard({ contas, transacoes, mesAtual, anoAtual, calcularSaldoTotal, calcularReceitasMes, calcularDespesasMes, calcularSaldoConta, calcularFaturaAtual, renderizarIconeConta, chartInstance }, { ...elementos, chartInstance });
        UI.renderizarTransacoesAgrupadas({ contas, transacoes, mesAtual, anoAtual });

        document.getElementById('item-sobre').innerHTML = `ℹ️ Sobre (v${APP_VERSION})`;

        // Eventos de navegação de ano/mês...
        // (Manter todos os event listeners como estavam, mas chamando atualizarTudo())

        // Backup
        document.getElementById('btn-exportar-backup').addEventListener('click', () => {
            Backup.exportarBackup(contas, transacoes, categorias, APP_VERSION);
        });
        document.getElementById('btn-importar-backup').addEventListener('click', () => {
            document.getElementById('input-importar-backup').click();
        });
        document.getElementById('input-importar-backup').addEventListener('change', (e) => {
            Backup.importarBackup(e, (backup) => {
                contas = backup.contas;
                transacoes = backup.transacoes;
                if (backup.categorias) categorias = backup.categorias;
                salvarContas(); salvarTransacoes(); Categorias.salvarCategorias(categorias);
            });
        });

        // ... (todos os outros event listeners, adaptados para usar os módulos)

        // Exemplo de como abrir modal de transação com categorias
        window.abrirModalTransacao = function() {
            // ... lógica existente, mas usando Categorias.renderizarChipsCategorias
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();