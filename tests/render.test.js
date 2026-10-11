import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'

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
  } finally {
    await vite.close()
  }
})
