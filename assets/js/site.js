/* DAPI · поведение сайта
   У сайта три состояния одной системы: NORMAL, DAPI и скрытое BROTHER.
   NORMAL и DAPI переключаются в левой колонке, живут в адресе (#normal, #dapi)
   и в localStorage, поэтому сохраняются между страницами и ими можно поделиться.
   BROTHER существует только на скрытой странице и включается четырьмя кликами по логотипу. */
(() => {
  const root = document.documentElement;
  const KEY = 'dapi-mode';
  const PASS = 'dapi-brother-pass';
  const STATES = { normal: '01', dapi: '02', brother: '03' };
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

  // фраза есть только в выразительных состояниях, в разметке NORMAL ее нет вовсе
  const STAMP = 'хуйню не кодим';
  const stamps = document.querySelectorAll('[data-stamp]');
  const buttons = document.querySelectorAll('[data-set-mode]');
  const readouts = document.querySelectorAll('[data-state]');
  const inner = document.querySelectorAll('a[href$=".html"]:not([target])');

  function paint(mode) {
    root.dataset.mode = mode;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setMode === mode)));
    stamps.forEach(s => { s.textContent = mode === 'normal' ? '' : STAMP; });
    readouts.forEach(r => { r.textContent = `State ${STATES[mode]} / 03`; });
    inner.forEach(a => {
      const base = a.getAttribute('href').split('#')[0];
      a.setAttribute('href', mode === 'dapi' ? base + '#dapi' : base);
    });
  }

  function setMode(mode) {
    if (mode === root.dataset.mode || mode === 'brother') return;
    if (forced) {
      // из третьего состояния выход ведет на главную в выбранном состоянии
      store.set(KEY, mode);
      location.href = 'index.html#' + mode;
      return;
    }
    const apply = () => {
      paint(mode);
      store.set(KEY, mode);
      history.replaceState(null, '', location.pathname + location.search + '#' + mode);
    };
    if (calm || !document.startViewTransition) {
      apply();
    } else {
      // объекты с именами перетекают из старой формы в новую, см. блок «движение» в стилях
      root.classList.add('mode-switching');
      document.startViewTransition(apply).finished.finally(() => root.classList.remove('mode-switching'));
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

  buttons.forEach(b => b.addEventListener('click', () => setMode(b.dataset.setMode)));
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
  // пункт .brother виден только на самой скрытой странице, ярлыка в меню нет
  if (nav && root.dataset.page === 'brother') {
    const a = document.createElement('a');
    a.className = 'nav-secret';
    a.href = 'brother.html';
    a.textContent = '.brother';
    a.setAttribute('aria-current', 'page');
    nav.append(a);
  }
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
        // пропуск живет в этой вкладке, по прямой ссылке страница не открывается
        try { sessionStorage.setItem(PASS, '1'); } catch { /* нет доступа */ }
        setTimeout(() => { location.href = 'brother.html'; }, 260);
        return;
      }
      timer = setTimeout(() => {
        clicks = 0;
        letters.forEach(l => l.classList.remove('on'));
      }, 1600);
    });
  }

  // кадр с людьми на первом экране: команда сменяется сама каждые две секунды, по клику следующий
  document.querySelectorAll('[data-people]').forEach(box => {
    const slides = [...box.querySelectorAll('[data-slide]')];
    const frame = box.querySelector('.people-frame');
    const name = box.querySelector('[data-people-name]');
    const count = box.querySelector('[data-people-count]');
    if (slides.length < 2 || !frame) return;
    const two = n => String(n).padStart(2, '0');
    let i = 0;
    let timer = 0;
    const show = n => {
      slides[i].classList.remove('is-on');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-on');
      if (name) name.textContent = `${slides[i].dataset.letter} / ${slides[i].dataset.name}`;
      if (count) count.textContent = `${two(i + 1)} / ${two(slides.length)}`;
    };
    const stop = () => clearInterval(timer);
    const start = () => {
      stop();
      timer = setInterval(() => show(i + 1), 2000);
    };
    frame.addEventListener('click', () => { show(i + 1); start(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    start();
  });

  // на сенсорном экране буква открывает человека по касанию
  document.querySelectorAll('.letter').forEach(l => l.addEventListener('click', () => {
    const on = !l.classList.contains('is-person');
    document.querySelectorAll('.letter.is-person').forEach(x => x.classList.remove('is-person'));
    l.classList.toggle('is-person', on);
  }));

  // маленький экран приложения идет за курсором в пределах своей строки
  const hover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.querySelectorAll('.apps > li').forEach(li => {
    const peek = li.querySelector('.peek');
    if (!peek) return;
    const video = peek.querySelector('video');
    const play = on => {
      if (!video) return;
      if (on) video.play().catch(() => {}); else video.pause();
    };
    if (!hover) {
      if (video && 'IntersectionObserver' in window) {
        new IntersectionObserver(es => es.forEach(en => play(en.isIntersecting)), { threshold: 0.5 }).observe(peek);
      }
      return;
    }
    let x = null;
    let target = 0;
    let raf = 0;
    const step = () => {
      raf = 0;
      x += (target - x) * 0.2;
      li.style.setProperty('--dx', x.toFixed(1) + 'px');
      if (Math.abs(target - x) > 0.5) raf = requestAnimationFrame(step);
    };
    li.addEventListener('pointermove', e => {
      const r = li.getBoundingClientRect();
      const free = r.width - peek.offsetWidth;
      const left = Math.max(0, Math.min(free, e.clientX - r.left + 28));
      target = left - free;
      if (x === null || calm) {
        x = target;
        li.style.setProperty('--dx', x + 'px');
      } else if (!raf) {
        raf = requestAnimationFrame(step);
      }
    });
    li.addEventListener('pointerenter', () => play(true));
    li.addEventListener('pointerleave', () => { play(false); x = null; });
  });

  // на телефоне лента разделов прокручивается к текущему
  const current = nav && nav.querySelector('[aria-current="page"]');
  if (current && nav.scrollWidth > nav.clientWidth) {
    const c = current.getBoundingClientRect();
    const n = nav.getBoundingClientRect();
    if (c.right > n.right - 16 || c.left < n.left) nav.scrollLeft += c.left - n.left - 16;
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
