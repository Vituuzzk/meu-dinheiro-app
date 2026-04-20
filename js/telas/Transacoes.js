// Tela de Planejamento
(function(global) {
    "use strict";

    function renderizarPlanejamento(estado, utils, calculos) {
        const { contas, transacoes, mesAtual, anoAtual, orcamentos, categorias, planejamentoChartInstance } = estado;
        const { getEl } = utils;
        const { formatarMoeda } = Mascaras;
        const { calcularGastosPorCategoria } = calculos;

        const container = getEl('planejamento-container');
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
            html += `<div class="orcamento-item"><div class="orcamento-header"><span>${cat.icone} ${cat.nome}</span><span>${formatarMoeda(gasto)} / ${formatarMoeda(limite)}</span></div>
                <div class="limite-barra-container"><div class="limite-barra"><div class="limite-barra-preenchida" style="width: ${Math.min(percentual, 100)}%; background: ${percentual > 100 ? '#dc2626' : '#059669'};"></div></div></div></div>`;
        });
        container.innerHTML = html;
        
        if (estado.planejamentoChartInstance) estado.planejamentoChartInstance.destroy();
        const ctx = getEl('grafico-planejamento').getContext('2d');
        estado.planejamentoChartInstance = new Chart(ctx, {
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

    global.Planejamento = { renderizarPlanejamento };

})(window);