# -----------------------------
#   DOCKERFILE PARA FLASK + GUNICORN
# -----------------------------

# Imagem base mínima
FROM python:3.11-slim

# Evita prompts interativos
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Diretório de trabalho
WORKDIR /app

# Instala dependências do sistema (necessário p/ psycopg2, mysqlclient etc)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements e instala dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o resto do projeto
COPY . .

# Expõe a porta
EXPOSE 5000

# Comando FINAL de produção usando Gunicorn + WSGI
#CMD ["gunicorn", "wsgi:app", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "120"]
CMD ["python", "run.py"]