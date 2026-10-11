export const sections = ['inicio', 'sobre', 'experiencia', 'habilidades', 'formacao', 'contato']

export function navigationTarget(reply, profile) {
  if (!reply || typeof reply.target !== 'string') return null
  if (reply.action === 'navigate_section') {
    const allowed = profile.projects.length ? [...sections, 'projetos'] : sections
    return allowed.includes(reply.target) ? reply.target : null
  }
  if (reply.action === 'highlight_project') {
    return profile.projects.some(project => `projeto-${project.id}` === reply.target) ? reply.target : null
  }
  return null
}

export function isInReadingPosition(top, viewportHeight) {
  return top >= 25 && top <= Math.min(viewportHeight * .3, 220)
}
