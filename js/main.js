/* Navegação e galeria da página inicial, sem bibliotecas externas. */
(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function initGallery() {
    const slider = document.getElementById('gallerySlider');
    const track = document.getElementById('galleryTrack');
    const dots = document.getElementById('galleryDots');
    const next = document.getElementById('galleryNext');
    const previous = document.getElementById('galleryPrev');
    if (!slider || !track || !dots || !next || !previous) return;
    const slides = Array.from(track.children);
    if (!slides.length) return;
    const region = slider.closest('section');
    const duration = 650;
    let visible = 1;
    let index = 1;
    let step = 0;
    let position = 0;
    let moving = false;
    let gesture = null;
    let hovered = false;
    let inView = false;
    let timer = 0;
    let settleTimer = 0;
    let dragFrame = 0;
    let resizeFrame = 0;
    let lastWidth = 0;

    slider.setAttribute('role', 'region');
    slider.setAttribute('aria-roledescription', 'carrossel');
    slider.setAttribute('aria-label', 'Resultados dos serviços: use as setas do teclado para navegar');
    slider.tabIndex = 0;
    const realIndex = () => ((index - visible) % slides.length + slides.length) % slides.length;
    const visibleCount = () => window.innerWidth <= 768 ? 1 : window.innerWidth <= 992 ? 2 : 3;

    function updateDots() {
      Array.from(dots.children).forEach((dot, dotIndex) => {
        const active = dotIndex === realIndex();
        dot.classList.toggle('active', active);
        if (active) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    }

    function stopAuto() { window.clearTimeout(timer); }
    function syncAuto() {
      stopAuto();
      if (reducedMotion.matches || !inView || document.hidden || hovered || gesture ||
          moving || region.contains(document.activeElement)) return;
      timer = window.setTimeout(() => go(index + 1), 4800);
    }

    function place(value, animated = false) {
      track.style.transition = animated
        ? `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none';
      track.style.transform = `translate3d(${value}px, 0, 0)`;
      position = value;
    }

    function settle() {
      window.clearTimeout(settleTimer);
      moving = false;
      const canonical = visible + realIndex();
      if (canonical !== index) { index = canonical; place(-index * step); }
      updateDots();
      syncAuto();
    }

    function go(target) {
      if (moving) return;
      stopAuto();
      index = target;
      const offset = -index * step;
      const animate = !reducedMotion.matches && Math.abs(offset - position) > 0.5;
      moving = animate;
      place(offset, animate);
      updateDots();
      if (animate) settleTimer = window.setTimeout(settle, duration + 90);
      else settle();
    }

    slides.forEach((slide, slideIndex) => {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-label', `Resultado ${slideIndex + 1} de ${slides.length}`);
      slide.querySelectorAll('img').forEach(img => { img.draggable = false; });
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'gallery-dot';
      dot.setAttribute('aria-label', `Mostrar resultado ${slideIndex + 1} de ${slides.length}`);
      dot.addEventListener('click', () => go(visible + slideIndex));
      dots.appendChild(dot);
    });

    function clone(slide) {
      const copy = slide.cloneNode(true);
      copy.classList.add('clone');
      copy.setAttribute('aria-hidden', 'true');
      copy.removeAttribute('aria-label');
      return copy;
    }

    function build() {
      const width = slider.getBoundingClientRect().width;
      const count = visibleCount();
      if (Math.abs(width - lastWidth) < 0.5 && count === visible && step) return;
      const current = step ? realIndex() : 0;
      stopAuto();
      window.clearTimeout(settleTimer);
      cancelAnimationFrame(dragFrame);
      gesture = null;
      moving = false;
      track.classList.remove('dragging');
      visible = count;
      lastWidth = width;
      track.querySelectorAll('.clone').forEach(item => item.remove());
      // prepend(...items) mantém a ordem das imagens também na volta do loop.
      track.prepend(...slides.slice(-visible).map(clone));
      track.append(...slides.slice(0, visible).map(clone));
      step = slides[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(track).gap) || 0);
      index = visible + current;
      place(-index * step);
      updateDots();
      syncAuto();
    }

    track.addEventListener('transitionend', event => {
      if (event.target === track && event.propertyName === 'transform') settle();
    });
    next.addEventListener('click', () => go(index + 1));
    previous.addEventListener('click', () => go(index - 1));
    slider.addEventListener('keydown', event => {
      if (event.target !== slider) return;
      const target = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: visible,
        End: visible + slides.length - 1 }[event.key];
      if (target !== undefined) { event.preventDefault(); go(target); }
    });

    slider.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') { hovered = true; stopAuto(); }
    });
    slider.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse') { hovered = false; syncAuto(); }
    });
    region.addEventListener('focusin', stopAuto);
    region.addEventListener('focusout', () => requestAnimationFrame(syncAuto));

    slider.addEventListener('pointerdown', event => {
      if (moving || gesture || !event.isPrimary || event.button !== 0 || event.target.closest('button, a')) return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, axis: null };
      stopAuto();
    });
    window.addEventListener('pointermove', event => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (!gesture.axis) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 7) return;
        gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (gesture.axis === 'x') {
          slider.setPointerCapture(event.pointerId);
          track.classList.add('dragging');
        }
      }
      if (gesture.axis !== 'x') return;
      gesture.dx = Math.max(-step, Math.min(step, dx));
      if (!dragFrame) dragFrame = requestAnimationFrame(() => {
        dragFrame = 0;
        if (gesture) place(-index * step + gesture.dx);
      });
    }, { passive: true });

    function endGesture(event) {
      if (!gesture || gesture.id !== event.pointerId) return;
      const ended = gesture;
      gesture = null;
      cancelAnimationFrame(dragFrame);
      dragFrame = 0;
      track.classList.remove('dragging');
      if (slider.hasPointerCapture(event.pointerId)) slider.releasePointerCapture(event.pointerId);
      if (ended.axis === 'x') {
        const threshold = Math.min(110, step * 0.16);
        const direction = event.type === 'pointercancel' || Math.abs(ended.dx) < threshold
          ? 0 : ended.dx < 0 ? 1 : -1;
        go(index + direction);
      } else syncAuto();
    }
    window.addEventListener('pointerup', endGesture);
    window.addEventListener('pointercancel', endGesture);
    slider.addEventListener('lostpointercapture', endGesture);
    slider.addEventListener('dragstart', event => event.preventDefault());

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
        syncAuto();
      }, { threshold: 0.12 }).observe(slider);
    } else inView = true;
    const scheduleBuild = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(build);
    };
    if ('ResizeObserver' in window) new ResizeObserver(scheduleBuild).observe(slider);
    window.addEventListener('resize', scheduleBuild, { passive: true });
    document.addEventListener('visibilitychange', syncAuto);
    window.addEventListener('pagehide', stopAuto);
    window.addEventListener('pageshow', syncAuto);
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) { place(-index * step); settle(); }
      syncAuto();
    });
    build();
  }

  function initMenu() {
    const menu = document.getElementById('mobileMenu');
    const backdrop = document.getElementById('mobileMenuBackdrop');
    const toggle = document.getElementById('mobileMenuToggle');
    const close = document.getElementById('mobileMenuClose');
    if (!menu || !backdrop || !toggle || !close) return;
    const background = Array.from(document.querySelectorAll('body > header, body > main, body > footer, .float-contact'));
    const inertBefore = new Map();
    let previousOverflow = '';
    let opened = false;
    toggle.setAttribute('aria-controls', 'mobileMenu');
    toggle.setAttribute('aria-expanded', 'false');
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', 'Menu principal');
    menu.inert = true;

    function openMenu() {
      if (opened) return;
      opened = true;
      previousOverflow = document.body.style.overflow;
      menu.inert = false;
      menu.classList.add('active');
      backdrop.classList.add('active');
      menu.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      close.focus({ preventScroll: true });
      background.forEach(element => { inertBefore.set(element, element.inert); element.inert = true; });
    }

    function closeMenu() {
      if (!opened) return;
      opened = false;
      background.forEach(element => { element.inert = inertBefore.get(element); });
      document.body.style.overflow = previousOverflow;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus({ preventScroll: true });
      menu.inert = true;
      menu.classList.remove('active');
      backdrop.classList.remove('active');
      menu.setAttribute('aria-hidden', 'true');
    }

    toggle.addEventListener('click', openMenu);
    close.addEventListener('click', closeMenu);
    backdrop.addEventListener('click', closeMenu);
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
      if (!opened) return;
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(); }
      if (event.key === 'Tab') {
        const focusable = Array.from(menu.querySelectorAll('a[href], button:not([disabled])'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 860) closeMenu(); }, { passive: true });
  }

  function initSmoothNavigation() {
    const header = document.querySelector('.header');
    let animationFrame = null;

    // Rolagem própria para ficar consistente e realmente suave em todos os navegadores.
    // A duração aumenta um pouco em trajetos longos, sem ficar lenta demais.
    function animateScroll(destination) {
      if (animationFrame) cancelAnimationFrame(animationFrame);

      const start = window.scrollY;
      const distance = destination - start;
      const absoluteDistance = Math.abs(distance);

      if (absoluteDistance < 2) {
        window.scrollTo(0, destination);
        return;
      }

      const duration = Math.min(1150, Math.max(720, 680 + absoluteDistance * 0.11));
      const startedAt = performance.now();

      // Ease in/out cúbico: acelera naturalmente e desacelera antes de chegar.
      const easeInOutCubic = progress =>
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      function step(now) {
        const elapsed = now - startedAt;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);

        window.scrollTo(0, start + distance * eased);

        if (progress < 1) {
          animationFrame = requestAnimationFrame(step);
        } else {
          animationFrame = null;
          window.scrollTo(0, destination);
        }
      }

      animationFrame = requestAnimationFrame(step);
    }

    function targetTop(target) {
      const headerHeight = header ? header.getBoundingClientRect().height : 0;
      return Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerHeight - 18);
    }

    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', event => {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;

        const target = document.querySelector(href);
        if (!target) return;

        event.preventDefault();
        animateScroll(targetTop(target));

        if (window.location.hash !== href) {
          history.pushState(null, '', href);
        }
      });
    });

    // Se o usuário começar a rolar manualmente durante a animação, devolve o controle na hora.
    const stopAnimation = () => {
      if (!animationFrame) return;
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    };

    window.addEventListener('wheel', stopAnimation, { passive: true });
    window.addEventListener('touchstart', stopAnimation, { passive: true });
  }

  initGallery();
  initMenu();
  initSmoothNavigation();
})();
