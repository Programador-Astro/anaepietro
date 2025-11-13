from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv
from app.db import db
from flask_mail import Mail
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_talisman import Talisman

load_dotenv()
mail = Mail()

def create_app():
    app = Flask(__name__)

    # ===== CONFIGURAÇÕES =====
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'CHAVESECRETA'

    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USE_SSL'] = False
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

    # ===== CORRIGE PROXY (Railway) =====
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

    # ===== (OPCIONAL, MAS RECOMENDADO) =====
    # Isso faz Flask sempre gerar URLs HTTPS
    app.config['PREFERRED_URL_SCHEME'] = 'https'

    # ===== INICIALIZA EXTENSÕES =====
    db.init_app(app)
    mail.init_app(app)

    # ===== IMPORTA ROTAS =====
    with app.app_context():
        from app import routes, models

    from app.routes import routes_bp
    app.register_blueprint(routes_bp)

    return app
