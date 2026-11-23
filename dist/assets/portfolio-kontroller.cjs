const { chromium, firefox } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const project = path.resolve(__dirname, '..');
const dist = path.join(project, 'dist');
const base = new URL(process.argv[2] || 'http://127.0.0.1:4173/');
const results = [];
const browsers = [];
const widths = [320, 390, 768, 901, 958, 1024, 1108, 1440, 1600];
const sourceFiles = ['index.html', 'en.html', 'styles.css', 'app.js', 'assets/contrast-math.js', 'assets/contrast-selection.js', 'assets/contrast-panel.js', 'assets/contrast-panel.css'];
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

(async () => {
  for (const [name, type] of [['Chromium', chromium], ['Firefox', firefox]]) {
    const browser = await type.launch({ headless: true });
    browsers.push({ name, version: browser.version() });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    async function check(label, checkEn, test) {
      const page = await context.newPage();
      page.setDefaultTimeout(7000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(base.href);
        await test(page);
        assert.deepEqual(errors, []);
        results.push({ browser: name, check: label, checkEn, status: 'Godkänt' });
      } catch (error) {
        results.push({ browser: name, check: label, checkEn, status: 'Avviker', detail: error.message.slice(0, 500) });
      } finally { await page.close(); }
    }
    await check('Tydlig profil och fyra steg från krav till återtest', 'Profile and four steps from requirements to retesting', async page => {
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('.hero-kicker,.overview-grid').count(), 0);
      assert(await page.locator('.hero-portrait img').isVisible(), 'Porträttet saknas');
      const soughtRole = await page.locator('.sidebar-note').innerText();
      assert.equal(soughtRole.replace(/\s+/g, ' ').trim(), 'Söker jobb som Mjukvarutestare');
      assert(!/mjukvarutestare under utbildning/i.test(await page.content()), 'Utbildningsraden finns kvar i sidans HTML');
      assert(await page.locator('#job-role').evaluate(el => [...el.querySelectorAll('.eyebrow,.job-title')].every(part => getComputedStyle(part).fontWeight === '400')), 'Jobbraden visas med fetstil');
      assert(await page.locator('#job-role').evaluate(el => getComputedStyle(el.querySelector('.eyebrow')).fontSize === getComputedStyle(el.querySelector('.job-title')).fontSize), 'Olika textstorlek i raden för sökt roll');
      assert.equal(await page.locator('.case-card').count(), 4);
      assert.equal(await page.locator('#arbetsprov .section-heading h2').innerText(), 'Testarbete');
      assert.equal(await page.locator('#site-nav a[href="#arbetsprov"]').innerText(), 'Testarbete');
      const reportLink = page.getByRole('link', { name: 'Även den här sidan är testad. Öppna testrapporten' });
      assert.equal(await reportLink.getAttribute('href'), './kontroller.html');
      assert((await reportLink.boundingBox()).height >= 44);
      assert.equal(await page.locator('.verification-note').count(), 0);
      assert.deepEqual(await page.locator('.case-category').allTextContents(), ['Steg 1', 'Steg 2', 'Steg 3', 'Steg 4']);
      assert.deepEqual(await page.locator('.case-card [data-case]').evaluateAll(buttons => buttons.map(button => button.dataset.case)), ['requirements', 'testcases', 'bugreport', 'release']);
      assert(!await page.locator('.hero-content').innerText().then(text => /Playwright|Obsidian|arbetsprov/i.test(text)));
      assert.equal(await page.locator('#profil > .hero-content + #verktyg dt').count(), 7);
      assert.equal(await page.locator('.extra-project').count(), 2);
      for (const project of await page.locator('.extra-project').all()) assert(await project.isVisible());
      assert.equal(await page.locator('.extra-projects details,.extra-projects button').count(), 0);
      assert(!await page.locator('body').innerText().then(text => text.includes('Test Impact Analyzer')));
      assert(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)));
    });
    await check('Språkbyte på dator och mobil, inklusive testfall och kontrastdemo', 'Switching languages on desktop and mobile, including case studies and the contrast demo', async page => {
      for (const width of [320, 1193]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(base.href);
        const switcher = page.getByRole('link', { name: 'English', exact: true });
        await switcher.focus();
        await page.keyboard.press('Enter');
        await page.waitForURL('**/en.html');
        assert.equal(await page.locator('html').getAttribute('lang'), 'en');
        assert.match(await page.title(), /Software tester/);
        assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
        const cvLinks = page.getByRole('link', { name: 'View my CV (PDF)', exact: true });
        const englishCV = 'assets/Filip-Isberg-CV-EN.pdf';
        const pdfHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, englishCV))).digest('hex').slice(0, 12);
        assert.deepEqual(await cvLinks.evaluateAll(links => links.map(link => link.getAttribute('href'))),
          Array(2).fill('./' + englishCV + '?v=' + pdfHash));
        assert.equal(await page.locator('a[href="./checks.html"]').count(), 2);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
        if (width === 320) {
          await page.getByRole('button', { name: 'Open menu' }).click();
          assert.equal(await page.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded'), 'true');
        }
        await page.getByRole('navigation').getByRole('link', { name: 'Testing in practice' }).click();
        for (const button of await page.locator('[data-case]').all()) {
          const title = (await button.innerText()).replace('+', '').trim();
          await button.click();
          const dialog = page.getByRole('dialog', { name: title });
          assert(await dialog.getByRole('button', { name: 'Close' }).isVisible());
          assert.match(await dialog.innerText(), /focus/i);
          if (await button.getAttribute('data-case') === 'testcases') assert.match(await dialog.locator('pre').innerText(), /Given.*keyboard/);
          await page.keyboard.press('Escape');
          assert(await button.evaluate(el => document.activeElement === el));
        }
        const slider = page.getByRole('slider', { name: 'Text contrast' });
        await slider.focus();
        await page.keyboard.press('Home');
        assert.equal(await slider.inputValue(), '0');
        assert.equal(await page.locator('#contrast-panel .sample').innerText(), 'Selected text appears here.');
        await page.locator('#tillganglighet').evaluate(el => el.scrollIntoView());
        await page.getByRole('link', { name: 'Svenska' }).click();
        await page.waitForURL('**/#tillganglighet');
        assert.equal(await page.locator('html').getAttribute('lang'), 'sv');
        assert(await page.getByRole('slider', { name: 'Textkontrast' }).isVisible());
      }
    });
    await check('Hoppa till innehållet fungerar med tangentbord', 'The skip link works with a keyboard', async page => {
      await page.keyboard.press('Tab');
      assert(await page.locator('.skip-link').evaluate(el => el === document.activeElement));
      await page.keyboard.press('Enter');
      assert.equal(new URL(page.url()).hash, '#main');
    });
    await check('Porträttet följer med till sidospalten och tillbaka utan att flytta innehållet', 'The portrait moves to the sidebar and back without shifting the content', async page => {
      const hero = page.locator('.hero-portrait');
      const image = page.locator('img[alt="Filip Isberg"]');
      const initial = await hero.boundingBox();
      const halfway = await hero.evaluate(el => el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2);
      await page.evaluate(top => scrollTo(0, top), halfway - 12);
      assert(await hero.locator('img').isVisible(), 'Bilden flyttas innan halva har passerat överkanten');
      await page.evaluate(top => scrollTo(0, top), halfway + 12);
      await page.waitForFunction(() => document.querySelector('.sidebar-portrait img'));
      assert.equal(await image.evaluate(el => el.getAnimations().length), 0);
      await page.locator('#site-nav a[href="#arbetsprov"]').click();
      await page.waitForFunction(() => document.querySelector('.sidebar-portrait img'));
      assert.equal(await image.count(), 1);
      const docked = await image.boundingBox();
      assert(docked.width === 80 && docked.height === 106);
      const placeholder = await hero.boundingBox();
      assert(Math.abs(placeholder.height - initial.height) < 0.5);
      assert(Math.abs(placeholder.width - initial.width) < 0.5);
      await page.locator('#site-nav a[href="#profil"]').click();
      await page.waitForFunction(() => document.querySelector('.hero-portrait img'));
      assert.equal(await image.count(), 1);
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await page.waitForFunction(() => document.querySelector('.sidebar-portrait img'));
      await page.emulateMedia({ media: 'print' });
      await page.waitForFunction(() => document.querySelector('.hero-portrait img'));
      await page.emulateMedia({ media: 'screen' });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => document.querySelector('.sidebar.is-compact .sidebar-portrait img'));
      assert.equal(await image.evaluate(el => el.getBoundingClientRect().width), 34);
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForFunction(() => document.querySelector('.hero-portrait img'));
      assert.equal(await page.locator('.sidebar-portrait').isVisible(), false);
      await page.setViewportSize({ width: 1024, height: 568 });
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await page.waitForFunction(() => document.querySelector('.sidebar-portrait img'));
      const sidebar = await page.locator('.sidebar').boundingBox();
      assert(sidebar.y >= 0 && sidebar.y + sidebar.height <= 568, 'Sidospalten lämnar skärmen');
      assert(await page.locator('.sidebar').evaluate(el => el.scrollHeight === el.clientHeight && getComputedStyle(el).overflowY === 'visible'), 'Sidospalten har egen skrollning');
      await page.setViewportSize({ width: 1024, height: 450 });
      const contact = page.locator('.sidebar-contact');
      await contact.scrollIntoViewIfNeeded();
      const contactBox = await contact.boundingBox();
      assert(contactBox.y >= 0 && contactBox.y + contactBox.height <= 450, 'Sidans skrollning når inte kontaktlänken i ett lågt fönster');
    });
    await check('Porträttet tonas ut och in åt båda håll och klarar avbruten skrollning', 'The portrait fades in and out even if you change scroll direction mid-animation', async page => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const image = page.locator('img[alt="Filip Isberg"]');
      const halfway = await page.locator('.hero-portrait').evaluate(el => el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2);
      const jump = top => page.evaluate(top => scrollTo({ top, behavior: 'instant' }), top);
      const phase = (parent, opacity) => page.waitForFunction(({ parent, opacity }) => {
        const image = document.querySelector(parent + ' img');
        return image?.getAnimations().some(animation => Number(animation.effect.getKeyframes().at(-1).opacity) === opacity);
      }, { parent, opacity });
      async function settled(parent) {
        await page.waitForFunction(parent => document.querySelector(parent + ' img'), parent);
        await image.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished.catch(() => {}))));
        assert.equal(await image.evaluate(el => getComputedStyle(el).opacity), '1');
        assert.equal(await image.count(), 1);
      }
      for (const [top, from, to] of [
        [halfway + 16, '.hero-portrait', '.sidebar-portrait'],
        [halfway - 16, '.sidebar-portrait', '.hero-portrait']
      ]) {
        await jump(top);
        await phase(from, 0);
        await phase(to, 1);
        await settled(to);
      }
      await jump(halfway + 16);
      await phase('.hero-portrait', 0);
      await jump(halfway - 16);
      await settled('.hero-portrait');
      await jump(halfway + 16);
      await phase('.sidebar-portrait', 1);
      await jump(halfway - 16);
      await settled('.hero-portrait');
      await jump(halfway + 16);
      await phase('.hero-portrait', 0);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await settled('.sidebar-portrait');
      assert.equal(await image.evaluate(el => el.getAnimations().length), 0);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await jump(halfway - 16);
      await phase('.sidebar-portrait', 0);
      await page.emulateMedia({ media: 'print' });
      await settled('.hero-portrait');
      assert.equal(await image.evaluate(el => el.getAnimations().length), 0);
    });
    await check('Samma namn och jobbtext tonas ut, flyttas och återkommer tillsammans åt båda håll', 'The name and job title fade and move together in both directions', async page => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      for (const width of [1344, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        const name = page.locator('.profile-name');
        await page.waitForFunction(() => document.querySelector('#profil h1 .profile-name'));
        await name.evaluate(el => { window.originalProfileName = el; });
        const initial = await page.locator('#profil h1').evaluate(el => ({ top: el.getBoundingClientRect().top + scrollY, height: el.getBoundingClientRect().height }));
        const boundary = width > 900 ? 0 : 64;
        const passed = await page.locator('#profil h1').evaluate((el, boundary) => el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 + scrollY - boundary + 8, boundary);
        const jump = top => page.evaluate(top => scrollTo({ top, behavior: 'instant' }), top);
        const phase = (selector, opacity) => page.waitForFunction(({ selector, opacity }) => document.querySelector(selector)?.getAnimations().some(animation => Number(animation.effect.getKeyframes().at(-1).opacity) === opacity), { selector, opacity });
        const home = () => page.waitForFunction(() => { const el = document.querySelector('#profil h1 .profile-name'); return el && getComputedStyle(el).opacity === '1' && !el.getAnimations().length && document.querySelector('.hero-role-slot #job-role'); });
        await jump(passed);
        await phase('#profil h1 .profile-name', 0);
        await phase('.hero-role-slot #job-role', 0);
        assert((await name.boundingBox()).y + (await name.boundingBox()).height > boundary, 'Namnet klipps bort innan uttoningen börjar');
        await page.waitForFunction(() => document.querySelector('.identity-copy .profile-name') && document.querySelector('.sidebar-role-slot #job-role') && getComputedStyle(document.querySelector('.sidebar-identity')).opacity === '1');
        assert.equal(await name.count(), 1);
        assert(await name.evaluate(el => el === window.originalProfileName));
        assert.equal(await page.locator('#profil h1 .profile-name').count(), 0, 'Namnet dubbleras i profilen');
        const docked = await page.locator('#profil h1').evaluate(el => ({ top: el.getBoundingClientRect().top + scrollY, height: el.getBoundingClientRect().height }));
        assert(Math.abs(docked.top - initial.top) < 1 && Math.abs(docked.height - initial.height) < 1, 'Rubrikens plats ändras vid flytten');
        await jump(0);
        await phase('.sidebar-identity', 0);
        assert.equal(await page.locator('#profil h1 .profile-name').count(), 0, 'Profilnamnet visas före sidomenyns uttoning');
        await phase('#profil h1 .profile-name', 1);
        await phase('.hero-role-slot #job-role', 1);
        const timing = await page.evaluate(async () => { const animations = ['#profil h1 .profile-name', '.hero-role-slot #job-role'].map(selector => document.querySelector(selector).getAnimations()[0]); await Promise.all(animations.map(animation => animation.ready)); return animations.map(animation => animation.startTime); });
        assert(timing.every(time => typeof time === 'number') && Math.abs(timing[0] - timing[1]) < 25, 'Namn och jobbtext återkommer vid olika tidpunkter');
        await home();
        await jump(passed);
        await phase('#profil h1 .profile-name', 0);
        await jump(0);
        await home();
        assert.equal(await name.count(), 1);
        await jump(passed);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => document.querySelector('.identity-copy .profile-name'));
        assert.equal(await name.evaluate(el => el.getAnimations().length), 0);
        await page.emulateMedia({ media: 'print' });
        await home();
        assert.equal(await page.locator('#profil h1').getAttribute('aria-label'), 'Filip Isberg');
        await page.emulateMedia({ media: 'screen', reducedMotion: 'no-preference' });
      }
    });
    await check('Namn och jobbtext visas tillsammans som en grupp i sidomenyn', 'The name and job title appear together in the sidebar', async page => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      for (const width of [1108, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await page.waitForFunction(() => document.querySelector('.hero-role-slot #job-role') && getComputedStyle(document.querySelector('.profile-name')).opacity === '1');
        const boundary = width > 900 ? 0 : 64;
        const passed = await page.locator('#profil h1').evaluate((el, boundary) => el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 + scrollY - boundary + 8, boundary);
        await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), passed);
        await page.waitForFunction(() => document.querySelector('.sidebar-role-slot #job-role'));
        await page.waitForFunction(() => { const opacity = Number(getComputedStyle(document.querySelector('.sidebar-identity')).opacity); return opacity > 0.2 && opacity < 0.8; });
        const together = await page.locator('.sidebar-identity').evaluate(panel => {
          const role = panel.querySelector('#job-role');
          const name = panel.querySelector('.identity-copy strong');
          const opacity = el => { let value = 1; for (; el; el = el.parentElement) value *= Number(getComputedStyle(el).opacity); return value; };
          const bounds = panel.getBoundingClientRect();
          const roleBounds = role.getBoundingClientRect();
          return { difference: Math.abs(opacity(name) - opacity(role)), ownAnimations: role.getAnimations().length, clipped: getComputedStyle(panel.querySelector('.sidebar-identity-inner')).overflowY !== 'visible' && roleBounds.bottom > bounds.bottom + 1 };
        });
        assert(together.difference < 0.001, 'Namnet och jobbtexten har olika synlighet under intoningen');
        assert.equal(together.ownAnimations, 0, 'Jobbtexten har en separat intoning');
        assert.equal(together.clipped, false, 'Jobbtexten klipps under intoningen');
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.sidebar-identity')).opacity === '1');
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await page.waitForFunction(() => document.querySelector('.hero-role-slot #job-role') && getComputedStyle(document.querySelector('.profile-name')).opacity === '1');
      }
    });
    await check('Sidomenyn dras ihop utan hopp när jobbtexten flyttas tillbaka', 'The sidebar collapses smoothly when the job title returns to the profile', async page => {
      await page.setViewportSize({ width: 1108, height: 900 });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const passed = await page.locator('#profil h1').evaluate(el => el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 + scrollY + 8);
      await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), passed);
      await page.waitForFunction(() => { const panel = document.querySelector('.sidebar-identity'); return getComputedStyle(panel).opacity === '1' && !panel.getAnimations().length; });
      const frames = await page.evaluate(async () => {
        const panel = document.querySelector('.sidebar-identity');
        const nav = document.getElementById('site-nav');
        const read = () => ({ nav: nav.getBoundingClientRect().top, height: panel.getBoundingClientRect().height, home: !!document.querySelector('.hero-role-slot #job-role') });
        const frames = [read()];
        const start = performance.now();
        scrollTo({ top: 0, behavior: 'instant' });
        while (performance.now() - start < 650) { await new Promise(requestAnimationFrame); frames.push(read()); }
        return frames;
      });
      const moved = frames.findIndex(frame => frame.home);
      assert(moved > 0, 'Jobbtexten flyttades inte tillbaka');
      assert(Math.abs(frames[moved].nav - frames[moved - 1].nav) < 24, 'Navigeringen hoppar när jobbtexten lämnar sidomenyn');
      assert(frames.at(-1).height < 1, 'Ett tomt utrymme finns kvar i sidomenyn');
      assert.equal(await page.locator('#job-role').count(), 1);
      assert.equal(await page.locator('.profile-name').evaluate(el => getComputedStyle(el).opacity), '1');
    });
    await check('Alla fyra steg öppnas och Escape återställer fokus', 'All four steps open and Escape returns focus to the original button', async page => {
      for (const key of ['requirements', 'testcases', 'bugreport', 'release']) {
        const trigger = page.locator('[data-case="' + key + '"]').first();
        await trigger.click();
        assert(await page.locator('#case-dialog').evaluate(el => el.open));
        assert.equal(await page.locator('#dialog-title').innerText(), (await trigger.innerText()).replace(/\s*\+\s*$/, ''));
        assert.equal(await page.locator('#case-dialog button').count(), 1);
        assert.equal(await page.locator('#dialog-note,.dialog-footer').count(), 0);
        assert(await page.locator('.dialog-block').count() >= 2);
        assert((await page.locator('.dialog-block h3,.dialog-block p').allTextContents()).every(text => text.trim()));
        assert(await page.locator('#dialog-close').evaluate(el => el === document.activeElement));
        await page.keyboard.press('Escape');
        assert(!await page.locator('#case-dialog').evaluate(el => el.open));
        assert(await trigger.evaluate(el => el === document.activeElement));
      }
    });
    await check('Lite om mig ligger under porträttet och Mejla mig direkt under Kontakt', 'The personal introduction sits below the portrait and the email link follows Contact', async page => {
      for (const width of [958, 1193, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForFunction(() => document.querySelector('.hero-portrait img'));
        const spacing = await page.locator('.sidebar').evaluate(panel => {
          const contact = panel.querySelector('a[href="#kontakt"]').getBoundingClientRect();
          const mail = panel.querySelector('.sidebar-contact').getBoundingClientRect();
          return {
            gap: mail.top - contact.bottom,
            extraBelow: panel.getBoundingClientRect().bottom - mail.bottom - parseFloat(getComputedStyle(panel).paddingBottom)
          };
        });
        assert(spacing.gap >= 0 && spacing.gap <= 4, 'Mejllänken ska följa direkt efter Kontakt');
        assert(Math.abs(spacing.extraBelow) < 1, 'Sidopanelen ska sluta vid mejllänken');
        const geometry = await page.locator('.hero-content').evaluate(el => {
          const image = el.querySelector('.hero-portrait img').getBoundingClientRect();
          const card = el.querySelector('#lite-om-mig').getBoundingClientRect();
          const intro = el.querySelector('.hero-description').getBoundingClientRect();
          const identity = document.querySelector('.sidebar-identity');
          return {
            edges: Math.max(Math.abs(intro.top - image.top), Math.abs(intro.bottom - card.bottom)),
            gap: card.top - image.bottom, aligned: Math.abs(card.left - image.left) < 1 && Math.abs(card.width - image.width) < 1,
            imageHeight: image.height, identityHeight: identity.getBoundingClientRect().height, inert: identity.inert
          };
        });
        assert(geometry.edges < 1, 'Profilbilden och det personliga kortet ska linjera med introduktionsrutans över- och nederkant');
        assert(geometry.aligned && geometry.gap > 0 && geometry.gap <= 20, 'Det personliga kortet ska ligga direkt under porträttet');
        assert(geometry.imageHeight > 0 && geometry.imageHeight <= 240, 'Porträttet ska hålla sin kompakta höjd');
        assert(geometry.identityHeight < 1 && geometry.inert, 'Dubblerad identitet visas i sidospalten högst upp');
        await page.locator('#site-nav a[href="#arbetsprov"]').click();
        await page.waitForFunction(() => document.querySelector('.sidebar.has-profile .sidebar-portrait img'));
        assert.equal(await page.locator('.sidebar-identity').evaluate(el => el.inert), false);
      }
    });
    await check('Jobbblocket syns under profilnamnet och följer namnet före bilden', 'The name and job title move into the sidebar together, followed by the portrait', async page => {
      await page.setViewportSize({ width: 1102, height: 900 });
      const role = page.locator('#job-role');
      await role.evaluate(el => { window.originalJobRole = el; });
      assert(await page.locator('.hero-role-slot #job-role').isVisible());
      assert((await role.boundingBox()).y >= (await page.locator('#profil h1').boundingBox()).y + (await page.locator('#profil h1').boundingBox()).height);
      const initial = await page.locator('.hero-portrait').evaluate(el => el.getBoundingClientRect().top + scrollY);
      const roleHeight = await page.locator('.hero-role-slot').evaluate(el => el.getBoundingClientRect().height);
      const namePassed = await page.locator('#profil h1').evaluate(el => el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 + scrollY + 8);
      await page.evaluate(top => scrollTo(0, top), namePassed);
      await page.waitForFunction(() => document.querySelector('.sidebar-role-slot #job-role'));
      assert(await role.evaluate(el => el === window.originalJobRole));
      assert.equal(await page.locator('#job-role').count(), 1);
      assert(await page.locator('.hero-portrait img').isVisible(), 'Bilden lämnar profilen samtidigt som namnet');
      assert(Math.abs(await page.locator('.hero-portrait').evaluate(el => el.getBoundingClientRect().top + scrollY) - initial) < 1, 'Profilen hoppar när jobbblocket flyttas');
      assert(Math.abs(await page.locator('.hero-role-slot').evaluate(el => el.getBoundingClientRect().height) - roleHeight) < 1);
      const picturePassed = await page.locator('.hero-portrait').evaluate(el => el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2 + 8);
      await page.evaluate(top => scrollTo(0, top), picturePassed);
      await page.waitForFunction(() => document.querySelector('.sidebar-portrait img'));
      await page.evaluate(top => scrollTo(0, top), namePassed);
      await page.waitForFunction(() => document.querySelector('.hero-portrait img'));
      assert(await page.locator('.sidebar-role-slot #job-role').isVisible());
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForFunction(() => document.querySelector('.hero-role-slot #job-role'));
      assert(await role.isVisible());
      assert(await role.evaluate(el => el === window.originalJobRole));
      await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
      await page.waitForFunction(() => document.querySelector('.sidebar-role-slot #job-role'));
      await page.emulateMedia({ media: 'print' });
      await page.waitForFunction(() => document.querySelector('.hero-role-slot #job-role'));
      assert.equal(await page.locator('#job-role').count(), 1);
    });
    await check('Dialogen håller bakgrunden inaktiv och kan stängas med knapp', 'While a dialog is open, the page behind it is inactive and the Close button dismisses it', async page => {
      await page.locator('[data-case="bugreport"]').click();
      assert(await page.evaluate(() => {
        document.querySelector('.hero-actions a').focus();
        return document.getElementById('case-dialog').contains(document.activeElement);
      }));
      await page.locator('#dialog-close').click();
      assert(!await page.locator('#case-dialog').evaluate(el => el.open));
      await page.setViewportSize({ width: 320, height: 568 });
      await page.locator('[data-case="bugreport"]').click();
      await page.locator('#case-dialog').evaluate(el => { el.scrollTop = el.scrollHeight; });
      const close = await page.locator('#dialog-close').boundingBox();
      const modal = await page.locator('#case-dialog').boundingBox();
      assert(close && modal && close.y >= modal.y && close.y + close.height <= modal.y + modal.height, 'Stängknappen försvinner vid skrollning');
      await page.locator('#dialog-close').click();
      assert(!await page.locator('#case-dialog').evaluate(el => el.open));
    });
    await check('Reglaget ändrar textkontrasten och behåller färgerna på bakgrunder, kanter och fokusmarkeringar', 'The slider changes text contrast while backgrounds, borders and focus indicators keep their colours', async page => {
      const slider = page.getByRole('slider', { name: 'Textkontrast' });
      const panel = page.locator('#contrast-panel');
      await panel.waitFor({ state: 'visible' });
      assert.equal(await page.locator('.contrast-sample,#contrast-sample').count(), 0);
      assert.equal(await panel.locator('.sample').innerText(), 'Här ser man texten som markeras.');
      assert.equal(await slider.getAttribute('aria-describedby'), 'contrast-description');
      assert.equal(await slider.inputValue(), '100');
      const pageRatios = () => page.evaluate(() => {
        const selectors = ['.hero-lead', '.case-card p:last-child', '.extra-project p', '.timeline-date', '.contact-location', '.button.primary', '#site-nav a[href="#bakgrund"]'];
        return selectors.map(selector => {
          const range = document.createRange();
          range.selectNodeContents(document.querySelector(selector));
          return ContrastSelection.analyze({}, range).groups[0].ratio;
        });
      });
      const textAlphas = (inPanel = false) => page.evaluate(inPanel => {
        const panel = document.querySelector('#contrast-panel').shadowRoot;
        const elements = inPanel ? panel.querySelectorAll('*') : document.querySelectorAll('.layout *, dialog *');
        const colors = new Set([...elements].filter(el => [...el.childNodes].some(node =>
          node.nodeType === Node.TEXT_NODE && /[\p{L}\p{N}]/u.test(node.textContent)
        )).map(el => getComputedStyle(el).color));
        const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
        return [...new Set([...colors].map(color => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          return ctx.getImageData(0, 0, 1, 1).data[3];
        }))];
      }, inPanel);
      const interfaceColors = () => page.evaluate(() => {
        const style = selector => getComputedStyle(document.querySelector(selector));
        const primary = style('.button.primary');
        const nav = style('#site-nav a[aria-current]');
        const slider = style('#contrast-level');
        return [
          style('body').backgroundColor, style('.case-card').backgroundColor, style('.sidebar').backgroundColor,
          primary.backgroundColor, primary.borderTopColor, style('.button:not(.primary)').borderTopColor,
          nav.backgroundColor, nav.borderTopColor, style('.case-title > span').color,
          slider.accentColor, slider.outlineColor
        ];
      });
      for (const colorScheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme });
        const light = colorScheme === 'light';
        const expectedHigh = light ? 'Contrast: 13.58:1' : 'Contrast: 13.34:1';
        const expectedLow = light ? 'Contrast: 2.28:1' : 'Contrast: 3.33:1';
        await panel.getByText(expectedHigh, { exact: true }).waitFor();
        await page.locator('[data-case="release"]').focus();
        for (const [name, slug] of [['Text Contrast Checker', 'text-contrast-checker'], ['Zoom Profiles', 'zoom-profiles']]) {
          await page.keyboard.press('Tab');
          const link = page.locator('.extra-project').getByRole('link', { name, exact: true });
          assert(await link.evaluate(el => el.matches(':focus-visible')));
          assert.equal(await link.getAttribute('href'), 'https://addons.mozilla.org/en-US/firefox/addon/' + slug + '/');
        }
        await page.keyboard.press('Tab');
        assert(await slider.evaluate(el => el.matches(':focus-visible')));
        const surfaces = await interfaceColors();
        const high = await pageRatios();
        assert.deepEqual(await textAlphas(), [255]);
        assert.deepEqual(await textAlphas(true), [255]);
        assert(high.every(value => value >= 4.5));
        await slider.press('Home');
        assert.equal(await slider.inputValue(), '0');
        const low = await pageRatios();
        assert.deepEqual(await interfaceColors(), surfaces);
        assert.deepEqual(await textAlphas(), [102]);
        assert.deepEqual(await textAlphas(true), [255]);
        assert(low.every((value, i) => value < high[i]), 'Sidans textkontrast i ' + colorScheme + ': ' + JSON.stringify({ low, high }));
        assert.equal(await panel.locator('.ratio').innerText(), expectedLow);
        assert.equal(await panel.locator('.outcome.fail').count(), 2);
        await slider.press('ArrowRight');
        assert.equal(await slider.inputValue(), '1');
        assert.notEqual(await panel.locator('.ratio').innerText(), expectedLow);
        await slider.fill('34');
        assert.deepEqual(await textAlphas(), [154]);
        assert.deepEqual(await textAlphas(true), [255]);
        assert.deepEqual(await interfaceColors(), surfaces);
        assert.equal(await panel.locator('.ratio').innerText(), light ? 'Contrast: 3.91:1' : 'Contrast: 5.75:1');
        assert.equal(await panel.locator('.outcome.fail').count(), light ? 2 : 1);
        if (!await panel.locator('dl').isVisible()) await panel.locator('summary').click();
        assert.match(await panel.locator('dl').innerText(), light ? /#827F8C/ : /#9E9AA6/);
        assert.match(await panel.locator('dl').innerText(), /16 px · regular text/);
        await slider.press('End');
        assert.equal(await panel.locator('.outcome.pass').count(), 1);
        assert(await panel.locator('dl').isVisible());
        assert.match(await panel.locator('dl').innerText(), light ? /#302B40/ : /#EEEAF5/);
        assert.deepEqual(await pageRatios(), high);
      }
      await slider.press('Home');
      await page.reload();
      await panel.waitFor({ state: 'visible' });
      assert.equal(await slider.inputValue(), '100');
      assert.equal(await panel.locator('.ratio').innerText(), 'Contrast: 13.34:1');
      const ratio = await panel.locator('.ratio').innerText();
      const appearance = panel.locator('#dark-mode');
      const original = await appearance.isChecked();
      await appearance.setChecked(!original);
      assert.equal(await panel.locator('.ratio').innerText(), ratio, 'Tilläggets färgläge påverkar mätningen');
      assert.equal(await panel.evaluate(el => getComputedStyle(el.shadowRoot.querySelector('.panel-page')).backgroundColor), original ? 'rgb(255, 255, 255)' : 'rgb(26, 26, 26)');
      await appearance.setChecked(original);
      await panel.locator('#side-panel').check();
      assert.equal(await panel.getAttribute('data-view'), 'sidebar');
      await panel.locator('#side-panel').uncheck();
      assert.equal(await panel.getAttribute('data-view'), 'popup');
    });
    await check('Smala skärmbredder orsakar ingen horisontell klippning', 'Content fits narrow screens without horizontal clipping', async page => {
      await page.locator('#contrast-panel').waitFor({ state: 'visible' });
      for (const width of widths) {
        await page.setViewportSize({ width, height: 1000 });
        const description = await page.locator('#contrast-description').boundingBox();
        const slider = await page.locator('#contrast-level').boundingBox();
        assert(description && slider && description.y + description.height <= slider.y + 1, 'Förklaringen ligger inte ovanför reglaget vid bredden ' + width);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'Sidans innehåll går utanför bredden ' + width);
        assert(await page.locator('.case-card').evaluateAll(cards => {
          const boxes = cards.map(card => card.getBoundingClientRect());
          return boxes.every(box => Math.abs(box.top - boxes[0].top) < 1) && cards.every(card => card.scrollHeight <= card.clientHeight + 1 && card.scrollWidth <= card.clientWidth + 1);
        }), 'Kortens text klipps eller korten är inte uppradade vid bredden ' + width);
        if (width > 900) {
          assert(await page.locator('.case-grid').evaluate(el => el.scrollWidth <= el.clientWidth + 1 && [...el.children].every(card => {
            const box = card.getBoundingClientRect();
            return box.left >= 0 && box.right <= document.documentElement.clientWidth;
          })), 'Alla fyra kort syns inte utan sidoskrollning vid bredden ' + width);
        }
        assert(await page.locator('.case-title').evaluateAll(titles => titles.every(el => el.scrollWidth <= el.clientWidth + 1)), 'Kortrubriken ryms inte vid bredden ' + width);
        assert(await page.locator('.case-card button').evaluateAll(buttons => buttons.every(button => {
          const box = button.getBoundingClientRect();
          return box.width >= 44 && box.height >= 44;
        })), 'Projektens klickytor är för små vid bredden ' + width);
        assert(await page.locator('#contrast-panel').evaluate(host => {
          const panel = host.shadowRoot.querySelector('.panel-page');
          return panel.scrollWidth <= panel.clientWidth + 1;
        }), 'Kontrastrutan går utanför bredden ' + width);
        await page.locator('[data-case="bugreport"]').click();
        assert(await page.locator('#case-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Dialogen går utanför bredden ' + width);
        await page.keyboard.press('Escape');
      }
    });
    await check('Mobilmenyn öppnas med tangentbord och stängs efter navigering', 'The mobile menu opens from the keyboard and closes after navigation', async page => {
      await page.setViewportSize({ width: 495, height: 900 });
      const toggle = page.locator('.menu-toggle');
      await toggle.focus();
      await page.keyboard.press('Enter');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      const panel = await page.locator('.nav-panel').boundingBox();
      const button = await toggle.boundingBox();
      assert(panel.y > button.y + button.height && Math.abs(panel.x + panel.width - button.x - button.width) < 1, 'Menyn ska öppnas under knappen med samma högerkant');
      await page.keyboard.press('Escape');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert(await toggle.evaluate(el => el === document.activeElement));
      await page.keyboard.press('Enter');
      await page.locator('#site-nav a[href="#arbetsprov"]').click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(new URL(page.url()).hash, '#arbetsprov');
    });
    await check('Mobilmenyn blir kompakt med profilbild, följer toppen och behåller sidans position', 'The compact mobile header shows the portrait and stays at the top without shifting the page', async page => {
      for (const width of [320, 390, 607, 768]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForFunction(() => document.querySelector('.hero-portrait img') && !document.querySelector('.sidebar').classList.contains('is-compact'));
        await page.waitForFunction(() => Math.abs(document.querySelector('.sidebar').getBoundingClientRect().height - document.querySelector('.header-body').getBoundingClientRect().height) < 0.5);
        assert.equal(await page.locator('.sidebar-identity').evaluate(el => el.inert), true);
        assert((await page.locator('.sidebar-identity').boundingBox()).height < 1, 'Mobilens startläge innehåller mer än menyknappen');
        assert(await page.locator('.hero-role-slot #job-role').isVisible());
        assert.equal((await page.locator('.hero-role-slot #job-role').innerText()).replace(/\s+/g, ' ').trim(), 'Söker jobb som Mjukvarutestare');
        assert.equal(await page.locator('.hero-description .mobile-job').count(), 0);
        assert(await page.locator('.menu-label').isVisible());
        const start = await page.locator('#main').evaluate(el => el.getBoundingClientRect().top + scrollY);
        const passed = await page.locator('#profil h1').evaluate(el => el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 + scrollY - 64 + 8);
        await page.evaluate(top => scrollTo(0, top), passed - 16);
        assert.equal(await page.locator('.sidebar').evaluate(el => el.classList.contains('has-profile') || el.classList.contains('has-portrait')), false, 'Namn eller bild flyttas för tidigt');
        await page.evaluate(top => scrollTo(0, top), passed);
        await page.waitForFunction(() => document.querySelector('.sidebar.is-compact.has-profile.has-portrait .sidebar-portrait img'));
        assert.equal(await page.locator('.sidebar-role-slot #job-role').innerText(), 'Mjukvarutestare');
        assert(await page.locator('.header-body').evaluate(el => !['transparent', 'rgba(0, 0, 0, 0)'].includes(getComputedStyle(el).backgroundColor)), 'Bannern släpper igenom innehåll bakom sig');
        const bar = await page.locator('.header-body').boundingBox();
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        assert(Math.abs(bar.y) < 1 && Math.abs(bar.x) < 1 && Math.abs(bar.width - clientWidth) < 1, 'Menyn följer inte skärmens överkant');
        assert(bar.height <= 65);
        assert(!await page.locator('.menu-label').isVisible());
        assert.equal(await page.locator('img[alt="Filip Isberg"]').count(), 1);
        assert(Math.abs(await page.locator('#main').evaluate(el => el.getBoundingClientRect().top + scrollY) - start) < 1, 'Sidans innehåll hoppar vid komprimering');
        const scrollBeforeMenu = await page.evaluate(() => scrollY);
        await page.locator('.identity').evaluate(el => el.focus({ preventScroll: true }));
        await page.keyboard.press('Tab');
        assert(await page.locator('.language-switch').evaluate(el => el === document.activeElement));
        await page.keyboard.press('Tab');
        assert(await page.locator('.menu-toggle').evaluate(el => el === document.activeElement));
        await page.keyboard.press('Enter');
        assert(Math.abs(await page.evaluate(() => scrollY) - scrollBeforeMenu) < 1, 'Tangentbordsfokus flyttar sidan när menyn öppnas');
        assert(await page.locator('.sidebar').evaluate(el => el.classList.contains('is-compact')));
        assert.equal(await page.locator('#site-nav').evaluate(el => el.inert), false);
        await page.locator('#site-nav a[href="#arbetsprov"]').click();
        assert.equal(await page.locator('#site-nav').evaluate(el => el.inert), true);
        assert((await page.locator('#arbetsprov').boundingBox()).y >= 64, 'Rubriken göms bakom menyn');
        await page.locator('.identity').click();
        await page.waitForFunction(() => document.querySelector('.hero-portrait img') && !document.querySelector('.sidebar').classList.contains('is-compact'));
      }
      await page.setViewportSize({ width: 390, height: 900 });
      await page.evaluate(() => scrollTo(0, 0));
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const passed = await page.locator('#profil h1').evaluate(el => el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 + scrollY - 64 + 8);
      await page.evaluate(top => scrollTo({ top, behavior: 'instant' }), passed);
      await page.waitForFunction(() => document.querySelector('.sidebar.is-compact'));
      assert(await page.locator('.header-body').evaluate(el => el.getAnimations().length > 0), 'Komprimeringen saknar animation');
      assert(await page.locator('.hero-portrait img').evaluate(el => el.getAnimations().some(a => Number(a.effect.getKeyframes().at(-1).opacity) === 0)), 'Bilden tonas inte ut samtidigt som menyn ändras');
      assert.equal(await page.locator('.sidebar-identity').evaluate(el => Number(getComputedStyle(el).opacity)), 0, 'Namnet visas före bildens intoning');
      await page.waitForFunction(() => document.querySelector('.sidebar-portrait img'));
      assert(await page.locator('.sidebar-identity').evaluate(el => el.getAnimations().some(a => a.transitionProperty === 'opacity')), 'Namnet tonas inte in tillsammans med bilden');
      await page.locator('.menu-toggle').click();
      assert(await page.locator('.nav-panel').evaluate(el => el.getAnimations().length > 0), 'Menyn saknar öppningsanimation');
      await page.keyboard.press('Escape');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForFunction(() => document.querySelector('.hero-portrait img'));
      assert.equal(await page.locator('.header-body').evaluate(el => el.getAnimations().length), 0);
    });
    await check('Lokala underlag, CV och länkmål finns', 'Local assets, CV and link destinations are available', async page => {
      const fontLoaded = await page.evaluate(async () => {
        const { fontFamily } = getComputedStyle(document.body);
        const [face] = await document.fonts.load('16px "Atkinson Hyperlegible Next"', 'Återtest i Göteborg');
        return fontFamily.startsWith('"Atkinson Hyperlegible Next"') && face?.status === 'loaded';
      });
      assert(fontLoaded, 'Portfolions typsnitt ska kunna laddas och användas på sidan');
      for (const file of ['styles.css', 'assets/contrast-selection.js', 'assets/contrast-panel.js']) {
        const version = crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, file))).digest('hex').slice(0, 12);
        const url = './' + file + '?v=' + version;
        assert.equal(await page.locator(`head link[href="${url}"],head script[src="${url}"]`).count(), 1, 'Uppdatera filens adress i index.html till ' + url);
      }
      const missing = await page.locator('a[href^="#"]').evaluateAll(links => links.map(link => link.hash).filter(hash => !document.getElementById(hash.slice(1))));
      assert.deepEqual(missing, []);
      const ids = await page.locator('[id]').evaluateAll(elements => elements.map(el => el.id));
      assert.equal(ids.length, new Set(ids).size);
      for (const file of ['assets/Filip-Isberg-CV.pdf','assets/Filip-Isberg-CV-EN.pdf','assets/tangentbord-sokpanel.html','assets/kontrast-testning.txt','styles.css','app.js','assets/filip-isberg.jpg','assets/favicon.svg', ...sourceFiles.filter(file => file.startsWith('assets/'))]) {
        const response = await page.request.get(new URL(file, base).href);
        assert(response.ok(), file + ' saknas');
        if (file.endsWith('.pdf')) assert((await response.body()).subarray(0, 4).toString() === '%PDF');
      }
      const publicText = await page.locator('body').innerText();
      assert(!publicText.includes('Kungsbacka'), 'Ort ligger kvar i huvudprofilen');
      assert.match(await page.locator('#kontakt').innerText(), /Göteborgsregionen/);
      assert.match(await page.locator('#bakgrund').innerText(), /14 september 2026–29 januari 2027/);
      assert.match(await page.locator('.education-list').innerText(), /Embedded systems/);
      assert.match(await page.locator('.education-list').innerText(), /API-testning/);
      assert(!/arbetsprov|Obsidian/i.test(publicText));
      assert.equal((publicText.match(/Språk:/g) || []).length, 1);
    });
    await check('Utskriftsvyn behåller innehåll och accepterad textbredd', 'The print layout retains the content and fits the page width', async page => {
      await page.emulateMedia({ media: 'print' });
      assert(await page.locator('h1').isVisible());
      assert(await page.locator('.case-card').first().isVisible());
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    });
    await browser.close();
  }

  const digest = crypto.createHash('sha256');
  for (const file of sourceFiles) digest.update(file + '\0').update(fs.readFileSync(path.join(dist, file)));
  const report = {
    checkedAt: new Date().toISOString(),
    scope: 'Automatiska kontroller av portfolions statiska filer. Skärmbredder är simulerade; ingen fysisk mobil eller fullständig WCAG-granskning ingår.',
    sourceFiles,
    sourceSHA256: digest.digest('hex'),
    browsers, widths, results,
    passed: results.filter(item => item.status === 'Godkänt').length,
    failed: results.filter(item => item.status === 'Avviker').length
  };
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'assets/portfolio-kontroller.json'), JSON.stringify(report, null, 2));
  fs.copyFileSync(__filename, path.join(dist, 'assets/portfolio-kontroller.cjs'));
  const styleVersion = crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, 'styles.css'))).digest('hex').slice(0, 12);
  function writeReport(en) {
    const lang = en ? 'en' : 'sv';
    const time = new Date(report.checkedAt).toLocaleString(en ? 'en-GB' : 'sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'long', timeStyle: 'short' });
    const rows = results.map(item => {
      const status = en ? (item.status === 'Godkänt' ? 'Passed' : 'Failed') : item.status;
      return `<tr role="row"><th scope="row" role="rowheader">${escapeHTML(en ? item.checkEn : item.check)}</th><td role="cell">${escapeHTML(item.browser)}</td><td role="cell">${status}${item.detail ? '<br>' + escapeHTML(item.detail) : ''}</td></tr>`;
    }).join('\n');
    const headers = (en ? ['Check', 'Browser', 'Result'] : ['Kontroll', 'Webbläsare', 'Utfall']).map(label => `<th scope="col" role="columnheader">${label}</th>`).join('');
    const html = `<!doctype html><html lang="${lang}"><head>
<meta name="robots" content="noindex, nofollow, noimageindex"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${en ? 'Portfolio test report' : 'Portfolions kontrollrapport'} – Filip Isberg</title><link rel="stylesheet" href="./styles.css?v=${styleVersion}"></head>
<body><main class="report-document">
<nav class="report-links" aria-label="${en ? 'Report navigation' : 'Rapportmeny'}"><a href="${en ? './en.html' : './index.html'}#arbetsprov">← ${en ? 'Back to the portfolio' : 'Till portfolion'}</a>
<a href="${en ? './kontroller.html' : './checks.html'}" hreflang="${en ? 'sv' : 'en'}" lang="${en ? 'sv' : 'en'}">${en ? 'Svenska' : 'English'}</a></nav>
<p class="eyebrow">${en ? 'Automated test run' : 'Sparad automatisk körning'}</p>
<h1>${en ? 'How I tested this portfolio' : 'Så kontrollerades den här portfolion.'}</h1>
<p>${escapeHTML(time)}, ${en ? 'Stockholm time' : 'svensk tid'}.</p>
<p>${escapeHTML(browsers.map(item => item.name + ' ' + item.version).join(' · '))}</p>
<p>${en ? 'I ran these automated checks in desktop browsers at several screen widths. The results reflect browser simulations. Testing on physical devices and a full WCAG audit were outside the scope of this run.' : escapeHTML(report.scope)}</p>
<h2 id="resultat">${en ? 'Results by check' : 'Resultat per kontroll'}</h2>
<table role="table" aria-labelledby="resultat"><thead role="rowgroup"><tr role="row">${headers}</tr></thead><tbody role="rowgroup">${rows}</tbody></table>
<h2>${en ? 'Files covered by this run' : 'Körningen gäller dessa filer'}</h2>
<p>${en ? 'The run covers both language versions, the shared styles and scripts, and the contrast demo. The results were recorded at the time shown above.' : 'Körningen omfattar båda språkversionerna, sidans CSS och JavaScript samt kontrastdemon. Resultaten sparades vid tidpunkten ovan.'}</p>
<pre>SHA256: ${report.sourceSHA256}</pre><p><a href="./assets/portfolio-kontroller.json">${en ? 'View run data' : 'Läs kördata'}</a> · <a href="./assets/portfolio-kontroller.cjs" download>${en ? 'Download the test script' : 'Hämta kontrollkoden'}</a></p>
<p>${en ? 'I used AI assistance to write and run these checks while building the portfolio.' : 'Kontrollerna är framtagna och körda med AI-stöd under arbetet med portfolion.'}</p></main></body></html>`;
    fs.writeFileSync(path.join(dist, en ? 'checks.html' : 'kontroller.html'), html);
  }
  writeReport(false);
  writeReport(true);
  const requestBrowser = await chromium.launch({ headless: true });
  const page = await requestBrowser.newPage();
  const response = await page.goto(new URL('kontroller.html', base).href);
  assert(response.ok(), 'Den genererade kontrollrapporten kan inte öppnas');
  const table = page.getByRole('table', { name: 'Resultat per kontroll' });
  for (const width of [320, 471, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await table.getByRole('rowheader').count(), results.length);
    assert.equal(await table.getByRole('columnheader').count(), 3);
    const row = table.locator('tbody tr').first();
    const title = await row.getByRole('rowheader').boundingBox();
    const [browserCell, statusCell] = await row.getByRole('cell').all();
    const browser = await browserCell.boundingBox();
    const status = await statusCell.boundingBox();
    if (width <= 600) {
      assert(browser.y >= title.y + title.height && Math.abs(browser.y - status.y) < 1);
      assert(status.x + status.width <= width);
      for (const cell of [browserCell, statusCell]) {
        assert.equal(await cell.evaluate(el => {
          const range = document.createRange();
          range.selectNode(el.firstChild);
          return range.getClientRects().length;
        }), 1, 'Webbläsare och utfall ska kunna läsas som hela ord');
      }
    } else {
      assert.equal(title.y, browser.y);
      assert.equal(browser.y, status.y);
    }
  }
  await page.goto(new URL('checks.html', base).href);
  assert.equal(await page.getByRole('table', { name: 'Results by check' }).getByRole('rowheader').count(), results.length);
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  await page.getByRole('link', { name: 'Back to the portfolio' }).click();
  assert.equal(new URL(page.url()).pathname, new URL('en.html', base).pathname);
  await requestBrowser.close();
  console.log(JSON.stringify({ passed: report.passed, failed: report.failed, browsers, sourceSHA256: report.sourceSHA256, failures: results.filter(item => item.status !== 'Godkänt') }));
  process.exitCode = report.failed ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
