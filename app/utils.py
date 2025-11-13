#envio de email
from flask_mail import Message
from app import mail, app
import secrets

def enviar_email(destinatario, assunto, mensagem_html):


    try:
        msg = Message(
            subject=assunto,
            sender=app.config['MAIL_USERNAME'],
            recipients=[destinatario],
            html=mensagem_html
        )
        mail.send(msg)
        print("✅ Email enviado com sucesso!")
    except Exception as e:
        print("❌ Falha ao enviar email:", e)

def gerar_token_seguro():
    return str(secrets.randbelow(9000) + 1000)