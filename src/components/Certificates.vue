<script setup>
import Icon from './Icon.vue'
defineProps({ certificates: Array })
</script>

<template>
  <section
    id="certificados"
    class="section certificate-section wrap"
    aria-labelledby="certificates-title"
    tabindex="-1"
  >
    <div class="section-heading">
      <div>
        <p class="eyebrow">06 / CERTIFICADOS</p>
        <h2 id="certificates-title">Certificados</h2>
      </div>
      <p>
        Machine Learning, inteligência artificial
        <br />
        e desenvolvimento de software.
      </p>
    </div>
    <div class="certificate-grid">
      <article v-for="certificate in certificates" :key="certificate.id" class="certificate-card">
        <a
          class="certificate-image"
          :href="certificate.image"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`Abrir certificado: ${certificate.name}`"
        >
          <img
            :src="certificate.image"
            :alt="`Certificado de ${certificate.name} emitido para Henrique Ribeiro Milech`"
            loading="lazy"
          />
          <span>
            <Icon name="arrow-up-right" />
            Abrir documento
          </span>
        </a>
        <div class="certificate-content">
          <p class="eyebrow">{{ certificate.category }}</p>
          <h3>{{ certificate.name }}</h3>
          <p class="certificate-issuer">{{ certificate.issuer }}</p>
          <p class="certificate-description">{{ certificate.description }}</p>
          <ul class="tags" aria-label="Conteúdo do curso">
            <li v-for="topic in certificate.topics" :key="topic">{{ topic }}</li>
          </ul>
          <div class="certificate-meta">
            <time :datetime="certificate.date">{{ certificate.dateLabel }}</time>
            <span>{{ certificate.duration }}</span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
