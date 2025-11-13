# Usa a imagem oficial do Python
FROM python:3.11-slim

# Define o diretório de trabalho
WORKDIR /app

# Copia e instala dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código
COPY . .

# Expõe a porta padrão do Flask/Gunicorn
EXPOSE 5000

# Usa Gunicorn para rodar a aplicação
#CMD ["gunicorn", "--bind", "0.0.0.0:5000", "wsgi:app"]
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--timeout", "120", "wsgi:app"]


#CMD [ "python", "run.py" ]