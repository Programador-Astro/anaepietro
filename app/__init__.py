from flask import Flask
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv
# Assumindo que 'app.db' contém a instância de SQLAlchemy,
# o caminho correto seria .db se estiver no mesmo nível, ou app.db
# Se 'db' for inicializado em um arquivo separado, certifique-se de que o caminho de importação esteja correto.
from app.db import db 
from flask_mail import Mail
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_talisman import Talisman

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()
mail = Mail()
# Talisman será inicializado dentro de create_app()

def create_app():
    # Inicializa a aplicação Flask
    app = Flask(__name__)

    # ===== CONFIGURAÇÕES GERAIS =====
    # URL do Banco de Dados (deve ser configurada no .env como DATABASE_URL)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    # Chave Secreta para segurança (sessões, CSRF, etc.)
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'CHAVE_SECRETA_DEFAULT_MUITO_FORTE') # Recomendado buscar do .env

    # ===== CONFIGURAÇÕES DE EMAIL (Flask-Mail) =====
    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USE_SSL'] = False
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

    # ===== CORRIGE PROXY (Se estiver usando Gunicorn/Proxy como no Railway) =====
    # Define o número de proxies na frente do Flask
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

    # ===== FORÇA HTTPS (OPCIONAL, MAS RECOMENDADO) =====
    app.config['PREFERRED_URL_SCHEME'] = 'https'

    # ===== INICIALIZA EXTENSÕES =====
    db.init_app(app)
    mail.init_app(app)

    # Inicializa Talisman para políticas de segurança (ex: Content Security Policy)
    # Recomenda-se Talisman para produção, forçando HTTPS e cabeçalhos de segurança.
    Talisman(app,
             content_security_policy=None, # Define o CSP (ou use None para desabilitar temporariamente se tiver problemas com assets)
             force_https=True,            # Redireciona HTTP para HTTPS
             frame_options='DENY')        # Impede clickjacking

    # ===== IMPORTA MODELOS E CRIA AS TABELAS NO BANCO DE DADOS =====
    with app.app_context():
        # A importação dos modelos é crucial antes do create_all() para que o SQLAlchemy saiba quais tabelas criar
        from app import routes, models
        
        # Este é o comando que você estava procurando! 
        # Ele cria todas as tabelas definidas nos seus modelos no banco de dados.
        db.create_all()

    # ===== REGISTRA ROTAS (Blueprints) =====
    from app.routes import routes_bp
    app.register_blueprint(routes_bp)

    return app