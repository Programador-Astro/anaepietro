# Use a imagem oficial do Python
FROM python:3.11-slim

# Define diretório de trabalho
WORKDIR /app

# Copia os arquivos do projeto
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expõe a porta do Flask
EXPOSE 5000

# Comando para rodar o app
CMD ["python", "run.py"]
