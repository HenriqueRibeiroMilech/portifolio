<script setup>
import { computed, onMounted, ref } from 'vue'
import initialProfile from '../content/profile.json'
import Icon from './components/Icon.vue'

const profile = ref(initialProfile)
const menuOpen = ref(false)
const expandedJob = ref('jost')
const activeSection = ref('inicio')
const chatOpen = ref(false)
const year = new Date().getFullYear()
const navigation = computed(() => [
  { id: 'sobre', label: 'Sobre' },
  ...(profile.value.projects.length ? [{ id: 'projetos', label: 'Projetos' }] : []),
  { id: 'experiencia', label: 'Trajetória' },
  { id: 'contato', label: 'Contato' },
])

onMounted(async () => {
  try {
    const response = await fetch('/api/v1/profile')
    if (response.ok) profile.value = (await response.json()).profile
  } catch { /* O conteúdo também está incluído no build. */ }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) activeSection.value = entry.target.id
  }, { rootMargin: '-15% 0px -60% 0px' })
  document.querySelectorAll('main section[id]').forEach(section => observer.observe(section))
})
</script>

<template>
  <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
  <header class="site-header">
    <a class="wordmark" href="#inicio" aria-label="Henrique Milech, início">h.milech<span> /</span></a>
    <nav class="desktop-nav" aria-label="Navegação principal">
      <a v-for="(item, index) in navigation" :key="item.id" :href="`#${item.id}`" :aria-current="activeSection === item.id ? 'location' : undefined">
        <span class="nav-number">0{{ index + 1 }}</span>{{ item.label }}
      </a>
    </nav>
    <a class="header-contact" :href="`mailto:${profile.contact.email}`">Vamos conversar <Icon name="arrow-up-right" /></a>
    <button class="menu-toggle icon-button" :aria-expanded="menuOpen" aria-controls="mobile-nav" :aria-label="menuOpen ? 'Fechar menu' : 'Abrir menu'" @click="menuOpen = !menuOpen"><Icon :name="menuOpen ? 'close' : 'menu'" /></button>
    <nav v-if="menuOpen" id="mobile-nav" class="mobile-nav" aria-label="Navegação no celular">
      <a v-for="item in navigation" :key="item.id" :href="`#${item.id}`" @click="menuOpen = false">{{ item.label }} <Icon name="arrow-up-right" /></a>
      <a href="#habilidades" @click="menuOpen = false">Habilidades <Icon name="arrow-up-right" /></a>
      <a href="#formacao" @click="menuOpen = false">Formação <Icon name="arrow-up-right" /></a>
    </nav>
  </header>

  <main id="conteudo">
    <section id="inicio" class="hero wrap" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow"><span class="status-dot"></span> SOFTWARE, DADOS & UM POUCO DE CURIOSIDADE</p>
        <p class="hello">Oi, eu sou o Henrique <span class="wave" aria-hidden="true">✳</span></p>
        <h1 id="hero-title">Ideias que<br />viram <em>código.</em></h1>
        <p class="hero-description">{{ profile.summary }}</p>
        <div class="hero-actions">
          <a class="button button-dark" :href="profile.projects.length ? '#projetos' : '#experiencia'">{{ profile.projects.length ? 'Conheça meu trabalho' : 'Conheça minha trajetória' }} <Icon name="arrow-down-right" /></a>
          <a class="text-link" href="#sobre">Um pouco sobre mim <Icon name="arrow-down" /></a>
        </div>
      </div>
      <div class="portrait-area">
        <span class="portrait-orbit" aria-hidden="true"></span>
        <span class="portrait-star" aria-hidden="true">✳</span>
        <span class="code-sticker" aria-hidden="true">&lt;olá, mundo /&gt;</span>
        <figure class="portrait">
          <img src="/henrique.jpg" :alt="profile.shortName + ' sorrindo'" width="400" height="400" fetchpriority="high" />
          <figcaption><span>Henrique, prazer :)</span><span aria-hidden="true">↗</span></figcaption>
        </figure>
        <div class="location-sticker"><Icon name="pin" /><span>{{ profile.location }}<br /><small>da serra para a web.</small></span></div>
        <span class="photo-note">esse sou eu, fora do terminal <svg viewBox="0 0 75 35" aria-hidden="true"><path d="M3 6Q40 45 68 8m-12 1 13-3-2 13" /></svg></span>
      </div>
      <div class="hero-foot"><span>DESENVOLVEDOR. CURIOSO POR NATUREZA.</span><a href="#sobre">Continue explorando <Icon name="arrow-down" /></a></div>
    </section>

    <div class="tech-strip" aria-label="Tecnologias principais"><div class="wrap"><span class="strip-label">MEU DIA A DIA TEM</span><span v-for="tech in profile.mainTechnologies" :key="tech">{{ tech }}</span><span class="strip-flower" aria-hidden="true">✳</span><span class="strip-end">e vontade de aprender.</span></div></div>

    <section id="sobre" class="section wrap about-section" aria-labelledby="about-title" tabindex="-1">
      <div class="section-intro">
        <p class="eyebrow">01 / QUEM ESTÁ POR AQUI</p><h2 id="about-title">Antes do código,<br />vem a <em>curiosidade.</em></h2>
        <div class="about-doodle" aria-hidden="true"><span>{</span><span class="doodle-star">✳</span><span>}</span></div>
      </div>
      <div class="about-copy"><p v-for="paragraph in profile.about" :key="paragraph">{{ paragraph }}</p><a class="text-link" href="#experiencia">Veja como cheguei até aqui <Icon name="arrow-down-right" /></a></div>
    </section>

    <section v-if="profile.projects.length" id="projetos" class="section projects-section" aria-labelledby="projects-title" tabindex="-1">
      <div class="wrap">
        <div class="section-heading"><div><p class="eyebrow">02 / DA IDEIA À APLICAÇÃO</p><h2 id="projects-title">Código em <em>ação.</em></h2></div><p>Um recorte do que<br />ajudo a construir.</p></div>
        <article v-for="(project, index) in profile.projects" :id="`projeto-${project.id}`" :key="project.id" class="project-card" tabindex="-1">
          <div class="project-art" :class="{ 'has-image': project.image }">
            <img v-if="project.image" :src="project.image" :alt="`Imagem do projeto ${project.name}`" loading="lazy" />
            <template v-else>
              <div class="art-top"><span>{{ project.organization || project.category }}</span><span>DESENVOLVIMENTO & EVOLUÇÃO <Icon name="asterisk" /></span></div>
              <div class="system-art" aria-hidden="true">
                <div class="system-node"><Icon name="database" /><span>dados</span></div>
                <div class="system-connection"></div><div class="system-core"><Icon name="code" /></div><div class="system-connection"></div>
                <div class="system-node node-web"><Icon name="window" /><span>aplicação</span></div><span class="art-orbit"></span>
              </div>
              <div class="art-bottom"><span>{{ project.name }}<b>.</b></span><small>SOFTWARE QUE CONECTA.</small></div>
            </template>
          </div>
          <div class="project-info">
            <div class="project-meta"><span class="project-index">0{{ index + 1 }}</span><span>{{ project.category }}</span></div>
            <h3>{{ project.name }}</h3><p>{{ project.description }}</p><p class="project-role">{{ project.role }}</p>
            <ul class="tags" aria-label="Tecnologias do projeto"><li v-for="tech in project.technologies" :key="tech">{{ tech }}</li></ul>
            <div class="project-links">
              <a v-if="project.repository" class="text-link" :href="project.repository" target="_blank" rel="noopener noreferrer">Código no GitHub <Icon name="arrow-up-right" /></a>
              <a v-if="project.demo" class="text-link" :href="project.demo" target="_blank" rel="noopener noreferrer">Visitar projeto <Icon name="arrow-up-right" /></a>
              <span v-if="!project.repository && !project.demo" class="private-project"><Icon name="lock" /> Projeto sem link público</span>
            </div>
          </div>
        </article>
        <p class="project-footnote">Os trabalhos corporativos aparecem sem exposição de dados ou interfaces internas. As ilustrações são conceituais.</p>
      </div>
    </section>

    <section id="experiencia" class="section wrap experience-section" aria-labelledby="experience-title" tabindex="-1">
      <div class="section-heading"><div><p class="eyebrow">03 / O CAMINHO ATÉ AQUI</p><h2 id="experience-title">Uma coisa levou<br />à <em>outra.</em></h2></div><p>Da fabricação mecânica<br />à transformação digital.</p></div>
      <div class="timeline">
        <article v-for="job in profile.experience" :key="job.id" class="job" :class="{ 'job-current': !job.end }">
          <div class="job-time"><span>{{ job.period }}</span><span v-if="!job.end" class="current-label"><span class="status-dot"></span> POR AQUI AGORA</span></div>
          <div class="job-body">
            <button class="job-toggle" :aria-expanded="expandedJob === job.id" :aria-controls="`job-${job.id}`" @click="expandedJob = expandedJob === job.id ? null : job.id">
              <span><span class="job-company">{{ job.company }} <span v-if="!job.end" class="small-arrow" aria-hidden="true">↗</span></span><span class="job-title">{{ job.role }}</span></span>
              <span class="expand-icon" aria-hidden="true">{{ expandedJob === job.id ? '−' : '+' }}</span>
            </button>
            <p class="job-description">{{ job.description }}</p>
            <div v-show="expandedJob === job.id" :id="`job-${job.id}`" class="job-details">
              <ul><li v-for="point in job.highlights" :key="point">{{ point }}</li></ul>
              <ul class="tags" aria-label="Tecnologias e competências"><li v-for="tech in job.technologies" :key="tech">{{ tech }}</li></ul>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section id="habilidades" class="section skills-section" aria-labelledby="skills-title" tabindex="-1"><div class="wrap">
      <div class="section-heading"><div><p class="eyebrow">04 / MINHA CAIXA DE FERRAMENTAS</p><h2 id="skills-title">Cada problema,<br />uma <em>possibilidade.</em></h2></div><span class="skills-star" aria-hidden="true">✳</span></div>
      <div class="skills-grid">
        <article v-for="(group, index) in profile.skills" :key="group.name" class="skill-group">
          <div class="skill-group-top"><Icon :name="['code', 'database', 'spark'][index % 3]" /><span>0{{ index + 1 }}</span></div>
          <p class="eyebrow">{{ group.label }}</p><h3>{{ group.name }}</h3>
          <ul class="tags"><li v-for="item in group.items" :key="item">{{ item }}</li></ul>
        </article>
      </div>
    </div></section>

    <section id="formacao" class="section wrap education-section" aria-labelledby="education-title" tabindex="-1">
      <div class="section-intro">
        <p class="eyebrow">05 / SEM PARAR DE APRENDER</p><h2 id="education-title">Sempre em<br /><em>construção.</em></h2>
        <div class="language-list"><p v-for="language in profile.languages" :key="language.name"><span>{{ language.name }}</span><small>{{ language.level }}</small></p></div>
      </div>
      <div class="education-content">
        <article v-for="course in profile.education" :key="course.degree" class="education-item">
          <div class="institution-mark">{{ course.shortName }}</div>
          <div><p class="education-period">{{ course.period }}</p><h3>{{ course.degree }}</h3><p>{{ course.institution }}</p><span v-if="course.ongoing" class="studying"><span class="status-dot"></span> Em andamento</span></div>
        </article>
        <div v-if="profile.certifications.length" class="certifications">
          <h3>Também passaram por aqui</h3><p class="certifications-label">CURSOS & CERTIFICAÇÕES</p>
          <ul><li v-for="course in profile.certifications" :key="course"><Icon name="arrow-up-right" />{{ course }}</li></ul>
        </div>
      </div>
    </section>

    <section id="contato" class="contact-section" aria-labelledby="contact-title" tabindex="-1"><div class="wrap">
      <p class="eyebrow"><span class="status-dot"></span>06 / A PRÓXIMA IDEIA PODE COMEÇAR AQUI</p>
      <div class="contact-heading"><h2 id="contact-title">Vamos fazer<br />algo <em>legal?</em></h2><a v-if="profile.contact.email" class="contact-circle" :href="`mailto:${profile.contact.email}`" aria-label="Enviar um email para Henrique"><Icon name="arrow-up-right" /></a></div>
      <div class="contact-bottom">
        <p>Uma oportunidade, um projeto<br />ou só uma boa conversa.</p>
        <div class="contact-links">
          <a v-if="profile.contact.email" :href="`mailto:${profile.contact.email}`">Me manda um email <Icon name="arrow-up-right" /><small>{{ profile.contact.email }}</small></a>
          <a v-if="profile.contact.linkedin" :href="profile.contact.linkedin" target="_blank" rel="noopener noreferrer">LinkedIn <Icon name="arrow-up-right" /></a>
          <a v-if="profile.contact.github" :href="profile.contact.github" target="_blank" rel="noopener noreferrer">GitHub <Icon name="arrow-up-right" /></a>
        </div>
      </div>
    </div></section>
  </main>

  <footer class="site-footer wrap"><a class="wordmark" href="#inicio">h.milech<span> /</span></a><span>Feito com café, curiosidade e Vue.</span><span>© {{ year }} {{ profile.shortName }}</span><a href="#inicio" aria-label="Voltar ao início"><Icon name="arrow-up" /></a></footer>
  <button class="chat-launcher" aria-label="Abrir conversa com Bit, o assistente do portfólio" @click="chatOpen = !chatOpen"><span class="bit-icon" aria-hidden="true"><i></i><i></i></span><span>Conheça o Bit <span class="launcher-star">✳</span></span></button>
</template>
