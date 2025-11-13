document.addEventListener("DOMContentLoaded", () => {
  // ===== SLIDES =====
  const slides = document.querySelectorAll('.slides img');
  const miniaturas = document.querySelectorAll('.miniaturas img');
  let index = 0;
  let intervalo;

  function mostrarSlide(n) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('ativo', i === n);
      miniaturas[i].classList.toggle('ativo', i === n);
    });
    index = n;
  }

  function proximoSlide() {
    index = (index + 1) % slides.length;
    mostrarSlide(index);
  }

  function iniciarSlide() {
    intervalo = setInterval(proximoSlide, 4000);
  }

  miniaturas.forEach((thumb, i) => {
    thumb.addEventListener('click', () => {
      clearInterval(intervalo);
      mostrarSlide(i);
      iniciarSlide();
    });
  });

  iniciarSlide();

  // ===== FUNÇÃO DE CONVERSÃO DE PREÇO BRASILEIRO =====
  function parsePrecoBRL(precoStr) {
    return Number(
      precoStr
        .replace(/[^\d,]/g, '')  // remove tudo exceto dígitos e vírgulas
        .replace(/\./g, '')      // remove pontos de milhar
        .replace(',', '.')       // troca vírgula por ponto decimal
    );
  }

  // ===== CARRINHO =====
  const addButtons = document.querySelectorAll(".card button");
  const cartIcon = document.getElementById("cartIcon");
  const cartCount = document.getElementById("cartCount");
  const cartModal = document.getElementById("cartModal");
  const closeCart = document.getElementById("closeCart");
  const cartItemsContainer = document.getElementById("cartItems");

  let cart = [];

  // ===== ATUALIZAÇÃO DO CARRINHO =====
  function updateCart() {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalCount;

    cartItemsContainer.innerHTML = "";

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `<p class="empty">Seu carrinho está vazio 😔</p>`;
      document.querySelector(".btn-pagar").style.display = "none";
      return;
    }

    let totalGeral = 0;

    cart.forEach((item, index) => {
      const subtotal = item.price * item.quantity;
      totalGeral += subtotal;

      const div = document.createElement("div");
      div.classList.add("cart-item");
      div.innerHTML = `
        <img src="${item.img}" alt="${item.title}">
        <div class="info">
          <h4>${item.title}</h4>
          <p>${item.desc}</p>
          <p class="preco-unit">Valor unitário: R$ ${item.price.toFixed(2)}</p>
          <p class="subtotal">Subtotal: R$ ${(subtotal).toFixed(2)}</p>
          <div class="quantity-controls">
            <button class="decrease" data-index="${index}">-</button>
            <span class="quantity">${item.quantity}</span>
            <button class="increase" data-index="${index}">+</button>
          </div>
        </div>
        <button class="remove" data-index="${index}">🗑️</button>
      `;
      cartItemsContainer.appendChild(div);
    });

    // Total geral no final
    const totalDiv = document.createElement("div");
    totalDiv.classList.add("cart-total");
    totalDiv.innerHTML = `<h3>Total: R$ ${totalGeral.toFixed(2)}</h3>`;
    cartItemsContainer.appendChild(totalDiv);

    document.querySelector(".btn-pagar").style.display = "block";

    // === Eventos dos botões ===
    document.querySelectorAll(".remove").forEach(btn => {
      btn.addEventListener("click", e => {
        const idx = e.target.dataset.index;
        cart.splice(idx, 1);
        updateCart();
      });
    });

    document.querySelectorAll(".increase").forEach(btn => {
      btn.addEventListener("click", e => {
        const idx = e.target.dataset.index;
        cart[idx].quantity++;
        updateCart();
      });
    });

    document.querySelectorAll(".decrease").forEach(btn => {
      btn.addEventListener("click", e => {
        const idx = e.target.dataset.index;
        if (cart[idx].quantity > 1) {
          cart[idx].quantity--;
        } else {
          cart.splice(idx, 1);
        }
        updateCart();
      });
    });
  }

  // ===== ADICIONAR ITEM AO CARRINHO =====
  addButtons.forEach(button => {
    button.addEventListener("click", () => {
      const card = button.closest(".card");
      const title = card.querySelector("h4").textContent;
      const desc = card.querySelector("p").textContent;
      const img = card.querySelector("img").src;

      // 🔹 Corrigido: captura o preço corretamente no formato BR
      const priceEl = card.querySelector(".price");
      const price = priceEl ? parsePrecoBRL(priceEl.textContent) : 0;

      const existingItem = cart.find(item => item.title === title);

      if (existingItem) {
        existingItem.quantity++;
      } else {
        cart.push({ title, desc, img, quantity: 1, price });
      }

      updateCart();

      // Feedback visual
      button.textContent = "Adicionado ✔️";
      button.disabled = true;
      button.classList.add("added");

      setTimeout(() => {
        button.textContent = "Adicionar";
        button.disabled = false;
        button.classList.remove("added");
      }, 1000);
    });
  });

  // ===== MODAL DO CARRINHO =====
  cartIcon.addEventListener("click", () => {
    cartModal.style.display = "flex";
  });

  closeCart.addEventListener("click", () => {
    cartModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === cartModal) {
      cartModal.style.display = "none";
    }
  });

  // ===== MODAL DE CHECKOUT =====
  const checkoutModal = document.getElementById("checkoutModal");
  const closeCheckout = document.getElementById("closeCheckout");
  const checkoutForm = document.getElementById("checkoutForm");
  const pagarBtn = document.querySelector(".btn-pagar");

  pagarBtn.addEventListener("click", () => {
    if (cart.length === 0) {
      alert("Seu carrinho está vazio!");
      return;
    }
    checkoutModal.style.display = "flex";
  });

  closeCheckout.addEventListener("click", () => {
    checkoutModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === checkoutModal) {
      checkoutModal.style.display = "none";
    }
  });

  // ===== ENVIAR FORM DE CHECKOUT =====
  checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = checkoutForm.nome.value.trim();
    const email = checkoutForm.email.value.trim();
    const cpf = checkoutForm.cpf.value.trim();

    if (!nome || !email || !cpf) {
      alert("Todos os campos são obrigatórios!");
      return;
    }

    const itemsToSend = cart.map(item => ({
      name: item.title,
      quantity: item.quantity,
      unit_amount: Math.round(item.price * 100) // agora com preço correto
    }));

    const total = itemsToSend.reduce((sum, i) => sum + i.unit_amount * i.quantity, 0) / 100;

    const payload = { nome, email, cpf, items: itemsToSend, total };

    try {
      const response = await fetch("/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Erro ao iniciar o pagamento.");
        return;
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert("Link de checkout não encontrado.");
      }

    } catch (err) {
      console.error("Erro ao enviar dados:", err);
      alert("Ocorreu um erro. Tente novamente.");
    }
  });
});

