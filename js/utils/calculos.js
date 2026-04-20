// Módulo de Cálculos Financeiros
(function(global) {
    "use strict";

    function getDataLimite(anoAtual, mesAtual) {
        return new Date(anoAtual, mesAtual + 1, 0);
    }

    function calcularFaturaAtual(transacoes, cartaoId) {
        return transacoes.filter(t => t.tipo === 'despesa' && t.contaId === cartaoId)
            .reduce((s, t) => s + t.valor, 0);
    }

    function calcularSaldoConta(contas, transacoes, contaId, anoAtual, mesAtual) {
        const conta = contas.find(c => c.id === contaId);
        if (!conta) return 0;
        if (conta.tipo === 'credito') return -calcularFaturaAtual(transacoes, contaId);
        const dataLimite = getDataLimite(anoAtual, mesAtual);
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

    function calcularSaldoTotal(contas, transacoes, anoAtual, mesAtual) {
        let total = 0;
        contas.forEach(c => {
            if (c.tipo === 'normal' && c.incluirNoTotal) {
                total += calcularSaldoConta(contas, transacoes, c.id, anoAtual, mesAtual);
            } else if (c.tipo === 'credito') {
                total -= calcularFaturaAtual(transacoes, c.id);
            }
        });
        return total;
    }

    function calcularSaldoProjetado(contas, transacoes, anoAtual, mesAtual) {
        const hoje = new Date();
        const fimDoMes = new Date(anoAtual, mesAtual + 1, 0);
        let saldo = calcularSaldoTotal(contas, transacoes, anoAtual, mesAtual);
        transacoes.forEach(t => {
            const data = new Date(t.data + 'T00:00:00');
            if (data > hoje && data <= fimDoMes) {
                if (t.tipo === 'receita' && t.recebido === false) saldo += t.valor;
                else if (t.tipo === 'despesa') saldo -= t.valor;
            }
        });
        return saldo;
    }

    function calcularReceitasMes(transacoes, mesAtual, anoAtual) {
        return transacoes.filter(t => {
            if (t.tipo !== 'receita') return false;
            const d = new Date(t.data + 'T00:00:00');
            return d.getMonth() === mesAtual && d.getFullYear() === anoAtual && t.recebido !== false;
        }).reduce((s, t) => s + t.valor, 0);
    }

    function calcularDespesasMes(transacoes, mesAtual, anoAtual) {
        return transacoes.filter(t => {
            if (t.tipo !== 'despesa') return false;
            const d = new Date(t.data + 'T00:00:00');
            return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        }).reduce((s, t) => s + t.valor, 0);
    }

    function calcularGastosPorCategoria(transacoes, mesAtual, anoAtual) {
        const gastos = {};
        transacoes.filter(t => t.tipo === 'despesa' && new Date(t.data).getMonth() === mesAtual && new Date(t.data).getFullYear() === anoAtual)
            .forEach(t => gastos[t.categoria] = (gastos[t.categoria] || 0) + t.valor);
        return gastos;
    }

    global.Calculos = {
        getDataLimite,
        calcularFaturaAtual,
        calcularSaldoConta,
        calcularSaldoTotal,
        calcularSaldoProjetado,
        calcularReceitasMes,
        calcularDespesasMes,
        calcularGastosPorCategoria
    };

})(window);