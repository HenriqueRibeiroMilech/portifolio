import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { navigationTarget, isInReadingPosition } from '../src/navigation.js'

const profile = JSON.parse(readFileSync(new URL('../content/profile.json', import.meta.url)))

test('only known sections can be navigation targets', () => {
  assert.equal(
    navigationTarget({ action: 'navigate_section', target: 'experiencia' }, profile),
    'experiencia',
  )
  for (const target of [
    '#experiencia',
    'body',
    'https://example.com',
    '<script>',
    null,
    '__proto__',
  ]) {
    assert.equal(navigationTarget({ action: 'navigate_section', target }, profile), null)
  }
})

test('project highlights require an existing project and the correct action', () => {
  assert.equal(
    navigationTarget({ action: 'highlight_project', target: 'projeto-digitaljost' }, profile),
    'projeto-digitaljost',
  )
  assert.equal(
    navigationTarget({ action: 'navigate_section', target: 'projeto-digitaljost' }, profile),
    null,
  )
  assert.equal(
    navigationTarget({ action: 'highlight_project', target: 'projeto-inventado' }, profile),
    null,
  )
  assert.equal(navigationTarget({ action: 'highlight_project', target: 'contato' }, profile), null)
})

test('none, missing and arbitrary actions never navigate', () => {
  for (const reply of [
    null,
    {},
    { action: 'none', target: 'contato' },
    { action: 'eval', target: 'contato' },
  ]) {
    assert.equal(navigationTarget(reply, profile), null)
  }
})

test('an empty project list removes project destinations', () => {
  const empty = { ...profile, projects: [] }
  assert.equal(navigationTarget({ action: 'navigate_section', target: 'projetos' }, empty), null)
  assert.equal(
    navigationTarget({ action: 'highlight_project', target: 'projeto-digitaljost' }, empty),
    null,
  )
})

test('a section already at reading height does not scroll again', () => {
  assert.equal(isInReadingPosition(45, 900), true)
  assert.equal(isInReadingPosition(120, 600), true)
  assert.equal(isInReadingPosition(-100, 900), false)
  assert.equal(isInReadingPosition(800, 900), false)
  assert.equal(isInReadingPosition(250, 900), false)
})
