/* Animações progressivas: o conteúdo nunca depende de uma classe para aparecer. */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const running = new Map();
  const seen = new WeakSet();
  const canAnimate = typeof Element.prototype.animate === 'function';

  function animate(element, frames, options) {
    if (!canAnimate || reducedMotion.matches) return;
    const animation = element.animate(frames, options);
    running.set(animation, element);
    const cleanup = () => running.delete(animation);
    animation.addEventListener('finish', cleanup, { once: true });
    animation.addEventListener('cancel', cleanup, { once: true });
    return animation;
  }

  const header = document.querySelector('.header');
  function updateHeaderOffset() {
    if (header) {
      document.documentElement.style.setProperty('--header-offset', `${header.offsetHeight + 18}px`);
    }
  }
  updateHeaderOffset();
  if (header && 'ResizeObserver' in window) {
    new ResizeObserver(updateHeaderOffset).observe(header);
  } else {
    window.addEventListener('resize', updateHeaderOffset, { passive: true });
  }

  const targets = new Map();
  function addGroup(selector, step = 70) {
    document.querySelectorAll(selector).forEach((element, index) => {
      targets.set(element, Math.min(index * step, 240));
    });
  }

  addGroup('.hero-content > h1, .hero-content > p, .hero-actions', 90);
  addGroup('.hero-features li', 65);
  addGroup('.service-hero-copy > :not(.service-trust)', 65);
  addGroup('.service-trust li', 55);
  addGroup('.service-hero-media');
  addGroup('.section-head, .process-head, .service-section-head', 0);
  addGroup('.cards > .card');
  addGroup('.process-video-card');
  addGroup('.testimonials-grid > .testimonial-card', 55);
  addGroup('.split > .about-box', 100);
  addGroup('.service-benefit');
  addGroup('.service-process-intro, .service-step', 60);
  addGroup('.coverage-card, .service-seo-links', 0);
  addGroup('.service-faq', 55);
  addGroup('.related-card', 70);
  addGroup('.cta-box > :not(.ornament)', 65);

  function reveal(element, delay) {
    if (seen.has(element)) return;
    seen.add(element);
    if (element.contains(document.activeElement)) return;
    animate(element, [
      { opacity: 0, translate: '0 22px' },
      { opacity: 1, translate: '0 0' }
    ], { duration: 680, delay, easing, fill: 'backwards' });
  }

  if (canAnimate && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        reveal(entry.target, targets.get(entry.target) || 0);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -18px 0px' });
    targets.forEach((_, element) => observer.observe(element));
  }

  const heroPhoto = document.querySelector('.hero-photo');
  if (heroPhoto && window.scrollY < window.innerHeight / 2) {
    animate(heroPhoto, [{ transform: 'scale(1.055)' }, { transform: 'scale(1)' }],
      { duration: 1700, easing, fill: 'backwards' });
  }

  // Cancelar a entrada evita que um elemento focado fique temporariamente invisível.
  document.addEventListener('focusin', event => {
    running.forEach((element, animation) => {
      if (element.contains(event.target)) animation.cancel();
    });
  });

  // FAQ nativo preservado, com altura animada ao abrir e fechar.
  const finishFaqs = [];
  document.querySelectorAll('.service-faq').forEach(details => {
    const summary = details.querySelector('summary');
    if (!summary || !canAnimate) return;
    let animation = null;
    let expanded = details.open;

    const finish = () => {
      if (!animation) return;
      if (animation) {
        animation.onfinish = null;
        animation.cancel();
        animation = null;
      }
      details.open = expanded;
      delete details.dataset.collapsing;
    };
    finishFaqs.push(finish);

    summary.addEventListener('click', event => {
      if (reducedMotion.matches) return;
      event.preventDefault();
      if (!animation) expanded = details.open;
      expanded = !expanded;
      const start = details.getBoundingClientRect().height;
      if (animation) {
        animation.onfinish = null;
        animation.cancel();
      }
      details.open = true;
      details.toggleAttribute('data-collapsing', !expanded);
      const style = getComputedStyle(details);
      const closedHeight = summary.getBoundingClientRect().height +
        parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const end = expanded ? details.getBoundingClientRect().height : closedHeight;
      animation = details.animate([{ height: `${start}px` }, { height: `${end}px` }],
        { duration: 340, easing });
      animation.onfinish = finish;
    });
  });

  // Vídeos de bastidores: comportamento de GIF, sem controles.
  const videos = Array.from(document.querySelectorAll('.process-video-card video'));
  const visibleVideos = new Set();

  function syncVideos() {
    videos.forEach(video => {
      video.controls = false;
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      if (document.hidden || !visibleVideos.has(video)) {
        video.pause();
      } else {
        const promise = video.play();
        if (promise) promise.catch(() => {});
      }
    });
  }

  videos.forEach(video => {
    video.controls = false;
    video.removeAttribute('controls');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
  });

  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleVideos.add(entry.target);
        else visibleVideos.delete(entry.target);
      });
      syncVideos();
    }, { threshold: 0.08 });
    videos.forEach(video => videoObserver.observe(video));
  } else {
    videos.forEach(video => visibleVideos.add(video));
  }

  syncVideos();
  document.addEventListener('visibilitychange', syncVideos);
  window.addEventListener('pagehide', () => videos.forEach(video => video.pause()));
  window.addEventListener('pageshow', syncVideos);

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      running.forEach((_, animation) => animation.cancel());
      finishFaqs.forEach(finish => finish());
    }
    syncVideos();
  });
})();
