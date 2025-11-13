from flask import (
    jsonify, request, render_template, redirect,
    url_for, flash, current_app, Blueprint
)

from app.db import db
from app.utils import enviar_email, gerar_token_seguro
from app.models import Comentario, Pagamento, NotificacaoPagBank, Lista_presenca, Retorno
from datetime import datetime
import requests
import uuid
import os
from dotenv import load_dotenv
import json
import traceback

load_dotenv()

LOG_FILE = ".pagbank_logs.log"
TOKEN_USADO = 101

routes_bp = Blueprint('routes_bp', __name__)

# ============================================================
# 🧾 Função auxiliar: grava logs estruturados
# ============================================================


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


# ============================================================
# 🌍 Rotas principais
# ============================================================

@routes_bp.route('/')
def index():
    """Página inicial do site."""
    return render_template('index.html')


# ============================================================
# 💰 Pagamento via PagBank
# ============================================================
@routes_bp.route('/pagar', methods=['POST'])
def pagar():
    """Cria checkout no PagBank e salva o pagamento."""
    from traceback import format_exc
    try:
        token = gerar_token_seguro()
        data = request.json or {}
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
        payload_items = [{
            "name": i.get("name", f"Item {idx+1}"),
            "quantity": int(i.get("quantity", 1)),
            "unit_amount": int(i.get("unit_amount", 0)),
            "reference_id": reference_id
        } for idx, i in enumerate(items)]

        payload = {
            "reference_id": reference_id,
            "customer": {"name": nome, "email": email, "tax_id": cpf},
            "items": payload_items,
            "notification_urls": ["https://www.anavitoriaepietro.com.br/notificacaopagbank"],
            "redirect_url": f"https://www.anavitoriaepietro.com.br/comentar/{token}"
        }

        registrar_log("REQUEST ENVIADO PARA PAGBANK /checkouts", payload)

        resp = requests.post(url_api, headers=headers, json=payload)
        resp.raise_for_status()
        resp_json = resp.json()
        registrar_log("RESPONSE RECEBIDO DO PAGBANK /checkouts", resp_json)

        # Extrair dados relevantes
        order_id = resp_json.get("id")
        charge = resp_json.get("charges", [{}])[0]
        charge_id = charge.get("id")
        status = charge.get("status", "PENDENTE")

        link_checkout = next(
            (l["href"] for l in resp_json.get("links", []) if l.get("rel") == "PAY"),
            None
        )
        if not link_checkout:
            return jsonify({"error": "Link de checkout não encontrado"}), 500

        # Salvar no banco
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

        return jsonify({
            "checkout_url": link_checkout,
            "pagamento_id": novo_pagamento.id,
            "reference_id": reference_id,
            "order_id": order_id,
            "charge_id": charge_id,
            "status": status
        }), 200

    except Exception as e:
        print("🔥 ERRO EM /pagar:", e)
        registrar_log("ERRO EM /pagar", {"erro": str(e), "trace": format_exc()})
        return jsonify({"error": "Erro interno no servidor"}), 500


# ============================================================
# 📡 Webhook PagBank
# ============================================================
@routes_bp.route('/notificacaopagbank', methods=['POST'])
def notificacao_pagbank():
    """Recebe notificações do PagBank e atualiza o pagamento."""
    try:
        payload = request.get_json(silent=True) or {}
        headers = dict(request.headers)
        registrar_log("NOTIFICAÇÃO RECEBIDA DO PAGBANK", {"headers": headers, "body": payload})

        notificacao = NotificacaoPagBank(payload=payload, headers=headers)
        db.session.add(notificacao)
        db.session.commit()

        reference_id = payload.get("items", [{}])[0].get("reference_id")
        novo_status = (
            payload.get("charges", [{}])[0].get("status")
            or payload.get("status", "PENDING")
        )

        if reference_id:
            pagamento = Pagamento.query.filter_by(id_pagbank=reference_id).first()
            if pagamento:
                pagamento.status = novo_status
                customer = payload.get("customer", {})
                pagamento.nome_pagbank = customer.get("name")
                pagamento.email_pagbank = customer.get("email")
                db.session.commit()

                if novo_status.upper() == "PAID":
                    assunto = "🎉 Pagamento confirmado!"
                    url_comentario = f"https://www.anavitoriaepietro.com.br/comentar/{pagamento.token}"
                    mensagem_html = f"""
                    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                        <h2 style="color: #198754;">Olá, {pagamento.nome or 'amigo(a)'}!</h2>
                        <p>Seu presente foi recebido com sucesso 💖</p>
                        <p>Agora você pode deixar seu comentário usando o link abaixo:</p>
                        <p style="text-align:center; margin: 30px 0;">
                            <a href="{url_comentario}" 
                            style="
                                    background-color: #198754; 
                                    color: white; 
                                    padding: 12px 24px; 
                                    border-radius: 8px; 
                                    text-decoration: none;
                                    font-weight: bold;
                                    display: inline-block;
                            ">
                                Deixar Comentário
                            </a>
                        </p>
                        <p>Ou copie este token para acessar: <strong>{pagamento.token}</strong></p>
                        <p>Obrigado por participar desse momento especial!</p>
                        <p><strong>Ana & Pietro</strong></p>
                    </div>
                    """
                    try:
                        enviar_email(pagamento.email_pagbank or pagamento.email_site, assunto, mensagem_html)
                    except Exception as e:
                        registrar_log("ERRO AO ENVIAR E-MAIL", {"erro": str(e)})
            else:
                print(f"⚠️ Pagamento não encontrado: {reference_id}")

        return jsonify({"message": "Notificação processada com sucesso"}), 200

    except Exception as e:
        registrar_log("ERRO EM /notificacaopagbank", {"erro": str(e), "trace": traceback.format_exc()})
        return jsonify({"error": str(e)}), 200


