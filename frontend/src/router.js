// Tiny hash router: #/home, #/design, #/estimate, #/assistant, #/projects
const routes = {};
export function route(name, page) { routes[name] = page; }
export function startRouter(mount) {
  const go = () => {
    const name = (location.hash.replace('#/', '') || 'home').split('?')[0];
    const page = routes[name] || routes.home;
    const key = routes[name] ? name : 'home';
    mount.innerHTML = page.html();
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === key));
    document.body.dataset.page = key;
    document.getElementById('lk')?.classList.remove('open');
    window.scrollTo(0, 0);
    page.mount && page.mount(mount);
  };
  window.addEventListener('hashchange', go);
  go();
}
