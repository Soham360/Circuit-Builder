export const routes = ['workspace', 'homework', 'library', 'learn'];
export function resolveRoute(hash) {
  const route = String(hash || '').replace(/^#/, '');
  return routes.includes(route) ? route : 'workspace';
}

// Homework and Workspace intentionally share the same editor DOM and document.
export function applyRoute(document, route) {
  route = resolveRoute(route);
  const homework = route === 'homework';
  document.body.classList.toggle('homework-mode', homework);
  document.body.dataset.route = route;
  for (const page of document.querySelectorAll('.page')) {
    const visible = page.id === route || (homework && page.id === 'workspace');
    page.classList.toggle('active', visible);
    page.hidden = !visible;
  }
  for (const id of ['homework-banner', 'homework-question', 'worked-solution']) {
    document.getElementById(id).hidden = !homework;
  }
  for (const button of document.querySelectorAll('[data-page]')) {
    const active = button.dataset.page === route;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  return route;
}
