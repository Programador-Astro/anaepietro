let pagamentoId = null;

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formPagamento');
  const loader = document.getElementById('modalLoader');
  const modalPagamento = document.getElementById('modalPagamento');
  const bsModalPagamento = new bootstrap.Modal(modalPagamento);
  const btnPagar = document.getElementById('btnPagar');
  const bsModalCarrinho = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCarrinho'));

  // ========== Quando clicar em "Pagar" no carrinho ==========
  btnPagar.addEventListener('click', () => {
    const carrinho = JSON.parse(localStorage.getItem("carrinho_v1") || "[]");
    if (carrinho.length === 0) {
      alert("Seu carrinho está vazio 😢");
      return;
    }
    // Fecha carrinho e abre modal de pagamento
    bsModalCarrinho.hide();
    setTimeout(() => bsModalPagamento.show(), 400);
  });

  // ========== Envio do formulário de pagamento ==========
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const cpf = document.getElementById('cpf').value.trim();

    if (!nome || !email || !cpf) {
      alert("Preencha todos os campos!");
      return;
    }

    const carrinho = JSON.parse(localStorage.getItem("carrinho_v1") || "[]");
    if (carrinho.length === 0) {
      alert("Seu carrinho está vazio!");
      return;
    }

    loader.style.display = 'block';

    const items = carrinho.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit_amount: item.unit_amount
    }));

    const total = carrinho.reduce((acc, i) => acc + i.unit_amount * i.quantity, 0);

    try {
      const res = await fetch("/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          cpf,
          items,
          total: total / 100 // valor em reais
        })
      });

      const data = await res.json();
      console.log("🔁 Resposta do servidor:", data);

      if (res.ok && data.checkout_url && data.pagamento_id) {
        pagamentoId = data.pagamento_id;
        localStorage.removeItem("carrinho_v1");
        window.location.href = data.checkout_url;
      } else {
        loader.style.display = 'none';
        alert(data.error || "Erro ao iniciar o pagamento.");
      }
    } catch (err) {
      console.error(err);
      loader.style.display = 'none';
      alert("Erro de conexão com o servidor.");
    }
  });

  /* carrinho.js
   - Gerencia o carrinho no frontend (localStorage)
   - Renderiza modal, soma valores, adiciona/remove itens, persiste
   - Versão organizada e comentada em PT-BR
*/

