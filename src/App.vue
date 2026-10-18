<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import initialProfile from '../content/profile.json'
import Icon from './components/Icon.vue'
import Certificates from './components/Certificates.vue'
import { isInReadingPosition, navigationTarget } from './navigation.js'

const profile = ref(initialProfile)
const menuOpen = ref(false)
const expandedJob = ref('jost')
const activeSection = ref('inicio')
const chatOpen = ref(false)
const chatLoaded = ref(false)
const chatAvailability = ref('unknown')
const page = ref('portfolio')
const chatRequest = ref(null)
const mascotAnchor = ref(null)
const mascotVisible = ref(false)
const launcher = ref(null)
const ChatPanel = defineAsyncComponent(() => import('./components/ChatPanel.vue'))
const Mascot = defineAsyncComponent(() => import('./components/Mascot.vue'))
const previousPosition = ref(null)
const navigationNotice = ref('')
let highlightTimer, observer, mascotObserver, highlightedElement
const year = new Date().getFullYear()
const navigation = computed(() => [
  { id: 'sobre', label: 'Sobre' },
  ...(profile.value.projects.length ? [{ id: 'projetos', label: 'Projetos' }] : []),
  { id: 'experiencia', label: 'Experiência' },
  ...(profile.value.certifications.length ? [{ id: 'certificados', label: 'Certificados' }] : []),
  { id: 'contato', label: 'Contato' },
])

async function openChat(question) {
  chatLoaded.value = true
  chatOpen.value = true
  if (typeof question === 'string' && question.trim()) {
    chatRequest.value = { text: question, id: Date.now() }
  }
}

function observeSections() {
  observer?.disconnect()
  document.querySelectorAll('main section[id]').forEach((section) => observer?.observe(section))
}

async function syncPage() {
  const id = window.location.hash.slice(1)
  const nextPage =
    id === 'certificados' && profile.value.certifications.length ? 'certificados' : 'portfolio'
  page.value = nextPage
  menuOpen.value = false
  activeSection.value = id || 'inicio'
  await nextTick()
  observeSections()
  if (!id || id === 'inicio' || id === 'certificados') {
    window.scrollTo({ top: 0, behavior: 'instant' })
  } else {
    document.getElementById(id)?.scrollIntoView({ behavior: 'instant' })
  }
}

async function closeChat() {
  chatOpen.value = false
  await nextTick()
  launcher.value?.focus({ preventScroll: true })
}

async function guideNavigation(reply) {
  const targetId = navigationTarget(reply, profile.value)
  if (!targetId) return
  const savedPosition = { y: window.scrollY, page: page.value, hash: window.location.hash }
  const nextPage = targetId === 'certificados' ? 'certificados' : 'portfolio'
  const changedPage = page.value !== nextPage
  if (changedPage) {
    page.value = nextPage
    window.history.replaceState(null, '', `#${targetId}`)
    await nextTick()
    observeSections()
    previousPosition.value = savedPosition
  }
  const target = document.getElementById(targetId)
  if (!target) return
  const top = target.getBoundingClientRect().top
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  const destination = Math.max(0, Math.min(maxScroll, window.scrollY + top - 40))
  if (
    !isInReadingPosition(top, window.innerHeight) &&
    Math.abs(destination - window.scrollY) > 24
  ) {
    if (!changedPage) previousPosition.value = savedPosition
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({
      top: destination,
      behavior: reduced ? 'instant' : 'smooth',
    })
  }
  highlightedElement?.classList.remove('guided-highlight')
  target.classList.add('guided-highlight')
  highlightedElement = target
  const title = target.querySelector('h1, h2, h3')?.innerText.replace(/\s+/g, ' ') || 'a seção'
  navigationNotice.value = `Bit destacou: ${title}`
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => {
    target.classList.remove('guided-highlight')
    navigationNotice.value = ''
  }, 3200)
}

async function backToReading() {
  if (previousPosition.value === null) return
  const previous = previousPosition.value
  page.value = previous.page
  window.history.replaceState(null, '', previous.hash || window.location.pathname)
  await nextTick()
  observeSections()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({
    top: previous.y,
    behavior: reduced ? 'instant' : 'smooth',
  })
  previousPosition.value = null
  highlightedElement?.classList.remove('guided-highlight')
}

