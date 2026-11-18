'use strict';

const caseData = {
  keyboard: {
    category: 'Sportson / Tangentbordstest',
    title: 'Kan man söka med bara tangentbordet?',
    lead: 'Jag testade sökningen i Sportsons portal med tangentbord och följde upp hur sökpanelen skulle stängas.',
    sections: [
      ['Genomförandet', 'Jag sökte efter produkter, gick mellan träffarna och bytte resultatsida med Tab, Shift+Tab och Enter. I mobilvy på datorn kontrollerade jag även söktyperna och att tangentbordsfokus syntes.'],
      ['Fokus efter sidbyte', 'Vid återkontrollen den 16 november 2026 bedömdes de nio huvudkontrollerna som godkända. Fokus flyttades till första produkten på den nya resultatsidan, så att det gick att fortsätta bland de nya resultaten.'],
      ['Avstämning och återtest', 'Produktägaren bekräftade att panelen ska stängas när man tabbar förbi den, trycker Escape eller klickar utanför. Jag återtestade alla tre sätten och samtliga blev godkända.']
    ],
    evidence: [['Läs kontrollerna och återtestet', './assets/tangentbord-sokpanel.html']]
  },
  portal: {
    category: 'Sportson / Testdesign',
    title: 'Från kravlista till testfall',
    lead: 'Kravet beskrev en sökresultatsida. Jag behövde först bekräfta vilket fält sökningen skulle stödja.',
    sections: [
      ['Avstämningen', 'Jag stämde av kravet med produktägaren, som bekräftade att sökkravet enbart gäller produktnamn.'],
      ['Testfallet', 'Jag valde en sökbar produkt och använde produktens namn som testdata. Jag beskrev förutsättningarna, sökningen och den förväntade träffen.'],
      ['Genomförandet och resultatet', 'Jag körde testfallet med de valda testuppgifterna. Den förväntade produkten visades och testet blev godkänt.']
    ],
    code: 'Genomfört testfall\n\nGivet: En sökbar produkt och dess namn är valda.\nNär: Användaren söker på namnet.\nSå: Den matchande produkten visas.'
  },
  playwright: {
    category: 'Sportson / Testautomation',
    title: 'När testet stoppade för tidigt',
    lead: 'Testet skulle följa en länk från en nyhetsartikel till kalendern. Körningen avbröts vid artikelns datum.',
    sections: [
      ['Orsaken', 'Datumet på sidan innehöll ett intervall med tankstreck och årtal. Testets datumkontroll tillät bara bindestreck och datum utan årtal. Därför stoppades körningen innan kalenderlänken kontrollerades.'],
      ['Ändringen', 'Jag felsökte datumkontrollen med AI-stöd och anpassade den för årtal samt både bindestreck och tankstreck. Övriga kontroller behölls.'],
      ['Återtestet', 'Jag körde om de två berörda testerna i testmiljön. Båda gick igenom efter ändringen.']
    ],
    code: 'Visat datum: 30 sep. – 27 jan. 2027'
  },

};

const dialog = document.getElementById('case-dialog');
let dialogTrigger;
document.querySelectorAll('[data-case]').forEach(button => button.addEventListener('click', () => {
  const data = caseData[button.dataset.case];
  if (!data) return;
  dialogTrigger = button;
  document.getElementById('dialog-category').textContent = data.category;
  document.getElementById('dialog-title').textContent = data.title;
  document.getElementById('dialog-lead').textContent = data.lead;
  const content = document.getElementById('dialog-content');
  content.replaceChildren();
  for (const [title, copy] of data.sections) {
    const section = document.createElement('section');
    section.className = 'dialog-block';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = copy;
    section.append(heading, paragraph);
    content.append(section);
  }
  if (data.code) {
    const code = document.createElement('pre');
    code.className = 'dialog-code';
    code.textContent = data.code;
    content.append(code);
  }
  if (data.evidence) {
    const links = document.createElement('div');
    links.className = 'evidence-links';
    for (const [label, href] of data.evidence) {
      const link = document.createElement('a');
      link.className = 'button';
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = label;
      links.append(link);
    }
    content.append(links);
  }
  dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add('dialog-open');
  document.getElementById('dialog-close').focus();
}));
document.getElementById('dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  document.body.classList.remove('dialog-open');
  dialogTrigger?.focus({ preventScroll: true });
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
});

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('site-nav');
const sidebar = document.querySelector('.sidebar');
const headerBody = document.querySelector('.header-body');
const identityPanel = document.querySelector('.sidebar-identity');
const desktopLayout = matchMedia('(min-width: 901px)');
const printLayout = matchMedia('print');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function setMenu(open) {
  nav.classList.toggle('is-open', open);
  sidebar.classList.toggle('menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Stäng meny' : 'Öppna meny');
  menuToggle.querySelector('.menu-label').textContent = open ? 'Stäng meny' : 'Öppna meny';
  menuToggle.querySelector('.menu-icon').textContent = open ? '×' : '☰';
  const unavailable = !desktopLayout.matches && !open;
  nav.inert = unavailable;
  nav.setAttribute('aria-hidden', String(unavailable));
}
function closeMenu() { setMenu(false); }
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

