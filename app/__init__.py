# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os
from app.db import db
from flask_mail import Mail
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_talisman import Talisman

load_dotenv()
mail = Mail()

def create_app():
    app = Flask(__name__)

    # ================== CONFIG ==================
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

    # ===== CONFIG EMAIL =====
    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USE_SSL'] = False
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

    # ===== PROXY (Railway, Render, Nginx, etc) =====
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

    # ===== HTTPS =====
    app.config['PREFERRED_URL_SCHEME'] = 'https'

    # ===== Inicializa extensões =====
    db.init_app(app)
    mail.init_app(app)

    # ===== Segurança =====
    """ Talisman(
        app,
        content_security_policy=None,
        force_https=True,
        frame_options='DENY'
    )
    """
    # ===== ROTAS =====
    from app.routes import routes_bp
    app.register_blueprint(routes_bp)

    return app
