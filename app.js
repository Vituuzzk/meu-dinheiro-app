// Ponto de entrada principal do Meu Dinheiro
import { db, auth } from './services/firebase.js';
import { loginComGoogle, logout, observarAuth, handleRedirectResult } from './services/auth.js';
import { 
  collection, addDoc, getDocs, query, where, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

(function(){
    "use strict";
    const APP_VERSION = '3.2.0';
    console.log(`🚀 Meu Dinheiro v${APP_VERSION}`);

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

    const getEl = (id) => document.getElementById(id);
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

    // Firebase
    async function carregarFirebase(userId) {
        try {
            const contasSnap = await getDocs(query(collection(db, 'contas'), where('userId', '==', userId)));
            contas = contasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const transSnap = await getDocs(query(collection(db, 'transacoes'), where('userId', '==', userId), orderBy('data', 'desc')));
            transacoes = transSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const empSnap = await getDocs(query(collection(db, 'emprestimos'), where('userId', '==', userId)));
            emprestimos = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const configSnap = await getDocs(query(collection(db, 'configuracoes'), where('userId', '==', userId)));
            configSnap.forEach(doc => {
                const data = doc.data();
                if (data.orcamentos) orcamentos = data.orcamentos;
                if (data.categorias) categorias = data.categorias;
            });
        } catch(e) { console.warn("Firebase:", e); }
        atualizarTudo();
    }

    async function salvarContaFirebase(conta) {
        if (!currentUser) return;
        await addDoc(collection(db, 'contas'), { ...conta, userId: currentUser.uid });
    }
    async function salvarTransacaoFirebase(trans) {
        if (!currentUser) return;
        await addDoc(collection(db, 'transacoes'), { ...trans, userId: currentUser.uid });
    }
    async function salvarEmprestimoFirebase(emp) {
        if (!currentUser) return;
        await addDoc(collection(db, 'emprestimos'), { ...emp, userId: currentUser.uid });
    }

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
        
        // Preparar estado para renderização
        const estado = { contas, transacoes, mesAtual, anoAtual, orcamentos, categorias };
        const utils = { getEl, abrirModal, renderizarIconeConta };
        
        renderizarDashboard(estado, utils, Mascaras, Calculos);
        renderizarTransacoesAgrupadas(estado, utils, Mascaras);
        
        // Empréstimos (mantido inline por simplicidade)
        const container = getEl('lista-emprestimos');
        const empty = getEl('empty-emprestimos');
        if (emprestimos.length === 0) {
            if (container) container.innerHTML = '';
            if (empty) empty.style.display = 'block';
            getEl('total-emprestado').textContent = formatarMoeda(0);
            getEl('total-a-receber').textContent = formatarMoeda(0);
        } else {
            if (empty) empty.style.display = 'none';
            let html = '';
            let totalEmp = 0, totalRec = 0;
            emprestimos.forEach(e => {
                const valor = e.valorPrincipal || 0;
                if (e.tipo === 'emprestei') totalEmp += valor;
                else totalRec += valor;
                const parcelasRestantes = e.parcelas?.filter(p => p.status !== 'pago').length || 0;
                html += `<div class="emprestimo-item">
                    <div><strong>${e.nome}</strong><br><small>${parcelasRestantes} parcela(s) pendente(s)</small></div>
                    <div style="color: ${e.tipo === 'emprestei' ? '#10b981' : '#dc2626'};">${e.tipo === 'emprestei' ? '+ ' : '- '}${formatarMoeda(valor)}</div>
                </div>`;
            });
            if (container) container.innerHTML = html;
            getEl('total-emprestado').textContent = formatarMoeda(totalEmp);
            getEl('total-a-receber').textContent = formatarMoeda(totalRec);
        }
        
        if (getEl('tela-planejamento').classList.contains('ativa')) {
            renderizarPlanejamento(estado, utils, Mascaras, Calculos);
        }
    }

    // Continua na Parte 2...
    function configurarListeners() {
        getEl('fab-adicionar').addEventListener('click', () => {
            getEl('modal-data').valueAsDate = new Date();
            abrirModal(getEl('modal-transacao'));
            renderizarChipsCategorias(getEl('categorias-chips-container'), categorias, categoriaSelecionada, (cat) => categoriaSelecionada = cat);
        });

        getEl('toggle-emprestimos').addEventListener('click', () => {
            const content = getEl('emprestimos-content');
            const icon = getEl('emprestimo-toggle-icon');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
            icon.textContent = content.style.display === 'none' ? '▼' : '▲';
        });

        getEl('btn-adicionar-emprestimo').addEventListener('click', () => {
            getEl('emp-data').valueAsDate = new Date();
            abrirModal(getEl('modal-emprestimo'));
        });

        document.querySelectorAll('[id^="fechar-modal"]').forEach(btn => {
            btn.addEventListener('click', () => fecharModal(btn.closest('.modal-overlay')));
        });

        getEl('salvar-emprestimo').addEventListener('click', async () => {
            const nome = getEl('emp-nome').value;
            const tipo = getEl('emp-tipo').value;
            const valor = converterMoedaParaFloat(getEl('emp-valor').value);
            const juros = parseFloat(getEl('emp-juros').value) || 0;
            const parcelas = parseInt(getEl('emp-parcelas').value);
            const dataInicio = getEl('emp-data').value;
            if (!nome || !valor || !dataInicio) return alert('Preencha todos os campos.');
            const valorComJuros = valor * (1 + juros / 100);
            const valorParcela = valorComJuros / parcelas;
            const parcelasArray = [];
            for (let i = 0; i < parcelas; i++) {
                const venc = new Date(dataInicio);
                venc.setMonth(venc.getMonth() + i);
                parcelasArray.push({ numero: i+1, valor: valorParcela, vencimento: venc.toISOString().split('T')[0], status: 'pendente' });
            }
            const novo = { id: gerarId(), nome, tipo, valorPrincipal: valor, juros, parcelas: parcelasArray };
            emprestimos.push(novo);
            salvarLocal();
            if (usandoFirebase) await salvarEmprestimoFirebase(novo);
            atualizarTudo();
            fecharModal(getEl('modal-emprestimo'));
        });

        getEl('adicionar-conta-principal').addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('input[value="normal"]').checked = true;
            getEl('campos-conta-normal').style.display = 'block';
            getEl('campos-cartao-credito').style.display = 'none';
            abrirModal(getEl('modal-contas'));
        });

        getEl('btn-criar-conta').addEventListener('click', async () => {
            const nome = getEl('nova-conta-nome').value;
            if (!nome) return alert('Digite um nome.');
            const tipo = document.querySelector('input[name="tipo-conta"]:checked').value;
            let nova = { id: gerarId(), nome, tipo };
            if (tipo === 'normal') {
                nova.saldoInicial = converterMoedaParaFloat(getEl('nova-conta-saldo-inicial').value);
                nova.incluirNoTotal = getEl('nova-conta-incluir-total').checked;
            } else {
                nova.limite = converterMoedaParaFloat(getEl('cartao-limite').value);
                nova.diaFechamento = parseInt(getEl('cartao-dia-fechamento').value) || 1;
                nova.diaVencimento = parseInt(getEl('cartao-dia-vencimento').value) || 10;
            }
            contas.push(nova);
            salvarLocal();
            if (usandoFirebase) await salvarContaFirebase(nova);
            fecharModal(getEl('modal-contas'));
            atualizarTudo();
        });

        getEl('salvar-transacao-modal').addEventListener('click', async () => {
            const contaId = getEl('modal-conta').value;
            if (!contaId) return alert('Selecione uma conta.');
            const valor = converterMoedaParaFloat(getEl('modal-valor').value);
            if (!valor) return alert('Valor inválido.');
            const data = getEl('modal-data').value;
            if (!data) return alert('Data inválida.');
            const descricao = getEl('modal-descricao').value || (tipoTransacaoAtual === 'receita' ? 'Receita' : 'Despesa');
            const categoria = categoriaSelecionada;
            const recebido = tipoTransacaoAtual === 'receita' ? getEl('modal-recebido').checked : true;
            const nova = { id: gerarId(), tipo: tipoTransacaoAtual, valor, categoria, descricao, data, recebido, contaId };
            transacoes.push(nova);
            salvarLocal();
            if (usandoFirebase) await salvarTransacaoFirebase(nova);
            fecharModal(getEl('modal-transacao'));
            atualizarTudo();
        });

        getEl('fechar-modal-transacao-btn').addEventListener('click', () => fecharModal(getEl('modal-transacao')));

        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const tela = item.dataset.tela;
                document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
                getEl(`tela-${tela}`).classList.add('ativa');
                document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('ativo'));
                item.classList.add('ativo');
                if (tela === 'planejamento') atualizarTudo();
            });
        });

        getEl('tipo-receita-btn').addEventListener('click', () => {
            tipoTransacaoAtual = 'receita';
            getEl('modal-titulo').textContent = 'Nova receita';
            getEl('tipo-receita-btn').classList.add('ativo');
            getEl('tipo-despesa-btn').classList.remove('ativo');
            getEl('modal-recebido').closest('label').style.display = 'flex';
        });
        getEl('tipo-despesa-btn').addEventListener('click', () => {
            tipoTransacaoAtual = 'despesa';
            getEl('modal-titulo').textContent = 'Nova despesa';
            getEl('tipo-despesa-btn').classList.add('ativo');
            getEl('tipo-receita-btn').classList.remove('ativo');
            getEl('modal-recebido').closest('label').style.display = 'none';
        });

        // Dropdown meses
        getEl('btn-toggle-meses').addEventListener('click', (e) => {
            e.stopPropagation();
            const dd = getEl('meses-dropdown');
            dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', (e) => {
            const dd = getEl('meses-dropdown');
            const btn = getEl('btn-toggle-meses');
            if (!btn.contains(e.target) && !dd.contains(e.target)) dd.style.display = 'none';
        });
        document.querySelectorAll('.mes-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                mesAtual = parseInt(chip.dataset.mes);
                atualizarTudo();
                getEl('meses-dropdown').style.display = 'none';
            });
        });
        getEl('btn-cancelar-mes').addEventListener('click', () => {
            mesAtual = mesAnteriorSelecao;
            anoAtual = anoAnteriorSelecao;
            atualizarTudo();
            getEl('meses-dropdown').style.display = 'none';
        });
        getEl('btn-mes-atual').addEventListener('click', () => {
            const hoje = new Date();
            mesAtual = hoje.getMonth();
            anoAtual = hoje.getFullYear();
            atualizarTudo();
            getEl('meses-dropdown').style.display = 'none';
        });

        getEl('btn-limpar-tudo').addEventListener('click', () => {
            if (confirm('Apagar TODOS os dados permanentemente?')) {
                localStorage.clear();
                location.reload();
            }
        });

        getEl('btn-exportar-backup')?.addEventListener('click', () => exportarBackup(contas, transacoes, emprestimos, orcamentos, categorias, APP_VERSION));
        getEl('btn-importar-backup')?.addEventListener('click', () => getEl('input-importar-backup').click());
        getEl('input-importar-backup')?.addEventListener('change', (e) => importarBackup(e, (backup) => {
            contas = backup.contas;
            transacoes = backup.transacoes;
            emprestimos = backup.emprestimos || [];
            orcamentos = backup.orcamentos || {};
            if (backup.categorias) categorias = backup.categorias;
            salvarLocal();
        }));
        getEl('btn-exportar-excel')?.addEventListener('click', () => exportarParaCSV(transacoes, contas, mesAtual, anoAtual));

        const itemSobre = getEl('item-sobre');
        if (itemSobre) {
            itemSobre.innerHTML = `ℹ️ Sobre (v${APP_VERSION})`;
            itemSobre.addEventListener('click', () => alert(`💰 Meu Dinheiro v${APP_VERSION}\nDesenvolvido por Victor Rodrigues`));
        }
    }

    async function init() {
        await handleRedirectResult();
        carregarLocal();
        configurarMascaras();
        atualizarTudo();
        configurarListeners();

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
    }

    function navegarMes(delta) {
        mesAtual += delta;
        if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
        else if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
        atualizarTudo();
    }

    init();
})();