const STORAGE_KEY = "carrinho_ana_pietro";
let carrinho = [];

const formatBRL = (cents) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Máscara de CPF (000.000.000-00)
function mascaraCPF(value) {
    return value
        .replace(/\D/g, "") // Remove tudo que não é dígito
        .replace(/(\d{3})(\d)/, "$1.$2") // Coloca ponto após os primeiros 3 dígitos
        .replace(/(\d{3})(\d)/, "$1.$2") // Coloca ponto após os segundos 3 dígitos
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2") // Coloca hífen antes dos últimos 2 dígitos
        .substring(0, 14); // Limita o tamanho
}

// Validação Real de CPF (Algoritmo oficial)
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

// --- CARRINHO ---
function salvarCarrinho() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carrinho));
    atualizarBadge();
}

function carregarCarrinho() {
    carrinho = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    atualizarBadge();
}

function atualizarBadge() {
    document.getElementById("cart-count").textContent = carrinho.reduce((acc, i) => acc + i.quantity, 0);
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
        total += item.unit_amount * item.quantity;
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
                <button onclick="removerDoCarrinho('${item.id}')" style="border:none; background:none; color:red; cursor:pointer;">&times;</button>
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

    // TIMER (Funciona para mobile)
    const timer = () => {
        const diff = new Date("2026-01-10T00:00:00") - new Date();
        if (diff > 0) {
            document.getElementById("dias").textContent = Math.floor(diff / 86400000);
            document.getElementById("horas").textContent = Math.floor((diff % 86400000) / 3600000);
            document.getElementById("minutos").textContent = Math.floor((diff % 3600000) / 60000);
        }
    };
    setInterval(timer, 1000); timer();

    // Seleção dos elementos do Checkout
    const cpfInput = document.getElementById("cpf");
    const checkoutForm = document.getElementById("checkoutForm");

    // Aplicar Máscara enquanto digita
    cpfInput.addEventListener("input", (e) => {
        e.target.value = mascaraCPF(e.target.value);
    });

    // Validar no envio do formulário
    checkoutForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const cpfValue = cpfInput.value;

        if (!validarCPF(cpfValue)) {
            alert("⚠️ Por favor, insira um CPF válido.");
            cpfInput.style.borderColor = "red";
            cpfInput.focus();
            return;
        }

        cpfInput.style.borderColor = "#ddd";
        
        // Se chegar aqui, o CPF é válido. Prosseguir com o pagamento:
        console.log("CPF Válido! Iniciando checkout...");
        // Adicione aqui a chamada para sua API de pagamento
        alert("Processando seu presente... ❤️");
    };


    // LÓGICA DE VÍDEO (Apenas Mobile)
    const video = document.getElementById("introVideo");
    // Se a largura da tela for maior que 768px (PC), o CSS já esconde o vídeo container.
    // Mas garantimos aqui que ele pause para não gastar recursos.
    if(window.innerWidth > 768) {
        if(video) video.pause();
    } else {
        // Celular: quando acabar o vídeo, esconde o container do vídeo e mostra o countdown
        if(video) video.onended = () => { 
            document.getElementById("mobile-video-container").style.display="none"; 
            document.getElementById("countdown").classList.remove("hidden"); 
        };
    }

    // Galeria
    document.querySelectorAll(".thumb").forEach(t => {
        t.onclick = () => {
            document.getElementById("carouselImage").src = t.dataset.image;
            document.querySelectorAll(".thumb").forEach(x => x.classList.remove("active"));
            t.classList.add("active");
        };
    });

    // BOTÃO ADICIONAR (Animação de Pulinho)
    document.querySelectorAll(".add-to-cart").forEach(btn => {
    btn.onclick = () => {
        // Agora pegamos o name também para servir de ID caso não tenha um
        const {id, name, price} = btn.dataset;
        
        // Usamos o 'name' como chave única se o 'id' estiver vazio no HTML
        const itemId = id || name; 

        const item = carrinho.find(i => i.id === itemId);

        if(item) {
            item.quantity++; 
        } else {
            // Importante: multiplicar por 100 pois seu sistema usa centavos
            carrinho.push({
                id: itemId, 
                name: name, 
                unit_amount: Math.round(parseFloat(price) * 100), 
                quantity: 1
            });
        }
        
        salvarCarrinho();
        renderizarCarrinho();

        // Animação do ícone
        const icon = document.getElementById("floating-cart");
        icon.classList.remove("cart-pop");
        void icon.offsetWidth; // truque para resetar animação CSS
        icon.classList.add("cart-pop");
    };
});

    // Modais
    const cartM = document.getElementById("cart-modal");
    document.getElementById("floating-cart").onclick = () => { renderizarCarrinho(); cartM.style.display="flex"; };
    document.getElementById("close-cart").onclick = () => cartM.style.display="none";
    document.getElementById("keep-shopping").onclick = () => cartM.style.display="none";
    
    document.getElementById("btn-ir-checkout").onclick = () => {
        if(!carrinho.length) return;
        cartM.style.display="none";
        document.getElementById("checkout-modal").style.display="flex";
    };
    document.getElementById("close-checkout").onclick = () => document.getElementById("checkout-modal").style.display="none";
});