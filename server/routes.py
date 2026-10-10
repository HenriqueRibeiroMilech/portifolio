import json

from flask import Blueprint, current_app, jsonify, request
from openai import APIError, APITimeoutError, AuthenticationError, RateLimitError
from pydantic import ValidationError

from .chat import ChatInput, ask_model

api = Blueprint('api', __name__)


def load_profile():
    return json.loads(current_app.config['PROFILE_PATH'].read_text(encoding='utf-8'))


@api.get('/profile')
def profile():
    return jsonify(profile=load_profile(), chatAvailable=bool(current_app.config['OPENAI_API_KEY']))


@api.post('/chat')
def chat():
    if request.headers.get('Sec-Fetch-Site') == 'cross-site':
        return jsonify(error='Abra o chat pelo portfólio.'), 403
    try:
        question = ChatInput.model_validate(request.get_json())
    except ValidationError:
        return jsonify(error='Envie uma pergunta de 1 a 1.000 caracteres e até 12 mensagens de histórico.'), 400

    if not current_app.config['OPENAI_API_KEY']:
        return jsonify(error='A IA ainda não está configurada. Você pode explorar todas as seções do portfólio normalmente.', code='not_configured'), 503

    limiter = current_app.extensions['chat_limit']
    if not limiter.allow(request.remote_addr, current_app.config['CHAT_REQUESTS_PER_MINUTE'],
                         current_app.config['CHAT_REQUESTS_PER_HOUR']):
        return jsonify(error='O Bit precisa de uma pausa. Tente novamente daqui a pouco.'), 429, {'Retry-After': '60'}

    try:
        reply = ask_model(question, load_profile(), current_app.config)
        return jsonify(reply.model_dump())
    except AuthenticationError:
        return jsonify(error='A credencial da IA precisa ser revisada pelo responsável pelo site.'), 503
    except RateLimitError:
        return jsonify(error='O serviço de IA está no limite de uso. Tente novamente mais tarde.'), 503
    except APITimeoutError:
        return jsonify(error='A IA demorou para responder. Tente de novo em instantes.'), 504
    except (APIError, ValueError):
        current_app.logger.warning('Chat provider failed to return a valid answer')
        return jsonify(error='A IA está indisponível agora. O portfólio continua disponível para explorar.'), 502
