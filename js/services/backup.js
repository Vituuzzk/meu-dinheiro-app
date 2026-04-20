// Módulo de Backup e Exportação
(function(global) {
    "use strict";

    function exportarBackup(contas, transacoes, emprestimos, orcamentos, categorias, versao) {
        const backup = { versao, data: new Date().toISOString(), contas, transacoes, emprestimos, orcamentos, categorias };
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

    function importarBackup(event, callback) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                if (!backup.contas || !backup.transacoes) throw new Error('Arquivo inválido');
                if (confirm('Importar backup substituirá todos os dados atuais. Continuar?')) {
                    callback(backup);
                    location.reload();
                }
            } catch (error) { alert('❌ Arquivo de backup inválido.'); }
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    function exportarParaCSV(transacoes, contas, mesAtual, anoAtual) {
        if (transacoes.length === 0) return alert('Nenhuma transação para exportar.');
        let csv = 'Data,Tipo,Categoria,Descrição,Conta,Valor (R$)\n';
        transacoes.sort((a,b) => new Date(b.data) - new Date(a.data)).forEach(t => {
            const conta = contas.find(c => c.id === t.contaId)?.nome || 'Conta';
            const valor = t.tipo === 'despesa' ? -t.valor : t.valor;
            csv += `${t.data},${t.tipo},${t.categoria},${t.descricao || ''},${conta},${valor.toFixed(2).replace('.',',')}\n`;
        });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meu-dinheiro-${mesAtual+1}-${anoAtual}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    global.Backup = {
        exportarBackup,
        importarBackup,
        exportarParaCSV
    };

})(window);