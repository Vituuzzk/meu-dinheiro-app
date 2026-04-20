// Tela Principal (Dashboard)
(function(global) {
    "use strict";

    function renderizarDashboard(estado, elementos, utils, calculos) {
        const { contas, transacoes, mesAtual, anoAtual, chartInstance, categorias, orcamentos } = estado;
        const { getEl, abrirModal, renderizarIconeConta } = utils;
        const { formatarMoeda } = Mascaras;
        const { 
            calcularSaldoTotal, calcularSaldoProjetado, calcularReceitasMes, calcularDespesasMes,
            calcularSaldoConta, calcularFaturaAtual
        } = calculos;

        getEl('saldo-total-valor').textContent = formatarMoeda(calcularSaldoTotal(contas, transacoes, anoAtual, mesAtual));
        getEl('saldo-projetado-valor').textContent = formatarMoeda(calcularSaldoProjetado(contas, transacoes, anoAtual, mesAtual));
        getEl('total-receitas-mes').textContent = formatarMoeda(calcularReceitasMes(transacoes, mesAtual, anoAtual));
        getEl('total-despesas-mes').textContent = formatarMoeda(calcularDespesasMes(transacoes, mesAtual, anoAtual));

        const contasNormais = contas.filter(c => c.tipo === 'normal');
        const lista = getEl('lista-contas-resumo');
        lista.innerHTML = '';
        contasNormais.forEach(c => {
            const saldo = calcularSaldoConta(contas, transacoes, c.id, anoAtual, mesAtual);
            const div = document.createElement('div');
            div.className = 'conta-item';
            div.innerHTML = `<div class="conta-info"><div class="conta-icone">${renderizarIconeConta(c.nome)}</div><div class="conta-detalhes"><div class="nome">${c.nome}</div><div class="subtitulo">${c.incluirNoTotal ? 'Incluída' : 'Não incluída'}</div></div></div><div class="conta-saldo">${formatarMoeda(saldo)}</div>`;
            lista.appendChild(div);
        });
        const totalNormal = contasNormais.reduce((s, c) => s + calcularSaldoConta(contas, transacoes, c.id, anoAtual, mesAtual), 0);
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
                const fatura = calcularFaturaAtual(transacoes, cartao.id);
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
            if (estado.chartInstance) estado.chartInstance.destroy();
            estado.chartInstance = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(totais),
                    datasets: [{ data: Object.values(totais), backgroundColor: ['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#94a3b8'] }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        }
    }

    global.Principal = { renderizarDashboard };

})(window);