  // ======= ANIMAÇÃO DA NAVBAR =======
  (function () {
    const navbar = document.getElementById('navbar2');
    let isFixed = false;
    let transitionDuration = 400;

    function makeFixed() {
      if (isFixed) return;
      const rect = navbar.getBoundingClientRect();

      navbar.style.position = 'fixed';
      navbar.style.top = '20px';
      navbar.style.left = `${rect.left}px`;
      navbar.style.right = 'auto';

      navbar.offsetWidth; // força reflow

      navbar.classList.add('fixed');
      isFixed = true;
    }

    function removeFixed() {
      if (!isFixed) return;
      const rect = navbar.getBoundingClientRect();
      const navWidth = rect.width;
      const targetLeft = window.innerWidth - navWidth - 20;

      navbar.classList.remove('fixed');
      navbar.style.left = `${rect.left}px`;
      navbar.style.top = '20px';
      navbar.style.position = 'fixed';
      navbar.style.right = 'auto';

      navbar.offsetWidth;
      navbar.style.left = `${targetLeft}px`;

      setTimeout(() => {
        navbar.style.position = 'absolute';
        navbar.style.left = 'auto';
        navbar.style.right = '20px';
        navbar.style.top = '20px';
        isFixed = false;
      }, transitionDuration);
    }

    window.addEventListener('scroll', () => {
      if (window.scrollY > 100) makeFixed();
      else removeFixed();
    });

    window.addEventListener('load', () => {
      if (window.scrollY > 100) makeFixed();
      else {
        navbar.style.position = 'absolute';
        navbar.style.top = '20px';
        navbar.style.right = '20px';
      }
    });

    window.addEventListener('resize', () => {
      if (isFixed) {
        navbar.style.left = `${(window.innerWidth - navbar.offsetWidth) / 2}px`;
        setTimeout(() => {
          navbar.classList.add('fixed');
          navbar.style.left = '';
        }, 50);
      } else {
        navbar.style.position = 'absolute';
        navbar.style.left = 'auto';
        navbar.style.right = '20px';
        navbar.style.top = '20px';
      }
    });
  })();


  // ======= CARROSSEL AUTOMÁTICO + CLIQUE =======
  document.addEventListener('DOMContentLoaded', () => {
    const mainImage = document.getElementById('mainImage');
    const thumbs = document.querySelectorAll('.thumbnail-bar .thumb');
    let currentIndex = 0;
    let intervalo;

    if (mainImage && thumbs.length > 0) {

      // Função que troca a imagem
      function trocarImagem(index) {
        thumbs.forEach(t => t.classList.remove('active'));
        const newSrc = thumbs[index].src;
        mainImage.classList.remove('fade-in');
        void mainImage.offsetWidth; // reflow
        mainImage.src = newSrc;
        mainImage.classList.add('fade-in');
        thumbs[index].classList.add('active');
        currentIndex = index;
      }

      // Carrossel automático
      function iniciarCarrossel() {
        intervalo = setInterval(() => {
          currentIndex = (currentIndex + 1) % thumbs.length;
          trocarImagem(currentIndex);
        }, 1500);
      }

      // Pausa e reinicia o carrossel quando clicar em uma thumb
      thumbs.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
          clearInterval(intervalo);
          trocarImagem(index);
          iniciarCarrossel(); // reinicia depois de clicar
        });
      });

      iniciarCarrossel(); // começa automaticamente
    }

    // ======= SCROLL SUAVE =======
    document.querySelectorAll('a.nav-link[href^="#"]').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const destino = document.querySelector(this.getAttribute('href'));
        if (destino) {
          window.scrollTo({
            top: destino.offsetTop - 80,
            behavior: 'smooth'
          });
        }
      });
    });
  });
