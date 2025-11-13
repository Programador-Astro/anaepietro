from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv
from app.db import db
from flask_mail import Mail
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_talisman import Talisman
import requests

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

    # ===== INICIALIZA EXTENSÕES =====
    db.init_app(app)
    mail.init_app(app)
    @app.before_request
    def force_https():
        if request.headers.get("X-Forwarded-Proto", "https") == "http":
            return redirect(request.url.replace("http://", "https://", 1), code=301)

    # ===== HTTPS E CSP (apenas em produção) =====
    csp = {
        'default-src': ["'self'"],
        'img-src': ["'self'", "https://i.imgur.com"],
        'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        'script-src': ["'self'", "https://cdn.jsdelivr.net"],
        'font-src': ["'self'", "https://fonts.gstatic.com"]
    }

    if os.getenv("RAILWAY_ENVIRONMENT") == "production":
        app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
        Talisman(app, force_https=True, content_security_policy=csp)

    # ===== IMPORTA ROTAS E MODELOS DEPOIS =====
    with app.app_context():
        from app import routes, models
        # db.create_all()  # descomente se quiser criar tabelas localmente

    from app.routes import routes_bp
    app.register_blueprint(routes_bp)
    return app
