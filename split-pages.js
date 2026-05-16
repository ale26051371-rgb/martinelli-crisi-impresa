#!/usr/bin/env node
/**
 * Split script: converte il single-page index.html in 7 file HTML statici.
 * Eseguire con: node split-pages.js
 * NON modifica l'index.html originale (lo rinomina in index-spa.html come backup).
 */

const fs = require('fs');
const path = require('path');

const srcFile = fs.existsSync(path.join(__dirname, 'index-spa.html')) ? 'index-spa.html' : 'index.html';
const src = fs.readFileSync(path.join(__dirname, srcFile), 'utf-8');
const lines = src.split('\n');

// === PAGE DEFINITIONS ===
const pages = [
  { id: 'home', file: 'index.html', title: 'Martinelli — Crisi d\'Impresa | Ristrutturiamo il debito. Difendiamo la continuità.', desc: 'Boutique specializzata nella ristrutturazione della crisi e nella difesa della continuità aziendale. Composizione negoziata, transazione fiscale, accordi con banche e fornitori.', theme: 'dark', num: '01' },
  { id: 'studio', file: 'studio.html', title: 'Studio | Martinelli — Crisi d\'Impresa', desc: 'Chi siamo: boutique dedicata esclusivamente alla ristrutturazione della crisi d\'impresa e alla difesa della continuità aziendale.', theme: 'light', num: '02' },
  { id: 'soluzioni', file: 'soluzioni.html', title: 'Soluzioni | Martinelli — Crisi d\'Impresa', desc: 'Composizione negoziata, transazione fiscale, accordi bancari, piani di risanamento e sovraindebitamento. Gli strumenti del Codice della Crisi.', theme: 'dark', num: '03' },
  { id: 'metodo', file: 'metodo.html', title: 'Metodo | Martinelli — Crisi d\'Impresa', desc: 'Il nostro metodo in 5 fasi per la ristrutturazione del debito e la difesa della continuità aziendale.', theme: 'light', num: '04' },
  { id: 'casi', file: 'casi.html', title: 'Casi | Martinelli — Crisi d\'Impresa', desc: 'Tipologie di intervento nella crisi d\'impresa: composizione negoziata, transazione fiscale, accordi di ristrutturazione.', theme: 'dark', num: '05' },
  { id: 'osservatorio', file: 'osservatorio.html', title: 'Osservatorio | Martinelli — Crisi d\'Impresa', desc: 'Pubblicazioni, rassegna stampa e contributi dottrinali sulla crisi d\'impresa e il Codice della Crisi.', theme: 'light', num: '06' },
  { id: 'faq', file: 'faq.html', title: 'FAQ | Martinelli — Crisi d\'Impresa', desc: 'Domande frequenti sulla crisi d\'impresa, la composizione negoziata, la transazione fiscale e le procedure del CCII.', theme: 'light', num: '07' },
];

// === FIND LINE BOUNDARIES ===
function findLine(pattern, startFrom = 0) {
  for (let i = startFrom; i < lines.length; i++) {
    if (lines[i].includes(pattern)) return i;
  }
  return -1;
}

function findLineRegex(regex, startFrom = 0) {
  for (let i = startFrom; i < lines.length; i++) {
    if (regex.test(lines[i])) return i;
  }
  return -1;
}

// CSS block: from <style> to </style>
const styleStart = findLine('<style>');
const styleEnd = findLine('</style>');

// Head content before <style> (meta, links, etc) - lines 1 to styleStart-1
const headBeforeStyle = lines.slice(0, styleStart); // includes <!DOCTYPE> to line before <style>

// CSS content
const cssContent = lines.slice(styleStart, styleEnd + 1).join('\n');

// Scripts in <head> (GSAP, Lenis) - between </style> and </head>
const headAfterStyle = [];
for (let i = styleEnd + 1; i < lines.length; i++) {
  if (lines[i].includes('</head>')) break;
  headAfterStyle.push(lines[i]);
}

// Find page section boundaries
function findPageStart(pageId) {
  return findLine(`data-page="${pageId}"`);
}

