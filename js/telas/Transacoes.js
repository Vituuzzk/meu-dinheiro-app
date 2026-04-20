// Tela de Transações
(function(global) {
    "use strict";

    function renderizarTransacoesAgrupadas(estado, utils) {
        const { contas, transacoes, mesAtual, anoAtual } = estado;
        const { getEl } = utils;
        const { formatarMoeda } = Mascaras;

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

    global.Transacoes = { renderizarTransacoesAgrupadas };

})(window);