// Módulo de Backup e Restauração
(function(global) {
    "use strict";

    function exportarBackup(contas, transacoes, categorias, versao) {
        const backup = {
            versao: versao,
            data: new Date().toISOString(),
            contas: contas,
            transacoes: transacoes,
            categorias: categorias
        };
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
            } catch (error) {
                alert('❌ Arquivo de backup inválido.');
            }
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    global.Backup = {
        exportarBackup,
        importarBackup
    };

})(window);