function findPageEnd(pageId) {
  const start = findPageStart(pageId);
  // Find the matching closing: <!-- /PAGE_NAME --> or the next page start or </main>
  // The pages end with </section>\n</section> or </section>\n<!-- /NAME -->
  // Let's find the next data-page or </main>
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].match(/^<section class="page" data-page="/) || lines[i].includes('</main>')) {
      // Go back to find the </section> before this
      let j = i - 1;
      while (j > start && lines[j].trim() === '') j--;
      // Should be at <!-- /NAME --> or </section>
      return j;
    }
  }
  return -1;
}

// Find shared HTML elements
const floatingCtaStart = findLine('class="floating-cta"');
const floatingCtaEnd = findLine('</a>', floatingCtaStart);

const transitionStart = findLine('id="pageTransition"') - 1; // include comment
const transitionEnd = findLine('</div>', findLine('id="pageTransition"'));

const navStart = findLine('<nav class="nav');
const navEnd = findLine('</nav>');

const mobileMenuStart = findLine('id="mobileMenu"') - 3;
const mobileMenuEnd = findLine('</div>', findLine('class="mobile-menu-foot"') + 4);

// CTA Modal - from comment to closing div
const ctaModalCommentStart = findLine('CTA EXPAND MODAL') - 1;
const ctaModalStart = findLine('id="ctaModal"');
// Find its end - it's a complex nested div. Let's find the line with just </div> after form
const ctaFormSuccess = findLine('id="ctaFormSuccess"');
let ctaModalEnd = ctaFormSuccess;
// Go forward to find closing divs
let divDepth = 0;
for (let i = ctaModalStart; i < lines.length; i++) {
  const opens = (lines[i].match(/<div/g) || []).length;
  const closes = (lines[i].match(/<\/div>/g) || []).length;
  divDepth += opens - closes;
  if (divDepth <= 0) {
    ctaModalEnd = i;
    break;
  }
}

// Footer
const footerStart = findLine('<footer class="footer">');
const footerEnd = findLine('</footer>');

// Mobile sticky CTA
const mobileStickyStart = findLine('class="mobile-sticky-cta"');
const mobileStickyEnd = findLine('</div>', findLine('class="msc-form"'));

// Main JS block
const scriptStart = findLine('<script>', findLine('SCRIPTS') - 2);
const scriptEnd = findLine('</script>', scriptStart);

// Iubenda block — head widget (cookie consent banner)
const iubendaHeadStart = findLine('IUBENDA', styleEnd) - 1;
const iubendaHeadEnd = findLine('</script>', findLine('embeds.iubenda.com'));

// Iubenda block — footer loader (embed overlay + cookie preferences)
const iubendaFooterStart = findLine('IUBENDA', scriptEnd) - 1;
const iubendaCookiePrefLine = findLine('iubenda-cs-preferences-link', scriptEnd);
const iubendaFooterEnd = findLine('</script>', iubendaCookiePrefLine);

// Legacy aliases for rest of script
const iubendaStart = iubendaHeadStart;
const cookiePrefEnd = iubendaFooterEnd;

console.log('=== Line boundaries found ===');
console.log(`CSS: ${styleStart}-${styleEnd}`);
console.log(`Nav: ${navStart}-${navEnd}`);
console.log(`Mobile menu: ${mobileMenuStart}-${mobileMenuEnd}`);
console.log(`CTA Modal: ${ctaModalStart}-${ctaModalEnd}`);
console.log(`Footer: ${footerStart}-${footerEnd}`);
console.log(`Mobile sticky: ${mobileStickyStart}-${mobileStickyEnd}`);
console.log(`Main script: ${scriptStart}-${scriptEnd}`);
console.log(`Iubenda: ${iubendaStart}-${cookiePrefEnd}`);

// Page boundaries
const pageBounds = {};
for (const p of pages) {
  const start = findPageStart(p.id);
  const end = findPageEnd(p.id);
  pageBounds[p.id] = { start, end };
  console.log(`Page "${p.id}": ${start}-${end}`);
}

