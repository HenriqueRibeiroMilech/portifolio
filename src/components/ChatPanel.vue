<script setup>
import { defineAsyncComponent, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Icon from './Icon.vue'

const Mascot = defineAsyncComponent(() => import('./Mascot.vue'))
const props = defineProps({
  open: Boolean,
  availability: String,
  hasPrevious: Boolean,
  request: Object,
})
const emit = defineEmits(['close', 'navigate', 'back'])
const messages = ref([])
const draft = ref('')
const busy = ref(false)
const error = ref('')
const mascotState = ref('idle')
const paused = ref(false)
const lightMode = ref(false)
const compact = ref(false)
const autoNavigate = ref(true)
const input = ref(null)
const history = ref(null)
const suggestions = [
  'Como ele usa IA no trabalho?',
  'Quais tecnologias ele utiliza?',
  'Quais certificados de IA ele tem?',
]
let controller, stateTimeout

watch(
  () => props.request,
  async (request) => {
    if (!request?.text) return
    await nextTick()
    send(request.text)
  },
  { immediate: true },
)

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick()
      input.value?.focus({ preventScroll: true })
      scrollHistory()
    }
  },
  { immediate: true },
)

async function scrollHistory() {
  await nextTick()
  if (history.value) history.value.scrollTop = history.value.scrollHeight
}

function navigate(reply) {
  emit('navigate', reply)
  if (window.matchMedia('(max-width: 600px)').matches) compact.value = true
}

async function send(question = draft.value) {
  const text = question.trim()
  if (!text || text.length > 1000 || busy.value) return
  const previous = messages.value.slice(-12).map(({ role, content }) => ({ role, content }))
  messages.value.push({ role: 'user', content: text })
  draft.value = ''
  error.value = ''
  busy.value = true
  mascotState.value = 'thinking'
  scrollHistory()
  controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45000)
  try {
    const response = await fetch('/api/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: previous }),
      signal: controller.signal,
    })
    const data = await response.json()
    if (!response.ok)
      throw new Error(
        data.error || 'O Bit não conseguiu responder agora. Tente de novo em instantes.',
      )
    if (typeof data.message !== 'string' || !data.message.trim())
      throw new Error('A resposta não chegou completa. Tente de novo.')
    messages.value.push({ role: 'assistant', content: data.message })
    mascotState.value = 'speaking'
    if (autoNavigate.value && props.open && data.action !== 'none') {
      navigate(data)
      mascotState.value = 'success'
    }
    clearTimeout(stateTimeout)
    stateTimeout = setTimeout(() => {
      mascotState.value = 'idle'
    }, 2600)
  } catch (failure) {
    messages.value.pop()
    draft.value = text
    error.value =
      failure.name === 'AbortError'
        ? 'A resposta demorou mais que o esperado. Você pode tentar novamente.'
        : failure instanceof TypeError || failure instanceof SyntaxError
          ? 'Não consegui me conectar agora. O portfólio continua disponível para explorar.'
          : failure.message
    mascotState.value = 'idle'
  } finally {
    clearTimeout(timeout)
    busy.value = false
    scrollHistory()
  }
}

onBeforeUnmount(() => {
  controller?.abort()
  clearTimeout(stateTimeout)
})
</script>

