(function(){
    "use strict";
    const APP_VERSION = '2.0.0';
    console.log(`🚀 Meu Dinheiro v${APP_VERSION} iniciado`);

    // ---------- ESTADO ----------
    let contas = [];
    let transacoes = [];
    let mesAtual = new Date().getMonth();
    let anoAtual = new Date().getFullYear();

    // Categorias padrão (usaremos para os chips)
    let categorias = [
        { nome: 'Alimentação', icone: '🍔', cor: '#f97316' },
        { nome: 'Transporte', icone: '🚗', cor: '#3b82f6' },
        { nome: 'Lazer', icone: '🎉', cor: '#10b981' },
        { nome: 'Contas', icone: '📄', cor: '#8b5cf6' },
        { nome: 'Salário', icone: '💼', cor: '#ec4899' },
        { nome: 'Freelance', icone: '💻', cor: '#94a3b8' },
        { nome: 'Saúde', icone: '🏥', cor: '#ef4444' },
        { nome: 'Educação', icone: '📚', cor: '#14b8a6' }
    ];

    // ---------- ELEMENTOS ----------
    const getEl = (id) => document.getElementById(id);
    const mesAtualTitulo = getEl('mes-atual-titulo');
    const mesTransacoesTituloNovo = getEl('mes-transacoes-titulo-novo');
    const saldoTotalValor = getEl('saldo-total-valor');
    const totalReceitasMes = getEl('total-receitas-mes');
    const totalDespesasMes = getEl('total-despesas-mes');
    const listaContasResumo = getEl('lista-contas-resumo');
    const totalContasResumo = getEl('total-contas-resumo');
    const cartoesResumoContainer = getEl('cartoes-resumo-container');
    const ctx = getEl('grafico-categorias')?.getContext('2d');
    const emptyDespesas = getEl('empty-despesas');
    let chartInstance = null;

    // Modal Transação
    const modalTransacao = getEl('modal-transacao');
    const modalTitulo = getEl('modal-titulo');
    const tipoReceitaBtn = getEl('tipo-receita-btn');
    const tipoDespesaBtn = getEl('tipo-despesa-btn');
    const modalValor = getEl('modal-valor');
    const modalConta = getEl('modal-conta');
    const modalData = getEl('modal-data');
    const modalDescricao = getEl('modal-descricao');
    const salvarTransacaoModal = getEl('salvar-transacao-modal');
    const salvarContinuarModal = getEl('salvar-continuar-modal');
    const fecharModalTransacao = getEl('fechar-modal-transacao');
    const checkboxRecebido = getEl('modal-recebido');
    const checkboxReceitaFixa = getEl('modal-receita-fixa');
    const repetirContainer = getEl('repetir-container');
    const modalRepetir = getEl('modal-repetir');
    const modalObservacao = getEl('modal-observacao');
    const modalTags = getEl('modal-tags');
    const modalLembrar = getEl('modal-lembrar');
    const categoriasChipsContainer = getEl('categorias-chips-container');
    let tipoTransacaoAtual = 'receita';
    let categoriaSelecionada = 'Alimentação';

    // Modal Contas
    const modalOverlay = getEl('modal-contas');
    const btnGerenciarContas = getEl('btn-abrir-modal-contas');
    const btnFecharModal = getEl('btn-fechar-modal');
    const listaContasModal = getEl('lista-contas-modal');
    const novaContaNome = getEl('nova-conta-nome');
    const camposContaNormal = getEl('campos-conta-normal');
    const camposCartaoCredito = getEl('campos-cartao-credito');
    const radioTipoConta = document.getElementsByName('tipo-conta');
    const novaContaSaldoInicial = getEl('nova-conta-saldo-inicial');
    const novaContaIncluirTotal = getEl('nova-conta-incluir-total');
    const cartaoLimite = getEl('cartao-limite');
    const cartaoDiaFechamento = getEl('cartao-dia-fechamento');
    const cartaoDiaVencimento = getEl('cartao-dia-vencimento');
    const btnCriarConta = getEl('btn-criar-conta');
    const btnLimparTudo = getEl('btn-limpar-tudo');

    const telas = {
        principal: getEl('tela-principal'),
        transacoes: getEl('tela-transacoes'),
        planejamento: getEl('tela-planejamento'),
        mais: getEl('tela-mais')
    };
    const menuItems = document.querySelectorAll('.menu-item');
    const fab = getEl('fab-adicionar');

    const abasBtns = document.querySelectorAll('.aba-btn');
    const abasConteudos = document.querySelectorAll('.aba-conteudo');
    const btnAbrirConfig = getEl('btn-abrir-configuracoes');
    const telaConfiguracoes = getEl('tela-configuracoes');
    const btnVoltarConfig = getEl('btn-voltar-configuracoes');

    const btnAdicionarContaPrincipal = getEl('adicionar-conta-principal');

    // Dropdown de meses
    const btnToggleMeses = getEl('btn-toggle-meses');
    const mesesDropdown = getEl('meses-chips-dropdown');
    const mesChips = document.querySelectorAll('.mes-chip');

    // ---------- MÁSCARA ----------
    function aplicarMascaraMoeda(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v === '') { e.target.value = ''; return; }
        e.target.value = (parseFloat(v) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function converterMoedaParaFloat(v) {
        if (!v) return 0;
        return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0;
    }
    function formatarMoeda(v) {
        return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    function configurarMascaras() {
        document.querySelectorAll('.moeda').forEach(i => {
            i.addEventListener('input', aplicarMascaraMoeda);
            i.addEventListener('blur', e => { if (e.target.value === '') e.target.value = '0,00'; });
        });
    }
    function gerarId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 9); }

    // ---------- ÍCONES DE BANCOS ----------
    function getIconeBanco(nomeConta) {
        const nome = nomeConta.toLowerCase();
        if (nome.includes('nubank')) return 'ibb-nubank';
        if (nome.includes('inter')) return 'ibb-inter';
        if (nome.includes('itaú') || nome.includes('itau')) return 'ibb-itau';
        if (nome.includes('bradesco')) return 'ibb-bradesco';
        if (nome.includes('santander')) return 'ibb-santander';
        if (nome.includes('caixa')) return 'ibb-caixa';
        if (nome.includes('carteira')) return '💰';
        return '🏦';
    }
    function renderizarIconeConta(nomeConta) {
        const icone = getIconeBanco(nomeConta);
        if (icone.startsWith('ibb-')) {
            return `<i class="${icone}" style="font-size: 24px;"></i>`;
        } else {
            return `<span style="font-size: 24px;">${icone}</span>`;
        }
    }

    // ---------- PERSISTÊNCIA ----------
    function carregarDados() {
        try {
            contas = JSON.parse(localStorage.getItem('contas')) || [];
            transacoes = JSON.parse(localStorage.getItem('transacoes')) || [];
            const catsSalvas = localStorage.getItem('categorias');
            if (catsSalvas) categorias = JSON.parse(catsSalvas);
        } catch(e) { contas = []; transacoes = []; }
        
        transacoes.forEach(t => {
            if (t.tipo === 'receita' && t.recebido === undefined) t.recebido = true;
        });
        salvarTransacoes();
        salvarCategorias();
        
        if (contas.length === 0) {
            contas.push({ id: gerarId(), nome: 'Carteira', tipo: 'normal', saldoInicial: 0, incluirNoTotal: true });
            salvarContas();
        }
    }
    function salvarContas() { localStorage.setItem('contas', JSON.stringify(contas)); }
    function salvarTransacoes() { localStorage.setItem('transacoes', JSON.stringify(transacoes)); }
    function salvarCategorias() { localStorage.setItem('categorias', JSON.stringify(categorias)); }

    // ---------- CÁLCULOS (com filtro por data limite) ----------
    function getDataLimite() {
        return new Date(anoAtual, mesAtual + 1, 0);
    }
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
            }
            else if (t.tipo === 'transferencia') {
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

    // ---------- RENDER ----------
    function atualizarCabecalhoMes() {
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const titulo = `${meses[mesAtual]} ${anoAtual}`;
        if (mesAtualTitulo) mesAtualTitulo.textContent = titulo;
        if (mesTransacoesTituloNovo) mesTransacoesTituloNovo.textContent = titulo;
        atualizarChipAtivo();
    }
    function atualizarChipAtivo() {
        mesChips.forEach(chip => {
            const mesChip = parseInt(chip.dataset.mes);
            chip.classList.toggle('ativo', mesChip === mesAtual);
        });
    }

    function renderizarDashboard() {
        if (!saldoTotalValor) return;
        saldoTotalValor.textContent = formatarMoeda(calcularSaldoTotal());
        if (totalReceitasMes) totalReceitasMes.textContent = formatarMoeda(calcularReceitasMes());
        if (totalDespesasMes) totalDespesasMes.textContent = formatarMoeda(calcularDespesasMes());

        const contasNormais = contas.filter(c => c.tipo === 'normal');
        if (listaContasResumo) {
            listaContasResumo.innerHTML = '';
            contasNormais.forEach(c => {
                const saldo = calcularSaldoConta(c.id);
                const div = document.createElement('div');
                div.className = 'conta-item';
                div.innerHTML = `<div class="conta-info"><div class="conta-icone">${renderizarIconeConta(c.nome)}</div><div class="conta-detalhes"><div class="nome">${c.nome}</div><div class="subtitulo">${c.incluirNoTotal ? 'Incluída' : 'Não incluída'}</div></div></div><div class="conta-saldo" style="color: ${saldo < 0 ? '#dc2626' : '#1f2937'}">${formatarMoeda(saldo)}</div>`;
                listaContasResumo.appendChild(div);
            });
        }
        const totalNormal = contasNormais.reduce((s, c) => s + calcularSaldoConta(c.id), 0);
        if (totalContasResumo) totalContasResumo.innerHTML = `<span>Total</span> <span style="font-weight:700;">${formatarMoeda(totalNormal)}</span>`;

        const cartoes = contas.filter(c => c.tipo === 'credito');
        if (cartoesResumoContainer) {
            cartoesResumoContainer.innerHTML = '';
            if (cartoes.length === 0) {
                cartoesResumoContainer.innerHTML = `<div class="empty-state"><p>💳 Ops! Você ainda não tem nenhum cartão de crédito cadastrado.</p><button id="btn-adicionar-cartao-vazio" class="btn-outline">ADICIONAR NOVO CARTÃO</button></div>`;
                const btnAdicionar = getEl('btn-adicionar-cartao-vazio');
                if (btnAdicionar) btnAdicionar.addEventListener('click', () => {
                    document.querySelector('input[value="credito"]').checked = true;
                    if (camposContaNormal) camposContaNormal.style.display = 'none';
                    if (camposCartaoCredito) camposCartaoCredito.style.display = 'block';
                    if (modalOverlay) modalOverlay.style.display = 'flex';
                });
            } else {
                cartoes.forEach(cartao => {
                    const fatura = calcularFaturaAtual(cartao.id);
                    const disponivel = cartao.limite - fatura;
                    const percentual = cartao.limite > 0 ? (fatura / cartao.limite) * 100 : 0;
                    const melhorDia = cartao.diaFechamento + 1 > 31 ? 1 : cartao.diaFechamento + 1;
                    const div = document.createElement('div');
                    div.className = 'cartao-resumo-item';
                    div.innerHTML = `
                        <div class="cartao-resumo-header"><strong>${cartao.nome}</strong><span>${formatarMoeda(fatura)}</span></div>
                        <div class="limite-barra-container">
                            <div class="limite-barra">
                                <div class="limite-barra-preenchida" style="width: ${percentual}%;"></div>
                            </div>
                        </div>
                        <div style="font-size:14px; color:#6b7280;">Limite: ${formatarMoeda(cartao.limite)} | Disponível: ${formatarMoeda(disponivel)}</div>
                        <div class="cartao-datas">
                            <span>📅 Vence dia ${cartao.diaVencimento}</span>
                            <span class="melhor-dia-compra">✨ Melhor dia: ${melhorDia}</span>
                        </div>
                    `;
                    cartoesResumoContainer.appendChild(div);
                });
            }
        }

        const despesasMes = transacoes.filter(t => t.tipo === 'despesa' && new Date(t.data).getMonth() === mesAtual && new Date(t.data).getFullYear() === anoAtual);
        const canvas = getEl('grafico-categorias');
        if (canvas) {
            if (despesasMes.length === 0) {
                canvas.style.display = 'none';
                if (emptyDespesas) emptyDespesas.style.display = 'block';
            } else {
                canvas.style.display = 'block';
                if (emptyDespesas) emptyDespesas.style.display = 'none';
                const totais = {};
                despesasMes.forEach(d => { totais[d.categoria] = (totais[d.categoria] || 0) + d.valor; });
                if (chartInstance) chartInstance.destroy();
                if (ctx) {
                    chartInstance = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: Object.keys(totais),
                            datasets: [{ data: Object.values(totais), backgroundColor: ['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#94a3b8'] }]
                        },
                        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
                    });
                }
            }
        }
    }

    function renderizarTransacoesAgrupadas() {
        const container = getEl('grupos-transacoes');
        const emptyState = getEl('empty-transacoes');
        if (!container) return;
        const transacoesMes = transacoes.filter(t => {
            const d = new Date(t.data + 'T00:00:00');
            return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        }).sort((a, b) => new Date(b.data) - new Date(a.data));
        if (transacoesMes.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            const grupos = {};
            transacoesMes.forEach(t => {
                const data = new Date(t.data + 'T00:00:00');
                const dataFormatada = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
                if (!grupos[dataFormatada]) grupos[dataFormatada] = [];
                grupos[dataFormatada].push(t);
            });
            let html = '';
            for (const [data, transacoesDia] of Object.entries(grupos)) {
                html += `<div class="grupo-transacoes"><div class="grupo-data">${data}</div>`;
                transacoesDia.forEach(t => {
                    const conta = contas.find(c => c.id === t.contaId);
                    const icone = t.tipo === 'receita' ? '📈' : '📉';
                    const classeValor = t.tipo === 'receita' ? 'receita' : 'despesa';
                    const prefixo = t.tipo === 'receita' ? '+' : '-';
                    const descricao = t.descricao || t.categoria;
                    html += `<div class="transacao-item"><div class="transacao-icone">${icone}</div><div class="transacao-info"><div class="transacao-descricao">${descricao}</div><div class="transacao-conta">${conta?.nome || 'Conta'} • ${t.categoria}</div></div><div class="transacao-valor ${classeValor}">${prefixo} ${formatarMoeda(t.valor)}</div></div>`;
                });
                html += `</div>`;
            }
            container.innerHTML = html;
        }
    }

    function atualizarSelectModal() {
        if (!modalConta) return;
        modalConta.innerHTML = '<option value="">Selecione a conta...</option>';
        contas.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = `${c.nome} (${c.tipo === 'credito' ? '💳' : '💰'})`;
            modalConta.appendChild(option);
        });
    }

    function renderizarChipsCategorias() {
        if (!categoriasChipsContainer) return;
        categoriasChipsContainer.innerHTML = '';
        categorias.forEach(cat => {
            const chip = document.createElement('span');
            chip.className = `categoria-chip ${categoriaSelecionada === cat.nome ? 'ativo' : ''}`;
            chip.innerHTML = `${cat.icone} ${cat.nome}`;
            chip.dataset.categoria = cat.nome;
            chip.addEventListener('click', () => {
                categoriaSelecionada = cat.nome;
                renderizarChipsCategorias();
            });
            categoriasChipsContainer.appendChild(chip);
        });
    }

    function abrirModalTransacao() {
        atualizarSelectModal();
        const hoje = new Date();
        modalData.value = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
        modalValor.value = '';
        modalDescricao.value = '';
        modalObservacao.value = '';
        modalTags.value = '';
        checkboxRecebido.checked = true;
        checkboxReceitaFixa.checked = false;
        repetirContainer.style.display = 'none';
        categoriaSelecionada = 'Alimentação';
        renderizarChipsCategorias();
        modalTransacao.style.display = 'flex';
    }

    function mostrarTela(id) {
        Object.values(telas).forEach(t => { if (t) t.classList.remove('ativa'); });
        if (telas[id]) telas[id].classList.add('ativa');
        menuItems.forEach(item => item.classList.toggle('ativo', item.dataset.tela === id));
        if (id === 'principal') renderizarDashboard();
        if (id === 'transacoes') renderizarTransacoesAgrupadas();
    }

    function renderizarListaContasModal() {
        if (!listaContasModal) return;
        listaContasModal.innerHTML = '';
        contas.forEach(c => {
            const saldo = calcularSaldoConta(c.id);
            const li = document.createElement('li');
            li.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;"><span>${renderizarIconeConta(c.nome)}</span><div><strong>${c.nome}</strong> (${c.tipo==='credito'?'💳':'💰'})<br><small>${formatarMoeda(saldo)}</small></div></div><button data-id="${c.id}" style="width:auto; background:#ef4444;">🗑️</button>`;
            li.querySelector('button').addEventListener('click', () => {
                if (confirm('Excluir?')) {
                    contas = contas.filter(co => co.id !== c.id);
                    transacoes = transacoes.filter(t => t.contaId !== c.id && t.contaOrigemId !== c.id && t.contaDestinoId !== c.id);
                    salvarContas(); salvarTransacoes();
                    renderizarListaContasModal(); renderizarDashboard(); renderizarTransacoesAgrupadas();
                }
            });
            listaContasModal.appendChild(li);
        });
    }

    // ---------- BACKUP ----------
    function exportarBackup() {
        const backup = { versao: APP_VERSION, data: new Date().toISOString(), contas, transacoes, categorias };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meu-dinheiro-backup-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('✅ Backup exportado com sucesso!');
    }

    function importarBackup(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                if (!backup.contas || !backup.transacoes) throw new Error('Arquivo inválido');
                if (confirm('Importar backup substituirá todos os dados atuais. Continuar?')) {
                    contas = backup.contas;
                    transacoes = backup.transacoes;
                    if (backup.categorias) categorias = backup.categorias;
                    salvarContas(); salvarTransacoes(); salvarCategorias();
                    location.reload();
                }
            } catch (error) { alert('❌ Arquivo de backup inválido.'); }
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    // ---------- INIT ----------
    function init() {
        console.log(`🟢 init() executado - v${APP_VERSION}`);
        carregarDados();
        configurarMascaras();
        atualizarCabecalhoMes();
        renderizarDashboard();
        renderizarTransacoesAgrupadas();

        const itemSobre = getEl('item-sobre');
        if (itemSobre) itemSobre.innerHTML = `ℹ️ Sobre (v${APP_VERSION})`;

        if (btnAdicionarContaPrincipal) {
            btnAdicionarContaPrincipal.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelector('input[value="normal"]').checked = true;
                if (camposContaNormal) camposContaNormal.style.display = 'block';
                if (camposCartaoCredito) camposCartaoCredito.style.display = 'none';
                if (novaContaNome) novaContaNome.value = '';
                if (novaContaSaldoInicial) novaContaSaldoInicial.value = '0,00';
                if (novaContaIncluirTotal) novaContaIncluirTotal.checked = true;
                if (modalOverlay) modalOverlay.style.display = 'flex';
            });
        }

        const navegarMes = (delta) => {
            mesAtual += delta;
            if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
            else if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
            atualizarCabecalhoMes();
            renderizarDashboard();
            renderizarTransacoesAgrupadas();
            if (mesesDropdown) mesesDropdown.classList.remove('ativo');
            if (btnToggleMeses) btnToggleMeses.classList.remove('aberto');
        };

        btnToggleMeses.addEventListener('click', () => {
            mesesDropdown.classList.toggle('ativo');
            btnToggleMeses.classList.toggle('aberto');
        });

        mesChips.forEach(chip => {
            chip.addEventListener('click', () => {
                mesAtual = parseInt(chip.dataset.mes);
                atualizarCabecalhoMes();
                renderizarDashboard();
                renderizarTransacoesAgrupadas();
                mesesDropdown.classList.remove('ativo');
                btnToggleMeses.classList.remove('aberto');
            });
        });

        fab.addEventListener('click', () => abrirModalTransacao());

        tipoReceitaBtn.addEventListener('click', () => {
            tipoTransacaoAtual = 'receita';
            modalTitulo.textContent = 'Nova receita';
            tipoReceitaBtn.style.background = '#10b981';
            tipoDespesaBtn.style.background = '#9ca3af';
            if (checkboxRecebido) checkboxRecebido.closest('label').style.display = 'flex';
        });
        tipoDespesaBtn.addEventListener('click', () => {
            tipoTransacaoAtual = 'despesa';
            modalTitulo.textContent = 'Nova despesa';
            tipoDespesaBtn.style.background = '#dc2626';
            tipoReceitaBtn.style.background = '#9ca3af';
            if (checkboxRecebido) checkboxRecebido.closest('label').style.display = 'none';
        });

        checkboxReceitaFixa.addEventListener('change', () => {
            repetirContainer.style.display = checkboxReceitaFixa.checked ? 'block' : 'none';
        });

        const salvarTransacao = (fecharModal = true) => {
            const contaId = modalConta?.value;
            if (!contaId) { alert('Selecione uma conta.'); return false; }
            const valor = converterMoedaParaFloat(modalValor?.value);
            if (isNaN(valor) || valor <= 0) { alert('Valor inválido.'); return false; }
            const data = modalData?.value;
            if (!data) { alert('Data inválida.'); return false; }
            const descricao = modalDescricao?.value.trim() || (tipoTransacaoAtual === 'receita' ? 'Receita' : 'Despesa');
            const categoria = categoriaSelecionada;
            const recebido = tipoTransacaoAtual === 'receita' ? checkboxRecebido?.checked : true;
            
            const novaTransacao = {
                id: gerarId(),
                tipo: tipoTransacaoAtual,
                valor,
                categoria,
                descricao,
                data,
                timestamp: new Date().toISOString(),
                contaId,
                recebido
            };
            if (modalObservacao?.value) novaTransacao.observacao = modalObservacao.value;
            if (modalTags?.value) novaTransacao.tags = modalTags.value;
            if (checkboxReceitaFixa?.checked) {
                novaTransacao.receitaFixa = true;
                novaTransacao.repetir = modalRepetir?.value || 'mensal';
            }
            if (modalLembrar?.checked) novaTransacao.lembrar = true;
            
            transacoes.push(novaTransacao);
            salvarTransacoes();
            if (fecharModal) modalTransacao.style.display = 'none';
            renderizarDashboard();
            renderizarTransacoesAgrupadas();
            return true;
        };

        salvarTransacaoModal.addEventListener('click', () => salvarTransacao(true));
        salvarContinuarModal.addEventListener('click', () => {
            if (salvarTransacao(false)) {
                abrirModalTransacao();
            }
        });

        fecharModalTransacao.addEventListener('click', () => modalTransacao.style.display = 'none');

        // ... continua na Parte 2 ...
        // Continuação do init()

        if (btnGerenciarContas) btnGerenciarContas.addEventListener('click', () => { renderizarListaContasModal(); if(modalOverlay) modalOverlay.style.display = 'flex'; });
        if (btnFecharModal) btnFecharModal.addEventListener('click', () => { if(modalOverlay) modalOverlay.style.display = 'none'; });
        
        const adicionarCartaoLink = getEl('adicionar-cartao-link');
        if (adicionarCartaoLink) adicionarCartaoLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('input[value="credito"]').checked = true;
            if(camposContaNormal) camposContaNormal.style.display = 'none';
            if(camposCartaoCredito) camposCartaoCredito.style.display = 'block';
            if(modalOverlay) modalOverlay.style.display = 'flex';
        });
        
        const verTodasContas = getEl('ver-todas-contas');
        if (verTodasContas) verTodasContas.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarTela('mais');
            setTimeout(() => { renderizarListaContasModal(); if(modalOverlay) modalOverlay.style.display = 'flex'; }, 100);
        });

        radioTipoConta.forEach(r => r.addEventListener('change', () => {
            const isCredito = document.querySelector('input[name="tipo-conta"]:checked').value === 'credito';
            if(camposContaNormal) camposContaNormal.style.display = isCredito ? 'none' : 'block';
            if(camposCartaoCredito) camposCartaoCredito.style.display = isCredito ? 'block' : 'none';
        }));

        if (btnCriarConta) btnCriarConta.addEventListener('click', () => {
            const nome = novaContaNome?.value.trim();
            if (!nome) { alert('Digite um nome.'); return; }
            const tipo = document.querySelector('input[name="tipo-conta"]:checked').value;
            let novaConta = { id: gerarId(), nome, tipo };
            if (tipo === 'normal') {
                novaConta.saldoInicial = converterMoedaParaFloat(novaContaSaldoInicial?.value);
                novaConta.incluirNoTotal = novaContaIncluirTotal?.checked;
            } else {
                novaConta.limite = converterMoedaParaFloat(cartaoLimite?.value);
                novaConta.diaFechamento = parseInt(cartaoDiaFechamento?.value) || 1;
                novaConta.diaVencimento = parseInt(cartaoDiaVencimento?.value) || 10;
            }
            contas.push(novaConta); salvarContas();
            if(novaContaNome) novaContaNome.value = ''; 
            if(novaContaSaldoInicial) novaContaSaldoInicial.value = '0,00'; 
            if(cartaoLimite) cartaoLimite.value = '0,00';
            if(modalOverlay) modalOverlay.style.display = 'none';
            renderizarDashboard(); renderizarTransacoesAgrupadas();
        });

        if (btnLimparTudo) btnLimparTudo.addEventListener('click', () => {
            if (confirm('Apagar TUDO?')) { localStorage.clear(); location.reload(); }
        });

        menuItems.forEach(item => item.addEventListener('click', () => mostrarTela(item.dataset.tela)));
        
        const btnDefinirPlanejamento = getEl('btn-definir-planejamento');
        if (btnDefinirPlanejamento) btnDefinirPlanejamento.addEventListener('click', () => mostrarTela('planejamento'));

        if (modalOverlay) modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; });
        if (modalTransacao) modalTransacao.addEventListener('click', e => { if (e.target === modalTransacao) modalTransacao.style.display = 'none'; });

        // Backup
        const btnExportarBackup = getEl('btn-exportar-backup');
        const btnImportarBackup = getEl('btn-importar-backup');
        const inputImportarBackup = getEl('input-importar-backup');
        if (btnExportarBackup) btnExportarBackup.addEventListener('click', exportarBackup);
        if (btnImportarBackup) btnImportarBackup.addEventListener('click', () => { if(inputImportarBackup) inputImportarBackup.click(); });
        if (inputImportarBackup) inputImportarBackup.addEventListener('change', importarBackup);

        // Abas
        abasBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const aba = btn.dataset.aba;
                abasBtns.forEach(b => b.classList.remove('ativo'));
                abasConteudos.forEach(c => c.classList.remove('ativo'));
                btn.classList.add('ativo');
                const conteudo = getEl(`aba-${aba}`);
                if (conteudo) conteudo.classList.add('ativo');
            });
        });

        // Ações da lista
        document.querySelectorAll('.lista-opcoes').forEach(lista => {
            lista.addEventListener('click', (e) => {
                const opcao = e.target.closest('.opcao-item');
                if (!opcao) return;
                const acao = opcao.dataset.acao;
                switch (acao) {
                    case 'contas': renderizarListaContasModal(); if(modalOverlay) modalOverlay.style.display = 'flex'; break;
                    case 'cartoes': document.querySelector('input[value="credito"]').checked = true; if(camposContaNormal) camposContaNormal.style.display = 'none'; if(camposCartaoCredito) camposCartaoCredito.style.display = 'block'; if(modalOverlay) modalOverlay.style.display = 'flex'; break;
                    case 'exportar-excel': if (typeof exportarParaCSV === 'function') exportarParaCSV(); else alert('Em breve'); break;
                    case 'backup-exportar': exportarBackup(); break;
                    case 'backup-importar': if(inputImportarBackup) inputImportarBackup.click(); break;
                    case 'sobre': alert(`Meu Dinheiro v${APP_VERSION}\nMVP em desenvolvimento.`); break;
                    default: alert(`"${acao}" em breve!`);
                }
            });
        });

        if (btnAbrirConfig) btnAbrirConfig.addEventListener('click', () => { if(telaConfiguracoes) telaConfiguracoes.style.display = 'block'; });
        if (btnVoltarConfig) btnVoltarConfig.addEventListener('click', () => { if(telaConfiguracoes) telaConfiguracoes.style.display = 'none'; });

        // Áudio (placeholder)
        const btnAudio = getEl('btn-gravar-audio');
        if (btnAudio) btnAudio.addEventListener('click', () => alert('🎤 Gravação de áudio em breve!'));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();