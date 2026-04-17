import { db, auth } from './js/firebase.js';
import { loginComGoogle, logout, observarAuth } from './js/auth.js';
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

(function(){
    "use strict";
    const APP_VERSION = '3.0.0';
    console.log(`🚀 Meu Dinheiro v${APP_VERSION}`);

    // Estado
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
    let usandoFirebase = false;

    const getEl = (id) => document.getElementById(id);
    const formatarMoeda = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const converterMoedaParaFloat = (v) => {
        if (!v) return 0;
        const limpo = v.replace(/\./g, '').replace(',', '.');
        return parseFloat(limpo) || 0;
    };
    function gerarId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 9); }

    // Máscaras
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
    async function salvarConfiguracoesFirebase() {
        if (!currentUser) return;
        const userId = currentUser.uid;
        const snap = await getDocs(query(collection(db, 'configuracoes'), where('userId', '==', userId)));
        const data = { userId, orcamentos, categorias };
        if (!snap.empty) await updateDoc(doc(db, 'configuracoes', snap.docs[0].id), data);
        else await addDoc(collection(db, 'configuracoes'), data);
    }

    // Cálculos
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
        return transacoes.filter(t => t.contaId === cartaoId && t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
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

    // Continua na Parte 2...
// Renderizações
function atualizarTudo() {
    renderizarDashboard();
    renderizarTransacoesAgrupadas();
    renderizarEmprestimos();
    if (getEl('tela-planejamento').classList.contains('ativa')) renderizarPlanejamento();
}

function renderizarDashboard() {
    getEl('saldo-total-valor').textContent = formatarMoeda(calcularSaldoTotal());
    getEl('saldo-projetado-valor').textContent = formatarMoeda(calcularSaldoProjetado());
    getEl('total-receitas-mes').textContent = formatarMoeda(calcularReceitasMes());
    getEl('total-despesas-mes').textContent = formatarMoeda(calcularDespesasMes());

    const contasNormais = contas.filter(c => c.tipo === 'normal');
    const lista = getEl('lista-contas-resumo');
    lista.innerHTML = '';
    contasNormais.forEach(c => {
        const saldo = calcularSaldoConta(c.id);
        const div = document.createElement('div');
        div.className = 'conta-item';
        div.innerHTML = `<div class="conta-info"><div class="conta-icone">${renderizarIconeConta(c.nome)}</div><div class="conta-detalhes"><div class="nome">${c.nome}</div><div class="subtitulo">${c.incluirNoTotal ? 'Incluída' : 'Não incluída'}</div></div></div><div class="conta-saldo">${formatarMoeda(saldo)}</div>`;
        lista.appendChild(div);
    });
    const total = contasNormais.reduce((s, c) => s + calcularSaldoConta(c.id), 0);
    getEl('total-contas-resumo').innerHTML = `<span>Total</span> <span style="font-weight:700;">${formatarMoeda(total)}</span>`;

    const cartoes = contas.filter(c => c.tipo === 'credito');
    const cartoesContainer = getEl('cartoes-resumo-container');
    cartoesContainer.innerHTML = '';
    if (cartoes.length === 0) {
        cartoesContainer.innerHTML = `<div class="empty-state"><p>💳 Nenhum cartão cadastrado.</p><button id="btn-adicionar-cartao-vazio" class="btn-outline">ADICIONAR</button></div>`;
        getEl('btn-adicionar-cartao-vazio')?.addEventListener('click', () => {
            document.querySelector('input[value="credito"]').checked = true;
            getEl('campos-conta-normal').style.display = 'none';
            getEl('campos-cartao-credito').style.display = 'block';
            getEl('modal-contas').style.display = 'flex';
        });
    } else {
        cartoes.forEach(cartao => {
            const fatura = calcularFaturaAtual(cartao.id);
            const disponivel = cartao.limite - fatura;
            const percentual = cartao.limite > 0 ? (fatura / cartao.limite) * 100 : 0;
            const melhorDia = cartao.diaFechamento + 1 > 31 ? 1 : cartao.diaFechamento + 1;
            const div = document.createElement('div');
            div.className = 'cartao-resumo-item';
            div.innerHTML = `<div class="cartao-resumo-header"><strong>${cartao.nome}</strong><span>${formatarMoeda(fatura)}</span></div>
                <div class="limite-barra-container"><div class="limite-barra"><div class="limite-barra-preenchida" style="width: ${percentual}%;"></div></div></div>
                <div style="font-size:14px;">Limite: ${formatarMoeda(cartao.limite)} | Disponível: ${formatarMoeda(disponivel)}</div>
                <div class="cartao-datas"><span>📅 Vence dia ${cartao.diaVencimento}</span><span class="melhor-dia-compra">✨ Melhor dia: ${melhorDia}</span></div>`;
            cartoesContainer.appendChild(div);
        });
    }

    const despesasMes = transacoes.filter(t => t.tipo === 'despesa' && new Date(t.data).getMonth() === mesAtual && new Date(t.data).getFullYear() === anoAtual);
    const canvas = getEl('grafico-categorias');
    if (despesasMes.length === 0) {
        canvas.style.display = 'none';
        getEl('empty-despesas').style.display = 'block';
    } else {
        canvas.style.display = 'block';
        getEl('empty-despesas').style.display = 'none';
        const totais = {};
        despesasMes.forEach(d => { totais[d.categoria] = (totais[d.categoria] || 0) + d.valor; });
        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(totais),
                datasets: [{ data: Object.values(totais), backgroundColor: ['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#94a3b8'] }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }
}

function renderizarTransacoesAgrupadas() {
    const container = getEl('grupos-transacoes');
    const empty = getEl('empty-transacoes');
    const transMes = transacoes.filter(t => {
        const d = new Date(t.data + 'T00:00:00');
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    }).sort((a,b) => new Date(b.data) - new Date(a.data));
    if (transMes.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    const grupos = {};
    transMes.forEach(t => {
        const data = new Date(t.data + 'T00:00:00');
        const key = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(t);
    });
    let html = '';
    for (let data in grupos) {
        html += `<div class="grupo-transacoes"><div class="grupo-data">${data}</div>`;
        grupos[data].forEach(t => {
            const conta = contas.find(c => c.id === t.contaId);
            const icone = t.tipo === 'receita' ? '📈' : '📉';
            const prefixo = t.tipo === 'receita' ? '+' : '-';
            const desc = t.descricao || t.categoria;
            html += `<div class="transacao-item"><div class="transacao-icone">${icone}</div>
                <div class="transacao-info"><div class="transacao-descricao">${desc}</div><div class="transacao-conta">${conta?.nome || 'Conta'} • ${t.categoria}</div></div>
                <div class="transacao-valor ${t.tipo === 'receita' ? 'receita' : 'despesa'}">${prefixo} ${formatarMoeda(t.valor)}</div></div>`;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
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
        const parcelasRestantes = e.parcelas?.filter(p => p.status !== 'pago').length || 0;
        html += `<div class="emprestimo-item">
            <div><strong>${e.nome}</strong><br><small>${parcelasRestantes} parcela(s) pendente(s)</small></div>
            <div style="color: ${e.tipo === 'emprestei' ? '#10b981' : '#dc2626'};">${e.tipo === 'emprestei' ? '+ ' : '- '}${formatarMoeda(valor)}</div>
        </div>`;
    });
    container.innerHTML = html;
    getEl('total-emprestado').textContent = formatarMoeda(totalEmp);
    getEl('total-a-receber').textContent = formatarMoeda(totalRec);
}

function renderizarPlanejamento() {
    const container = getEl('planejamento-container');
    const gastos = {};
    transacoes.filter(t => t.tipo === 'despesa' && new Date(t.data).getMonth() === mesAtual && new Date(t.data).getFullYear() === anoAtual)
        .forEach(t => gastos[t.categoria] = (gastos[t.categoria] || 0) + t.valor);
    const categoriasPlanejadas = categorias.filter(c => orcamentos[c.nome]);
    if (categoriasPlanejadas.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>📝 Nenhum orçamento definido.</p></div>`;
        return;
    }
    let html = '';
    categoriasPlanejadas.forEach(cat => {
        const limite = orcamentos[cat.nome];
        const gasto = gastos[cat.nome] || 0;
        const percentual = limite > 0 ? (gasto / limite) * 100 : 0;
        html += `<div class="orcamento-item"><div class="orcamento-header"><span>${cat.icone} ${cat.nome}</span><span>${formatarMoeda(gasto)} / ${formatarMoeda(limite)}</span></div>
            <div class="limite-barra-container"><div class="limite-barra"><div class="limite-barra-preenchida" style="width: ${Math.min(percentual, 100)}%; background: ${percentual > 100 ? '#dc2626' : '#059669'};"></div></div></div></div>`;
    });
    container.innerHTML = html;
    if (planejamentoChartInstance) planejamentoChartInstance.destroy();
    const ctx = getEl('grafico-planejamento').getContext('2d');
    planejamentoChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categoriasPlanejadas.map(c => c.nome),
            datasets: [
                { label: 'Gasto', data: categoriasPlanejadas.map(c => gastos[c.nome] || 0), backgroundColor: '#f97316' },
                { label: 'Limite', data: categoriasPlanejadas.map(c => orcamentos[c.nome]), backgroundColor: '#3b82f6' }
            ]
        },
        options: { responsive: true }
    });
}

function renderizarIconeConta(nome) {
    const n = nome.toLowerCase();
    if (n.includes('nubank')) return '<i class="ibb-nubank" style="font-size:24px;"></i>';
    if (n.includes('inter')) return '<i class="ibb-inter" style="font-size:24px;"></i>';
    if (n.includes('carteira')) return '<span style="font-size:24px;">💰</span>';
    return '<span style="font-size:24px;">🏦</span>';
}

// Continua na Parte 3...
    // Inicialização e Listeners
    async function init() {
        carregarLocal();
        configurarMascaras();
        renderizarDashboard();
        renderizarTransacoesAgrupadas();
        renderizarEmprestimos();

        // Auth
        observarAuth(async (user) => {
            currentUser = user;
            if (user) {
                usandoFirebase = true;
                getEl('perfil-nome').textContent = user.displayName || 'Usuário';
                getEl('perfil-email').textContent = user.email;
                getEl('btn-login-google').style.display = 'none';
                getEl('btn-logout').style.display = 'block';
                await carregarFirebase(user.uid);
            } else {
                usandoFirebase = false;
                getEl('perfil-nome').textContent = 'Usuário Local';
                getEl('perfil-email').textContent = 'Modo offline';
                getEl('btn-login-google').style.display = 'block';
                getEl('btn-logout').style.display = 'none';
                carregarLocal();
                atualizarTudo();
            }
        });

        // Listeners de UI
        getEl('btn-login-google').addEventListener('click', loginComGoogle);
        getEl('btn-logout').addEventListener('click', logout);
        getEl('fab-adicionar').addEventListener('click', () => {
            getEl('modal-transacao').style.display = 'flex';
            getEl('modal-data').valueAsDate = new Date();
        });
        getEl('toggle-emprestimos').addEventListener('click', () => {
            const content = getEl('emprestimos-content');
            const icon = getEl('emprestimo-toggle-icon');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
            icon.textContent = content.style.display === 'none' ? '▼' : '▲';
        });
        getEl('btn-adicionar-emprestimo').addEventListener('click', () => {
            getEl('modal-emprestimo').style.display = 'flex';
            getEl('emp-data').valueAsDate = new Date();
        });
        getEl('fechar-modal-emprestimo').addEventListener('click', () => getEl('modal-emprestimo').style.display = 'none');
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
            renderizarEmprestimos();
            getEl('modal-emprestimo').style.display = 'none';
        });

        // Navegação
        document.querySelectorAll('.menu-item').forEach(item => item.addEventListener('click', () => {
            const tela = item.dataset.tela;
            document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
            getEl(`tela-${tela}`).classList.add('ativa');
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('ativo'));
            item.classList.add('ativo');
            if (tela === 'planejamento') renderizarPlanejamento();
        }));

        // Meses
        getEl('mes-anterior-seta').addEventListener('click', () => navegarMes(-1));
        getEl('mes-proximo-seta').addEventListener('click', () => navegarMes(1));
        // ... implementar navegarMes(delta) que atualiza mesAtual/anoAtual e chama atualizarTudo()
    }

    function navegarMes(delta) {
        mesAtual += delta;
        if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
        else if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
        const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        getEl('mes-atual-titulo').textContent = meses[mesAtual];
        getEl('mes-transacoes-titulo').textContent = `${meses[mesAtual]} ${anoAtual}`;
        atualizarTudo();
    }

    init();
})();