const profileName = document.querySelector('#profil h1');
const nameText = profileName.querySelector('.profile-name');
const nameDock = document.querySelector('.identity-copy strong');
const portraitHome = document.querySelector('.hero-portrait');
const portrait = portraitHome.querySelector('img');
const portraitDock = document.querySelector('.sidebar-portrait');
const roleHome = document.querySelector('.hero-role-slot');
const roleBlock = document.getElementById('job-role');
const roleDock = document.querySelector('.sidebar-role-slot');
const nameMove = { element: nameText, destination: profileName, animation: null, request: 0 };
const portraitMove = { element: portrait, destination: portraitHome, animation: null, request: 0 };
const roleMove = { element: roleBlock, destination: roleHome, animation: null, request: 0 };
async function moveProfileItem(move, destination, animate) {
  if (destination === move.destination && animate) return;
  move.destination = destination;
  const request = ++move.request;
  move.animation?.cancel();
  if (move.element === roleBlock) move.element.parentElement.style.height = '';
  if (move.element.parentElement === destination) return;
  // Keep both slots stable while the same job block moves between them.
  if (move.element === roleBlock) {
    const origin = move.element.parentElement;
    origin.style.height = getComputedStyle(origin).height;
  }
  if (move.element === roleBlock && destination === roleDock) {
    const probe = roleBlock.cloneNode(true);
    probe.removeAttribute('id');
    probe.setAttribute('aria-hidden', 'true');
    probe.inert = true;
    probe.style.visibility = 'hidden';
    roleDock.style.height = '';
    roleDock.append(probe);
    roleDock.style.height = getComputedStyle(roleDock).height;
    probe.remove();
  }
  if (animate) {
    const leavesGroup = move.element.parentElement === nameDock || move.element.parentElement === roleDock || (move.element.parentElement === portraitDock && !desktopLayout.matches);
    if (leavesGroup) {
      await Promise.all(identityPanel.getAnimations()
        .filter(animation => ['opacity', 'transform'].includes(animation.transitionProperty))
        .map(animation => animation.finished.catch(() => {})));
    } else {
      move.animation = move.element.animate([
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(6px) scale(.96)' }
      ], { duration: 180, easing: 'ease-in', fill: 'forwards' });
      await move.animation.finished.catch(() => {});
    }
    if (request !== move.request) return;
  }
  move.animation?.cancel();
  destination.append(move.element);
  if (move.element === roleBlock) destination.style.height = '';
  const entersGroup = destination === nameDock || destination === roleDock || (destination === portraitDock && !desktopLayout.matches);
  if (animate && !entersGroup) {
    move.animation = move.element.animate([
      { opacity: 0, transform: 'translateY(6px) scale(.96)' },
      { opacity: 1, transform: 'none' }
    ], { duration: 180, easing: 'ease-out' });
    void move.animation.finished.catch(() => {});
  }
}
function placePortrait() {
  const bounds = portraitHome.getBoundingClientRect();
  const boundary = desktopLayout.matches ? 0 : 64;
  const nameBounds = profileName.getBoundingClientRect();
  const identityDocked = !printLayout.matches && nameBounds.top + nameBounds.height / 2 < boundary;
  const pictureDocked = identityDocked && (!desktopLayout.matches || bounds.top + bounds.height / 2 < boundary);
  sidebar.classList.toggle('has-profile', identityDocked);
  sidebar.classList.toggle('has-portrait', pictureDocked);
  sidebar.classList.toggle('is-compact', !desktopLayout.matches && identityDocked);
  identityPanel.inert = !identityDocked;
  identityPanel.setAttribute('aria-hidden', String(!identityDocked));
  const animate = !printLayout.matches && !reducedMotion.matches;
  void moveProfileItem(nameMove, identityDocked ? nameDock : profileName, animate);
  void moveProfileItem(roleMove, identityDocked ? roleDock : roleHome, animate);
  void moveProfileItem(portraitMove, pictureDocked ? portraitDock : portraitHome, animate);
}
function measureHeaderSpace() {
  if (desktopLayout.matches || printLayout.matches || sidebar.classList.contains('is-compact')) return;
  if (headerBody.getAnimations().some(animation => animation.playState === 'running')) return;
  sidebar.style.setProperty('--mobile-header-space', `${headerBody.getBoundingClientRect().height}px`);
}
function updateViewport() {
  sidebar.style.setProperty('--page-width', `${document.documentElement.clientWidth}px`);
  setMenu(menuToggle.getAttribute('aria-expanded') === 'true');
  measureHeaderSpace();
  void placePortrait();
}
// The mobile header keeps its original space while its visible bar becomes smaller.
new ResizeObserver(measureHeaderSpace).observe(headerBody);
headerBody.addEventListener('transitionend', event => {
  if (event.target === headerBody) measureHeaderSpace();
});
let scrollFrame = 0;
window.addEventListener('scroll', () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; void placePortrait(); });
}, { passive: true });
window.addEventListener('resize', updateViewport);
desktopLayout.addEventListener('change', updateViewport);
printLayout.addEventListener('change', updateViewport);
reducedMotion.addEventListener('change', updateViewport);
updateViewport();

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav.classList.contains('is-open')) {
    closeMenu();
    menuToggle.focus();
  }
});
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    const active = entries.find(entry => entry.isIntersecting);
    if (!active) return;
    nav.querySelectorAll('a').forEach(link => {
      if (link.hash === '#' + active.target.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-10% 0px -55% 0px' });
  document.querySelectorAll('main>.section').forEach(section => observer.observe(section));
}
