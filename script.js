(function(){
    "use strict";

    // ---------- Dados ----------
    let contas = [];
    let transacoes = []; // cada transação: { id, tipo, valor, categoria, data, contaId, contaOrigemId?, contaDestinoId? }

    // ---------- Elementos ----------
    const saldoTotalH2 = document.getElementById('saldo-total-valor');
    const selectContaTransacao = document.getElementById('conta-transacao');
    const valorGastoInput = document.getElementById('valor-gasto');
    const categoriaGastoSelect = document.getElementById('categoria-gasto');
    const dataGastoInput = document.getElementById('data-gasto');
    const btnAdicionarDespesa = document.getElementById('btn-adicionar-despesa');
    const listaTransacoesUl = document.getElementById('lista-transacoes');
    const btnLimparTudo = document.getElementById('btn-limpar-tudo');
    const dataAtualP = document.getElementById('data-atual');
    const ctx = document.getElementById('grafico-categorias').getContext('2d');
    let chartInstance = null;

    // Modal
    const modalOverlay = document.getElementById('modal-contas');
    const btnGerenciarContas = document.getElementById('btn-gerenciar-contas');
    const btnFecharModal = document.getElementById('btn-fechar-modal');
    const listaContasModal = document.getElementById('lista-contas-modal');
    const novaContaNome = document.getElementById('nova-conta-nome');
    const novaContaSaldoInicial = document.getElementById('nova-conta-saldo-inicial');
    const novaContaIncluirTotal = document.getElementById('nova-conta-incluir-total');
    const btnCriarConta = document.getElementById('btn-criar-conta');

    // ---------- Funções Auxiliares ----------
    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function gerarId() {
        return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    function carregarDados() {
        const contasSalvas = localStorage.getItem('contas');
        contas = contasSalvas ? JSON.parse(contasSalvas) : [];
        const transacoesSalvas = localStorage.getItem('transacoes');
        transacoes = transacoesSalvas ? JSON.parse(transacoesSalvas) : [];

        // Se não houver contas, cria uma padrão "Carteira"
        if (contas.length === 0) {
            contas.push({
                id: gerarId(),
                nome: 'Carteira',
                saldoInicial: 0,
                incluirNoTotal: true
            });
            salvarContas();
        }
    }

    function salvarContas() {
        localStorage.setItem('contas', JSON.stringify(contas));
    }

    function salvarTransacoes() {
        localStorage.setItem('transacoes', JSON.stringify(transacoes));
    }

    // Calcula o saldo atual de uma conta específica
    function calcularSaldoConta(contaId) {
        const conta = contas.find(c => c.id === contaId);
        if (!conta) return 0;

        let saldo = conta.saldoInicial;

        transacoes.forEach(t => {
            if (t.tipo === 'despesa' && t.contaId === contaId) {
                saldo -= t.valor;
            } else if (t.tipo === 'receita' && t.contaId === contaId) {
                saldo += t.valor;
            } else if (t.tipo === 'transferencia') {
                if (t.contaOrigemId === contaId) saldo -= t.valor;
                if (t.contaDestinoId === contaId) saldo += t.valor;
            }
        });
        return saldo;
    }

    // Saldo total (soma dos saldos das contas com incluirNoTotal = true)
    function calcularSaldoTotal() {
        return contas
            .filter(c => c.incluirNoTotal)
            .reduce((total, conta) => total + calcularSaldoConta(conta.id), 0);
    }

    // Preenche o <select> de contas no formulário
    function atualizarSelectContas() {
        selectContaTransacao.innerHTML = '<option value="">Selecione a conta...</option>';
        contas.forEach(conta => {
            const option = document.createElement('option');
            option.value = conta.id;
            option.textContent = `${conta.nome} (${formatarMoeda(calcularSaldoConta(conta.id))})`;
            selectContaTransacao.appendChild(option);
        });
    }

    // Lista as contas no modal
    function renderizarListaContasModal() {
        listaContasModal.innerHTML = '';
        contas.forEach(conta => {
            const saldo = calcularSaldoConta(conta.id);
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <strong>${conta.nome}</strong> ${conta.incluirNoTotal ? '✅' : '❌'}<br>
                    <small>Saldo: ${formatarMoeda(saldo)}</small>
                </div>
                <div class="conta-actions">
                    <button class="btn-editar-conta" data-id="${conta.id}">✏️</button>
                    <button class="btn-excluir-conta" data-id="${conta.id}">🗑️</button>
                </div>
            `;
            listaContasModal.appendChild(li);
        });

        // Event listeners para botões de editar/excluir (serão adicionados depois)
        document.querySelectorAll('.btn-excluir-conta').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (confirm('Excluir esta conta? Todas as transações associadas serão perdidas.')) {
                    contas = contas.filter(c => c.id !== id);
                    transacoes = transacoes.filter(t => t.contaId !== id && t.contaOrigemId !== id && t.contaDestinoId !== id);
                    salvarContas();
                    salvarTransacoes();
                    atualizarTudo();
                    renderizarListaContasModal();
                }
            });
        });
        // Edição pode ser implementada depois (simplificamos)
    }

    // Renderiza a lista de transações na tela principal
    function renderizarTransacoes() {
        const ordenadas = [...transacoes].sort((a,b) => new Date(b.data) - new Date(a.data));
        listaTransacoesUl.innerHTML = '';
        ordenadas.slice(0, 15).forEach(t => {
            const li = document.createElement('li');
            let descricao = '';
            if (t.tipo === 'despesa') {
                const conta = contas.find(c => c.id === t.contaId);
                descricao = `${t.categoria} (${conta?.nome || 'Conta'})`;
            } else if (t.tipo === 'receita') {
                const conta = contas.find(c => c.id === t.contaId);
                descricao = `Receita: ${t.categoria} (${conta?.nome || 'Conta'})`;
            } else if (t.tipo === 'transferencia') {
                const origem = contas.find(c => c.id === t.contaOrigemId);
                const destino = contas.find(c => c.id === t.contaDestinoId);
                descricao = `Transferência: ${origem?.nome} → ${destino?.nome}`;
            }
            const valorFormatado = (t.tipo === 'despesa' || (t.tipo === 'transferencia' && t.contaOrigemId)) 
                ? `- ${formatarMoeda(t.valor)}` 
                : `+ ${formatarMoeda(t.valor)}`;
            const dataFormatada = new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR');
            li.innerHTML = `<span><strong>${descricao}</strong><br><small>${dataFormatada}</small></span>
                            <span style="font-weight:bold; color:${t.tipo === 'despesa' ? '#dc2626' : '#10b981'}">${valorFormatado}</span>`;
            listaTransacoesUl.appendChild(li);
        });
    }

    // Gráfico de despesas por categoria (apenas despesas do mês atual)
    function atualizarGrafico() {
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();

        const despesasMes = transacoes.filter(t => {
            if (t.tipo !== 'despesa') return false;
            const d = new Date(t.data + 'T00:00:00');
            return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        });

        const totais = {};
        despesasMes.forEach(d => {
            totais[d.categoria] = (totais[d.categoria] || 0) + d.valor;
        });

        const labels = Object.keys(totais);
        const valores = Object.values(totais);

        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: valores,
                    backgroundColor: ['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#94a3b8']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    function definirDataHoje() {
        const hoje = new Date();
        dataAtualP.textContent = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (!dataGastoInput.value) {
            const ano = hoje.getFullYear();
            const mes = String(hoje.getMonth() + 1).padStart(2,'0');
            const dia = String(hoje.getDate()).padStart(2,'0');
            dataGastoInput.value = `${ano}-${mes}-${dia}`;
        }
    }

    function atualizarTudo() {
        atualizarSelectContas();
        saldoTotalH2.textContent = formatarMoeda(calcularSaldoTotal());
        renderizarTransacoes();
        atualizarGrafico();
    }

    // ---------- Inicialização e Eventos ----------
    function init() {
        carregarDados();
        definirDataHoje();
        atualizarTudo();

        // Adicionar Despesa
        btnAdicionarDespesa.addEventListener('click', () => {
            const contaId = selectContaTransacao.value;
            if (!contaId) {
                alert('Selecione uma conta.');
                return;
            }
            const valor = parseFloat(valorGastoInput.value);
            if (isNaN(valor) || valor <= 0) {
                alert('Valor inválido.');
                return;
            }
            const categoria = categoriaGastoSelect.value;
            const data = dataGastoInput.value;
            if (!data) {
                alert('Data inválida.');
                return;
            }

            const novaTransacao = {
                id: gerarId(),
                tipo: 'despesa',
                valor,
                categoria,
                data,
                contaId
            };
            transacoes.push(novaTransacao);
            salvarTransacoes();
            valorGastoInput.value = '';
            atualizarTudo();
        });

        // Modal de Contas
        btnGerenciarContas.addEventListener('click', () => {
            renderizarListaContasModal();
            modalOverlay.style.display = 'flex';
        });

        btnFecharModal.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
        });

        btnCriarConta.addEventListener('click', () => {
            const nome = novaContaNome.value.trim();
            if (!nome) {
                alert('Digite um nome para a conta.');
                return;
            }
            const saldoInicial = parseFloat(novaContaSaldoInicial.value) || 0;
            const incluir = novaContaIncluirTotal.checked;

            const novaConta = {
                id: gerarId(),
                nome,
                saldoInicial,
                incluirNoTotal: incluir
            };
            contas.push(novaConta);
            salvarContas();
            novaContaNome.value = '';
            novaContaSaldoInicial.value = '0';
            novaContaIncluirTotal.checked = true;
            renderizarListaContasModal();
            atualizarTudo();
        });

        // Limpar tudo
        btnLimparTudo.addEventListener('click', () => {
            if (confirm('Apagar TODOS os dados (contas e transações)?')) {
                localStorage.clear();
                location.reload();
            }
        });

        // Fechar modal clicando fora
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.style.display = 'none';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();