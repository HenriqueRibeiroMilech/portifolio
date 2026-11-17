import os

from waitress import serve

from . import create_app

if __name__ == '__main__':
    port = int(os.getenv('PORT', '5000'))
    host = '0.0.0.0' if 'PORT' in os.environ else '127.0.0.1'
    print(f'Portfólio em http://{host}:{port}', flush=True)
    serve(create_app(), host=host, port=port, threads=4)
