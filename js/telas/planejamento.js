// Tela de Planejamento
(function(global) {
    "use strict";

    function renderizarPlanejamento(estado, utils, mascaras, calculos) {
        const { contas, transacoes, mesAtual, anoAtual, orcamentos, categorias } = estado;
        const { getEl } = utils;
        const { formatarMoeda } = mascaras;
        const { calcularGastosPorCategoria } = calculos;

        const container = getEl('planejamento-container');
        if (!container) return;
        
        const gastos = calcularGastosPorCategoria(transacoes, mesAtual, anoAtual);
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
            const corBarra = percentual > 100 ? '#dc2626' : '#059669';
            html += `<div class="orcamento-item">
                <div class="orcamento-header"><span>${cat.icone} ${cat.nome}</span><span>${formatarMoeda(gasto)} / ${formatarMoeda(limite)}</span></div>
                <div class="limite-barra-container"><div class="limite-barra"><div class="limite-barra-preenchida" style="width: ${Math.min(percentual, 100)}%; background: ${corBarra};"></div></div></div>
            </div>`;
        });
        container.innerHTML = html;

        // Gráfico
        const ctx = getEl('grafico-planejamento')?.getContext('2d');
        if (ctx) {
            if (estado.planejamentoChartInstance) estado.planejamentoChartInstance.destroy();
            estado.planejamentoChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: categoriasPlanejadas.map(c => c.nome),
                    datasets: [
                        { label: 'Gasto', data: categoriasPlanejadas.map(c => gastos[c.nome] || 0), backgroundColor: '#f97316' },
                        { label: 'Limite', data: categoriasPlanejadas.map(c => orcamentos[c.nome]), backgroundColor: '#3b82f6' }
                    ]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        }
    }

    global.Planejamento = { renderizarPlanejamento };

})(window);