# ============================================================
# 💬 Comentários
# ============================================================
@routes_bp.route("/comentarios", methods=["GET"])
def get_comentarios():
    """Lista comentários em JSON."""
    comentarios = Comentario.query.order_by(Comentario.data_criacao.desc()).all()
    return jsonify([
        {
            "id": c.id,
            "convidado_nome": c.convidado_nome,
            "convidado_comentario": c.convidado_comentario,
            "data_criacao": c.data_criacao.strftime("%d/%m/%Y %H:%M")
        } for c in comentarios
    ])


@routes_bp.route("/comentar/", defaults={'token': None}, methods=["GET", "POST"])
@routes_bp.route("/comentar/<token>", methods=["GET", "POST"])
def criar_comentario(token=''):
    """Página para comentar após o pagamento."""
    if request.method == "POST":
        comentario_texto = request.form.get("comentario", "").strip()
        token = request.form.get("token", "").strip()

        pagamento = Pagamento.query.filter_by(token=token).first()
        if not pagamento:
            flash("Token inválido.", "danger")
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

        novo_comentario = Comentario(
            convidado_nome=pagamento.nome,
            convidado_comentario=comentario_texto,
            pagamento_id=pagamento.id
        )
        db.session.add(novo_comentario)
        pagamento.token = TOKEN_USADO
        db.session.commit()

        flash("Comentário salvo com sucesso! 🎉", "success")
        return redirect('https://www.anavitoriaepietro.com.br/')

    if token == None:
        return render_template('comentar.html')

    return render_template('comentar.html', token=token)



@routes_bp.route("/verificar_token", methods=["POST"])
def verificar_token():
    """Verifica se o token é válido (AJAX)."""
    data = request.get_json() or {}
    token = data.get("token", "").strip()
    pagamento = Pagamento.query.filter_by(token=token).first()

    if not pagamento:
        return jsonify({"valido": False, "mensagem": "Token inválido."}), 200
    if pagamento.status != "PAID":
        return jsonify({"valido": False, "mensagem": "Pagamento não confirmado."}), 200
    if pagamento.token == TOKEN_USADO:
        return jsonify({"valido": False, "mensagem": "Token já utilizado."}), 200

    return jsonify({"valido": True, "mensagem": "Token válido!"}), 200


# ============================================================
# 🧍 Lista de presença
# ============================================================
@routes_bp.route('/lista/', methods=['GET', 'POST'])
def lista_convidados():
    """Gerencia a lista de presença."""
    if request.method == 'GET':
        return render_template('lista_convidados.html')

    metodo = request.form.get('metodo')
    nome = request.form.get('nome')

    if metodo == 'cadastrar':
        telefone = request.form.get('telefone')
        email = request.form.get('email')

        if Lista_presenca.query.filter_by(nome=nome).first():
            flash(f'{nome} já está na lista.', 'warning')
        else:
            convidado = Lista_presenca(nome=nome, tell=telefone, email=email)
            db.session.add(convidado)
            db.session.commit()
            flash('Presença confirmada com sucesso!', 'success')

    elif metodo == 'pesquisar':
        convidado = Lista_presenca.query.filter_by(nome=nome).first()
        if not convidado:
            flash(f'Nenhum convidado chamado {nome} encontrado.', 'warning')
        elif convidado.status == 'Pendente':
            flash(f'{convidado.nome}, seu status é pendente.', 'info')
        else:
            flash(f'{convidado.nome}, presença confirmada! 🎉', 'success')

    return render_template('lista_convidados.html')


@routes_bp.route('/manager/<token>', methods=['GET'])
def manager(token):
    """Painel admin simples para gerenciar presença."""
    if token == 'admpi':
        lista = Lista_presenca.query.all()
        return render_template('manager.html', lista_presencas=lista)
    return redirect(url_for('index'))


@routes_bp.route('/alterar_status_convidado/<int:presenca_id>', methods=['POST'])
def alterar_status_convidado(presenca_id):
    """Atualiza o status de um convidado via painel admin."""
    novo_status = request.form.get('status')
    presenca = db.session.get(Lista_presenca, presenca_id)

    if not presenca or not novo_status:
        flash('Erro ao atualizar.', 'danger')
    else:
        presenca.status = novo_status
        db.session.commit()
        flash(f'Status de {presenca.nome} atualizado.', 'success')

    return redirect(url_for('manager', token='admpi'))
