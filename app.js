import { db, auth } from './js/firebase.js';
import { loginComGoogle, logout, observarAuth } from './js/auth.js';
import { 
  collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

(function(){
    "use strict";
    const APP_VERSION = '3.0.3';
    console.log(`🚀 Meu Dinheiro v${APP_VERSION}`);

    // ---------- ESTADO ----------
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
        return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0;
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
        } catch(e) { alert("Erro Firebase: "+e.message); }
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

    // ---------- CÁLCULOS ----------
    function getDataLimite() { return new Date(anoAtual, mesAtual + 1, 0); }
    function calcularFaturaAtual(cartaoId) {
        return transacoes.filter(t => t.tipo === 'despesa' && t.contaId === cartaoId)
            .reduce((s, t) => s + t.valor, 0);
    }
    function calcularSaldoConta(contaId) {
        const conta = contas.find(c => c.id === contaId);
        if (!conta) return 0;
        if (conta.tipo === 'credito') return -calcularFaturaAtual(contaId);
        const dataLimite = getDataLimite();
        let saldo = conta.saldoInicial || 0;
        transacoes.forEach(t => {
            const dataTransacao = new Date(t.data + 'T00:00:00');
            if (dataTransacao > dataLimite) return;
            if (t.contaId === contaId) {
                if (t.tipo === 'despesa') saldo -= t.valor;
                else if (t.tipo === 'receita' && t.recebido !== false) saldo += t.valor;
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
    function calcularGastosPorCategoria() {
        const gastos = {};
        transacoes.filter(t => t.tipo === 'despesa' && new Date(t.data).getMonth() === mesAtual && new Date(t.data).getFullYear() === anoAtual)
            .forEach(t => gastos[t.categoria] = (gastos[t.categoria] || 0) + t.valor);
        return gastos;
    }

    // ---------- RENDERIZAÇÕES ----------
    function atualizarCabecalho() {
        const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        getEl('mes-atual-titulo').textContent = meses[mesAtual];
        getEl('mes-transacoes-titulo').textContent = `${meses[mesAtual]} ${anoAtual}`;
        document.querySelectorAll('.mes-chip').forEach(chip => {
            chip.classList.toggle('ativo', parseInt(chip.dataset.mes) === mesAtual);
        });
    }

    function renderizarIconeConta(nome) {
        const n = nome.toLowerCase();
        if (n.includes('nubank')) return '<i class="ibb-nubank" style="font-size:24px;"></i>';
        if (n.includes('inter')) return '<i class="ibb-inter" style="font-size:24px;"></i>';
        if (n.includes('carteira')) return '<span style="font-size:24px;">💰</span>';
        return '<span style="font-size:24px;">🏦</span>';
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
        const totalNormal = contasNormais.reduce((s, c) => s + calcularSaldoConta(c.id), 0);
        getEl('total-contas-resumo').innerHTML = `<span>Total</span> <span style="font-weight:700;">${formatarMoeda(totalNormal)}</span>`;

        const cartoes = contas.filter(c => c.tipo === 'credito');
        const cartoesContainer = getEl('cartoes-resumo-container');
        cartoesContainer.innerHTML = '';
        if (cartoes.length === 0) {
            cartoesContainer.innerHTML = `<div class="empty-state"><p>💳 Nenhum cartão cadastrado.</p><button id="btn-adicionar-cartao-vazio" class="btn-outline">ADICIONAR</button></div>`;
            getEl('btn-adicionar-cartao-vazio')?.addEventListener('click', () => {
                document.querySelector('input[value="credito"]').checked = true;
                getEl('campos-conta-normal').style.display = 'none';
                getEl('campos-cartao-credito').style.display = 'block';
                abrirModal(getEl('modal-contas'));
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
        const gastos = calcularGastosPorCategoria();
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

    function atualizarTudo() {
        atualizarCabecalho();
        renderizarDashboard();
        renderizarTransacoesAgrupadas();
        renderizarEmprestimos();
        if (getEl('tela-planejamento').classList.contains('ativa')) renderizarPlanejamento();
    }

    // NOVA FUNÇÃO: Abrir modal com animação
    function abrirModal(modalOverlay) {
        modalOverlay.style.display = 'flex';
        setTimeout(() => modalOverlay.classList.add('ativo'), 10);
    }

    // NOVA FUNÇÃO: Fechar modal com animação
    function fecharModal(modalOverlay) {
        modalOverlay.classList.remove('ativo');
        setTimeout(() => modalOverlay.style.display = 'none', 300);
    }

    // Continua na Parte 2...

    // ---------- LISTENERS ----------
    function configurarListeners() {
        // FAB
        getEl('fab-adicionar').addEventListener('click', () => {
            getEl('modal-data').valueAsDate = new Date();
            abrirModal(getEl('modal-transacao'));
            renderizarChipsCategorias();
        });

        // Toggle Empréstimos
        getEl('toggle-emprestimos').addEventListener('click', () => {
            const content = getEl('emprestimos-content');
            const icon = getEl('emprestimo-toggle-icon');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
            icon.textContent = content.style.display === 'none' ? '▼' : '▲';
        });

        // Adicionar Empréstimo
        getEl('btn-adicionar-emprestimo').addEventListener('click', () => {
            getEl('emp-data').valueAsDate = new Date();
            abrirModal(getEl('modal-emprestimo'));
        });

        // Fechar modais (usando os botões de fechar)
        document.querySelectorAll('[id^="fechar-modal"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal-overlay');
                fecharModal(modal);
            });
        });

        // Salvar Empréstimo
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
            fecharModal(getEl('modal-emprestimo'));
        });

        // Adicionar Conta Principal
        getEl('adicionar-conta-principal').addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('input[value="normal"]').checked = true;
            getEl('campos-conta-normal').style.display = 'block';
            getEl('campos-cartao-credito').style.display = 'none';
            abrirModal(getEl('modal-contas'));
        });

        // Salvar Conta
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
            renderizarDashboard();
        });

        // Salvar Transação
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

        // Salvar e Continuar
        getEl('salvar-continuar-modal').addEventListener('click', async () => {
            // Salva sem fechar
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
            // Limpa campos, mas mantém modal aberto
            getEl('modal-valor').value = '';
            getEl('modal-descricao').value = '';
            atualizarTudo();
        });

        // Navegação
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const tela = item.dataset.tela;
                document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
                getEl(`tela-${tela}`).classList.add('ativa');
                document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('ativo'));
                item.classList.add('ativo');
                if (tela === 'planejamento') renderizarPlanejamento();
            });
        });

        // Chips de categorias
        window.renderizarChipsCategorias = () => {
            const container = getEl('categorias-chips-container');
            container.innerHTML = '';
            categorias.forEach(cat => {
                const chip = document.createElement('span');
                chip.className = `categoria-chip ${categoriaSelecionada === cat.nome ? 'ativo' : ''}`;
                chip.innerHTML = `<i data-lucide="${cat.icone}"></i> ${cat.nome}`;
                chip.addEventListener('click', () => {
                    categoriaSelecionada = cat.nome;
                    renderizarChipsCategorias();
                });
                container.appendChild(chip);
            });
            lucide.createIcons();
        };

        // Tipo de transação (Receita/Despesa)
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
    }

    // ---------- INICIALIZAÇÃO ----------
    async function init() {
        carregarLocal();
        configurarMascaras();
        atualizarCabecalho();
        renderizarDashboard();
        renderizarTransacoesAgrupadas();
        renderizarEmprestimos();
        configurarListeners();

        // Auth
        observarAuth(async (user) => {
            currentUser = user;
            usandoFirebase = !!user;
            if (user) {
                getEl('perfil-nome').textContent = user.displayName || 'Usuário';
                getEl('perfil-email').textContent = user.email;
                getEl('btn-login-google').style.display = 'none';
                getEl('btn-logout').style.display = 'block';
                await carregarFirebase(user.uid);
                alert("✅ Login realizado com sucesso!");
            } else {
                getEl('perfil-nome').textContent = 'Usuário Local';
                getEl('perfil-email').textContent = 'Modo offline';
                getEl('btn-login-google').style.display = 'block';
                getEl('btn-logout').style.display = 'none';
                carregarLocal();
                atualizarTudo();
            }
        });

        getEl('btn-login-google').addEventListener('click', loginComGoogle);
        getEl('btn-logout').addEventListener('click', () => {
            logout();
            alert("👋 Logout realizado.");
        });

        // Meses
        getEl('mes-anterior-seta').addEventListener('click', () => navegarMes(-1));
        getEl('mes-proximo-seta').addEventListener('click', () => navegarMes(1));
    }

    function navegarMes(delta) {
        mesAtual += delta;
        if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
        else if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
        atualizarTudo();
    }

    init();
})();