(() => {
  // Chaves e elementos
  const STORAGE_KEY = "carrinho_v1";
  const botaoAbrirCarrinho = document.getElementById("botaoAbrirCarrinho");
  const badgeCarrinho = document.getElementById("badgeCarrinho");
  const listaItensCarrinho = document.getElementById("listaItensCarrinho");
  const carrinhoVazioEl = document.getElementById("carrinhoVazio");
  const totalCarrinhoEl = document.getElementById("totalCarrinho");
  const btnLimpar = document.getElementById("btnLimparCarrinho");
  const btnPagar = document.getElementById("btnPagar");
  const modalCarrinhoEl = document.getElementById("modalCarrinho");
  const bsModalCarrinho = new bootstrap.Modal(modalCarrinhoEl, { keyboard: true });

  // Estrutura do carrinho: [{ id, name, unit_amount (centavos), quantity, thumb? }]
  let carrinho = [];

  /* -------------------------
     UTILITÁRIOS
     ------------------------- */
  // Formata centavos para string BRL "1234" -> "12,34"
  function formatBRL(cents) {
    const reais = (cents / 100).toFixed(2);
    return reais.replace(".", ",");
  }

  // Gera ID simples (pode ser substituído por um id real do produto)
  function gerarIdSimples(nome) {
    return nome.toLowerCase().replace(/\s+/g, "_").replace(/[^\w-]/g, "") ;
  }

  /* -------------------------
     PERSISTÊNCIA
     ------------------------- */
  function carregarCarrinho() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        carrinho = JSON.parse(raw);
      } else {
        carrinho = [];
      }
    } catch (e) {
      console.error("Erro ao ler carrinho do localStorage:", e);
      carrinho = [];
    }
    atualizarBadge();
  }

  function salvarCarrinho() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho));
    } catch (e) {
      console.error("Erro ao salvar carrinho:", e);
    }
    atualizarBadge();
  }

  function limparCarrinho() {
    carrinho = [];
    salvarCarrinho();
    renderizarCarrinho();
  }

  /* -------------------------
     OPERACOES NO CARRINHO
     ------------------------- */
  // Adiciona item — se existir, aumenta quantity
  function adicionarAoCarrinho(nome, precoCentavos, thumbUrl = null) {
    const id = gerarIdSimples(nome);
    const existe = carrinho.find(i => i.id === id);
    if (existe) {
      existe.quantity += 1;
    } else {
      carrinho.push({
        id,
        name: nome,
        unit_amount: Number(precoCentavos),
        quantity: 1,
        thumb: thumbUrl
      });
    }
    salvarCarrinho();
    // Feedback rápido
    const original = document.activeElement;
    if (original && original.classList && original.classList.contains('add-to-cart')) {
      original.classList.add('btn-added');
      setTimeout(()=> original.classList.remove('btn-added'), 500);
    }
  }

  // Remove item por id
  function removerItem(id) {
    carrinho = carrinho.filter(i => i.id !== id);
    salvarCarrinho();
    renderizarCarrinho();
  }

  // Atualiza quantidade (>=1). Se quantidade ficar 0, remove
  function atualizarQuantidade(id, novaQtd) {
    const item = carrinho.find(i => i.id === id);
    if (!item) return;
    item.quantity = Math.max(0, Number(novaQtd));
    if (item.quantity === 0) {
      removerItem(id);
    } else {
      salvarCarrinho();
      renderizarCarrinho();
    }
  }

  /* -------------------------
     RENDER (MODAL)
     ------------------------- */
  function calcularTotal() {
    return carrinho.reduce((acc, i) => acc + i.unit_amount * i.quantity, 0);
  }

  function atualizarBadge() {
    const totalItems = carrinho.reduce((acc, i) => acc + i.quantity, 0);
    badgeCarrinho.innerText = totalItems;
    badgeCarrinho.style.display = totalItems > 0 ? "inline-block" : "none";
  }

  // Renderiza os itens dentro do modal
  function renderizarCarrinho() {
    listaItensCarrinho.innerHTML = "";

    if (carrinho.length === 0) {
      carrinhoVazioEl.style.display = "block";
      totalCarrinhoEl.innerText = "0,00";
      return;
    }

    carrinhoVazioEl.style.display = "none";

    carrinho.forEach(item => {
      const el = document.createElement("div");
      el.className = "list-group-item";

      // Thumb (opcional)
      const thumb = document.createElement("img");
      thumb.className = "item-thumb";
      thumb.alt = item.name;
      thumb.src = item.thumb || "/static/img/default_thumb.png"; // se não existir thumb, garanta um placeholder

      // Conteúdo principal
      const info = document.createElement("div");
      info.className = "flex-grow-1";

      const titleRow = document.createElement("div");
      titleRow.className = "d-flex justify-content-between align-items-start";

      const title = document.createElement("div");
      title.innerHTML = `<div class="fw-bold">${item.name}</div>
                         <div class="text-muted small">R$ ${formatBRL(item.unit_amount)}</div>`;
      titleRow.appendChild(title);

      // Remover botão (no topo direita do item)
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-sm btn-outline-danger";
      removeBtn.innerText = "Remover";
      removeBtn.onclick = () => { removerItem(item.id); };

      titleRow.appendChild(removeBtn);

      // Quantidade + subtotal
      const controls = document.createElement("div");
      controls.className = "d-flex justify-content-between align-items-center mt-2";

      // Quantidade
      const qtyControls = document.createElement("div");
      qtyControls.className = "qty-controls";

      const btnMinus = document.createElement("button");
      btnMinus.className = "btn btn-sm btn-outline-secondary";
      btnMinus.innerText = "−";
      btnMinus.onclick = () => atualizarQuantidade(item.id, item.quantity - 1);

      const spanQty = document.createElement("span");
      spanQty.className = "px-2";
      spanQty.innerText = item.quantity;

      const btnPlus = document.createElement("button");
      btnPlus.className = "btn btn-sm btn-outline-secondary";
      btnPlus.innerText = "+";
      btnPlus.onclick = () => atualizarQuantidade(item.id, item.quantity + 1);

      qtyControls.appendChild(btnMinus);
      qtyControls.appendChild(spanQty);
      qtyControls.appendChild(btnPlus);

      // Subtotal do item
      const subtotal = document.createElement("div");
      subtotal.className = "text-end small text-muted";
      subtotal.innerText = `Subtotal: R$ ${formatBRL(item.unit_amount * item.quantity)}`;

      controls.appendChild(qtyControls);
      controls.appendChild(subtotal);

      info.appendChild(titleRow);
      info.appendChild(controls);

      el.appendChild(thumb);
      el.appendChild(info);

      listaItensCarrinho.appendChild(el);
    });

    // Atualiza total
    const total = calcularTotal();
    totalCarrinhoEl.innerText = formatBRL(total);
    atualizarBadge();
  }

  /* -------------------------
     AÇÕES PÚBLICAS / Eventos
     ------------------------- */
  // Abre modal do carrinho
  function abrirCarrinho() {
    renderizarCarrinho();
    bsModalCarrinho.show();
  }

  // Finalizar / Pagar - placeholder (será conectado ao backend na próxima etapa)
  async function pagar() {
    if (carrinho.length === 0) {
      alert("Seu carrinho está vazio.");
      return;
    }

    // Aqui nós mostramos um resumo antes de avançar — implementaremos integração com PagBank depois
    const resumo = carrinho.map(i => `${i.quantity}x ${i.name} — R$ ${formatBRL(i.unit_amount * i.quantity)}`).join("\n");
    const totalString = formatBRL(calcularTotal());
    const confirmar = confirm(`Resumo do pedido:\n\n${resumo}\n\nTotal: R$ ${totalString}\n\nDeseja continuar para o pagamento?`);
    if (!confirmar) return;

    // Placeholder: simula envio (na próxima etapa você pedirá que eu integre com /pagar)
    // -> Aqui você fará fetch('/pagar', { method: 'POST', body: JSON.stringify({ items: carrinho, customer: {...} }) })
    console.log("Dados do carrinho (enviar para o backend):", JSON.stringify({ items: carrinho }, null, 2));
    alert("Botão 'Pagar' acionado. Na próxima etapa eu conecto ao backend e envio os itens para criar o checkout.");

    // Opcional: limpar carrinho ao finalizar (normalmente após confirmação do checkout)
    // limparCarrinho();
    // bsModalCarrinho.hide();
  }

  /* -------------------------
     BINDINGS e Inicialização
     ------------------------- */
  // Adiciona listener aos botões "Adicionar" (delegação simples)
  function ligarBotoesAdicionar() {
    document.querySelectorAll(".add-to-cart").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const el = e.currentTarget;
        const name = el.dataset.name;
        const price = Number(el.dataset.price); // já em centavos
        // optional: try get product image from card
        const card = el.closest(".card");
        const thumb = card ? (card.querySelector("img")?.src || null) : null;

        adicionarAoCarrinho(name, price, thumb);
        // efeito visual rápido
        el.blur();
        // atualizar badge imediatamente
        atualizarBadge();
      });
    });
  }

  // Listeners UI
  botaoAbrirCarrinho.addEventListener("click", abrirCarrinho);
  btnLimpar.addEventListener("click", () => {
    if (confirm("Deseja limpar todo o carrinho?")) limparCarrinho();
  });
  btnPagar.addEventListener("click", pagar);

  // Disponibiliza funções no escopo global para depuração (opcional)
  window._carrinho = {
    adicionarAoCarrinho,
    removerItem,
    atualizarQuantidade,
    abrirCarrinho,
    limparCarrinho,
    pagar
  };

  // Inicializa
  carregarCarrinho();
  ligarBotoesAdicionar();
  renderizarCarrinho();

})();


  // ======= FORMULÁRIO DE COMENTÁRIO =======
  const formComentario = document.getElementById('formComentario');
  formComentario.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('comentarioNome').value.trim();
    const texto = document.getElementById('comentarioTexto').value.trim();

    if (!nome || !texto) return alert("Escreva seu comentário!");
    if (!pagamentoId) return alert("O pagamento precisa ser concluído antes de comentar.");

    try {
      const res = await fetch("/comentarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convidado_nome: nome, convidado_comentario: texto, pagamento_id: pagamentoId })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Comentário enviado com sucesso!");
        location.reload();
      } else {
        alert(data.error || "Erro ao enviar comentário.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar comentário.");
    }
  });

  // ======= CARREGAR COMENTÁRIOS =======
  fetch("/comentarios")
    .then(r => r.json())
    .then(data => {
      const comentarios = Array.isArray(data) ? data : data.comentarios || [];
      const container = document.getElementById("comentariosContainer");
      container.innerHTML = "";

      if (comentarios.length === 0) {
        container.innerHTML = "<p class='text-muted'>Nenhum comentário ainda.</p>";
        return;
      }

      comentarios.forEach(c => {
        const div = document.createElement("div");
        div.classList.add("mb-3", "p-3", "bg-white", "rounded", "shadow-sm");
        div.innerHTML = `<p><strong>${c.convidado_nome}</strong> disse:</p><p>${c.convidado_comentario}</p>`;
        container.appendChild(div);
      });
    })
    .catch(err => {
      console.error("Erro ao carregar comentários:", err);
      document.getElementById("comentariosContainer").innerHTML =
        "<p class='text-danger'>Erro ao carregar comentários.</p>";
    });
});
  