// ===== COMENTÁRIOS =====
async function carregarComentarios() {
  const container = document.getElementById("comentariosContainer");
  container.innerHTML = "<p>Carregando comentários...</p>";

  try {
    const response = await fetch("/comentarios");
    if (!response.ok) throw new Error("Erro ao carregar comentários");

    const comentarios = await response.json();

    if (comentarios.length === 0) {
      container.innerHTML = "<p>Nenhum comentário ainda. Seja o primeiro! 💌</p>";
      return;
    }

    container.innerHTML = ""; // limpa o carregando

    comentarios.forEach(c => {
      const div = document.createElement("div");
      div.classList.add("comentario");
      div.innerHTML = `
        <p><strong>${c.convidado_nome}</strong> </p>
        <p>${c.convidado_comentario}</p>
        <hr>
      `;
      container.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Não foi possível carregar os comentários 😔</p>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  carregarComentarios();
});

document.addEventListener('DOMContentLoaded', function() {
  if (window.innerWidth <= 768) {
    const fotos = document.querySelectorAll('.inicio .foto');
    let indexAtual = 0;

    // Define o estado inicial
    fotos.forEach((foto, i) => {
      foto.classList.remove('ativa');
      if (i === 0) foto.classList.add('ativa');
    });

    // Alterna suavemente a cada 2 segundos
    setInterval(() => {
      fotos[indexAtual].classList.remove('ativa');
      indexAtual = (indexAtual + 1) % fotos.length;
      fotos[indexAtual].classList.add('ativa');
    }, 2000);
  }
});