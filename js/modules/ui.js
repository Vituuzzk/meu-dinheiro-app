// Módulo de Interface (UI)
(function(global) {
    "use strict";

    const { formatarMoeda } = Mascaras;

    function atualizarCabecalho(anoAtual, mesAtual) {
        const anoEl = document.getElementById('ano-atual-titulo');
        const mesTransacoesEl = document.getElementById('mes-transacoes-titulo');
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        if (anoEl) anoEl.textContent = anoAtual;
        if (mesTransacoesEl) mesTransacoesEl.textContent = `${meses[mesAtual]} ${anoAtual}`;
        
        document.querySelectorAll('.mes-chip').forEach(chip => {
            chip.classList.toggle('ativo', parseInt(chip.dataset.mes) === mesAtual);
        });
    }

    function renderizarDashboard(estado, elementos) {
        const { contas, transacoes, mesAtual, anoAtual } = estado;
        const { saldoTotalValor, totalReceitasMes, totalDespesasMes, listaContasResumo, totalContasResumo, cartoesResumoContainer, ctx, emptyDespesas, modalOverlay, camposContaNormal, camposCartaoCredito, chartInstance } = elementos;
        
        if (!saldoTotalValor) return;

        const saldoTotal = estado.calcularSaldoTotal();
        const receitasMes = estado.calcularReceitasMes();
        const despesasMes = estado.calcularDespesasMes();

        saldoTotalValor.textContent = formatarMoeda(saldoTotal);
        if (totalReceitasMes) totalReceitasMes.textContent = formatarMoeda(receitasMes);
        if (totalDespesasMes) totalDespesasMes.textContent = formatarMoeda(despesasMes);

        // Contas normais
        const contasNormais = contas.filter(c => c.tipo === 'normal');
        if (listaContasResumo) {
            listaContasResumo.innerHTML = '';
            contasNormais.forEach(c => {
                const saldo = estado.calcularSaldoConta(c.id);
                const div = document.createElement('div');
                div.className = 'conta-item';
                div.innerHTML = `<div class="conta-info"><div class="conta-icone">${estado.renderizarIconeConta(c.nome)}</div><div class="conta-detalhes"><div class="nome">${c.nome}</div><div class="subtitulo">${c.incluirNoTotal ? 'Incluída' : 'Não incluída'}</div></div></div><div class="conta-saldo" style="color: ${saldo < 0 ? '#dc2626' : '#1f2937'}">${formatarMoeda(saldo)}</div>`;
                listaContasResumo.appendChild(div);
            });
        }
        const totalNormal = contasNormais.reduce((s, c) => s + estado.calcularSaldoConta(c.id), 0);
        if (totalContasResumo) totalContasResumo.innerHTML = `<span>Total</span> <span style="font-weight:700;">${formatarMoeda(totalNormal)}</span>`;

        // Cartões
        const cartoes = contas.filter(c => c.tipo === 'credito');
        if (cartoesResumoContainer) {
            cartoesResumoContainer.innerHTML = '';
            if (cartoes.length === 0) {
                cartoesResumoContainer.innerHTML = `<div class="empty-state"><p>💳 Ops! Você ainda não tem nenhum cartão de crédito cadastrado.</p><button id="btn-adicionar-cartao-vazio" class="btn-outline">ADICIONAR NOVO CARTÃO</button></div>`;
                document.getElementById('btn-adicionar-cartao-vazio')?.addEventListener('click', () => {
                    document.querySelector('input[value="credito"]').checked = true;
                    if (camposContaNormal) camposContaNormal.style.display = 'none';
                    if (camposCartaoCredito) camposCartaoCredito.style.display = 'block';
                    if (modalOverlay) modalOverlay.style.display = 'flex';
                });
            } else {
                cartoes.forEach(cartao => {
                    const fatura = estado.calcularFaturaAtual(cartao.id);
                    const disponivel = cartao.limite - fatura;
                    const percentual = cartao.limite > 0 ? (fatura / cartao.limite) * 100 : 0;
                    const melhorDia = cartao.diaFechamento + 1 > 31 ? 1 : cartao.diaFechamento + 1;
                    const div = document.createElement('div');
                    div.className = 'cartao-resumo-item';
                    div.innerHTML = `
                        <div class="cartao-resumo-header"><strong>${cartao.nome}</strong><span>${formatarMoeda(fatura)}</span></div>
                        <div class="limite-barra-container"><div class="limite-barra"><div class="limite-barra-preenchida" style="width: ${percentual}%;"></div></div></div>
                        <div style="font-size:14px; color:#6b7280;">Limite: ${formatarMoeda(cartao.limite)} | Disponível: ${formatarMoeda(disponivel)}</div>
                        <div class="cartao-datas"><span>📅 Vence dia ${cartao.diaVencimento}</span><span class="melhor-dia-compra">✨ Melhor dia: ${melhorDia}</span></div>
                    `;
                    cartoesResumoContainer.appendChild(div);
                });
            }
        }

        // Gráfico
        const despesasMes = transacoes.filter(t => t.tipo === 'despesa' && new Date(t.data).getMonth() === mesAtual && new Date(t.data).getFullYear() === anoAtual);
        const canvas = document.getElementById('grafico-categorias');
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
                    estado.chartInstance = new Chart(ctx, {
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

    function renderizarTransacoesAgrupadas(estado) {
        const { contas, transacoes, mesAtual, anoAtual } = estado;
        const container = document.getElementById('grupos-transacoes');
        const emptyState = document.getElementById('empty-transacoes');
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

    function renderizarListaContasModal(contas, estado) {
        const listaContasModal = document.getElementById('lista-contas-modal');
        if (!listaContasModal) return;
        listaContasModal.innerHTML = '';
        contas.forEach(c => {
            const saldo = estado.calcularSaldoConta(c.id);
            const li = document.createElement('li');
            li.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;"><span>${estado.renderizarIconeConta(c.nome)}</span><div><strong>${c.nome}</strong> (${c.tipo==='credito'?'💳':'💰'})<br><small>${formatarMoeda(saldo)}</small></div></div><button data-id="${c.id}" style="width:auto; background:#ef4444;">🗑️</button>`;
            li.querySelector('button').addEventListener('click', () => {
                if (confirm('Excluir?')) {
                    estado.excluirConta(c.id);
                    renderizarListaContasModal(contas, estado);
                    estado.atualizarTudo();
                }
            });
            listaContasModal.appendChild(li);
        });
    }

    global.UI = {
        atualizarCabecalho,
        renderizarDashboard,
        renderizarTransacoesAgrupadas,
        renderizarListaContasModal
    };

})(window);