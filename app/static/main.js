const STORAGE_KEY = "carrinho_ana_pietro";
let carrinho = [];

// --- UTILITÁRIOS ---
const formatBRL = (cents) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function mascaraCPF(value) {
    return value
        .replace(/\D/g, "")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
        .substring(0, 14);
}

function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto == 10) || (resto == 11)) resto = 0;
    if (resto != parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto == 10) || (resto == 11)) resto = 0;
    if (resto != parseInt(cpf.substring(10, 11))) return false;
    return true;
}

// --- COMENTÁRIOS ---
async function carregarComentarios() {
    const cont = document.getElementById("comentariosContainer");
    try {
        const res = await fetch("/comentarios");
        const comentarios = await res.json();
        cont.innerHTML = "";
        if (!comentarios.length) {
            cont.innerHTML = "<p>Nenhum comentário ainda 💌</p>";
            return;
        }
        comentarios.forEach((c) => {
            const div = document.createElement("div");
            div.className = "comentario-item";
            div.innerHTML = `<strong>${c.convidado_nome}</strong><br><span>${c.convidado_comentario}</span>`;
            cont.appendChild(div);
        });
    } catch (e) {
        cont.innerHTML = "<p>Erro ao carregar comentários 😔</p>";
    }
}

// --- LÓGICA DO CARRINHO ---
function salvarCarrinho() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho));
    atualizarBadge();
}

function carregarCarrinho() {
    carrinho = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    atualizarBadge();
}

function atualizarBadge() {
    const count = carrinho.reduce((acc, i) => acc + i.quantity, 0);
    document.getElementById("cart-count").textContent = count;
}

function renderizarCarrinho() {
    const container = document.getElementById("cart-items");
    const totalDisplay = document.getElementById("cart-total-value");
    container.innerHTML = "";
    let total = 0;

    if (carrinho.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:10px;">Vazio</p>`;
        totalDisplay.textContent = formatBRL(0);
        return;
    }

    carrinho.forEach((item) => {
        const subtotal = item.unit_amount * item.quantity;
        total += subtotal;
        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <div><strong>${item.name}</strong><br><small>${formatBRL(item.unit_amount)}</small></div>
            <div style="display:flex; align-items:center; gap:8px;">
                <div class="qty-controls">
                    <button onclick="mudarQtd('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="mudarQtd('${item.id}', 1)">+</button>
                </div>
                <button onclick="removerDoCarrinho('${item.id}')" style="border:none; background:none; color:red; cursor:pointer; font-size:1.2rem;">&times;</button>
            </div>`;
        container.appendChild(div);
    });
    totalDisplay.textContent = formatBRL(total);
}

window.mudarQtd = (id, delta) => {
    const item = carrinho.find(i => i.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) return removerDoCarrinho(id);
        salvarCarrinho(); renderizarCarrinho();
    }
};

window.removerDoCarrinho = (id) => {
    carrinho = carrinho.filter(i => i.id !== id);
    salvarCarrinho(); renderizarCarrinho();
};

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    carregarCarrinho();
    carregarComentarios();

    // Timer
    const timer = () => {
        const diff = new Date("2026-01-10T00:00:00") - new Date();
        if (diff > 0) {
            document.getElementById("dias").textContent = Math.floor(diff / 86400000);
            document.getElementById("horas").textContent = Math.floor((diff % 86400000) / 3600000);
            document.getElementById("minutos").textContent = Math.floor((diff % 3600000) / 60000);
        }
    };
    setInterval(timer, 1000); timer();

    // CPF Máscara
    const cpfInput = document.getElementById("cpf");
    cpfInput.addEventListener("input", (e) => {
        e.target.value = mascaraCPF(e.target.value);
    });

    // BOTÃO ADICIONAR
    document.querySelectorAll(".add-to-cart").forEach(btn => {
        btn.onclick = () => {
            const {id, name, price} = btn.dataset;
            const itemId = id || name; 
            const item = carrinho.find(i => i.id === itemId);

            if(item) {
                item.quantity++; 
            } else {
                carrinho.push({
                    id: itemId, 
                    name: name, 
                    unit_amount: Math.round(parseFloat(price) * 100), 
                    quantity: 1
                });
            }
            salvarCarrinho();
            renderizarCarrinho();

            const icon = document.getElementById("floating-cart");
            icon.classList.remove("cart-pop");
            void icon.offsetWidth;
            icon.classList.add("cart-pop");
        };
    });

    // Modais e Navegação
    const cartM = document.getElementById("cart-modal");
    const checkM = document.getElementById("checkout-modal");

    document.getElementById("floating-cart").onclick = () => { renderizarCarrinho(); cartM.style.display="flex"; };
    document.getElementById("close-cart").onclick = () => cartM.style.display="none";
    document.getElementById("keep-shopping").onclick = () => cartM.style.display="none";
    document.getElementById("close-checkout").onclick = () => checkM.style.display="none";

    document.getElementById("btn-ir-checkout").onclick = () => {
        if(!carrinho.length) return alert("Seu carrinho está vazio!");
        cartM.style.display="none";
        checkM.style.display="flex";
    };

    // --- ENVIO DO PAGAMENTO (IGUAL AO ANTIGO) ---
    document.getElementById("checkoutForm").onsubmit = async (e) => {
        e.preventDefault();
        
        const nome = document.getElementById("nome").value.trim();
        const email = document.getElementById("email").value.trim();
        const telefone = document.getElementById("telefone").value.trim();
        const cpfRaw = cpfInput.value;

        if (!validarCPF(cpfRaw)) {
            alert("⚠️ Por favor, insira um CPF válido.");
            cpfInput.focus();
            return;
        }

        const items = carrinho.map(i => ({
            name: i.name,
            quantity: i.quantity,
            unit_amount: i.unit_amount
        }));

        const totalCentavos = carrinho.reduce((acc, i) => acc + i.unit_amount * i.quantity, 0);

        // Mostrar algum feedback de carregamento se desejar
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Processando...";

        try {
            const res = await fetch("/pagar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    nome, 
                    email, 
                    cpf: cpfRaw.replace(/\D/g, ""), 
                    telefone,
                    items, 
                    total: totalCentavos / 100 
                })
            });

            const data = await res.json();

            if (res.ok && data.checkout_url) {
                localStorage.removeItem(STORAGE_KEY);
                window.location.href = data.checkout_url;
            } else {
                alert(data.error || "Erro ao gerar pagamento");
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Gerar Pagamento";
            }
        } catch (err) {
            alert("Erro de conexão com o servidor.");
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Gerar Pagamento";
        }
    };

    // Vídeo e Galeria
    const video = document.getElementById("introVideo");
    if(window.innerWidth > 768) { if(video) video.pause(); } 
    else { if(video) video.onended = () => { document.getElementById("mobile-video-container").style.display="none"; document.getElementById("countdown").classList.remove("hidden"); }; }

    document.querySelectorAll(".thumb").forEach(t => {
        t.onclick = () => {
            document.getElementById("carouselImage").src = t.dataset.image;
            document.querySelectorAll(".thumb").forEach(x => x.classList.remove("active"));
            t.classList.add("active");
        };
    });
});