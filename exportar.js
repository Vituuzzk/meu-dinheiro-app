// Função de exportação para Excel (CSV)
(function() {
    "use strict";

    // Função principal de exportação
    function exportarParaCSV() {
        // Obtém os dados do localStorage (mesma lógica do app.js)
        const contas = JSON.parse(localStorage.getItem('contas')) || [];
        const transacoes = JSON.parse(localStorage.getItem('transacoes')) || [];

        if (transacoes.length === 0) {
            alert('Não há transações para exportar.');
            return;
        }

        // Cabeçalho do CSV
        let csv = 'Data,Hora,Tipo,Categoria,Descrição,Conta,Valor (R$)\n';

        // Ordena transações por data/hora (mais recentes primeiro)
        const transacoesOrdenadas = [...transacoes].sort((a, b) => {
            return new Date(b.timestamp || b.data) - new Date(a.timestamp || a.data);
        });

        // Para cada transação, adiciona uma linha
        transacoesOrdenadas.forEach(t => {
            const conta = contas.find(c => c.id === t.contaId) || { nome: 'Conta não encontrada' };
            
            // Formata data e hora
            let dataFormatada = '';
            let horaFormatada = '';
            if (t.timestamp) {
                const dt = new Date(t.timestamp);
                dataFormatada = dt.toLocaleDateString('pt-BR');
                horaFormatada = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            } else {
                dataFormatada = new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR');
                horaFormatada = '--:--';
            }

            // Determina o valor com sinal
            let valorFormatado = t.valor.toFixed(2).replace('.', ',');
            if (t.tipo === 'despesa') {
                valorFormatado = '-' + valorFormatado;
            } else if (t.tipo === 'receita') {
                valorFormatado = '+' + valorFormatado;
            }

            // Descrição (usa descricao ou categoria)
            const descricao = t.descricao || t.categoria || '';

            // Nome da conta (para transferência usa origem)
            let nomeConta = conta.nome;
            if (t.tipo === 'transferencia') {
                const contaDestino = contas.find(c => c.id === t.contaDestinoId);
                nomeConta = `${conta.nome} → ${contaDestino?.nome || '?'}`;
            }

            // Escapa campos que possam conter vírgula
            const categoria = (t.categoria || '').replace(/,/g, ';');
            const desc = descricao.replace(/,/g, ';');
            const contaNome = nomeConta.replace(/,/g, ';');

            // Monta a linha CSV
            csv += `${dataFormatada},${horaFormatada},${t.tipo},${categoria},${desc},${contaNome},${valorFormatado}\n`;
        });

        // Adiciona resumo ao final (opcional)
        const totalReceitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
        const totalDespesas = transacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
        csv += `\n,,,RESUMO,,,\n`;
        csv += `,,,Total Receitas,,,${totalReceitas.toFixed(2).replace('.', ',')}\n`;
        csv += `,,,Total Despesas,,,-${totalDespesas.toFixed(2).replace('.', ',')}\n`;
        csv += `,,,Saldo,,,${(totalReceitas - totalDespesas).toFixed(2).replace('.', ',')}\n`;

        // Cria o arquivo e faz download
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // \ufeff para Excel reconhecer UTF-8
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Nome do arquivo com mês/ano atual
        const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        const hoje = new Date();
        const mes = meses[hoje.getMonth()];
        const ano = hoje.getFullYear();
        a.download = `meu-dinheiro-${mes}-${ano}.csv`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Exibe sugestão de uso com IA
        mostrarSugestaoIA();
    }

    // Função para exibir um card com prompt pronto para IA
    function mostrarSugestaoIA() {
        // Remove sugestão anterior se existir
        const antiga = document.getElementById('sugestao-ia-card');
        if (antiga) antiga.remove();

        // Verifica se o tema escuro está ativo
        const temaEscuro = document.body.classList.contains('dark-theme');

        const card = document.createElement('div');
        card.id = 'sugestao-ia-card';
        card.style.cssText = `
            position: fixed;
            bottom: 160px;
            left: 50%;
            transform: translateX(-50%);
            max-width: 420px;
            width: 90%;
            background: ${temaEscuro ? '#1e293b' : 'white'};
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 200;
            border: 1px solid ${temaEscuro ? '#334155' : '#e5e7eb'};
            color: ${temaEscuro ? '#f1f5f9' : 'inherit'};
        `;

        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const hoje = new Date();
        const mesAtual = meses[hoje.getMonth()];
        const anoAtual = hoje.getFullYear();

        const prompt = `Analise meus gastos do mês de ${mesAtual} de ${anoAtual} com base no arquivo CSV anexado.
Aponte:
1. As 3 maiores despesas e em quais categorias.
2. Onde posso reduzir gastos (sugestões práticas).
3. Uma projeção de economia para os próximos 3 meses se eu cortar 10% em Alimentação e Lazer.`;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="font-size: 16px; margin: 0; color: ${temaEscuro ? '#f1f5f9' : 'inherit'};">🤖 Análise com IA</h3>
                <button id="fechar-sugestao-ia" style="width: auto; background: none; border: none; font-size: 20px; cursor: pointer; padding: 0; margin: 0; color: ${temaEscuro ? '#cbd5e1' : 'inherit'};">✕</button>
            </div>
            <p style="font-size: 14px; margin-bottom: 12px; color: ${temaEscuro ? '#cbd5e1' : 'inherit'};">Arquivo exportado! Que tal pedir uma análise para o ChatGPT?</p>
            <div style="background: ${temaEscuro ? '#0f172a' : '#f3f4f6'}; padding: 12px; border-radius: 12px; margin-bottom: 12px; font-size: 13px; max-height: 120px; overflow-y: auto; color: ${temaEscuro ? '#e2e8f0' : 'inherit'};">
                ${prompt.replace(/\n/g, '<br>')}
            </div>
            <button id="copiar-prompt-ia" style="background: #10b981; margin-top: 0;">📋 Copiar prompt</button>
            <p style="font-size: 12px; color: ${temaEscuro ? '#94a3b8' : '#6b7280'}; margin-top: 8px;">Depois é só colar no ChatGPT e anexar o arquivo CSV.</p>
        `;

        document.body.appendChild(card);

        document.getElementById('fechar-sugestao-ia').addEventListener('click', () => card.remove());
        document.getElementById('copiar-prompt-ia').addEventListener('click', () => {
            navigator.clipboard?.writeText(prompt).then(() => {
                alert('Prompt copiado! Agora abra o ChatGPT e cole.');
            }).catch(() => {
                prompt('Copie manualmente:', prompt);
            });
            card.remove();
        });

        // Fecha sozinho após 15 segundos
        setTimeout(() => { if (card.parentNode) card.remove(); }, 15000);
    }

    // Aguarda o DOM carregar para adicionar o evento ao botão
    function initExportar() {
        const btnExportar = document.getElementById('btn-exportar-excel');
        if (btnExportar) {
            btnExportar.addEventListener('click', exportarParaCSV);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExportar);
    } else {
        initExportar();
    }
})();