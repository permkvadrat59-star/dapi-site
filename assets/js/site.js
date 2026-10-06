/* DAPI · поведение сайта
   Режим NORMAL или DAPI живет в адресе (#dapi, #normal) и в localStorage,
   поэтому сохраняется между страницами и им можно поделиться ссылкой. */
(() => {
  const root = document.documentElement;
  const KEY = 'dapi-mode';
  const BRO = 'dapi-brother';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* приватное окно */ } },
  };
  const forced = root.dataset.force || null;
  const fromHash = () => {
    const h = location.hash.slice(1).toLowerCase();
    return h === 'dapi' || h === 'normal' ? h : null;
  };

  // фраза есть только в режиме DAPI, в разметке NORMAL ее нет вовсе
  const STAMP = 'хуйню не кодим';
  const stamps = document.querySelectorAll('[data-stamp]');
  const buttons = document.querySelectorAll('[data-set-mode]');
  const inner = document.querySelectorAll('a[href$=".html"]:not([target])');

  function paint(mode) {
    root.dataset.mode = mode;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setMode === mode)));
    stamps.forEach(s => { s.textContent = mode === 'dapi' ? STAMP : ''; });
    inner.forEach(a => {
      const base = a.getAttribute('href').split('#')[0];
      a.setAttribute('href', mode === 'dapi' ? base + '#dapi' : base);
    });
  }

  function setMode(mode, origin) {
    if (mode === root.dataset.mode) return;
    const apply = () => {
      paint(mode);
      if (!forced) store.set(KEY, mode);
      history.replaceState(null, '', location.pathname + location.search + '#' + mode);
    };
    if (calm || !document.startViewTransition || !origin) {
      apply();
    } else {
      const r = origin.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const far = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.classList.add('mode-switching');
      const vt = document.startViewTransition(apply);
      vt.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${far}px at ${x}px ${y}px)`] },
          { duration: 620, easing: 'cubic-bezier(.2,.7,.2,1)', pseudoElement: '::view-transition-new(root)' },
        );
      }).catch(() => {});
      vt.finished.finally(() => root.classList.remove('mode-switching'));
    }
    if (mode === 'dapi') {
      stamps.forEach(s => {
        s.classList.remove('hit');
        void s.offsetWidth;
        s.classList.add('hit');
      });
    }
  }

  paint(forced || fromHash() || store.get(KEY) || 'normal');
  if (fromHash() && !forced) store.set(KEY, fromHash());

  buttons.forEach(b => b.addEventListener('click', () => setMode(b.dataset.setMode, b)));
  addEventListener('hashchange', () => { const m = fromHash(); if (m && !forced) setMode(m); });

  // короткая подпись на кнопке после копирования
  function flash(btn, text) {
    const label = btn.querySelector('[data-label]') || btn;
    const was = label.textContent;
    label.textContent = text;
    setTimeout(() => { label.textContent = was; }, 1600);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  }

  document.querySelectorAll('[data-share]').forEach(btn => btn.addEventListener('click', async () => {
    const url = location.origin + location.pathname + '#' + root.dataset.mode;
    flash(btn, await copy(url) ? 'Ссылка скопирована' : 'Не удалось скопировать');
  }));
  document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    flash(btn, await copy(btn.dataset.copy) ? 'Скопировано' : 'Не удалось скопировать');
  }));

  // четыре клика по логотипу на главной открывают скрытую страницу
  const nav = document.querySelector('.nav');
  const brand = document.querySelector('.brand');
  const addSecret = () => {
    if (!nav || nav.querySelector('.nav-secret')) return;
    const a = document.createElement('a');
    a.className = 'nav-secret';
    a.href = 'brother.html#dapi';
    a.textContent = '.brother';
    if (root.dataset.page === 'brother') a.setAttribute('aria-current', 'page');
    nav.append(a);
  };
  if (store.get(BRO) === '1' || root.dataset.page === 'brother') addSecret();
  if (brand && root.dataset.page === 'index') {
    const letters = brand.querySelectorAll('.wordmark span');
    let clicks = 0;
    let timer;
    brand.addEventListener('click', e => {
      e.preventDefault();
      clicks += 1;
      letters.forEach((l, i) => l.classList.toggle('on', i < clicks));
      clearTimeout(timer);
      if (clicks >= 4) {
        store.set(BRO, '1');
        setTimeout(() => { location.href = 'brother.html#dapi'; }, 260);
        return;
      }
      timer = setTimeout(() => {
        clicks = 0;
        letters.forEach(l => l.classList.remove('on'));
      }, 1600);
    });
  }

  // на телефоне лента разделов прокручивается к текущему
  const current = nav && nav.querySelector('[aria-current="page"]');
  if (current && nav.scrollWidth > nav.clientWidth) {
    nav.scrollLeft += current.getBoundingClientRect().left - nav.getBoundingClientRect().left - 16;
  }

  // появление блоков при прокрутке, первый экран виден сразу
  if (!calm && 'IntersectionObserver' in window) {
    const blocks = [...document.querySelectorAll('.sec:not(:first-child) > *, .foot')];
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    blocks.forEach(el => {
      if (el.getBoundingClientRect().top < innerHeight) return;
      el.classList.add('rv');
      io.observe(el);
    });
  }
})();
