# Henrique Milech

Meu portfólio em Vue 3 e Flask, com o Bit, um pequeno guia 3D feito em Three.js.

## Rodar no Windows

Node 22.12+ e Python 3.11+.

```powershell
npm install
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Coloque sua chave em `OPENAI_API_KEY` no `.env`. O modelo já é `gpt-6.1-terra`. Sem chave, o site funciona e o chat avisa que a IA não está configurada. Reinicie o Flask depois de alterar o `.env`.

Em um terminal:

```powershell
.\.venv\Scripts\python.exe -m server
```

Em outro:

```powershell
npm run dev
```

Abra o endereço que o Vite imprimir. Para rodar o build completo pelo Flask, use `npm run build` e acesse `http://127.0.0.1:5000` com o servidor ligado.

## Alterar o conteúdo

Tudo está em `content/profile.json`, usado pelo Vue e pelo Flask. Para adicionar um projeto, copie um item de `projects` e preencha `id` (único, em minúsculas e com hífens), `name`, `category`, `organization`, `description`, `role` e `technologies`. `image`, `repository` e `demo` podem continuar `null`. Imagens vão em `public/`, com caminho como `/meu-projeto.jpg`. Uma lista de projetos vazia esconde a seção.

Recompile depois de mudar conteúdo em produção. O servidor lê o JSON a cada chamada; o frontend também inclui uma cópia no build para funcionar sem a API. Os arquivos brutos do LinkedIn não são publicados nem versionados.

Os certificados estão em uma aba própria (`#certificados`). Para acrescentar um, edite `certifications` no JSON com título, emissor, data, descrição e caminho da imagem em `public/`.

Ainda faltam GitHub, projetos pessoais e imagens/demos públicas. O DigitalJost é um trabalho corporativo sem link público; a imagem do card é conceitual.

## Como o Bit funciona

Vue → `POST /api/v1/chat` → Flask → OpenAI Responses → `{ message, action, target }` → validação no Flask e no Vue → rolagem e destaque. O contexto é somente o JSON público; não há ferramentas, execução de código ou abertura automática de links. A conversa fica na memória desta aba e as últimas 12 mensagens acompanham cada pergunta. `store=False` desabilita armazenamento de estado de resposta na OpenAI; o provedor ainda processa as mensagens conforme suas políticas.

São 8 perguntas/minuto e 80/hora por IP, mais um teto de 240/hora no processo. Os limites ficam em memória, para uma instância. Não são compartilhados entre processos e o servidor não confia em `X-Forwarded-For`. Antes de hospedar com múltiplos processos ou proxy, configure os limites também na infraestrutura. Nada foi publicado.

## Verificar

```powershell
npm test
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -v
npm run build
```

Os testes automatizados cobrem perfil, certificados, privacidade, validação de entrada e ações, destinos inválidos, limites e ausência de chave. Não fazem chamadas nem simulam respostas do LLM. No navegador, foram verificados desktop/celular, mascote 3D, modo leve, navegação entre abas e retorno à leitura. Também foram feitas duas chamadas reais: consulta dos certificados com navegação automática e uma pergunta sobre experiência não cadastrada, que a IA informou não constar no portfólio.
