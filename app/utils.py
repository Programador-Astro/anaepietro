#envio de email
from flask_mail import Message
from app import mail
import secrets, os
from dotenv import load_dotenv
load_dotenv()
def enviar_email(destinatario, assunto, mensagem_html):


    try:
        msg = Message(
            subject=assunto,
            sender=os.getenv('MAIL_USERNAME'),
            recipients=[destinatario],
            html=mensagem_html
        )
        mail.send(msg)
        print("✅ Email enviado com sucesso!")
    except Exception as e:
        print("❌ Falha ao enviar email:", e)

def gerar_token_seguro():
    return str(secrets.randbelow(9000) + 1000)