// === BUILD NAV HTML ===
function buildNav(activePageId, theme) {
  const menuItems = [
    { id: 'home', label: 'Home', href: 'index.html' },
    { id: 'studio', label: 'Studio', href: 'studio.html' },
    { id: 'soluzioni', label: 'Soluzioni', href: 'soluzioni.html' },
    { id: 'metodo', label: 'Metodo', href: 'metodo.html' },
    { id: 'casi', label: 'Casi', href: 'casi.html' },
    { id: 'osservatorio', label: 'Osservatorio', href: 'osservatorio.html' },
    { id: 'faq', label: 'FAQ', href: 'faq.html' },
  ];

  const lis = menuItems.map(item => {
    const activeClass = item.id === activePageId ? ' class="active"' : '';
    return `    <li><a href="${item.href}" data-page="${item.id}"${activeClass}>${item.label}</a></li>`;
  }).join('\n');

  return `<nav class="nav theme-${theme}" id="nav">
  <a href="index.html" class="nav-logo" aria-label="Martinelli — Crisi d'Impresa">
    <i class="logo-full" role="img"
       style="-webkit-mask-image: url('images/mask_01.png'); mask-image: url('images/mask_01.png'); -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center;"></i>
  </a>
  <ul class="nav-menu">
${lis}
    <li><a href="#" class="nav-cta" id="navConsulenzaBtn">Consulenza</a></li>
  </ul>
  <button class="nav-toggle" id="navToggle">Menu</button>
</nav>`;
}

// === BUILD MOBILE MENU ===
function buildMobileMenu(activePageId) {
  const items = [
    { id: 'home', label: 'Home', num: '01', href: 'index.html' },
    { id: 'studio', label: 'Studio', num: '02', href: 'studio.html' },
    { id: 'soluzioni', label: 'Soluzioni', num: '03', href: 'soluzioni.html' },
    { id: 'metodo', label: 'Metodo', num: '04', href: 'metodo.html' },
    { id: 'casi', label: 'Casi', num: '05', href: 'casi.html' },
    { id: 'osservatorio', label: 'Osservatorio', num: '06', href: 'osservatorio.html' },
    { id: 'faq', label: 'FAQ', num: '07', href: 'faq.html' },
  ];

  const lis = items.map(item => {
    return `    <li><a href="${item.href}" data-page="${item.id}">${item.label} <span class="mm-num">— ${item.num}</span></a></li>`;
  }).join('\n');

  return `<div class="mobile-menu" id="mobileMenu">
  <ul class="mobile-menu-list">
${lis}
  </ul>
  <div class="mobile-menu-foot">
    <a href="tel:+393297575459"><strong>+39 329 757 5459</strong>Telefono diretto</a>
    <a href="mailto:martinelli.crisi@gmail.com"><strong>martinelli.crisi@gmail.com</strong>Email</a>
  </div>
</div>`;
}

// === BUILD FOOTER ===
function buildFooter() {
  return `<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">Martinelli</div>
        <div class="footer-tag">— crisi d'impresa</div>
        <p class="footer-desc">Boutique specializzata nella ristrutturazione della crisi e nella difesa della continuità aziendale. Operatività su tutto il territorio nazionale.</p>
      </div>
      <div>
        <div class="footer-col-title">Studio</div>
        <ul class="footer-links">
          <li><a href="studio.html">Chi siamo</a></li>
          <li><a href="metodo.html">Metodo</a></li>
          <li><a href="casi.html">Tipologie di intervento</a></li>
          <li><a href="osservatorio.html">Osservatorio</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-col-title">Soluzioni</div>
        <ul class="footer-links">
          <li><a href="soluzioni.html">Composizione negoziata</a></li>
          <li><a href="soluzioni.html">Transazione fiscale</a></li>
          <li><a href="soluzioni.html">Accordi bancari</a></li>
          <li><a href="soluzioni.html">Piani di risanamento</a></li>
          <li><a href="soluzioni.html">Sovraindebitamento</a></li>
        </ul>
      </div>
      <div>
        <div class="footer-col-title">Contatti</div>
        <ul class="footer-links">
          <li><a href="tel:+393297575459">+39 329 757 5459</a></li>
          <li><a href="mailto:martinelli.crisi@gmail.com">martinelli.crisi@gmail.com</a></li>
          <li><a href="#" class="open-consulenza">Richiedi consulenza</a></li>
          <li><a href="faq.html">FAQ</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div>&copy; 2026 Martinelli — Crisi d'Impresa. Tutti i diritti riservati.</div>
      <div class="footer-legal">
        <a href="https://www.iubenda.com/privacy-policy/40475408" class="iubenda-white iubenda-noiframe iubenda-embed" title="Privacy Policy">Privacy Policy</a>
        <a href="https://www.iubenda.com/privacy-policy/40475408/cookie-policy" class="iubenda-white iubenda-noiframe iubenda-embed" title="Cookie Policy">Cookie Policy</a>
        <a href="#" class="iubenda-cs-preferences-link">Preferenze cookie</a>
      </div>
    </div>
  </div>
</footer>`;
}

