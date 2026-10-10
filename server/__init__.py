import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory
from werkzeug.exceptions import HTTPException

ROOT = Path(__file__).resolve().parent.parent


def create_app(config=None):
    load_dotenv(ROOT / '.env')
    app = Flask(__name__, static_folder=None)
    app.config.update(
        OPENAI_API_KEY=os.getenv('OPENAI_API_KEY', ''),
        OPENAI_MODEL=os.getenv('OPENAI_MODEL', 'gpt-6.1-terra'),
        PROFILE_PATH=ROOT / 'content' / 'profile.json',
        MAX_CONTENT_LENGTH=24_000,
        CHAT_REQUESTS_PER_MINUTE=int(os.getenv('CHAT_REQUESTS_PER_MINUTE', '8')),
        CHAT_REQUESTS_PER_HOUR=int(os.getenv('CHAT_REQUESTS_PER_HOUR', '80')),
    )
    if config:
        app.config.update(config)

    from .routes import api
    from .chat import RateLimit
    app.register_blueprint(api, url_prefix='/api/v1')
    app.extensions['chat_limit'] = RateLimit()

    @app.after_request
    def security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['X-Frame-Options'] = 'DENY'
        if response.content_type.startswith('text/html'):
            response.headers['Cache-Control'] = 'no-cache'
        if response.content_type.startswith('application/json'):
            response.headers['Cache-Control'] = 'no-store'
        return response

    @app.errorhandler(HTTPException)
    def http_error(error):
        messages = {400: 'Envie um JSON válido.', 404: 'Endereço não encontrado.',
                    413: 'A mensagem ultrapassou o limite permitido.',
                    415: 'Envie os dados como application/json.'}
        return jsonify(error=messages.get(error.code, 'Não foi possível atender a solicitação.')), error.code

    @app.get('/')
    def index():
        if not (ROOT / 'dist' / 'index.html').exists():
            return jsonify(error='Rode npm run build ou abra o servidor do Vite.'), 503
        return send_from_directory(ROOT / 'dist', 'index.html')

    @app.get('/<path:filename>')
    def assets(filename):
        return send_from_directory(ROOT / 'dist', filename)

    return app
