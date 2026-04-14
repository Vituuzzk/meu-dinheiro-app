(function(){
    "use strict";

    // ---------- ESTADO ----------
    let contas = [];
    let transacoes = [];
    let mesAtual = new Date().getMonth();
    let anoAtual = new Date().getFullYear();

    // ---------- ELEMENTOS ----------
    const mesAtualTitulo = document.getElementById('mes-atual-titulo');
    const saldoTotalValor = document.getElementById('saldo-total-valor');
    const totalReceitasMes = document.getElementById('total-receitas-mes');
    const totalDespesasMes = document.getElementById('total-despesas-mes');
    const listaContasResumo = document.getElementById('lista-contas-resumo');
    const totalContasResumo = document.getElementById('total-contas-resumo');
    const cartoesResumoContainer = document.getElementById('cartoes-resumo-container');
    const ctx = document.getElementById('grafico-categorias').getContext('2d');
    const emptyDespesas = document.getElementById('empty-despesas');
    let chartInstance = null;

    const modalTransacao = document.getElementById('modal-transacao');
    const modalTitulo = document.getElementById('modal-titulo');
    const tipoReceitaBtn = document.getElementById('tipo-receita-btn');
    const tipoDespesaBtn = document.getElementById('tipo-despesa-btn');
    const modalValor = document.getElementById('modal-valor');
    const modalConta = document.getElementById('modal-conta');
    const modalData = document.getElementById('modal-data');
    const modalDescricao = document.getElementById('modal-descricao');
    const modalCategoria = document.getElementById('modal-categoria');
    const salvarTransacaoModal = document.getElementById('salvar-transacao-modal');
    const fecharModalTransacao = document.getElementById('fechar-modal-transacao');
    let tipoTransacaoAtual = 'receita';

    const modalOverlay = document.getElementById('modal-contas');
    const btnGerenciarContas = document.getElementById('btn-abrir-modal-contas');
    const btnFecharModal = document.getElementById('btn-fechar-modal');
    const listaContasModal = document.getElementById('lista-contas-modal');
    const novaContaNome = document.getElementById('nova-conta-nome');
    const camposContaNormal = document.getElementById('campos-conta-normal');
    const camposCartaoCredito = document.getElementById('campos-cartao-credito');
    const radioTipoConta = document.getElementsByName('tipo-conta');
    const novaContaSaldoInicial = document.getElementById('nova-conta-saldo-inicial');
    const novaContaIncluirTotal = document.getElementById('nova-conta-incluir-total');
    const cartaoLimite = document.getElementById('cartao-limite');
    const cartaoDiaFechamento = document.getElementById('cartao-dia-fechamento');
    const cartaoDiaVencimento = document.getElementById('cartao-dia-vencimento');
    const btnCriarConta = document.getElementById('btn-criar-conta');
    const btnLimparTudo = document.getElementById('btn-limpar-tudo');
    const btnToggleTema = document.getElementById('btn-toggle-tema');

    const telas = {
        principal: document.getElementById('tela-principal'),
        transacoes: document.getElementById('tela-transacoes'),
        planejamento: document.getElementById('tela-planejamento'),
        mais: document.getElementById('tela-mais')
    };
    const menuItems = document.querySelectorAll('.menu-item');
    const fab = document.getElementById('fab-adicionar');

    // Novos elementos da tela "Mais"
    const abasBtns = document.querySelectorAll('.aba-btn');
    const abasConteudos = document.querySelectorAll('.aba-conteudo');
    const btnAbrirConfig = document.getElementById('btn-abrir-configuracoes');
    const telaConfiguracoes = document.getElementById('tela-configuracoes');
    const btnVoltarConfig = document.getElementById('btn-voltar-configuracoes');

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
        } catch(e) { contas = []; transacoes = []; }
        if (contas.length === 0) {
            contas.push({ id: gerarId(), nome: 'Carteira', tipo: 'normal', saldoInicial: 0, incluirNoTotal: true });
            salvarContas();
        }
    }
    function salvarContas() { localStorage.setItem('contas', JSON.stringify(contas)); }
    function salvarTransacoes() { localStorage.setItem('transacoes', JSON.stringify(transacoes)); }

    // ---------- CÁLCULOS ----------
    function calcularFaturaAtual(cartaoId) {
        return transacoes.filter(t => t.tipo === 'despesa' && t.contaId === cartaoId).reduce((s, t) => s + t.valor, 0);
    }
    function calcularSaldoConta(contaId) {
        const conta = contas.find(c => c.id === contaId);
        if (!conta) return 0;
        if (conta.tipo === 'credito') return -calcularFaturaAtual(contaId);
        let saldo = conta.saldoInicial;
        transacoes.forEach(t => {
            if (t.tipo === 'despesa' && t.contaId === contaId) saldo -= t.valor;
            else if (t.tipo === 'receita' && t.contaId === contaId) saldo += t.valor;
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
        return transacoes.filter(t => t.tipo === 'receita' && new Date(t.data).getMonth() === mesAtual && new Date(t.data).getFullYear() === anoAtual).reduce((s, t) => s + t.valor, 0);
    }
    function calcularDespesasMes() {
        return transacoes.filter(t => t.tipo === 'despesa' && new Date(t.data).getMonth() === mesAtual && new Date(t.data).getFullYear() === anoAtual).reduce((s, t) => s + t.valor, 0);
    }

    // ---------- RENDER ----------
    function atualizarCabecalhoMes() {
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        mesAtualTitulo.textContent = `${meses[mesAtual]} ${anoAtual}`;
        document.getElementById('mes-transacoes-titulo').textContent = `${meses[mesAtual]} ${anoAtual}`;
    }
    function renderizarDashboard() {
        saldoTotalValor.textContent = formatarMoeda(calcularSaldoTotal());
        totalReceitasMes.textContent = formatarMoeda(calcularReceitasMes());
        totalDespesasMes.textContent = formatarMoeda(calcularDespesasMes());

        const contasNormais = contas.filter(c => c.tipo === 'normal');
        listaContasResumo.innerHTML = '';
        contasNormais.forEach(c => {
            const saldo = calcularSaldoConta(c.id);
            const div = document.createElement('div');
            div.className = 'conta-item';
            div.innerHTML = `<div class="conta-info">
                <div class="conta-icone">${renderizarIconeConta(c.nome)}</div>
                <div class="conta-detalhes">
                    <div class="nome">${c.nome}</div>
                    <div class="subtitulo">${c.incluirNoTotal ? 'Incluída' : 'Não incluída'}</div>
                </div>
            </div>
            <div class="conta-saldo" style="color: ${saldo < 0 ? '#dc2626' : '#1f2937'}">${formatarMoeda(saldo)}</div>`;
            listaContasResumo.appendChild(div);
        });
        const totalNormal = contasNormais.reduce((s, c) => s + calcularSaldoConta(c.id), 0);
        totalContasResumo.innerHTML = `<span>Total</span> <span style="font-weight:700;">${formatarMoeda(totalNormal)}</span>`;

        const cartoes = contas.filter(c => c.tipo === 'credito');
        cartoesResumoContainer.innerHTML = '';
        if (cartoes.length === 0) {
            cartoesResumoContainer.innerHTML = `<div class="empty-state"><p>💳 Ops! Você ainda não tem nenhum cartão de crédito cadastrado.</p><button id="btn-adicionar-cartao-vazio" class="btn-outline">ADICIONAR NOVO CARTÃO</button></div>`;
            document.getElementById('btn-adicionar-cartao-vazio')?.addEventListener('click', () => {
                document.querySelector('input[value="credito"]').checked = true;
                camposContaNormal.style.display = 'none';
                camposCartaoCredito.style.display = 'block';
                modalOverlay.style.display = 'flex';
            });
        } else {
            cartoes.forEach(cartao => {
                const fatura = calcularFaturaAtual(cartao.id);
                const disponivel = cartao.limite - fatura;
                const div = document.createElement('div');
                div.className = 'cartao-resumo-item';
                div.innerHTML = `<div class="cartao-resumo-header"><strong>${cartao.nome}</strong><span>${formatarMoeda(fatura)}</span></div><div style="font-size:14px; color:#6b7280;">Limite: ${formatarMoeda(cartao.limite)} | Disponível: ${formatarMoeda(disponivel)}</div><div style="font-size:12px; color:#9ca3af; margin-top:6px;">Fecha dia ${cartao.diaFechamento} | Vence dia ${cartao.diaVencimento}</div>`;
                cartoesResumoContainer.appendChild(div);
            });
        }

        const despesasMes = transacoes.filter(t => t.tipo === 'despesa' && new Date(t.data).getMonth() === mesAtual && new Date(t.data).getFullYear() === anoAtual);
        if (despesasMes.length === 0) {
            document.getElementById('grafico-categorias').style.display = 'none';
            emptyDespesas.style.display = 'block';
        } else {
            document.getElementById('grafico-categorias').style.display = 'block';
            emptyDespesas.style.display = 'none';
            const totais = {};
            despesasMes.forEach(d => { totais[d.categoria] = (totais[d.categoria] || 0) + d.valor; });
            if (chartInstance) chartInstance.destroy();
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

    function renderizarTransacoesAgrupadas() {
        const container = document.getElementById('grupos-transacoes');
        const emptyState = document.getElementById('empty-transacoes');
        const transacoesMes = transacoes.filter(t => {
            const d = new Date(t.data + 'T00:00:00');
            return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        }).sort((a, b) => new Date(b.data) - new Date(a.data));

        if (transacoesMes.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
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
        document.getElementById('saldo-atual-transacoes').textContent = formatarMoeda(calcularSaldoTotal());
        document.getElementById('balanco-mensal-transacoes').textContent = formatarMoeda(calcularReceitasMes() - calcularDespesasMes());
    }

    function atualizarSelectModal() {
        modalConta.innerHTML = '<option value="">Selecione a conta...</option>';
        contas.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = `${c.nome} (${c.tipo === 'credito' ? '💳' : '💰'})`;
            modalConta.appendChild(option);
        });
    }

    function abrirModalTransacao() {
        atualizarSelectModal();
        const hoje = new Date();
        modalData.value = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-${String(hoje.getDate()).padStart(2,'0')}`;
        modalValor.value = '';
        modalDescricao.value = '';
        modalCategoria.value = '';
        modalTransacao.style.display = 'flex';
    }

    function mostrarTela(id) {
        Object.values(telas).forEach(t => t.classList.remove('ativa'));
        telas[id].classList.add('ativa');
        menuItems.forEach(item => item.classList.toggle('ativo', item.dataset.tela === id));
        if (id === 'principal') renderizarDashboard();
        if (id === 'transacoes') renderizarTransacoesAgrupadas();
    }

    function renderizarListaContasModal() {
        listaContasModal.innerHTML = '';
        contas.forEach(c => {
            const saldo = calcularSaldoConta(c.id);
            const li = document.createElement('li');
            li.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;">
                <span>${renderizarIconeConta(c.nome)}</span>
                <div>
                    <strong>${c.nome}</strong> (${c.tipo==='credito'?'💳':'💰'})<br>
                    <small>${formatarMoeda(saldo)}</small>
                </div>
            </div>
            <button data-id="${c.id}" style="width:auto; background:#ef4444;">🗑️</button>`;
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

    // ---------- TEMA ESCURO ----------
    function aplicarTema(escuro) {
        if (escuro) {
            document.body.classList.add('dark-theme');
            if (btnToggleTema) {
                btnToggleTema.innerHTML = '☀️ Alternar para Tema Claro';
                btnToggleTema.style.background = '#1976d2';
            }
        } else {
            document.body.classList.remove('dark-theme');
            if (btnToggleTema) {
                btnToggleTema.innerHTML = '🌙 Alternar para Tema Escuro';
                btnToggleTema.style.background = '#6b7280';
            }
        }
        localStorage.setItem('temaEscuro', escuro);
        
        if (chartInstance) {
            const canvas = document.getElementById('grafico-categorias');
            if (canvas.style.display !== 'none') {
                const tipo = chartInstance.config.type;
                const dados = chartInstance.data;
                const opcoes = chartInstance.options;
                chartInstance.destroy();
                chartInstance = new Chart(ctx, { type: tipo, data: dados, options: opcoes });
            }
        }
    }

    // ---------- BACKUP ----------
    function exportarBackup() {
        const backup = {
            versao: '1.0',
            data: new Date().toISOString(),
            contas: contas,
            transacoes: transacoes,
            preferencias: { temaEscuro: document.body.classList.contains('dark-theme') }
        };
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
                    salvarContas();
                    salvarTransacoes();
                    if (backup.preferencias) aplicarTema(backup.preferencias.temaEscuro);
                    location.reload();
                }
            } catch (error) {
                alert('❌ Arquivo de backup inválido.');
            }
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    // ---------- INIT ----------
    function init() {
        carregarDados();
        configurarMascaras();
        atualizarCabecalhoMes();
        renderizarDashboard();
        renderizarTransacoesAgrupadas();

        const temaSalvo = localStorage.getItem('temaEscuro') === 'true';
        aplicarTema(temaSalvo);
        if (btnToggleTema) {
            btnToggleTema.addEventListener('click', () => {
                aplicarTema(!document.body.classList.contains('dark-theme'));
            });
        }

        document.getElementById('mes-anterior').addEventListener('click', () => {
            if (mesAtual === 0) { mesAtual = 11; anoAtual--; } else mesAtual--;
            atualizarCabecalhoMes(); renderizarDashboard(); renderizarTransacoesAgrupadas();
        });
        document.getElementById('mes-proximo').addEventListener('click', () => {
            if (mesAtual === 11) { mesAtual = 0; anoAtual++; } else mesAtual++;
            atualizarCabecalhoMes(); renderizarDashboard(); renderizarTransacoesAgrupadas();
        });
        document.getElementById('mes-transacoes-anterior').addEventListener('click', () => {
            if (mesAtual === 0) { mesAtual = 11; anoAtual--; } else mesAtual--;
            atualizarCabecalhoMes(); renderizarDashboard(); renderizarTransacoesAgrupadas();
        });
        document.getElementById('mes-transacoes-proximo').addEventListener('click', () => {
            if (mesAtual === 11) { mesAtual = 0; anoAtual++; } else mesAtual++;
            atualizarCabecalhoMes(); renderizarDashboard(); renderizarTransacoesAgrupadas();
        });

        tipoReceitaBtn.addEventListener('click', () => {
            tipoTransacaoAtual = 'receita'; modalTitulo.textContent = 'Nova receita';
            tipoReceitaBtn.style.background = '#10b981'; tipoDespesaBtn.style.background = '#9ca3af';
            tipoReceitaBtn.classList.add('ativo'); tipoDespesaBtn.classList.remove('ativo');
        });
        tipoDespesaBtn.addEventListener('click', () => {
            tipoTransacaoAtual = 'despesa'; modalTitulo.textContent = 'Nova despesa';
            tipoDespesaBtn.style.background = '#dc2626'; tipoReceitaBtn.style.background = '#9ca3af';
            tipoDespesaBtn.classList.add('ativo'); tipoReceitaBtn.classList.remove('ativo');
        });

        fecharModalTransacao.addEventListener('click', () => modalTransacao.style.display = 'none');
        salvarTransacaoModal.addEventListener('click', () => {
            const contaId = modalConta.value;
            if (!contaId) { alert('Selecione uma conta.'); return; }
            const valor = converterMoedaParaFloat(modalValor.value);
            if (isNaN(valor) || valor <= 0) { alert('Valor inválido.'); return; }
            const data = modalData.value;
            if (!data) { alert('Data inválida.'); return; }
            const descricao = modalDescricao.value.trim() || (tipoTransacaoAtual === 'receita' ? 'Receita' : 'Despesa');
            const categoria = modalCategoria.value.trim() || 'Outros';

            transacoes.push({
                id: gerarId(), tipo: tipoTransacaoAtual, valor, categoria, descricao, data,
                timestamp: new Date().toISOString(), contaId
            });
            salvarTransacoes();
            modalTransacao.style.display = 'none';
            renderizarDashboard();
            renderizarTransacoesAgrupadas();
        });

        if (btnGerenciarContas) {
            btnGerenciarContas.addEventListener('click', () => { renderizarListaContasModal(); modalOverlay.style.display = 'flex'; });
        }
        btnFecharModal.addEventListener('click', () => modalOverlay.style.display = 'none');
        document.getElementById('adicionar-cartao-link').addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('input[value="credito"]').checked = true;
            camposContaNormal.style.display = 'none';
            camposCartaoCredito.style.display = 'block';
            modalOverlay.style.display = 'flex';
        });
        document.getElementById('ver-todas-contas').addEventListener('click', (e) => {
            e.preventDefault();
            mostrarTela('mais');
            setTimeout(() => { renderizarListaContasModal(); modalOverlay.style.display = 'flex'; }, 100);
        });

        radioTipoConta.forEach(r => r.addEventListener('change', () => {
            const isCredito = document.querySelector('input[name="tipo-conta"]:checked').value === 'credito';
            camposContaNormal.style.display = isCredito ? 'none' : 'block';
            camposCartaoCredito.style.display = isCredito ? 'block' : 'none';
        }));

        btnCriarConta.addEventListener('click', () => {
            const nome = novaContaNome.value.trim();
            if (!nome) { alert('Digite um nome.'); return; }
            const tipo = document.querySelector('input[name="tipo-conta"]:checked').value;
            let novaConta = { id: gerarId(), nome, tipo };
            if (tipo === 'normal') {
                novaConta.saldoInicial = converterMoedaParaFloat(novaContaSaldoInicial.value);
                novaConta.incluirNoTotal = novaContaIncluirTotal.checked;
            } else {
                novaConta.limite = converterMoedaParaFloat(cartaoLimite.value);
                novaConta.diaFechamento = parseInt(cartaoDiaFechamento.value) || 1;
                novaConta.diaVencimento = parseInt(cartaoDiaVencimento.value) || 10;
            }
            contas.push(novaConta); salvarContas();
            novaContaNome.value = ''; novaContaSaldoInicial.value = '0,00'; cartaoLimite.value = '0,00';
            modalOverlay.style.display = 'none';
            renderizarDashboard(); renderizarTransacoesAgrupadas();
        });

        btnLimparTudo.addEventListener('click', () => {
            if (confirm('Apagar TUDO?')) { localStorage.clear(); location.reload(); }
        });

        fab.addEventListener('click', () => { mostrarTela('transacoes'); abrirModalTransacao(); });
        menuItems.forEach(item => item.addEventListener('click', () => mostrarTela(item.dataset.tela)));
        document.getElementById('btn-definir-planejamento').addEventListener('click', () => mostrarTela('planejamento'));

        modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; });
        modalTransacao.addEventListener('click', e => { if (e.target === modalTransacao) modalTransacao.style.display = 'none'; });

        // Backup
        const btnExportarBackup = document.getElementById('btn-exportar-backup');
        const btnImportarBackup = document.getElementById('btn-importar-backup');
        const inputImportarBackup = document.getElementById('input-importar-backup');
        if (btnExportarBackup) btnExportarBackup.addEventListener('click', exportarBackup);
        if (btnImportarBackup) btnImportarBackup.addEventListener('click', () => inputImportarBackup?.click());
        if (inputImportarBackup) inputImportarBackup.addEventListener('change', importarBackup);

        // Controle das Abas na tela Mais
        if (abasBtns.length > 0) {
            abasBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const aba = btn.dataset.aba;
                    abasBtns.forEach(b => b.classList.remove('ativo'));
                    abasConteudos.forEach(c => c.classList.remove('ativo'));
                    btn.classList.add('ativo');
                    document.getElementById(`aba-${aba}`).classList.add('ativo');
                });
            });
        }

        // Ações dos itens da lista
        document.querySelectorAll('.lista-opcoes').forEach(lista => {
            lista.addEventListener('click', (e) => {
                const opcao = e.target.closest('.opcao-item');
                if (!opcao) return;
                const acao = opcao.dataset.acao;
                switch (acao) {
                    case 'contas':
                        renderizarListaContasModal();
                        modalOverlay.style.display = 'flex';
                        break;
                    case 'cartoes':
                        document.querySelector('input[value="credito"]').checked = true;
                        camposContaNormal.style.display = 'none';
                        camposCartaoCredito.style.display = 'block';
                        modalOverlay.style.display = 'flex';
                        break;
                    case 'exportar-excel':
                        if (typeof exportarParaCSV === 'function') exportarParaCSV();
                        else alert('Função de exportação Excel será carregada.');
                        break;
                    case 'backup-exportar':
                        exportarBackup();
                        break;
                    case 'backup-importar':
                        document.getElementById('input-importar-backup')?.click();
                        break;
                    default:
                        alert(`Funcionalidade "${acao}" em breve!`);
                }
            });
        });

        // Abrir tela de Configurações
        if (btnAbrirConfig) {
            btnAbrirConfig.addEventListener('click', () => {
                if (telaConfiguracoes) telaConfiguracoes.style.display = 'block';
            });
        }
        if (btnVoltarConfig) {
            btnVoltarConfig.addEventListener('click', () => {
                if (telaConfiguracoes) telaConfiguracoes.style.display = 'none';
            });
        }
    }

    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();