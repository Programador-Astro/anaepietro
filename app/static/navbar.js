// Arquivo: navbar.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Seleciona o botão (o elemento que será clicado)
    const menuToggle = document.getElementById('menu-toggle');
    // 2. Seleciona o menu (o elemento que será expandido/contraído)
    const navLinks = document.getElementById('nav-links');

    // 3. Adiciona um "ouvinte" de evento de clique ao botão
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => { 
            // Ação: Adiciona ou remove a classe 'ativo' no menu
            // Esta classe 'ativo' deve ser definida no seu static/css.css
            navLinks.classList.toggle('ativo'); 
            // Opcional: Adiciona/remove a classe 'ativo' no botão para mudar o ícone (hambúrguer -> X)
            menuToggle.classList.toggle('ativo');
        });

        // Opcional: Fechar o menu ao clicar em um link (útil no mobile)
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('ativo');
                menuToggle.classList.remove('ativo');
            });
        });
    }
});