```javascript
// Aguarda a página carregar completamente
document.addEventListener('DOMContentLoaded', () => {
    // Elementos da tela
    const salarioInput = document.getElementById('salario-input');
    const btnSalvarSalario = document.getElementById('btn-salvar-salario');
    const saldoDisponivelH2 = document.getElementById('saldo-disponivel-valor');
    
    const valorGasto = document.getElementById('valor-gasto');
    const categoriaGasto = document.getElementById('categoria-gasto');
    const dataGasto = document.getElementById('data-gasto');
    const btnAdicionar = document.getElementById('btn-adicionar');
    const listaGastosUl = document.getElementById('lista-gastos');
    const btnLimpar = document.getElementById('btn-limpar');
    const dataAtualP = document.getElementById('data-atual');

    // Gráfico (vamos guardar a instância)
    let chartInstance = null;
    const ctx = document.getElementById('grafico-categorias').getContext('2d');

    // Dados salvos no navegador
    let salario = parseFloat(localStorage.getItem('salario')) || 0;
    let gastos = JSON.parse(localStorage.getItem('gastos')) || [];

    // --- FUNÇÕES AUXILIARES ---
    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function atualizarData() {
        const hoje = new Date();
        dataAtualP.textContent = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        // Define data padrão no input de data como hoje
        if (!dataGasto.value) {
            const ano = hoje.getFullYear();
            const mes = String(hoje.getMonth() + 1).padStart(2, '0');
            const dia = String(hoje.getDate()).padStart(2, '0');
            dataGasto.value = `${ano}-${mes}-${dia}`;
        }
    }

    // Calcula total de gastos do mês atual
    function calcularTotalGastoMes() {
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        
        return gastos.reduce((total, g) => {
            const dataG = new Date(g.data + 'T00:00:00'); // Evita fuso horário
            if (dataG.getMonth() === mesAtual && dataG.getFullYear() === anoAtual) {
                return total + g.valor;
            }
            return total;
        }, 0);
    }

    function atualizarSaldoDisponivel() {
        const totalGasto = calcularTotalGastoMes();
        const disponivel = salario - totalGasto;
        saldoDisponivelH2.textContent = formatarMoeda(disponivel);
        // Muda cor se estourou orçamento
        saldoDisponivelH2.style.color = disponivel < 0 ? '#fca5a5' : 'white';
    }

    function atualizarListaGastos() {
        // Ordena do mais recente para o mais antigo
        const gastosOrdenados = [...gastos].sort((a, b) => new Date(b.data) - new Date(a.data));
        listaGastosUl.innerHTML = '';
        
        gastosOrdenados.slice(0, 10).forEach(g => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>
                    <strong>${g.categoria}</strong><br>
                    <small>${new Date(g.data + 'T00:00:00').toLocaleDateString('pt-BR')}</small>
                </span>
                <span style="font-weight: bold;">${formatarMoeda(g.valor)}</span>
            `;
            listaGastosUl.appendChild(li);
        });
    }

    function atualizarGrafico() {
        // Agrupa gastos por categoria (apenas do mês atual)
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        
        const totaisPorCategoria = {};
        gastos.forEach(g => {
            const dataG = new Date(g.data + 'T00:00:00');
            if (dataG.getMonth() === mesAtual && dataG.getFullYear() === anoAtual) {
                totaisPorCategoria[g.categoria] = (totaisPorCategoria[g.categoria] || 0) + g.valor;
            }
        });

        const categorias = Object.keys(totaisPorCategoria);
        const valores = Object.values(totaisPorCategoria);

        // Destroi gráfico antigo se existir
        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categorias,
                datasets: [{
                    data: valores,
                    backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#94a3b8']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    function salvarDados() {
        localStorage.setItem('salario', salario);
        localStorage.setItem('gastos', JSON.stringify(gastos));
    }

    function atualizarTudo() {
        salarioInput.value = salario || '';
        atualizarSaldoDisponivel();
        atualizarListaGastos();
        atualizarGrafico();
        salvarDados();
    }

    // --- EVENTOS ---
    btnSalvarSalario.addEventListener('click', () => {
        const novoSalario = parseFloat(salarioInput.value);
        if (!isNaN(novoSalario) && novoSalario >= 0) {
            salario = novoSalario;
            atualizarTudo();
            alert('Salário salvo com sucesso!');
        } else {
            alert('Por favor, insira um valor válido.');
        }
    });

    btnAdicionar.addEventListener('click', () => {
        const valor = parseFloat(valorGasto.value);
        const categoria = categoriaGasto.value;
        let data = dataGasto.value;

        if (!data) {
            alert('Selecione uma data.');
            return;
        }
        if (isNaN(valor) || valor <= 0) {
            alert('Valor inválido.');
            return;
        }

        gastos.push({ valor, categoria, data });
        valorGasto.value = ''; // limpa campo
        atualizarTudo();
    });

    btnLimpar.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja apagar TODOS os dados salvos?')) {
            localStorage.clear();
            salario = 0;
            gastos = [];
            atualizarTudo();
            location.reload(); // recarrega para limpar campos
        }
    });

    // Inicialização
    atualizarData();
    atualizarTudo();
});
```
