// DIAGNÓSTICO COM CAPTURA DE ERROS - app.js
try {
    alert("🟢 1. Iniciando carregamento dos módulos Firebase...");

    import { db, auth } from './services/firebase.js';
    import { loginComGoogle, logout, observarAuth, handleRedirectResult } from './services/auth.js';
    import { 
      collection, addDoc, getDocs, query, where, orderBy 
    } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

    alert("✅ 2. Módulos Firebase importados");

    (function(){
        "use strict";
        const APP_VERSION = '3.2.0';
        console.log(`🚀 Meu Dinheiro v${APP_VERSION}`);

        alert("🟡 3. Verificando módulos globais...");
        alert(`📦 Mascaras: ${typeof Mascaras}\nModal: ${typeof Modal}\nPrincipal: ${typeof Principal}\nTransacoes: ${typeof Transacoes}\nPlanejamento: ${typeof Planejamento}\nPerfil: ${typeof Perfil}\nBackup: ${typeof Backup}\nCalculos: ${typeof Calculos}\nCardConta: ${typeof CardConta}\nChipCategoria: ${typeof ChipCategoria}`);

        // Se algum módulo estiver faltando, o erro será capturado abaixo

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

        alert("🟢 4. Desestruturando módulos...");
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

        alert("✅ 5. Desestruturação OK");

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

        function atualizarCabecalho() {
            const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
            getEl('mes-atual-titulo').textContent = meses[mesAtual];
            getEl('mes-transacoes-titulo').textContent = `${meses[mesAtual]} ${anoAtual}`;
            document.querySelectorAll('.mes-chip').forEach(chip => {
                chip.classList.toggle('ativo', parseInt(chip.dataset.mes) === mesAtual);
            });
        }

        function atualizarTudo() {
            atualizarCabecalho();
            const estado = { contas, transacoes, mesAtual, anoAtual, orcamentos, categorias };
            const utils = { getEl, abrirModal, renderizarIconeConta };
            renderizarDashboard(estado, utils, Mascaras, Calculos);
            renderizarTransacoesAgrupadas(estado, utils, Mascaras);
            // Empréstimos inline (omitido para brevidade, mas você pode colar do original)
            if (getEl('tela-planejamento').classList.contains('ativa')) {
                renderizarPlanejamento(estado, utils, Mascaras, Calculos);
            }
        }

        function configurarListeners() {
            getEl('fab-adicionar').addEventListener('click', () => {
                getEl('modal-data').valueAsDate = new Date();
                abrirModal(getEl('modal-transacao'));
                renderizarChipsCategorias(getEl('categorias-chips-container'), categorias, categoriaSelecionada, (cat) => categoriaSelecionada = cat);
            });
            // ... (restante dos listeners, você pode colar do app.js original)
        }

        async function init() {
            alert("🟢 6. init() iniciado");
            await handleRedirectResult();
            carregarLocal();
            configurarMascaras();
            alert("✅ 7. Máscaras configuradas");
            atualizarTudo();
            alert("✅ 8. Interface renderizada");
            configurarListeners();
            alert("✅ 9. Listeners configurados. APP PRONTO!");
        }

        init();
    })();

} catch (error) {
    alert("❌ ERRO CAPTURADO:\n" + error.message + "\n\nStack: " + error.stack);
}