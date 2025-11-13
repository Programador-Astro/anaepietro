from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv
from app.db import db
from flask_mail import Mail, Message
import secrets
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_talisman import Talisman
load_dotenv()
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'CHAVESECRETA'
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME') 
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD') 
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER') 
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
mail = Mail(app)
db.init_app(app)

csp = {
    'default-src': [
        "'self'"
    ],
    'img-src': [
        "'self'",
        "https://i.imgur.com"      # imagens do Imgur
    ],
    'style-src': [
        "'self'",
        "'unsafe-inline'",          # permite estilos inline (necessário para máscaras CSS)
        "https://fonts.googleapis.com",  # Google Fonts
        "https://cdn.jsdelivr.net"       # Bootstrap CDN
    ],
    'script-src': [
        "'self'",
        "https://cdn.jsdelivr.net"       # scripts do Bootstrap CDN
    ],
    'font-src': [
        "'self'",
        "https://fonts.gstatic.com"      # fontes do Google Fonts
    ]
}

Talisman(app, force_https=True, content_security_policy=csp)
from app.models import Comentario
with app.app_context():
    db.create_all()
from app import routes
