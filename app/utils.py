#envio de email
from flask_mail import Message
from app import mail
import secrets

def enviar_email(destinatario, assunto, mensagem_html):
    msg = Message(
        subject=assunto,
        recipients=[destinatario],
        html=mensagem_html
    )
    mail.send(msg)



def gerar_token_seguro():
    return str(secrets.randbelow(9000) + 1000)