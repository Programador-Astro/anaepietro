// MAIN.JS FINAL — Bootstrap + Carrinho + Checkout + Comentários + Slider + Navbar

document.addEventListener("DOMContentLoaded", () => {

    /* ============================================================
       SLIDE MOBILE (MOSTRAR 1 FOTO QUE TROCA AUTOMATICAMENTE)
    ============================================================ */
    (function configurarSlideMobile() {
        if (window.innerWidth > 768) return; // só mobile

        const inicio = document.querySelector("#inicio");
        if (!inicio) return;

        const fotos = [
            "https://i.imgur.com/uk81p37.jpeg",
            "https://i.imgur.com/uirOYGT.jpeg",
            "https://i.imgur.com/l6P4zFP.jpeg"
        ];

        let index = 0;

        // Remove fotos existentes (foto1, foto2, foto3)
        inicio.querySelectorAll(".foto").forEach(f => f.remove());

        // Cria camada única
        const div = document.createElement("div");
        div.classList.add("foto-mobile");
        div.style.backgroundImage = `url(${fotos[0]})`;
        inicio.appendChild(div);

        setInterval(() => {
            index = (index + 1) % fotos.length;
            div.style.opacity = 0;

            setTimeout(() => {
                div.style.backgroundImage = `url(${fotos[index]})`;
                div.style.opacity = 1;
            }, 400);

        }, 4500);
    })();



    /* ============================================================
       BOOTSTRAP MODALS
    ============================================================ */
    const modalCarrinho = new bootstrap.Modal(document.getElementById("modalCarrinho"));
    const modalCheckout = new bootstrap.Modal(document.getElementById("checkoutModal"));
    const modalLoader = new bootstrap.Modal(document.getElementById("modalLoader"));

    /* ============================================================
       RESTANTE DO SEU CÓDIGO (CARRINHO + COMENTÁRIOS + NAVBAR)
       >>> NADA FOI ALTERADO <<<
    ============================================================ */

    const STORAGE_KEY = "carrinho_v1";
    let carrinho = [];
    let pagamentoId = null;

    const cartCount = document.getElementById("cartCount");
    const cartItemsContainer = document.getElementById("cartItems");
    const totalEl = document.getElementById("totalCarrinho");
    const btnPagar = document.getElementById("btnPagar");

    const formatBRL = cents => (cents / 100).toFixed(2).replace(".", ",");
    const parsePrecoBRL = v => Number(v.replace(/[^\d,]/g, "").replace(",", "."));
    const gerarId = nome => nome.toLowerCase().replace(/\s+/g, "_").replace(/[^\w-]/g, "");

    function carregarCarrinho() {
        try { carrinho = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch { carrinho = []; }
        atualizarBadge();
    }

    function salvarCarrinho() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho));
        atualizarBadge();
    }

    function adicionarAoCarrinho(nome, precoCentavos, thumb) {
        const id = gerarId(nome);
        const existente = carrinho.find(i => i.id === id);

        if (existente) existente.quantity++;
        else carrinho.push({ id, name: nome, unit_amount: Number(precoCentavos), quantity: 1, thumb });

        salvarCarrinho();
        renderizarCarrinho();
    }

    function atualizarQuantidade(id, qtd) {
        const item = carrinho.find(i => i.id === id);
        if (!item) return;
        item.quantity = qtd;
        if (item.quantity <= 0) carrinho = carrinho.filter(i => i.id !== id);
        salvarCarrinho();
        renderizarCarrinho();
    }

    function removerItem(id) {
        carrinho = carrinho.filter(i => i.id !== id);
        salvarCarrinho();
        renderizarCarrinho();
    }

    function calcularTotal() {
        return carrinho.reduce((acc, i) => acc + i.unit_amount * i.quantity, 0);
    }

    function atualizarBadge() {
        cartCount.textContent = carrinho.reduce((acc, i) => acc + i.quantity, 0);
    }

    function renderizarCarrinho() {
        cartItemsContainer.innerHTML = "";
        if (carrinho.length === 0) {
            cartItemsContainer.innerHTML = `<p class="empty">Seu carrinho está vazio 😔</p>`;
            totalEl.textContent = "0,00";
            return;
        }

        carrinho.forEach(item => {
            const subtotal = item.unit_amount * item.quantity;
            const div = document.createElement("div");

            div.classList.add(
                "d-flex", "justify-content-between",
                "align-items-start", "border-bottom", "py-2"
            );

            div.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${item.thumb}" style="width:50px;height:50px;border-radius:6px;margin-right:10px;">
                    <div>
                        <strong>${item.name}</strong><br>
                        <small>R$ ${formatBRL(item.unit_amount)}</small>
                    </div>
                </div>

                <div class="text-end">
                    <div class="d-flex justify-content-end mb-1">
                        <button class="btn btn-sm btn-outline-secondary decrease" data-id="${item.id}">-</button>
                        <span class="px-2">${item.quantity}</span>
                        <button class="btn btn-sm btn-outline-secondary increase" data-id="${item.id}">+</button>
                    </div>

                    <strong>R$ ${formatBRL(subtotal)}</strong><br>
                    <button class="btn btn-sm btn-danger mt-1 remove" data-id="${item.id}">🗑️</button>
                </div>
            `;

            cartItemsContainer.appendChild(div);
        });

        totalEl.textContent = formatBRL(calcularTotal());

        document.querySelectorAll(".increase").forEach(btn => {
            btn.onclick = () => atualizarQuantidade(btn.dataset.id,
                carrinho.find(i => i.id === btn.dataset.id).quantity + 1
            );
        });

        document.querySelectorAll(".decrease").forEach(btn => {
            btn.onclick = () => atualizarQuantidade(btn.dataset.id,
                carrinho.find(i => i.id === btn.dataset.id).quantity - 1
            );
        });

        document.querySelectorAll(".remove").forEach(btn => {
            btn.onclick = () => removerItem(btn.dataset.id);
        });
    }

    function ligarBotoesAdicionar() {
        document.querySelectorAll(".add-to-cart").forEach(btn => {
            btn.addEventListener("click", () => {
                const card = btn.closest(".card");
                const nome = card.querySelector("h4").textContent;
                const preco = parsePrecoBRL(card.querySelector(".price").textContent);
                const thumb = card.querySelector("img").src;

                adicionarAoCarrinho(nome, preco * 100, thumb);

                btn.textContent = "Adicionado ✔️";
                btn.classList.add("btn-added");
                setTimeout(() => {
                    btn.textContent = "Adicionar";
                    btn.classList.remove("btn-added");
                }, 800);
            });
        });
    }

    document.getElementById("cartIcon").addEventListener("click", () => {
        renderizarCarrinho();
        modalCarrinho.show();
    });

    btnPagar.addEventListener("click", () => {
        if (carrinho.length === 0) return alert("Seu carrinho está vazio!");
        modalCarrinho.hide();
        setTimeout(() => modalCheckout.show(), 300);
    });

    document.getElementById("checkoutForm").addEventListener("submit", async e => {
        e.preventDefault();

        const nome = nomeInput.value.trim();
        const email = emailInput.value.trim();
        const cpf = cpfInput.value.trim();

        if (!nome || !email || !cpf) return alert("Preencha tudo!");

        const items = carrinho.map(i => ({
            name: i.name,
            quantity: i.quantity,
            unit_amount: i.unit_amount
        }));

        const total = calcularTotal() / 100;

        modalCheckout.hide();
        modalLoader.show();

        try {
            const res = await fetch("/pagar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome, email, cpf, items, total })
            });

            const data = await res.json();

            if (res.ok && data.checkout_url) {
                pagamentoId = data.pagamento_id;
                localStorage.removeItem(STORAGE_KEY);
                window.location.href = data.checkout_url;
            } else alert(data.error || "Erro no pagamento");

        } catch {
            alert("Erro de conexão");
        }

        modalLoader.hide();
    });

    async function carregarComentarios() {
        const cont = document.getElementById("comentariosContainer");
        cont.innerHTML = "<p>Carregando...</p>";

        try {
            const res = await fetch("/comentarios");
            const comentarios = await res.json();
            cont.innerHTML = "";

            if (!comentarios.length) {
                cont.innerHTML = "<p>Nenhum comentário ainda 💌</p>";
                return;
            }

            comentarios.forEach(c => {
                const div = document.createElement("div");
                div.classList.add("comentario", "mb-3", "p-3", "bg-light", "rounded");
                div.innerHTML = `<strong>${c.convidado_nome}</strong><br>${c.convidado_comentario}`;
                cont.appendChild(div);
            });

        } catch {
            cont.innerHTML = "<p>Erro ao carregar comentários 😔</p>";
        }
    }

    const menuToggle = document.getElementById("menu-toggle");
    const navLinks = document.getElementById("nav-links");

    menuToggle.addEventListener("click", () => {
        navLinks.classList.toggle("ativo");
        menuToggle.classList.toggle("ativo");
    });

    navLinks.querySelectorAll("a").forEach(l =>
        l.addEventListener("click", () => {
            navLinks.classList.remove("ativo");
            menuToggle.classList.remove("ativo");
        })
    );

    carregarCarrinho();
    ligarBotoesAdicionar();
    carregarComentarios();
});