<template>
  <aside
    id="bit-chat"
    class="chat-panel"
    :class="{ compact }"
    aria-labelledby="chat-title"
    @keydown.esc="emit('close')"
  >
    <header class="chat-header">
      <div>
        <span class="chat-kicker">ASSISTENTE DE IA DO PORTFÓLIO</span>
        <h2 id="chat-title">
          Converse com o Bit
          <span>.</span>
        </h2>
      </div>
      <div class="chat-header-actions">
        <button
          v-if="compact"
          class="icon-button"
          aria-label="Ampliar conversa"
          @click="compact = false"
        >
          <Icon name="arrow-up" />
        </button>
        <button class="icon-button" aria-label="Minimizar conversa" @click="emit('close')">
          <Icon name="minus" />
        </button>
      </div>
    </header>
    <div class="chat-character">
      <div v-if="lightMode" class="light-mascot">
        <span class="bit-icon" aria-hidden="true">
          <i></i>
          <i></i>
        </span>
        <span>Bit em modo leve</span>
      </div>
      <Mascot v-else-if="open" :state="mascotState" :paused="paused" />
      <div class="mascot-options">
        <button v-if="!lightMode" :aria-pressed="paused" @click="paused = !paused">
          {{ paused ? 'Animar Bit' : 'Pausar animação' }}
        </button>
        <button :aria-pressed="lightMode" @click="lightMode = !lightMode">
          {{ lightMode ? 'Voltar ao 3D' : 'Modo leve' }}
        </button>
      </div>
    </div>
    <div
      ref="history"
      class="chat-history"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      :aria-busy="busy"
      aria-label="Histórico da conversa"
    >
      <div class="chat-welcome">
        <p>Sou o Bit, o assistente de IA do Henrique.</p>
        <p>
          Pergunte sobre experiência, projetos ou certificados. Além de responder, posso mostrar a
          seção relacionada.
        </p>
      </div>
      <div v-if="!messages.length" class="chat-suggestions">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion"
          :disabled="busy"
          @click="send(suggestion)"
        >
          {{ suggestion }}
          <Icon name="arrow-up-right" />
        </button>
      </div>
      <nav v-if="!messages.length" class="chat-shortcuts" aria-label="Atalhos do portfólio">
        <span>OU EXPLORE DIRETO</span>
        <button @click="navigate({ action: 'navigate_section', target: 'experiencia' })">
          Experiência
          <Icon name="arrow-up-right" />
        </button>
        <button @click="navigate({ action: 'navigate_section', target: 'certificados' })">
          Certificados
          <Icon name="arrow-up-right" />
        </button>
        <button @click="navigate({ action: 'navigate_section', target: 'contato' })">
          Contato
          <Icon name="arrow-up-right" />
        </button>
      </nav>
      <div
        v-for="(message, index) in messages"
        :key="index"
        class="chat-message"
        :class="message.role"
      >
        <span class="message-author">{{ message.role === 'user' ? 'VOCÊ' : 'BIT' }}</span>
        <p>{{ message.content }}</p>
      </div>
      <p v-if="busy" class="thinking">
        <span></span>
        <span></span>
        <span></span>
        Buscando no portfólio…
      </p>
    </div>
    <div v-if="error" class="chat-notice chat-error" role="alert">
      {{ error }}
    </div>
    <p v-else-if="availability === 'unconfigured'" class="chat-notice">
      A IA ainda não está configurada. Enquanto isso, fique à vontade para explorar o portfólio.
    </p>
    <p v-else-if="availability === 'offline'" class="chat-notice">
      O chat está sem conexão com o servidor. Você pode explorar o site normalmente.
    </p>
    <div class="chat-controls">
      <label>
        <input v-model="autoNavigate" type="checkbox" />
        Me mostrar as seções
      </label>
      <button v-if="hasPrevious" @click="emit('back')">
        <Icon name="back" />
        Voltar à leitura
      </button>
    </div>
    <form class="chat-form" @submit.prevent="send()">
      <label class="sr-only" for="chat-message">Sua pergunta sobre Henrique</label>
      <textarea
        id="chat-message"
        ref="input"
        v-model="draft"
        rows="1"
        maxlength="1000"
        placeholder="O que você quer saber?"
        :disabled="busy"
        @keydown.enter.exact.prevent="send()"
      ></textarea>
      <button type="submit" :disabled="busy || !draft.trim()" aria-label="Enviar pergunta">
        <Icon name="send" />
      </button>
    </form>
    <p class="chat-disclaimer">Só este portfólio como fonte. Conversa mantida nesta aba.</p>
  </aside>
</template>

