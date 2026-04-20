// Componente de Gráfico (Chart.js)
(function(global) {
    "use strict";

    let chartInstance = null;
    let planejamentoChartInstance = null;

    function criarGraficoDespesas(canvas, dados, chartInstanceRef) {
        if (chartInstanceRef.value) chartInstanceRef.value.destroy();
        chartInstanceRef.value = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(dados),
                datasets: [{ data: Object.values(dados), backgroundColor: ['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#94a3b8'] }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
        return chartInstanceRef.value;
    }

    function criarGraficoPlanejamento(ctx, labels, gastos, limites, chartInstanceRef) {
        if (chartInstanceRef.value) chartInstanceRef.value.destroy();
        chartInstanceRef.value = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Gasto', data: gastos, backgroundColor: '#f97316' },
                    { label: 'Limite', data: limites, backgroundColor: '#3b82f6' }
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
        return chartInstanceRef.value;
    }

    global.Grafico = {
        criarGraficoDespesas,
        criarGraficoPlanejamento
    };

})(window);