from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB


class Comentario(db.Model):
    __tablename__ = "comentarios"

    id = db.Column(db.Integer, primary_key=True)
    convidado_nome = db.Column(db.String(120), nullable=False)
    convidado_comentario = db.Column(db.Text, nullable=False)
    convidado_id_pag = db.Column(db.String(120))
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    pagamento_id = db.Column(db.Integer, db.ForeignKey("pagamentos.id"), nullable=False)
    def to_dict(self):
        return {
            "id": self.id,
            "convidado_nome": self.convidado_nome,
            "convidado_comentario": self.convidado_comentario,
            "data_criacao": self.data_criacao.strftime("%d/%m/%Y %H:%M"),
            "pagamento_id": self.pagamento_id,
        }


class Pagamento(db.Model):
    __tablename__ = "pagamentos"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(120), nullable=False)
    nome_pagbank = db.Column(db.String(120))
    token = db.Column(db.String(100))
    cpf = db.Column(db.String(14))
    email_site = db.Column(db.String(120))
    email_pagbank = db.Column(db.String(120))
    presente = db.Column(db.String(120))
    valor = db.Column(db.Float, nullable=False)
    id_pagbank = db.Column(db.String(200), unique=True)  # order_id do PagBank
    charge_id = db.Column(db.String(200))                # id da charge (transação)
    status = db.Column(db.String(50), default="PENDENTE")
    items = db.Column(db.Text)                           # lista dos itens em JSON
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    comentarios = db.relationship("Comentario", backref="pagamento", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "email": self.email_site,
            "cpf": self.cpf,
            "presente": self.presente,
            "valor": self.valor,
            "status": self.status,
            "id_pagbank": self.id_pagbank,
            "charge_id": self.charge_id,
            "items": json.loads(self.items or "[]"),
            "criado_em": self.criado_em.strftime("%d/%m/%Y %H:%M"),
        }


class NotificacaoPagBank(db.Model):
    __tablename__ = "notificacoes_pagbank"

    id = db.Column(db.Integer, primary_key=True)
    recebido_em = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    payload = db.Column(JSONB, nullable=False)
    headers = db.Column(JSONB, nullable=True)

    def __repr__(self):
        return f"<NotificacaoPagBank id={self.id} recebido_em={self.recebido_em}>"  
    

class Lista_presenca(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    tell = db.Column(db.String(15), nullable=False)
    status = db.Column(db.String(300), default='Pendente') 

    def __repr__(self):
        return f'<Presença {self.nome} - Status: {self.status}>'
    

class Retorno(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    str_ret = db.Column(db.String(9000), nullable=False)