// === BUILD MOBILE STICKY CTA ===
function buildMobileStickyCta() {
  return `<div class="mobile-sticky-cta">
  <a href="tel:+393297575459" class="msc-call">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
    Chiamaci ora
  </a>
  <a href="#" class="msc-form open-consulenza">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
    Consulenza
  </a>
</div>`;
}

// === GET CTA MODAL HTML ===
const ctaModalHtml = lines.slice(ctaModalStart, ctaModalEnd + 1).join('\n');

// === BUILD TRANSITION OVERLAY (pre-populated with current page info) ===
function buildTransitionOverlay(pageId) {
  const pageInfo = pages.find(p => p.id === pageId);
  return `<div class="page-transition" id="pageTransition">
  <div class="transition-content">
    <div class="transition-num" id="transitionNum">— ${pageInfo.num} / 07 —</div>
    <div class="transition-title" id="transitionTitle"><em>${pageInfo.file === 'index.html' ? 'Home' : pageInfo.id.charAt(0).toUpperCase() + pageInfo.id.slice(1)}</em></div>
    <div class="transition-line"></div>
  </div>
</div>`;
}

// === GET CSS (modified) ===
function getModifiedCss() {
  let css = lines.slice(styleStart + 1, styleEnd).join('\n');

  // Remove .page { display: none } and .page.active rules - content is always visible
  css = css.replace(/\.page \{ display: none; \}/, '/* page always visible */');
  css = css.replace(/\.page\.active \{ display: block; animation: pageEnter[^}]+\}/, '');

  // Add: page is always visible block
  css += `

/* === MULTI-PAGE: page always visible === */
.page { display: block; animation: pageEnter 0.5s var(--ease-out); }

/* === PAGE TRANSITION: starts visible on load (animates OUT) === */
.page-transition.exit-on-load {
  transform: translateY(0);
  pointer-events: all;
}
.page-transition.exit-on-load .transition-content {
  opacity: 1;
  transform: translateY(0);
}
.page-transition.exit-on-load .transition-line {
  transform: scaleX(1);
}
`;
  return css;
}

