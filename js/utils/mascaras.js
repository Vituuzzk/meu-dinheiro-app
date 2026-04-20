// Módulo de Máscaras e Formatação de Moeda
(function(global) {
    "use strict";

    function aplicarMascaraMoeda(e) {
        let v = e.target.value.replace(/[^\d,]/g, '');
        const partes = v.split(',');
        if (partes.length > 2) v = partes[0] + ',' + partes.slice(1).join('');
        e.target.value = v;
    }

    function formatarMoedaInput(v) {
        if (!v) return '';
        let numero = parseFloat(v.replace(',', '.'));
        if (isNaN(numero)) return '';
        return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function converterMoedaParaFloat(v) {
        if (!v) return 0;
        return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0;
    }

    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function configurarMascaras() {
        document.querySelectorAll('.moeda').forEach(i => {
            i.addEventListener('input', aplicarMascaraMoeda);
            i.addEventListener('blur', (e) => {
                if (e.target.value) {
                    let numero = parseFloat(e.target.value.replace(',', '.'));
                    if (!isNaN(numero)) e.target.value = numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }
            });
        });
    }

    global.Mascaras = {
        aplicarMascaraMoeda,
        formatarMoedaInput,
        converterMoedaParaFloat,
        formatarMoeda,
        configurarMascaras
    };

})(window);