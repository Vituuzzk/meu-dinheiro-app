# 💰 Meu Dinheiro

**Meu Dinheiro** é um aplicativo de finanças pessoais completo, desenvolvido como um PWA (Progressive Web App) com HTML, CSS e JavaScript puro. Ele oferece controle de contas, cartões de crédito, transações, planejamento de orçamentos, empréstimos e muito mais, com uma interface moderna e intuitiva.

![Versão](https://img.shields.io/badge/versão-3.1.0-green)
![Licença](https://img.shields.io/badge/licença-MIT-blue)
![Status](https://img.shields.io/badge/status-Beta-orange)

---

## ✨ Funcionalidades

- **Dashboard principal:** Saldo em contas, receitas e despesas do mês, saldo projetado.
- **Contas e Cartões:** Gerencie contas normais e cartões de crédito com limite, dia de fechamento e vencimento.
- **Transações:** Registre receitas, despesas e transferências com categorias personalizáveis.
- **Planejamento:** Defina orçamentos por categoria e acompanhe com barras de progresso.
- **Empréstimos:** Controle empréstimos pessoais com cálculo de parcelas e juros simples.
- **Backup e Exportação:** Exporte seus dados em JSON (backup) ou CSV (Excel).
- **Login com Google:** Sincronize seus dados na nuvem com Firebase (opcional).
- **Tema escuro:** Interface adaptável para uso noturno.
- **Micro-interações:** Animações suaves e feedback tátil para uma experiência de app nativo.

---

## 🚀 Tecnologias Utilizadas

| Tecnologia | Finalidade |
| :--- | :--- |
| HTML5, CSS3 | Estrutura e estilização |
| JavaScript (Vanilla) | Lógica e interatividade |
| Chart.js | Gráficos dinâmicos |
| Lucide Icons | Ícones vetoriais modernos |
| Firebase | Autenticação e banco de dados em nuvem |
| Vercel | Hospedagem contínua |

---

## 📁 Estrutura do Projeto
/meu-dinheiro-app
├── index.html # Página principal (SPA)
├── app.js # Lógica central do aplicativo
├── exportar.js # Funções de exportação (legado)
├── css/
│ ├── style.css # Estilos principais
│ └── dark-theme.css # Estilos do tema escuro
├── js/
│ ├── firebase.js # Configuração do Firebase
│ ├── auth.js # Autenticação (Google)
│ └── modules/ # Módulos auxiliares
│ ├── mascaras.js
│ ├── backup.js
│ ├── ui.js
│ └── categorias.js
└── README.md

text

---

## 🔧 Como Executar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/meu-dinheiro-app.git
Abra o arquivo index.html em seu navegador.

Para usar a sincronização com Firebase, configure as credenciais em js/firebase.js.

☁️ Configuração do Firebase (Opcional)
Crie um projeto no Firebase Console.

Ative a Autenticação com Google.

Crie um banco de dados Firestore.

Registre um app Web e copie as credenciais para js/firebase.js.

Ative o Firebase Hosting para deploy simplificado.

🧪 Testando a Versão Beta
A versão mais recente está disponível em:
👉 https://meu-dinheiro-app.vercel.app

Nota: O login com Google é opcional. Você pode usar o app completamente offline.

👨‍💻 Desenvolvimento
Este projeto é mantido por Victor Rodrigues.
Feedbacks e sugestões são muito bem-vindos!

📋 Próximos passos (roadmap)
Gamificação (porquinho consultor)

Ranking anônimo de economia

Desafios semanais

Gravação de áudio para descrição de transações

Migração para React Native (versão mobile nativa)

📄 Licença
Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

Feito com 💚 e muito JavaScript.

text

---

Agora é só criar um arquivo chamado `README.md` no seu repositório (na raiz) e colar esse conteúdo. Vai dar um ar super profissional ao seu projeto! 🚀💚