onBeforeUnmount(() => {
  observer?.disconnect()
  mascotObserver?.disconnect()
  window.removeEventListener('hashchange', syncPage)
  clearTimeout(highlightTimer)
})

onMounted(async () => {
  window.addEventListener('hashchange', syncPage)
  await syncPage()
  mascotObserver = new IntersectionObserver(
    ([entry]) => {
      mascotVisible.value = entry.isIntersecting
    },
    { rootMargin: '100px' },
  )
  if (mascotAnchor.value) mascotObserver.observe(mascotAnchor.value)
  try {
    const response = await fetch('/api/v1/profile')
    if (!response.ok) throw new Error('offline')
    const data = await response.json()
    profile.value = data.profile
    chatAvailability.value = data.chatAvailable ? 'ready' : 'unconfigured'
  } catch {
    chatAvailability.value = 'offline'
  }
  await nextTick()
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) activeSection.value = entry.target.id
    },
    { rootMargin: '-15% 0px -60% 0px' },
  )
  observeSections()
})
</script>

<template>
  <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
  <header class="site-header" @keydown.esc="menuOpen = false">
    <a class="wordmark" href="#inicio" aria-label="Henrique Milech, início">
      {{ profile.shortName }}
    </a>
    <nav class="desktop-nav" aria-label="Navegação principal">
      <a
        v-for="(item, index) in navigation"
        :key="item.id"
        :href="`#${item.id}`"
        :aria-current="activeSection === item.id ? 'location' : undefined"
      >
        <span class="nav-number">0{{ index + 1 }}</span>
        {{ item.label }}
      </a>
    </nav>
    <a class="header-contact" :href="`mailto:${profile.contact.email}`">
      Vamos conversar
      <Icon name="arrow-up-right" />
    </a>
    <button
      class="menu-toggle icon-button"
      :aria-expanded="menuOpen"
      aria-controls="mobile-nav"
      :aria-label="menuOpen ? 'Fechar menu' : 'Abrir menu'"
      @click="menuOpen = !menuOpen"
    >
      <Icon :name="menuOpen ? 'close' : 'menu'" />
    </button>
    <nav v-if="menuOpen" id="mobile-nav" class="mobile-nav" aria-label="Navegação no celular">
      <a v-for="item in navigation" :key="item.id" :href="`#${item.id}`" @click="menuOpen = false">
        {{ item.label }}
        <Icon name="arrow-up-right" />
      </a>
      <a href="#habilidades" @click="menuOpen = false">
        Habilidades
        <Icon name="arrow-up-right" />
      </a>
      <a href="#formacao" @click="menuOpen = false">
        Formação
        <Icon name="arrow-up-right" />
      </a>
    </nav>
  </header>

  <main id="conteudo">
    <div v-show="page === 'portfolio'">
      <section id="inicio" class="hero wrap" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">
            <span class="status-dot"></span>
            DESENVOLVIMENTO FULL STACK & INTELIGÊNCIA ARTIFICIAL
          </p>
          <p class="hello">
            {{ profile.shortName }}
          </p>
          <h1 id="hero-title">
            Desenvolvedor
            <br />
            de
            <em>software.</em>
          </h1>
          <p class="hero-description">{{ profile.summary }}</p>
          <div class="hero-actions">
            <button class="button button-dark" @click="openChat">
              Testar assistente de IA
              <Icon name="chat" />
            </button>
            <a class="text-link" href="#experiencia">
              Ver experiência
              <Icon name="arrow-down" />
            </a>
          </div>
        </div>
        <div class="portrait-area">
          <span class="portrait-orbit" aria-hidden="true"></span>
          <span class="portrait-star" aria-hidden="true">✳</span>
          <figure class="portrait">
            <img
              src="/henrique.jpg"
              :alt="profile.shortName + ' sorrindo'"
              width="400"
              height="400"
              fetchpriority="high"
            />
            <figcaption>
              <span>{{ profile.role }}</span>
              <span aria-hidden="true">↗</span>
            </figcaption>
          </figure>
          <div class="location-sticker">
            <Icon name="pin" />
            <span>
              {{ profile.location }}
            </span>
          </div>
        </div>
        <div class="hero-foot">
          <span>PYTHON · FLASK · VUE.JS · SQL</span>
          <a href="#sobre">
            Sobre mim
            <Icon name="arrow-down" />
          </a>
        </div>
      </section>

      <section
        id="assistente"
        class="ai-invitation wrap"
        aria-labelledby="assistant-title"
        tabindex="-1"
      >
        <div ref="mascotAnchor" class="ai-character">
          <Mascot v-if="mascotVisible && !chatOpen" />
          <span v-else class="ai-preview-symbol" aria-hidden="true">
            <span class="bit-icon">
              <i></i>
              <i></i>
            </span>
          </span>
          <span class="character-caption">BIT · ASSISTENTE DE IA</span>
        </div>
        <div class="ai-invitation-copy">
          <p class="eyebrow">
            <span class="status-dot"></span>
            EXPERIMENTE A IA DO PORTFÓLIO
          </p>
          <h2 id="assistant-title">Pergunte sobre minha experiência.</h2>
          <p>
            O Bit responde sobre meus projetos, tecnologias e certificados, e mostra a seção certa
            enquanto você conversa.
          </p>
          <div class="ai-invitation-actions">
            <button class="button button-lime" @click="openChat">
              Conversar com a IA
              <Icon name="arrow-up-right" />
            </button>
            <button class="ai-question" @click="openChat('Como o Henrique usa IA no trabalho?')">
              “Como você usa IA no trabalho?”
              <Icon name="arrow-up-right" />
            </button>
          </div>
        </div>
      </section>

      <div class="tech-strip" aria-label="Tecnologias principais">
        <div class="wrap">
          <span class="strip-label">TECNOLOGIAS PRINCIPAIS</span>
          <span v-for="tech in profile.mainTechnologies" :key="tech">{{ tech }}</span>
          <span class="strip-flower" aria-hidden="true">✳</span>
        </div>
      </div>

      <section
        id="sobre"
        class="section wrap about-section"
        aria-labelledby="about-title"
        tabindex="-1"
      >
        <div class="section-intro">
          <p class="eyebrow">01 / SOBRE MIM</p>
          <h2 id="about-title">
            Desenvolvimento,
            <br />
            dados e
            <em>IA.</em>
          </h2>
        </div>
        <div class="about-copy">
          <p v-for="paragraph in profile.about" :key="paragraph">
            {{ paragraph }}
          </p>
          <a class="text-link" href="#experiencia">
            Minha experiência profissional
            <Icon name="arrow-down-right" />
          </a>
        </div>
      </section>

      <section
        v-if="profile.projects.length"
        id="projetos"
        class="section projects-section"
        aria-labelledby="projects-title"
        tabindex="-1"
      >
        <div class="wrap">
          <div class="section-heading">
            <div>
              <p class="eyebrow">02 / PROJETOS</p>
              <h2 id="projects-title">Projetos</h2>
            </div>
            <p>
              Aplicações em que
              <br />
              atuo no desenvolvimento.
            </p>
          </div>
          <article
            v-for="(project, index) in profile.projects"
            :id="`projeto-${project.id}`"
            :key="project.id"
            class="project-card"
            tabindex="-1"
          >
            <div class="project-art" :class="{ 'has-image': project.image }">
              <img
                v-if="project.image"
                :src="project.image"
                :alt="`Imagem do projeto ${project.name}`"
                loading="lazy"
              />
              <template v-else>
                <div class="art-top">
                  <span>{{ project.organization || project.category }}</span>
                  <span>
                    DESENVOLVIMENTO & EVOLUÇÃO
                    <Icon name="asterisk" />
                  </span>
                </div>
                <div class="system-art" aria-hidden="true">
                  <div class="system-node">
                    <Icon name="database" />
                    <span>dados</span>
                  </div>
                  <div class="system-connection"></div>
                  <div class="system-core"><Icon name="code" /></div>
                  <div class="system-connection"></div>
                  <div class="system-node node-web">
                    <Icon name="window" />
                    <span>aplicação</span>
                  </div>
                  <span class="art-orbit"></span>
                </div>
                <div class="art-bottom">
                  <span>
                    {{ project.name }}
                    <b>.</b>
                  </span>
                  <small>APLICAÇÃO CORPORATIVA</small>
                </div>
              </template>
            </div>
            <div class="project-info">
              <div class="project-meta">
                <span class="project-index">0{{ index + 1 }}</span>
                <span>{{ project.category }}</span>
              </div>
              <h3>{{ project.name }}</h3>
              <p>{{ project.description }}</p>
              <p class="project-role">{{ project.role }}</p>
              <ul class="tags" aria-label="Tecnologias do projeto">
                <li v-for="tech in project.technologies" :key="tech">
                  {{ tech }}
                </li>
              </ul>
              <div class="project-links">
                <a
                  v-if="project.repository"
                  class="text-link"
                  :href="project.repository"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Código no GitHub
                  <Icon name="arrow-up-right" />
                </a>
                <a
                  v-if="project.demo"
                  class="text-link"
                  :href="project.demo"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visitar projeto
                  <Icon name="arrow-up-right" />
                </a>
                <span v-if="!project.repository && !project.demo" class="private-project">
                  <Icon name="lock" />
                  Projeto sem link público
                </span>
              </div>
            </div>
          </article>
          <p class="project-footnote">
            Os trabalhos corporativos aparecem sem exposição de dados ou interfaces internas. As
            ilustrações são conceituais.
          </p>
        </div>
      </section>

      <section
        id="experiencia"
        class="section wrap experience-section"
        aria-labelledby="experience-title"
        tabindex="-1"
      >
        <div class="section-heading">
          <div>
            <p class="eyebrow">03 / EXPERIÊNCIA</p>
            <h2 id="experience-title">
              Experiência
              <br />
              <em>profissional.</em>
            </h2>
          </div>
          <p>
            Desenvolvimento, dados
            <br />
            e integração de sistemas.
          </p>
        </div>
        <div class="timeline">
          <article
            v-for="job in profile.experience"
            :key="job.id"
            class="job"
            :class="{ 'job-current': !job.end, 'job-secondary': !job.company }"
          >
            <div class="job-time">
              <span>{{ job.period }}</span>
              <span v-if="!job.end" class="current-label">
                <span class="status-dot"></span>
                ATUAL
              </span>
            </div>
            <div class="job-body">
              <button
                class="job-toggle"
                :aria-expanded="expandedJob === job.id"
                :aria-controls="`job-${job.id}`"
                @click="expandedJob = expandedJob === job.id ? null : job.id"
              >
                <span>
                  <span class="job-company">
                    {{ job.company || job.role }}
                    <span v-if="!job.end" class="small-arrow" aria-hidden="true">↗</span>
                  </span>
                  <span v-if="job.company" class="job-title">{{ job.role }}</span>
                </span>
                <span class="expand-icon" aria-hidden="true">
                  {{ expandedJob === job.id ? '−' : '+' }}
                </span>
              </button>
              <p class="job-description">{{ job.description }}</p>
              <div v-show="expandedJob === job.id" :id="`job-${job.id}`" class="job-details">
                <ul>
                  <li v-for="point in job.highlights" :key="point">
                    {{ point }}
                  </li>
                </ul>
                <ul class="tags" aria-label="Tecnologias e competências">
                  <li v-for="tech in job.technologies" :key="tech">{{ tech }}</li>
                </ul>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section
        id="habilidades"
        class="section skills-section"
        aria-labelledby="skills-title"
        tabindex="-1"
      >
        <div class="wrap">
          <div class="section-heading">
            <div>
              <p class="eyebrow">04 / HABILIDADES</p>
              <h2 id="skills-title">
                Tecnologias e
                <br />
                <em>competências.</em>
              </h2>
            </div>
            <span class="skills-star" aria-hidden="true">✳</span>
          </div>
          <div class="skills-grid">
            <article v-for="(group, index) in profile.skills" :key="group.name" class="skill-group">
              <div class="skill-group-top">
                <Icon :name="['code', 'database', 'spark'][index % 3]" />
                <span>0{{ index + 1 }}</span>
              </div>
              <p class="eyebrow">{{ group.label }}</p>
              <h3>{{ group.name }}</h3>
              <p v-if="group.description" class="skill-description">{{ group.description }}</p>
              <ul class="tags">
                <li v-for="item in group.items" :key="item">{{ item }}</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section
        id="formacao"
        class="section wrap education-section"
        aria-labelledby="education-title"
        tabindex="-1"
      >
        <div class="section-intro">
          <p class="eyebrow">05 / FORMAÇÃO</p>
          <h2 id="education-title">
            Formação
            <br />
            <em>acadêmica.</em>
          </h2>
          <div class="language-list">
            <p v-for="language in profile.languages" :key="language.name">
              <span>{{ language.name }}</span>
              <small>{{ language.level }}</small>
            </p>
          </div>
        </div>
        <div class="education-content">
          <article v-for="course in profile.education" :key="course.degree" class="education-item">
            <div class="institution-mark">{{ course.shortName }}</div>
            <div>
              <p class="education-period">{{ course.period }}</p>
              <h3>{{ course.degree }}</h3>
              <p>{{ course.institution }}</p>
              <span v-if="course.ongoing" class="studying">
                <span class="status-dot"></span>
                Em andamento
              </span>
            </div>
          </article>
          <a class="text-link certificates-link" href="#certificados">
            Ver certificados de IA e desenvolvimento
            <Icon name="arrow-up-right" />
          </a>
        </div>
      </section>

      <section id="contato" class="contact-section" aria-labelledby="contact-title" tabindex="-1">
        <div class="wrap">
          <p class="eyebrow">
            <span class="status-dot"></span>
            06 / CONTATO
          </p>
          <div class="contact-heading">
            <h2 id="contact-title">
              Vamos
              <em>conversar?</em>
            </h2>
            <a
              v-if="profile.contact.email"
              class="contact-circle"
              :href="`mailto:${profile.contact.email}`"
              aria-label="Enviar um email para Henrique"
            >
              <Icon name="arrow-up-right" />
            </a>
          </div>
          <div class="contact-bottom">
            <p>
              Desenvolvimento de software,
              <br />
              projetos e oportunidades em IA.
            </p>
            <div class="contact-links">
              <a v-if="profile.contact.email" :href="`mailto:${profile.contact.email}`">
                Me manda um email
                <Icon name="arrow-up-right" />
                <small>{{ profile.contact.email }}</small>
              </a>
              <a
                v-if="profile.contact.linkedin"
                :href="profile.contact.linkedin"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
                <Icon name="arrow-up-right" />
              </a>
              <a
                v-if="profile.contact.github"
                :href="profile.contact.github"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
                <Icon name="arrow-up-right" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
    <Certificates v-if="page === 'certificados'" :certificates="profile.certifications" />
  </main>

  <footer class="site-footer wrap">
    <a class="wordmark" href="#inicio">
      {{ profile.shortName }}
    </a>
    <span>Desenvolvimento de software & IA</span>
    <span>© {{ year }} {{ profile.shortName }}</span>
    <a href="#inicio" aria-label="Voltar ao início"><Icon name="arrow-up" /></a>
  </footer>
  <button
    v-show="!chatOpen"
    ref="launcher"
    class="chat-launcher"
    aria-label="Abrir conversa com Bit, o assistente do portfólio"
    aria-controls="bit-chat"
    :aria-expanded="chatOpen"
    @click="openChat"
  >
    <span class="bit-icon" aria-hidden="true">
      <i></i>
      <i></i>
    </span>
    <span>
      Converse com a IA
      <span class="launcher-dot" aria-hidden="true"></span>
    </span>
  </button>
  <ChatPanel
    v-if="chatLoaded"
    v-show="chatOpen"
    :open="chatOpen"
    :availability="chatAvailability"
    :request="chatRequest"
    :has-previous="previousPosition !== null"
    @close="closeChat"
    @navigate="guideNavigation"
    @back="backToReading"
  />
  <p class="sr-only" role="status">{{ navigationNotice }}</p>
</template>
