/* ============================================================
    1 — CONFIGURAÇÕES E ESTADO GLOBAL
============================================================ */
const STORAGE_KEY = "carrinho_ana_pietro";
let carrinho = [];

// Formatação para Moeda Brasileira
const formatBRL = (cents) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* ============================================================
    2 — VALIDAÇÃO DE CPF (ALGORITMO OFICIAL)
============================================================ */
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    
    let soma = 0, resto;

    // Primeiro dígito verificador
    for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    // Segundo dígito verificador
    soma = 0;
    for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
}

/* ============================================================
    3 — LÓGICA DO CARRINHO (PERSISTÊNCIA E RENDERIZAÇÃO)
============================================================ */
function salvarCarrinho() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho));
    atualizarBadge();
}

function carregarCarrinho() {
    try { 
        carrinho = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; 
    } catch { 
        carrinho = []; 
    }
    atualizarBadge();
}

function atualizarBadge() {
    const totalItens = carrinho.reduce((acc, i) => acc + i.quantity, 0);
    const badge = document.getElementById("cart-count");
    if(badge) badge.textContent = totalItens;
}

function renderizarCarrinho() {
    const container = document.getElementById("cart-items");
    if (!container) return;
    container.innerHTML = "";

    if (carrinho.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:20px;">Seu carrinho está vazio 😔</p>`;
        return;
    }

    let totalGeral = 0;
    carrinho.forEach(item => {
        const subtotal = item.unit_amount * item.quantity;
        totalGeral += subtotal;
        
        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>${formatBRL(item.unit_amount)}</small>
            </div>
            <div class="qty-controls">
                <button onclick="mudarQtd('${item.id}', -1)">-</button>
                <span style="margin:0 8px">${item.quantity}</span>
                <button onclick="mudarQtd('${item.id}', 1)">+</button>
            </div>
            <button class="delete-item" onclick="removerDoCarrinho('${item.id}')">&times;</button>
        `;
        container.appendChild(div);
    });

    const totalEl = document.createElement("div");
    totalEl.style.cssText = "text-align:right; margin-top:15px; font-weight:bold; border-top:1px solid #eee; padding-top:10px;";
    totalEl.innerHTML = `Total: ${formatBRL(totalGeral)}`;
    container.appendChild(totalEl);
}

// Funções globais para botões dinâmicos
window.mudarQtd = (id, delta) => {
    const item = carrinho.find(i => i.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) return removerDoCarrinho(id);
        salvarCarrinho();
        renderizarCarrinho();
    }
};

window.removerDoCarrinho = (id) => {
    carrinho = carrinho.filter(i => i.id !== id);
    salvarCarrinho();
    renderizarCarrinho();
};

/* ============================================================
    4 — INICIALIZAÇÃO E EVENTOS DOM
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    const inputCPF = document.getElementById("cpf");

    // Máscara de CPF em tempo real
    if (inputCPF) {
        inputCPF.addEventListener("input", (e) => {
            let v = e.target.value.replace(/\D/g, ""); // Remove não dígitos
            if (v.length > 11) v = v.slice(0, 11);
            
            // Aplica os símbolos
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
            
            e.target.value = v;
        });
    }

    carregarCarrinho();

    // Cronômetro do Casamento
    setInterval(() => {
        const diff = new Date("2026-01-10T00:00:00") - new Date();
        if (diff > 0) {
            document.getElementById("dias").innerText = Math.floor(diff / 864e5);
            document.getElementById("horas").innerText = Math.floor((diff % 864e5) / 36e5);
            document.getElementById("minutos").innerText = Math.floor((diff % 36e5) / 6e4);
            document.getElementById("segundos").innerText = Math.floor((diff % 6e4) / 1000);
        }
    }, 1000);

    // Botões de Adicionar ao Carrinho
    document.querySelectorAll(".add-to-cart").forEach(btn => {
        btn.onclick = () => {
            const { id, name, price } = btn.dataset;
            const unit_amount = Math.round(parseFloat(price) * 100); 
            const existente = carrinho.find(i => i.id === id);

            if (existente) existente.quantity++;
            else carrinho.push({ id, name, unit_amount, quantity: 1 });

            salvarCarrinho();
            
            // Efeito visual no ícone do carrinho
            const floating = document.getElementById("floating-cart");
            floating.classList.add("cart-pulse");
            setTimeout(() => floating.classList.remove("cart-pulse"), 300);
            
            btn.innerText = "Adicionado!";
            setTimeout(() => btn.innerText = "Adicionar", 800);
        };
    });

    // Modais
    const modalCart = document.getElementById("cart-modal");
    const modalCheckout = document.getElementById("checkout-modal");
    const modalLoader = document.getElementById("modalLoader");

    document.getElementById("floating-cart").onclick = () => {
        renderizarCarrinho();
        modalCart.style.display = "flex";
    };

    document.getElementById("close-cart").onclick = () => modalCart.style.display = "none";
    document.getElementById("close-checkout").onclick = () => modalCheckout.style.display = "none";

    document.getElementById("btn-ir-checkout").onclick = () => {
        if (carrinho.length === 0) return alert("Seu carrinho está vazio!");
        modalCart.style.display = "none";
        modalCheckout.style.display = "flex";
    };

    /* ============================================================
        5 — FINALIZAÇÃO (PAGBANK)
    ============================================================ */
    document.getElementById("checkoutForm").onsubmit = async (e) => {
        e.preventDefault();

        const nome = document.getElementById("nome").value.trim();
        const email = document.getElementById("email").value.trim();
        const cpfRaw = document.getElementById("cpf").value.replace(/\D/g, "");
        const telefone = document.getElementById("telefone").value.trim();

        // Validação Final antes do Envio
        if (!validarCPF(cpfRaw)) {
            alert("CPF Inválido! Por favor, confira os dados.");
            return;
        }

        const items = carrinho.map(i => ({
            name: i.name,
            quantity: i.quantity,
            unit_amount: i.unit_amount
        }));

        const total = carrinho.reduce((acc, i) => acc + (i.unit_amount * i.quantity), 0) / 100;

        modalCheckout.style.display = "none";
        modalLoader.style.display = "flex";

        try {
            const res = await fetch("/pagar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome, email, cpf: cpfRaw, telefone, items, total })
            });

            const data = await res.json();

            if (res.ok && data.checkout_url) {
                localStorage.removeItem(STORAGE_KEY);
                window.location.href = data.checkout_url;
            } else {
                alert(data.error || "Erro ao processar presente.");
                modalLoader.style.display = "none";
            }
        } catch (err) {
            alert("Erro de conexão. Tente novamente.");
            modalLoader.style.display = "none";
        }
    };
});

 git config --global user.email "programadorastro@gmail.com"