// === BUILD COMMON JS ===
function buildJs(pageId) {
  // Extract the JS from the original, removing the router parts
  let js = lines.slice(scriptStart + 1, scriptEnd).join('\n');

  // Remove PAGES meta object
  js = js.replace(/const PAGES = \{[\s\S]*?\};/m, '');

  // Remove routing functions
  js = js.replace(/\/\* =+\s*\n\s*ROUTING[\s\S]*?(?=\/\* =+\s*\n\s*SCROLL PROGRESS)/m, '');

  // Remove hash router + link handlers section
  js = js.replace(/\/\* =+\s*\n\s*HASH ROUTER \+ LINK HANDLERS[\s\S]*?(?=\/\* =+\s*\n\s*SCROLL PROGRESS)/m, '');

  // Remove the init function and replace with our own
  js = js.replace(/\/\* =+\s*\n\s*INIT[\s\S]*$/m, '');

  // Now build our custom init and transition logic
  const pageInfo = pages.find(p => p.id === pageId);

  const customJs = `
/* ============================================
   PAGE TRANSITION — multi-page version
   Replica fedelmente la transizione originale SPA:
   ENTER: overlay sale da sotto → mostra titolo → pausa
   EXIT:  titolo sfuma → overlay esce verso l'alto
   ============================================ */
const PAGE_META = {
  'index.html':        { num: '01', title: 'Home' },
  'studio.html':       { num: '02', title: 'Studio' },
  'soluzioni.html':    { num: '03', title: 'Soluzioni' },
  'metodo.html':       { num: '04', title: 'Metodo' },
  'casi.html':         { num: '05', title: 'Casi' },
  'osservatorio.html': { num: '06', title: 'Osservatorio' },
  'faq.html':          { num: '07', title: 'FAQ' },
};

let isNavigating = false;

/* --- PHASE 1: pagina sorgente → overlay ENTRA, poi naviga --- */
function navigateToPage(href) {
  if (isNavigating) return;
  isNavigating = true;

  const filename = href.split('/').pop() || 'index.html';
  const meta = PAGE_META[filename] || { num: '01', title: '' };

  const overlay = document.getElementById('pageTransition');
  if (!overlay || typeof gsap === 'undefined') {
    window.location.href = href;
    return;
  }

  // Popola titolo della pagina DI DESTINAZIONE
  const tNum = document.getElementById('transitionNum');
  const tTitle = document.getElementById('transitionTitle');
  if (tNum) tNum.textContent = '— ' + meta.num + ' / 07 —';
  if (tTitle) tTitle.innerHTML = '<em>' + meta.title + '</em>';

  // Salva in sessionStorage per la pagina di arrivo
  sessionStorage.setItem('transition-num', '— ' + meta.num + ' / 07 —');
  sessionStorage.setItem('transition-title', '<em>' + meta.title + '</em>');

  const content = overlay.querySelector('.transition-content');
  const line = overlay.querySelector('.transition-line');

  // Reset stato iniziale
  gsap.set(overlay, { y: '100%', display: 'flex' });
  gsap.set(content, { opacity: 0, y: 30 });
  gsap.set(line, { scaleX: 0 });
  overlay.classList.add('active');

  const tl = gsap.timeline({
    onComplete: () => { window.location.href = href; }
  });

  // Tempi identici all'originale
  tl.to(overlay, { y: 0, duration: 0.7, ease: 'power3.inOut' })
    .to(content, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.2')
    .to(line, { scaleX: 1, duration: 0.5, ease: 'power2.out' }, '-=0.3')
    .add(() => {}, '+=0.2'); // pausa per leggere il titolo, poi naviga
}

/* --- PHASE 2: pagina destinazione → overlay ESCE --- */
function exitTransition() {
  const overlay = document.getElementById('pageTransition');
  if (!overlay) return;

  const cameFromTransition = sessionStorage.getItem('page-transition-active');
  if (!cameFromTransition) {
    // Nessuna transizione: nascondi subito
    overlay.style.display = 'none';
    return;
  }
  sessionStorage.removeItem('page-transition-active');

  // Ripristina titolo salvato dalla pagina sorgente
  const savedNum = sessionStorage.getItem('transition-num');
  const savedTitle = sessionStorage.getItem('transition-title');
  const tNum = document.getElementById('transitionNum');
  const tTitle = document.getElementById('transitionTitle');
  if (savedNum && tNum) tNum.textContent = savedNum;
  if (savedTitle && tTitle) tTitle.innerHTML = savedTitle;
  sessionStorage.removeItem('transition-num');
  sessionStorage.removeItem('transition-title');

  // Overlay parte visibile (copre la pagina), poi esce
  overlay.style.display = 'flex';
  overlay.classList.add('active');

  const content = overlay.querySelector('.transition-content');
  const line = overlay.querySelector('.transition-line');

  if (typeof gsap === 'undefined') {
    overlay.style.display = 'none';
    return;
  }

  // Stato iniziale: overlay fermo, titolo visibile
  gsap.set(overlay, { y: 0 });
  gsap.set(content, { opacity: 1, y: 0 });
  gsap.set(line, { scaleX: 1 });

  // Animazione uscita: identica all'originale
  const tl = gsap.timeline();
  tl.to(content, { opacity: 0, y: -30, duration: 0.3, ease: 'power2.in' }, '+=0.2')
    .set(line, { scaleX: 0 })
    .to(overlay, { y: '-100%', duration: 0.7, ease: 'power3.inOut' }, '-=0.1')
    .set(overlay, {
      display: 'none',
      onComplete: () => overlay.classList.remove('active')
    });
}

/* Navigation link handler */
document.addEventListener('click', (e) => {
  // Handle consulenza modal triggers
  const consulenzaTrigger = e.target.closest('.nav-cta, #navConsulenzaBtn, .msc-form, .open-consulenza');
  if (consulenzaTrigger) {
    e.preventDefault();
    // close mobile menu
    const mobileMenu = document.getElementById('mobileMenu');
    const navToggle = document.getElementById('navToggle');
    if (mobileMenu) mobileMenu.classList.remove('open');
    if (navToggle) navToggle.textContent = 'Menu';
    document.body.style.overflow = '';
    if (window.openCtaModal) window.openCtaModal(consulenzaTrigger);
    return;
  }

  // Handle page navigation links
  const link = e.target.closest('a[data-page]');
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href || href === '#') return;

  // Check if it's the current page
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  const targetFile = href.split('#')[0] || currentFile;

  if (targetFile === currentFile) {
    // Same page - handle anchor
    const hash = href.split('#')[1];
    if (hash) {
      e.preventDefault();
      const el = document.getElementById(hash);
      if (el) {
        if (window.lenis) {
          window.lenis.scrollTo(el, { duration: 1.6, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
    return;
  }

  // Different page - animate transition
  e.preventDefault();
  // close mobile menu
  const mobileMenu = document.getElementById('mobileMenu');
  const navToggle = document.getElementById('navToggle');
  if (mobileMenu) mobileMenu.classList.remove('open');
  if (navToggle) navToggle.textContent = 'Menu';
  document.body.style.overflow = '';

  sessionStorage.setItem('page-transition-active', '1');
  navigateToPage(href);
});

/* Also handle the floating CTA (homepage) */
const floatingCta = document.getElementById('floatingCta');
if (floatingCta) {
  floatingCta.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.openCtaModal) window.openCtaModal(floatingCta);
  });
}

/* Prefetch pagine al hover per caricamento istantaneo */
const prefetched = new Set();
document.addEventListener('mouseover', (e) => {
  const link = e.target.closest('a[data-page]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href === '#' || prefetched.has(href)) return;
  prefetched.add(href);
  const prefetchLink = document.createElement('link');
  prefetchLink.rel = 'prefetch';
  prefetchLink.href = href;
  document.head.appendChild(prefetchLink);
}, { passive: true });

/* scrollProgress + updateScroll already declared above from original JS */

/* ============================================
   INIT
   ============================================ */
function init() {
  exitTransition();
  initRevealObserver();
  initCounters();
  initManifesto();
  initSmoothScroll();
  initMethod();
  initCalculator();
  initFAQ();
  initCasesFilter();
  initFAQPage();
  initObservatory();
  initMobileMenu();
  initFloatingCta();
  initContactForm();
  initHero();
  initPressVideo();
  initScreening();
  updateScroll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
`;

  return js + customJs;
}

