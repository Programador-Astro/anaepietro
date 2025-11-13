from flask import (
    jsonify, request, render_template, redirect,
    url_for, flash
)
from app import app, db
from app.utils import enviar_email, gerar_token_seguro
from app.models import Comentario, Pagamento, NotificacaoPagBank, Lista_presenca, Retorno
from datetime import datetime
import requests
import uuid
import os
from dotenv import load_dotenv
import json
load_dotenv()

LOG_FILE = ".pagbank_logs.log"


def registrar_log(titulo: str, conteudo: dict):
    """Grava logs estruturados em arquivo .log"""
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"\n{'='*80}\n")
            f.write(f"🕓 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"📘 {titulo}\n")
            f.write(json.dumps(conteudo, indent=2, ensure_ascii=False))
            f.write(f"\n{'='*80}\n")
    except Exception as e:
        print("⚠️ Erro ao registrar log:", e)




# Constante simbólica para tokens já utilizados
TOKEN_USADO = 101


# ==============================
# 🌍 Rotas principais
# =============================+

@app.route('/')
def index():
    """Página inicial do site."""
    return render_template('index.html')

@app.route('/pagar1', methods=['POST'])
def pagar1():
    """Inicia o processo de pagamento via PagBank com múltiplos itens."""
    from traceback import format_exc
    try:
        token = gerar_token_seguro()
        data = request.json or {}
        print("📦 Dados recebidos para pagamento:", data)

        # Log de auditoria
        retorno = Retorno(str_ret=json.dumps(data, ensure_ascii=False))
        db.session.add(retorno)
        db.session.commit()

        nome = data.get("nome")
        email = data.get("email")
        cpf = data.get("cpf")
        items = data.get("items", [])
        total = float(data.get("total", 0))

        if not nome or not email or not cpf or not items:
            return jsonify({"error": "Dados incompletos."}), 400

        TOKEN = os.getenv('TOKEN')
        url_api = "https://sandbox.api.pagseguro.com/checkouts"

        headers = {
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        }

        # ===================================================
        # 1️⃣ Gerar um reference_id único para vincular notificações
        # ===================================================
        reference_id = f"REF-{uuid.uuid4()}"

        # ===================================================
        # 2️⃣ Estrutura dos itens (com reference_id incluído)
        # ===================================================
        payload_items = []
        for i, item in enumerate(items, start=1):
            payload_items.append({
                "name": item.get("name", f"Item {i}"),
                "quantity": int(item.get("quantity", 1)),
                "unit_amount": int(item.get("unit_amount", 0)),
                "reference_id": reference_id   # ✅ ESSENCIAL para o webhook
            })

        # ===================================================
        # 3️⃣ Payload principal do checkout
        # ===================================================
        payload = {
            "reference_id": reference_id,
            "customer": {
                "name": nome,
                "email": email,
                "tax_id": cpf
            },
            "items": payload_items,
            "notification_urls": ["https://anaepietro-env.up.railway.app/notificacaopagbank"],
            "redirect_url": f"https://anaepietro-env.up.railway.app/comentar/{token}"
        }

        print("📤 Enviando payload ao PagBank:", json.dumps(payload, indent=2, ensure_ascii=False))

        # ===================================================
        # 4️⃣ Envia ao PagBank
        # ===================================================
        resp = requests.post(url_api, headers=headers, json=payload)
        resp.raise_for_status()
        resp_json = resp.json()
        print("📥 Retorno da API PagBank:", json.dumps(resp_json, indent=2, ensure_ascii=False))

        # ===================================================
        # 5️⃣ Extrair informações importantes
        # ===================================================
        order_id = resp_json.get("id")        # ID oficial do PagBank (CHEC_...)
        charge_id = None
        status = "PENDENTE"

        if resp_json.get("charges"):
            charge_id = resp_json["charges"][0].get("id")
            status = resp_json["charges"][0].get("status", "PENDENTE")

        # Link de pagamento (rel="PAY")
        link_checkout = next(
            (link["href"] for link in resp_json.get("links", []) if link.get("rel") == "PAY"),
            None
        )

        if not link_checkout:
            return jsonify({"error": "Link de checkout não encontrado"}), 500

        # ===================================================
        # 6️⃣ Gravar no banco
        # ===================================================
        novo_pagamento = Pagamento(
            nome=nome,
            email_site=email,
            cpf=cpf,
            presente=f"{len(items)} itens",
            valor=total,
            status=status,
            id_pagbank=reference_id,   # ← usamos o mesmo reference_id para vincular
            charge_id=charge_id,
            token=token,
            items=json.dumps(items, ensure_ascii=False)
        )

        db.session.add(novo_pagamento)
        db.session.commit()

        print(f"✅ Pagamento criado | ID interno: {novo_pagamento.id} | Ref: {reference_id}")

        # ===================================================
        # 7️⃣ Retorno para o front
        # ===================================================
        return jsonify({
            "checkout_url": link_checkout,
            "pagamento_id": novo_pagamento.id,
            "reference_id": reference_id,
            "order_id": order_id,
            "charge_id": charge_id,
            "status": status
        }), 200

    except Exception as e:
        print("🔥 ERRO INTERNO EM /pagar:", e)
        print(format_exc())
        return jsonify({"error": "Erro interno no servidor"}), 500
    
# ============================================================
# 🔹 ROTA /pagar — Envia requisição ao PagBank e loga tudo
# ============================================================
@app.route('/pagar', methods=['POST'])
def pagar():
    from traceback import format_exc
    try:
        token = gerar_token_seguro()
        data = request.json or {}
        print("📦 Dados recebidos para pagamento:", data)

        # Log inicial da solicitação recebida
        registrar_log("REQUEST RECEBIDO DO FRONTEND /pagar", data)

        retorno = Retorno(str_ret=json.dumps(data, ensure_ascii=False))
        db.session.add(retorno)
        db.session.commit()

        nome = data.get("nome")
        email = data.get("email")
        cpf = data.get("cpf")
        items = data.get("items", [])
        total = float(data.get("total", 0))

        if not nome or not email or not cpf or not items:
            return jsonify({"error": "Dados incompletos."}), 400

        TOKEN = os.getenv('TOKEN')
        url_api = "https://sandbox.api.pagseguro.com/checkouts"

        headers = {
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        }

        reference_id = f"REF-{uuid.uuid4()}"

        payload_items = []
        for i, item in enumerate(items, start=1):
            payload_items.append({
                "name": item.get("name", f"Item {i}"),
                "quantity": int(item.get("quantity", 1)),
                "unit_amount": int(item.get("unit_amount", 0)),
                "reference_id": reference_id
            })

        payload = {
            "reference_id": reference_id,
            "customer": {
                "name": nome,
                "email": email,
                "tax_id": cpf
            },
            "items": payload_items,
            "notification_urls": ["https://www.anavitoriaepietro.com.br/notificacaopagbank"],
            "redirect_url": f"https://www.anavitoriaepietro.com.br/comentar/{token}"
        }

        print("📤 Enviando payload ao PagBank:", json.dumps(payload, indent=2, ensure_ascii=False))

        # Log do request ao PagBank
        registrar_log("REQUEST ENVIADO PARA PAGBANK /checkouts", {
            "url": url_api,
            "headers": headers,
            "body": payload
        })

        resp = requests.post(url_api, headers=headers, json=payload)
        resp.raise_for_status()
        resp_json = resp.json()

        print("📥 Retorno da API PagBank:", json.dumps(resp_json, indent=2, ensure_ascii=False))

        # Log da resposta recebida
        registrar_log("RESPONSE RECEBIDO DO PAGBANK /checkouts", resp_json)

        order_id = resp_json.get("id")
        charge_id = None
        status = "PENDENTE"

        if resp_json.get("charges"):
            charge_id = resp_json["charges"][0].get("id")
            status = resp_json["charges"][0].get("status", "PENDENTE")

        link_checkout = next(
            (link["href"] for link in resp_json.get("links", []) if link.get("rel") == "PAY"),
            None
        )

        if not link_checkout:
            return jsonify({"error": "Link de checkout não encontrado"}), 500

        novo_pagamento = Pagamento(
            nome=nome,
            email_site=email,
            cpf=cpf,
            presente=f"{len(items)} itens",
            valor=total,
            status=status,
            id_pagbank=reference_id,
            charge_id=charge_id,
            token=token,
            items=json.dumps(items, ensure_ascii=False)
        )

        db.session.add(novo_pagamento)
        db.session.commit()

        print(f"✅ Pagamento criado | ID interno: {novo_pagamento.id} | Ref: {reference_id}")

        return jsonify({
            "checkout_url": link_checkout,
            "pagamento_id": novo_pagamento.id,
            "reference_id": reference_id,
            "order_id": order_id,
            "charge_id": charge_id,
            "status": status
        }), 200

    except Exception as e:
        print("🔥 ERRO INTERNO EM /pagar:", e)
        print(format_exc())
        registrar_log("ERRO EM /pagar", {"erro": str(e), "trace": format_exc()})
        return jsonify({"error": "Erro interno no servidor"}), 500



@app.route('/pagamento-status/<int:id_pagamento>', methods=['GET'])
def verificar_status_pagamento(id_pagamento):
    """Verifica o status de um pagamento existente."""
    try:
        pagamento = Pagamento.query.filter_by(id=id_pagamento).first()
        if not pagamento:
            return jsonify({"error": "Pagamento não encontrado"}), 404

        status = "PAGO" if pagamento.status == "PAID" else "PENDENTE"
        return jsonify({"status": status, "valor": pagamento.valor, "nome": pagamento.nome}), 200

    except Exception as e:
        print("🔥 ERRO EM /pagamento-status:", e)
        return jsonify({"error": "Erro ao verificar status"}), 500


@app.route('/sucesso')
def sucesso():
    """Página exibida após pagamento bem-sucedido."""
    return "<h1>Pagamento confirmado com sucesso!</h1>"


@app.route('/cancelado')
def cancelado():
    """Página exibida em caso de cancelamento."""
    return "<h1>Pagamento cancelado.</h1>"


# ==============================
# 📡 Webhook PagBank
# ==============================

@app.route('/notificacaopagbank1', methods=['POST'])
def notificacao_pagbank1():
    """
    Recebe notificações do PagBank, atualiza o pagamento e envia o token por e-mail.
    Compatível com fluxo CHECKOUT -> ORDER.
    """
    try:
        payload = request.get_json(silent=True) or {}
        headers = dict(request.headers)
        print("📬 Notificação recebida do PagBank:", json.dumps(payload, indent=2, ensure_ascii=False))

        # ======================================================
        # 1️⃣ Guarda a notificação completa no banco
        # ======================================================
        notificacao = NotificacaoPagBank(payload=payload, headers=headers)
        db.session.add(notificacao)
        db.session.commit()

        # ======================================================
        # 2️⃣ Extrai o reference_id (é o ID do checkout original)
        # ======================================================
        reference_id = None
        items = payload.get("items", [])
        if items:
            reference_id = items[0].get("reference_id")

        # ======================================================
        # 3️⃣ Extrai o novo status (se houver charges)
        # ======================================================
        novo_status = None
        if payload.get("charges"):
            novo_status = payload["charges"][0].get("status", "PENDING")
        else:
            novo_status = payload.get("status", "PENDING")

        # ======================================================
        # 4️⃣ Atualiza o pagamento no banco
        # ======================================================
        if reference_id:
            pagamento = Pagamento.query.filter_by(id_pagbank=reference_id).first()

            if pagamento:
                pagamento.status = novo_status

                # Atualiza informações do cliente
                customer = payload.get("customer", {})
                pagamento.nome_pagbank = customer.get("name")
                pagamento.email_pagbank = customer.get("email")

                db.session.commit()
                print(f"🔄 Pagamento {reference_id} atualizado para status: {novo_status}")

                # ======================================================
                # 5️⃣ Se foi pago, envia o e-mail com o token
                # ======================================================
                if novo_status.upper() == "PAID":
                    assunto = "🎉 Pagamento confirmado!"
                    mensagem_html = f"""
                        <h2>Olá, {pagamento.nome or 'amigo(a)'}!</h2>
                        <p>Seu presente foi recebido com sucesso 💖</p>
                        <p>Use este token para comentar: <b>{pagamento.token}</b></p>
                        <p>Obrigado por participar desse momento especial!</p>
                        <p><strong>Ana & Pietro</strong></p>
                    """
                    try:
                        enviar_email(pagamento.email_pagbank or pagamento.email_site, assunto, mensagem_html)
                        print(f"📧 E-mail enviado para {pagamento.email_pagbank or pagamento.email_site}")
                    except Exception as e:
                        print("⚠️ Erro ao enviar e-mail:", e)
            else:
                print(f"⚠️ Nenhum pagamento encontrado para reference_id: {reference_id}")
        else:
            print("⚠️ Notificação sem reference_id. Payload incompleto?")

        return jsonify({"message": "Notificação processada com sucesso"}), 200

    except Exception as e:
        print("❌ Erro em /notificacaopagbank:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 200



# ============================================================
# 🔹 ROTA /notificacaopagbank — Recebe notificações e loga tudos
# ============================================================
@app.route('/notificacaopagbank', methods=['POST'])
def notificacao_pagbank():
    try:
        payload = request.get_json(silent=True) or {}
        headers = dict(request.headers)
        print("📬 Notificação recebida do PagBank:", json.dumps(payload, indent=2, ensure_ascii=False))

        # Log completo da notificação recebida
        registrar_log("NOTIFICAÇÃO RECEBIDA DO PAGBANK /notificacaopagbank", {
            "headers": headers,
            "body": payload
        })

        notificacao = NotificacaoPagBank(payload=payload, headers=headers)
        db.session.add(notificacao)
        db.session.commit()

        reference_id = None
        items = payload.get("items", [])
        if items:
            reference_id = items[0].get("reference_id")

        novo_status = None
        if payload.get("charges"):
            novo_status = payload["charges"][0].get("status", "PENDING")
        else:
            novo_status = payload.get("status", "PENDING")

        if reference_id:
            pagamento = Pagamento.query.filter_by(id_pagbank=reference_id).first()

            if pagamento:
                pagamento.status = novo_status

                customer = payload.get("customer", {})
                pagamento.nome_pagbank = customer.get("name")
                pagamento.email_pagbank = customer.get("email")

                db.session.commit()
                print(f"🔄 Pagamento {reference_id} atualizado para status: {novo_status}")

                if novo_status.upper() == "PAID":
                    assunto = "🎉 Pagamento confirmado!"
                    mensagem_html = f"""
                        <h2>Olá, {pagamento.nome or 'amigo(a)'}!</h2>
                        <p>Seu presente foi recebido com sucesso 💖</p>
                        <p>Use este token para comentar: <b>{pagamento.token}</b></p>
                        <p>Obrigado por participar desse momento especial!</p>
                        <p><strong>Ana & Pietro</strong></p>
                    """
                    try:
                        enviar_email(pagamento.email_pagbank or pagamento.email_site, assunto, mensagem_html)
                        print(f"📧 E-mail enviado para {pagamento.email_pagbank or pagamento.email_site}")
                    except Exception as e:
                        print("⚠️ Erro ao enviar e-mail:", e)
                        registrar_log("ERRO AO ENVIAR E-MAIL", {"erro": str(e)})

                # Log do processamento da notificação
                registrar_log("PROCESSAMENTO FINALIZADO DE NOTIFICAÇÃO", {
                    "reference_id": reference_id,
                    "status_atual": novo_status
                })

            else:
                print(f"⚠️ Nenhum pagamento encontrado para reference_id: {reference_id}")
        else:
            print("⚠️ Notificação sem reference_id. Payload incompleto?")

        return jsonify({"message": "Notificação processada com sucesso"}), 200

    except Exception as e:
        print("❌ Erro em /notificacaopagbank:", e)
        traceback.print_exc()
        registrar_log("ERRO EM /notificacaopagbank", {"erro": str(e), "trace": traceback.format_exc()})
        return jsonify({"error": str(e)}), 200


# ==============================
# 💬 Comentários e Tokens
# ==============================

@app.route("/comentarios", methods=["GET"])
def get_comentarios():
    """Lista todos os comentários em formato JSON."""
    comentarios = Comentario.query.order_by(Comentario.data_criacao.desc()).all()
    return jsonify([
        {
            "id": c.id,
            "convidado_nome": c.convidado_nome,
            "convidado_comentario": c.convidado_comentario,
            "data_criacao": c.data_criacao.strftime("%d/%m/%Y %H:%M")
        } for c in comentarios
    ])


@app.route("/comentar/", defaults={'token': None}, methods=["GET", "POST"])
@app.route("/comentar/<token>", methods=["GET", "POST"])
def criar_comentario(token):
    """
    Página para deixar comentários.
    - Verifica o token antes de liberar o campo.
    - Após comentar, marca o token como usado.
    """
    # [POST] — Envio do comentário
    if request.method == "POST":
        comentario_texto = request.form.get("comentario", "").strip()
        token = request.form.get("token", "").strip()

        if not token:
            flash("Token não fornecido.", "danger")
            return render_template("comentar.html", token="")

        pagamento = Pagamento.query.filter_by(token=token).first()
        if not pagamento:
            flash("Token inválido. Verifique o e-mail e tente novamente.", "danger")
            return render_template("comentar.html", token="")

        if pagamento.status != "PAID":
            flash("Pagamento ainda não foi confirmado.", "warning")
            return render_template("comentar.html", token="")

        if pagamento.token == TOKEN_USADO:
            flash("Este token já foi utilizado.", "warning")
            return render_template("comentar.html", token="")

        if not comentario_texto:
            flash("O comentário não pode estar vazio.", "warning")
            return render_template("comentar.html", token=token)

        # Cria e salva o comentário
        novo_comentario = Comentario(
            convidado_nome=pagamento.nome,
            convidado_comentario=comentario_texto,
            pagamento_id=pagamento.id
        )
        db.session.add(novo_comentario)

        pagamento.token = TOKEN_USADO  # Marca como usado
        db.session.commit()

        flash("Comentário salvo com sucesso! 🎉", "success")
        return redirect(url_for("index"))

    # [GET] — Renderiza a página
    if not token:
        return render_template("comentar.html", token="")

    pagamento = Pagamento.query.filter_by(token=token).first()
    if not pagamento:
        flash("Token inválido.", "danger")
        return render_template("comentar.html", token="")

    if pagamento.status != "PAID":
        flash("Pagamento ainda não foi confirmado.", "warning")
        return render_template("comentar.html", token="")

    return render_template("comentar.html", token=token)


@app.route("/verificar_token", methods=["POST"])
def verificar_token():
    """
    Verifica se o token informado é válido e ativo (via AJAX).
    Retorna JSON com o resultado.
    """
    data = request.get_json() or {}
    token = data.get("token", "").strip()

    if not token:
        return jsonify({"valido": False, "mensagem": "Token não fornecido."}), 200

    pagamento = Pagamento.query.filter_by(token=token).first()
    if not pagamento:
        return jsonify({"valido": False, "mensagem": "Token inválido."}), 200

    if pagamento.status != "PAID":
        return jsonify({"valido": False, "mensagem": "Pagamento ainda não confirmado."}), 200

    if pagamento.token == TOKEN_USADO:
        return jsonify({"valido": False, "mensagem": "Este token já foi utilizado."}), 200

    return jsonify({"valido": True, "mensagem": "Token válido!"}), 200


# ==============================
# 📋 Lista de presença
# ==============================

@app.route('/lista/', methods=['GET', 'POST'])
def lista_convidados():
    """
    Gerencia a lista de presença dos convidados.
    - GET: mostra o formulário
    - POST: cadastra ou pesquisa convidados
    """
    if request.method == 'GET':
        return render_template('lista_convidados.html')

    metodo = request.form.get('metodo')

    if metodo == 'cadastrar':
        nome = request.form.get('nome')
        telefone = request.form.get('telefone')
        email = request.form.get('email')

        existente = Lista_presenca.query.filter_by(nome=nome).first()
        if existente:
            flash(f'{nome} já está na lista.', 'warning')
            return render_template('lista_convidados.html')

        convidado = Lista_presenca(nome=nome, tell=telefone, email=email)
        db.session.add(convidado)
        db.session.commit()

        flash('Presença confirmada com sucesso!', 'success')
        return render_template('lista_convidados.html')

    elif metodo == 'pesquisar':
        nome = request.form.get('nome')
        convidado = Lista_presenca.query.filter_by(nome=nome).first()

        if not convidado:
            flash(f'Nenhum convidado chamado {nome} encontrado.', 'warning')
        elif convidado.status == 'Pendente':
            flash(f'{convidado.nome}, seu status é pendente.', 'info')
        elif convidado.status == 'Confirmada':
            flash(f'{convidado.nome}, sua presença está confirmada! 🎉', 'success')

        return render_template('lista_convidados.html')


@app.route('/manager/<token>', methods=['GET'])
def manager(token):
    """Painel de administração da lista de presença (token simples)."""
    if token == 'admpi':
        lista_presenca = Lista_presenca.query.all()
        return render_template('manager.html', lista_presencas=lista_presenca)
    return redirect(url_for('index'))


@app.route('/alterar_status_convidado/<int:presenca_id>', methods=['POST'])
def alterar_status_convidado(presenca_id):
    """Atualiza o status de um convidado via painel admin."""
    novo_status = request.form.get('status')

    if not novo_status:
        flash('Status não fornecido.', 'danger')
        return redirect(url_for('manager', token='admpi'))

    presenca = db.session.get(Lista_presenca, presenca_id)
    if not presenca:
        flash('Convidado não encontrado.', 'danger')
        return redirect(url_for('manager', token='admpi'))

    presenca.status = novo_status
    db.session.commit()

    flash(f'Status de {presenca.nome} atualizado para {novo_status}.', 'success')
    return redirect(url_for('manager', token='admpi'))
