import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { existsSync, readFileSync } from 'node:fs'

const profile = JSON.parse(readFileSync(new URL('../content/profile.json', import.meta.url)))

test('the real Vue page renders the profile without the chat or WebGL', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom',
  })
  try {
    const { default: App } = await vite.ssrLoadModule('/src/App.vue')
    const html = await renderToString(createSSRApp(App))
    for (const section of [
      'inicio',
      'assistente',
      'sobre',
      'projetos',
      'experiencia',
      'habilidades',
      'formacao',
      'contato',
    ]) {
      assert.ok(html.includes(`id="${section}"`), section)
    }
    for (const content of [
      'Henrique Milech',
      'DigitalJost',
      'JOST Brasil',
      'Trailblazer',
      'Engenharia de Software',
      'devhenriquemilech@gmail.com',
    ]) {
      assert.ok(html.includes(content), content)
    }
    assert.ok(html.includes('/henrique.jpg'))
    assert.ok(!html.includes('<canvas'))
    assert.ok(!html.includes('id="bit-chat"'))
    assert.ok(!html.includes('github.com'))
    assert.ok(html.includes('Testar assistente de IA'))
    assert.ok(html.includes('Projetista CNC'))
    for (const removed of ['h.milech', 'Ideias que', 'Arte de Gato', 'Também passaram por aqui', 'da serra para a web']) {
      assert.ok(!html.includes(removed), removed)
    }
    const { default: Certificates } = await vite.ssrLoadModule('/src/components/Certificates.vue')
    const gallery = await renderToString(createSSRApp(Certificates, { certificates: profile.certifications }))
    for (const certificate of profile.certifications) {
      assert.ok(gallery.includes(certificate.image))
      assert.ok(gallery.includes(certificate.date))
      assert.ok(existsSync(new URL(`../public${decodeURIComponent(certificate.image)}`, import.meta.url)))
    }
  } finally {
    await vite.close()
  }
})
