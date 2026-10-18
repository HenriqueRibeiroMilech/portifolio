# Portfólio — Henrique Milech

Meu portfólio com projetos, experiência e certificados. Fiz com Vue, Flask e Three.js. O Bit é o assistente que responde sobre meu perfil e leva até as seções do site.

## Rodar localmente

Precisa de Node 22.12+ e Python 3.11+.

```powershell
npm install
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Coloque a chave da OpenAI em `OPENAI_API_KEY` no `.env`. O modelo configurado é `gpt-6.1-terra`. Sem chave, o portfólio funciona e só o chat fica indisponível.

Inicie o backend:

```powershell
.\.venv\Scripts\python.exe -m server
```

Em outro terminal, inicie o frontend e abra o endereço que aparecer:

```powershell
npm run dev
```

Para rodar tudo pelo Flask, faça `npm run build` e acesse `http://127.0.0.1:5000` com o backend ligado.

## Conteúdo

Os dados ficam em `content/profile.json` e as imagens em `public/`. É ali que adiciono projetos e certificados. O frontend e o chat usam o mesmo JSON.

## Testes

```powershell
npm test
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -v
```