<style scoped>
.chat-panel {
  position: fixed;
  z-index: 60;
  bottom: 22px;
  right: 25px;
  width: 385px;
  height: min(735px, calc(100dvh - 44px));
  background: var(--paper);
  border: 1px solid #cdd3bf;
  border-radius: 14px;
  box-shadow: 0 12px 80px #14231638;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 21px 22px 0;
}
.chat-kicker {
  font-size: 7px;
  letter-spacing: 0.1em;
  color: var(--muted);
}
.chat-header h2 {
  font-size: 29px;
  margin-top: 7px;
  letter-spacing: -0.05em;
}
.chat-header h2 span {
  color: #769836;
}
.chat-header .icon-button {
  border: 1px solid var(--line);
  border-radius: 50%;
  width: 34px;
  height: 34px;
}
.chat-header .icon-button svg {
  width: 18px;
  height: 18px;
}
.chat-header-actions {
  display: flex;
  gap: 7px;
}
.chat-character {
  position: relative;
  flex-shrink: 0;
  background: radial-gradient(ellipse, #e9efda 0%, transparent 67%);
}
.mascot-options {
  position: absolute;
  bottom: 6px;
  right: 15px;
  display: flex;
  gap: 6px;
}
.mascot-options button {
  background: transparent;
  border: 0;
  font-size: 8px;
  color: var(--muted);
  padding: 8px;
}
.light-mascot {
  height: 190px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30px;
}
.light-mascot .bit-icon {
  transform: scale(2);
}
.light-mascot > span:last-child {
  font-size: 9px;
  color: var(--muted);
}
.chat-history {
  padding: 2px 22px 10px;
  flex: 1;
  min-height: 65px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.chat-welcome p {
  font-size: 12px;
  line-height: 1.8;
}
.chat-welcome p:first-child {
  font-weight: 650;
  margin-bottom: 6px;
}
.chat-welcome p + p {
  color: var(--muted);
}
.chat-suggestions {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 16px;
}
.chat-suggestions button {
  padding: 10px 12px;
  border: 1px solid #d2d9c2;
  background: #edf0e3;
  border-radius: 6px;
  font-size: 10px;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.chat-suggestions button:hover {
  background: #e2edc9;
}
.chat-suggestions svg {
  width: 13px;
  height: 13px;
}
.chat-shortcuts {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 13px;
  margin-top: 17px;
}
.chat-shortcuts > span {
  font-size: 7px;
  letter-spacing: 0.08em;
  color: var(--muted);
}
.chat-shortcuts button {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  border: 0;
  padding: 5px 0;
  background: transparent;
}
.chat-shortcuts svg {
  width: 11px;
  height: 11px;
}
.chat-message {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 9px;
  background: #e7ebdf;
  overflow-wrap: anywhere;
}
.chat-message.user {
  margin-left: 25px;
  background: var(--forest);
  color: var(--paper);
}
.message-author {
  font-size: 7px;
  letter-spacing: 0.12em;
  opacity: 0.75;
}
.chat-message p {
  white-space: pre-wrap;
  font-size: 12px;
  line-height: 1.8;
  margin-top: 4px;
}
.chat-notice {
  font-size: 10px;
  line-height: 1.6;
  padding: 10px 13px;
  margin: 5px 18px;
  border: 1px solid #d5d9c5;
  border-radius: 6px;
  background: #eff0e6;
  flex-shrink: 0;
}
.chat-error {
  background: #f4e9df;
  border-color: #dcc1ab;
  color: #704b2b;
}
.chat-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin: 9px 22px;
  font-size: 9px;
  flex-shrink: 0;
}
.chat-controls label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.chat-controls input {
  accent-color: var(--forest);
  margin: 0;
}
.chat-controls button {
  background: transparent;
  border: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  padding: 5px 0;
}
.chat-controls svg {
  width: 12px;
  height: 12px;
}
.chat-form {
  border: 1px solid #bdc7aa;
  border-radius: 8px;
  margin: 2px 18px 0;
  padding: 6px;
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: #fafbf6;
  flex-shrink: 0;
}
.chat-form:focus-within {
  border-color: #749443;
  box-shadow: 0 0 0 2px #74944318;
}
.chat-form textarea {
  min-width: 0;
  width: 100%;
  background: transparent;
  border: 0;
  resize: vertical;
  max-height: 85px;
  padding: 10px 5px;
  font-size: 11px;
  line-height: 1.5;
}
.chat-form textarea:focus {
  outline: 0;
}
.chat-form button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 5px;
  background: var(--forest);
  color: var(--lime);
  flex-shrink: 0;
}
.chat-form button:disabled {
  opacity: 0.4;
}
.chat-form svg {
  width: 18px;
  height: 18px;
}
.chat-disclaimer {
  font-size: 8px;
  color: var(--muted);
  text-align: center;
  padding: 10px 12px 12px;
  flex-shrink: 0;
}
.thinking {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--muted);
  margin-top: 18px;
}
.thinking span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #7d9652;
  animation: pulse 1s infinite alternate;
}
.thinking span:nth-child(2) {
  animation-delay: 0.2s;
}
.thinking span:nth-child(3) {
  animation-delay: 0.4s;
  margin-right: 5px;
}
@keyframes pulse {
  to {
    opacity: 0.3;
    transform: translateY(-3px);
  }
}
@media (max-width: 600px) {
  .chat-form textarea {
    font-size: 16px;
  }
  .chat-panel {
    width: calc(100% - 16px);
    right: 8px;
    bottom: 8px;
    height: min(690px, calc(100dvh - 90px));
  }
  .chat-header {
    padding-top: 17px;
  }
  .chat-panel.compact {
    height: min(310px, 48dvh);
  }
  .compact .chat-character,
  .compact .chat-welcome,
  .compact .chat-suggestions,
  .compact .chat-disclaimer,
  .compact .chat-kicker {
    display: none;
  }
  .compact .chat-header {
    padding: 10px 18px;
  }
  .compact .chat-header h2 {
    font-size: 22px;
    margin: 0;
  }
  .compact .chat-shortcuts {
    margin-top: 5px;
  }
}
@media (max-height: 600px) {
  .chat-character {
    display: none;
  }
}
</style>
