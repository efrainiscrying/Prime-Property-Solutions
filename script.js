'use strict';

(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('#mobile-menu');
  const menuToggle = document.querySelector('.menu-toggle');
  const main = document.querySelector('main');
  const footer = document.querySelector('.footer');
  const mobileContact = document.querySelector('.mobile-contact');

  function setMenu(open, returnFocus = true) {
    menu.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    document.body.classList.toggle('menu-open', open);
    [main, footer, mobileContact].forEach(element => { element.inert = open; });
    if (open) menu.querySelector('a').focus();
    else if (returnFocus) menuToggle.focus();
  }
  menuToggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    setMenu(false, false);
    if (link.hash) {
      const target = document.getElementById(link.hash.slice(1));
      if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    }
  }));
  document.addEventListener('keydown', event => {
    if (menu.hidden) return;
    if (event.key === 'Escape') setMenu(false);
    if (event.key !== 'Tab') return;
    const elements = [menuToggle, ...menu.querySelectorAll('a')];
    const index = elements.indexOf(document.activeElement);
    if (event.shiftKey && index <= 0) {
      event.preventDefault(); elements.at(-1).focus();
    } else if (!event.shiftKey && (index === elements.length - 1 || index === -1)) {
      event.preventDefault(); elements[0].focus();
    }
  });
  const mobileWidth = window.matchMedia('(max-width: 900px)');
  mobileWidth.addEventListener('change', event => {
    if (!event.matches && !menu.hidden) setMenu(false, false);
  });

  // Scroll work is batched into a single frame; there is no permanent animation loop.
  let scrollPending = false;
  function updateScroll() {
    const total = root.scrollHeight - window.innerHeight;
    header.classList.toggle('scrolled', window.scrollY > 20);
    header.style.setProperty('--progress', total > 0 ? Math.min(1, window.scrollY / total) : 0);
    scrollPending = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });
  updateScroll();

  if ('IntersectionObserver' in window) {
    const reveals = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.removeAttribute('data-pending');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    reveals.forEach(element => {
      if (!reducedMotion.matches && element.getBoundingClientRect().top >= window.innerHeight) {
        element.setAttribute('data-pending', '');
        revealObserver.observe(element);
      }
    });
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const link = document.querySelector(`.desktop-nav a[href="#${entry.target.id}"]`);
        if (link) {
          if (entry.isIntersecting) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-20% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(section => sectionObserver.observe(section));
    const contactObserver = new IntersectionObserver(entries => {
      document.body.classList.toggle('contact-in-view', entries[0].isIntersecting);
    }, { threshold: 0.1 });
    contactObserver.observe(document.querySelector('#contact'));
  }

  // Honor motion/data preferences and manual pause, including after tab switches.
  const video = document.querySelector('#hero-video');
  const videoControl = document.querySelector('#video-control');
  let videoWanted = !reducedMotion.matches && !navigator.connection?.saveData;
  let heroVisible = true;
  let videoStarted = false;
  function videoUI() {
    const playing = !video.paused && !video.ended;
    videoControl.setAttribute('aria-label', playing ? 'Pause background video' : 'Play background video');
    videoControl.querySelector('.video-label').textContent = playing ? 'Pause video' : 'Play video';
    videoControl.querySelector('.play-symbol').textContent = playing ? 'Ⅱ' : '▶';
    if (playing) video.classList.add('is-playing');
  }
  function syncVideo() {
    if (!videoWanted || !heroVisible || document.hidden) { video.pause(); return; }
    if (!videoStarted) {
      videoStarted = true;
      video.src = video.dataset.src;
      video.muted = true;
    }
    const promise = video.play();
    if (promise) promise.catch(() => videoUI());
  }
  video.addEventListener('play', videoUI);
  video.addEventListener('pause', videoUI);
  video.addEventListener('error', () => {
    video.classList.remove('is-playing');
    videoControl.hidden = true;
  });
  videoControl.addEventListener('click', () => {
    videoWanted = video.paused;
    syncVideo();
  });
  reducedMotion.addEventListener('change', event => {
    videoWanted = !event.matches && !navigator.connection?.saveData;
    if (event.matches) document.querySelectorAll('[data-pending]').forEach(el => el.removeAttribute('data-pending'));
    syncVideo();
  });
  document.addEventListener('visibilitychange', syncVideo);
  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      syncVideo();
    }, { threshold: 0.03 });
    videoObserver.observe(document.querySelector('.hero'));
  }
  if (document.readyState === 'complete') syncVideo();
  else window.addEventListener('load', syncVideo, { once: true });

  // Original side-by-side images are presented as an accessible comparison.
  const comparison = document.querySelector('#comparison');
  const range = document.querySelector('#compare-range');
  const projectTitle = document.querySelector('#project-title');
  const originalLink = document.querySelector('#original-photo');
  const projectButtons = [...document.querySelectorAll('[data-project]')];
  const projects = [
    { title: 'Bedroom refresh', file: 'work-1.png', size: '214%', before: '4%', after: '96%', y: '64%' },
    { title: 'Doors & trim', file: 'work-2.png', size: '218%', before: '4%', after: '95%', y: '100%' },
    { title: 'Wall repair & paint', file: 'work-3.png', size: '263%', before: '4%', after: '96%', y: '76%' },
    { title: 'Utility area refresh', file: 'work-4.png', size: '261%', before: '4%', after: '96%', y: '65%' }
  ];
  function updateComparison() {
    comparison.style.setProperty('--split', `${range.value}%`);
    range.setAttribute('aria-valuetext', `${range.value} percent before, ${100 - Number(range.value)} percent after`);
  }
  range.addEventListener('input', updateComparison);
  let projectRequest = 0;
  async function selectProject(index) {
    const request = ++projectRequest;
    const project = projects[index];
    const image = new Image();
    image.src = project.file;
    try { await image.decode(); }
    catch {
      if (request === projectRequest) projectTitle.textContent = 'Photo could not load. Please try again.';
      return;
    }
    if (request !== projectRequest) return;
    comparison.style.setProperty('--photo', `url('${project.file}')`);
    comparison.style.setProperty('--photo-size', project.size);
    comparison.style.setProperty('--before-x', project.before);
    comparison.style.setProperty('--after-x', project.after);
    comparison.style.setProperty('--photo-y', project.y);
    projectTitle.textContent = project.title;
    document.querySelector('#comparison-caption').textContent = `${project.title}: compare the before and after painting photos.`;
    comparison.querySelector('.before').setAttribute('aria-label', `${project.title} before painting`);
    comparison.querySelector('.after').setAttribute('aria-label', `${project.title} after painting`);
    originalLink.href = project.file;
    range.value = 50;
    updateComparison();
    projectButtons.forEach((button, buttonIndex) => {
      button.classList.toggle('active', index === buttonIndex);
      button.setAttribute('aria-pressed', String(index === buttonIndex));
    });
    if (!reducedMotion.matches) comparison.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 350, easing: 'ease-out' });
  }
  projectButtons.forEach(button => button.addEventListener('click', () => selectProject(Number(button.dataset.project))));

  // Requests are composed locally and sent only by the visitor in their own app.
  const service = document.querySelector('#estimate-service');
  const property = document.querySelector('#estimate-property');
  const details = document.querySelector('#estimate-details');
  const textLink = document.querySelector('#estimate-text');
  const emailLink = document.querySelector('#estimate-email');
  function updateEstimate() {
    const message = `Hello Everstone Property Solutions,\n\nI'd like to request a free estimate.\nService: ${service.value}\nProperty: ${property.value}\n${details.value.trim() ? `Details: ${details.value.trim()}\n` : ''}\nThank you!`;
    const body = encodeURIComponent(message);
    // iOS uses an ampersand before the body; Android uses a query parameter.
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    textLink.href = `sms:+14708701416${ios ? '&' : '?'}body=${body}`;
    emailLink.href = `mailto:info@everstoneps.com?subject=${encodeURIComponent(`Free estimate — ${service.value}`)}&body=${body}`;
  }
  [service, property, details].forEach(input => input.addEventListener('input', updateEstimate));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    service.value = link.dataset.service;
    updateEstimate();
  }));
  updateEstimate();
  document.querySelector('#year').textContent = String(new Date().getFullYear());
})();