// === GET IUBENDA SCRIPTS ===
const iubendaHeadHtml = lines.slice(iubendaHeadStart, iubendaHeadEnd + 1).join('\n');
const iubendaFooterHtml = lines.slice(iubendaFooterStart, iubendaFooterEnd + 1).join('\n');
const iubendaHtml = iubendaHeadHtml + '\n\n' + iubendaFooterHtml;

// === UPDATE INTERNAL LINKS IN PAGE CONTENT ===
function updateLinks(html) {
  // Replace hash routes with file links
  html = html.replace(/href="#\/home#contatti"/g, 'href="#" class="open-consulenza"');
  html = html.replace(/href="#\/home"/g, 'href="index.html"');
  html = html.replace(/href="#\/studio"/g, 'href="studio.html"');
  html = html.replace(/href="#\/soluzioni"/g, 'href="soluzioni.html"');
  html = html.replace(/href="#\/metodo"/g, 'href="metodo.html"');
  html = html.replace(/href="#\/casi"/g, 'href="casi.html"');
  html = html.replace(/href="#\/osservatorio"/g, 'href="osservatorio.html"');
  html = html.replace(/href="#\/faq"/g, 'href="faq.html"');
  html = html.replace(/href="#\/lavora-con-noi"/g, 'href="index.html"');

  // Convert data-route to data-page for the navigation handler
  html = html.replace(/data-route="home"/g, 'data-page="home"');
  html = html.replace(/data-route="studio"/g, 'data-page="studio"');
  html = html.replace(/data-route="soluzioni"/g, 'data-page="soluzioni"');
  html = html.replace(/data-route="metodo"/g, 'data-page="metodo"');
  html = html.replace(/data-route="casi"/g, 'data-page="casi"');
  html = html.replace(/data-route="osservatorio"/g, 'data-page="osservatorio"');
  html = html.replace(/data-route="faq"/g, 'data-page="faq"');
  html = html.replace(/data-route="lavora-con-noi"/g, 'data-page="home"');

  // Remove data-anchor attributes (not needed anymore)
  html = html.replace(/ data-anchor="[^"]*"/g, '');

  return html;
}

