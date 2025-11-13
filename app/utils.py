#envio de email
from flask_mail import Message
from app import mail
import secrets, os
from dotenv import load_dotenv
import requests
load_dotenv()



def enviar_email(destinatario, assunto, mensagem_html):
    api_key = os.getenv("MAIL_PASSWORD")
    sender_email = os.getenv("MAIL_DEFAULT_SENDER")
    sender_name = os.getenv("MAIL_DEFAULT_SENDER")

    if not api_key:
        print("⚠️ API Key da Brevo não configurada.")
        return False

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }

    data = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": destinatario}],
        "subject": assunto,
        "htmlContent": mensagem_html
    }

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        print(f"✅ E-mail enviado para {destinatario}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao enviar e-mail: {e} == {os.getenv('MAIL_PASSWORD')}")
        return False

def gerar_token_seguro():
    return str(secrets.randbelow(9000) + 1000)