// Cole aqui o conteúdo completo do app.js que enviei anteriormente, 
// mas adicione as seguintes funções e chamadas no final do init():

// Dentro do init(), após a linha:
// modalTransacao.addEventListener('click', e => { if (e.target === modalTransacao) modalTransacao.style.display = 'none'; });

// Adicione:
        // ---------- BACKUP (EXPORTAÇÃO/IMPORTAÇÃO) ----------
        document.getElementById('btn-exportar-backup').addEventListener('click', exportarBackup);
        document.getElementById('btn-importar-backup').addEventListener('click', () => {
            document.getElementById('input-importar-backup').click();
        });
        document.getElementById('input-importar-backup').addEventListener('change', importarBackup);
    }

    // Novas funções (adicione antes do init() ou em qualquer lugar do escopo):
    function exportarBackup() {
        const backup = {
            versao: '1.0',
            data: new Date().toISOString(),
            contas: contas,
            transacoes: transacoes,
            preferencias: {
                temaEscuro: document.body.classList.contains('dark-theme')
            }
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

    function importarBackup(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                if (!backup.contas || !backup.transacoes) throw new Error('Arquivo inválido');
                
                if (confirm('Importar backup substituirá todos os dados atuais. Continuar?')) {
                    contas = backup.contas;
                    transacoes = backup.transacoes;
                    salvarContas();
                    salvarTransacoes();
                    
                    if (backup.preferencias) {
                        aplicarTema(backup.preferencias.temaEscuro);
                    }
                    
                    location.reload(); // Recarrega para aplicar tudo
                }
            } catch (error) {
                alert('❌ Arquivo de backup inválido.');
            }
            event.target.value = ''; // Limpa input
        };
        reader.readAsText(file);
    }