// === BUILD FLOATING CTA (homepage only) ===
function buildFloatingCta() {
  return `<a href="#" class="floating-cta" id="floatingCta" aria-label="Prenota una consulenza">
  <span class="floating-cta-icon">&rarr;</span>
  <span class="floating-cta-text">Prenota una consulenza</span>
</a>`;
}

// === ASSEMBLE EACH PAGE ===
for (const page of pages) {
  const bounds = pageBounds[page.id];
  if (!bounds || bounds.start === -1) {
    console.error(`Cannot find page section for: ${page.id}`);
    continue;
  }

  // Get page content (inner content of the <section class="page"> — skip the wrapper)
  let pageContent = lines.slice(bounds.start, bounds.end + 1).join('\n');

  // Remove the outer <section class="page" ...> wrapper — we make the content top-level
  pageContent = pageContent.replace(/^<section class="page"[^>]*>\n?/, '');
  // Remove closing </section> for the page wrapper (last one)
  pageContent = pageContent.replace(/\n<\/section>\s*$/, '');

  // Update links
  pageContent = updateLinks(pageContent);

  // Update CTA modal HTML links
  let ctaModal = updateLinks(ctaModalHtml);

  const html = `<!DOCTYPE html>
<html lang="it" style="background: #0A1628;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
<meta name="theme-color" content="#0A1628">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="favicon-192x192.png">
<title>${page.title}</title>
<meta name="description" content="${page.desc}">

<!-- Canonical & Open Graph -->
<link rel="canonical" href="https://www.crisidimpresa-martinelli.com/${page.file === 'index.html' ? '' : page.file}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://www.crisidimpresa-martinelli.com/${page.file === 'index.html' ? '' : page.file}">
<meta property="og:title" content="${page.title}">
<meta property="og:description" content="${page.desc}">
<meta property="og:locale" content="it_IT">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${page.title}">
<meta name="twitter:description" content="${page.desc}">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Infant:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..700,0..100,0..1;1,9..144,300..700,0..100,0..1&family=Inter+Tight:ital,wght@0,300..600;1,300..600&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600&display=swap" rel="stylesheet">

<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/studio-freight/lenis@1.0.42/bundled/lenis.min.js"></script>

<style>
${getModifiedCss()}
</style>
</head>
<body>

<!-- Scroll progress -->
<div class="scroll-progress" id="scrollProgress"></div>

${page.id === 'home' ? buildFloatingCta() : ''}

<!-- Page transition overlay -->
${buildTransitionOverlay(page.id)}

<!-- Navigation -->
${buildNav(page.id, page.theme)}

<!-- Mobile menu -->
${buildMobileMenu(page.id)}

<!-- CTA Modal -->
${ctaModal}

<!-- Page content -->
<main class="app" id="app">
<section class="page active" data-page="${page.id}" data-theme="${page.theme}">
${pageContent}
</section>
</main>

<!-- Footer -->
${buildFooter()}

<!-- Mobile sticky CTA -->
${buildMobileStickyCta()}

<!-- Scripts -->
<script>
${buildJs(page.id)}
</script>

${iubendaHtml}

</body>
</html>`;

  const outPath = path.join(__dirname, page.file === 'index.html' ? 'index-new.html' : page.file);
  fs.writeFileSync(outPath, html, 'utf-8');
  console.log(`Created: ${outPath} (${(html.length / 1024).toFixed(0)} KB)`);
}

console.log('\n=== DONE ===');
console.log('Files created. The original index.html is untouched.');
console.log('New homepage is saved as index-new.html — rename manually after testing.');
