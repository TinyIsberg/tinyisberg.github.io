// Text Contrast Checker 1.2.8: original renderer with a browser-local demo bridge.
(() => {
  const markup = document.getElementById("contrast-panel-template");
  function mountPanel(host, settings, changed) {
    const shadow = host.attachShadow({ mode: "open" });
    const fragment = markup.content.cloneNode(true);
    const sheet = fragment.querySelector('link');
    const styled = new Promise((resolve, reject) => {
      sheet.addEventListener('load', resolve, { once: true });
      sheet.addEventListener('error', reject, { once: true });
    });
    shadow.append(fragment);
    // Only the document boundary and Firefox APIs are adapted; the panel code below is reused.
    const document = {
      documentElement: host,
      getElementById: (id) => shadow.getElementById(id),
      createElement: (tag) => globalThis.document.createElement(tag),
      createTextNode: (text) => globalThis.document.createTextNode(text),
    };
    const location = { search: settings.sidePanel ? "?view=sidebar" : "" };
    const window = { close() {} };
    const listeners = [];
    const stored = { ...settings };
    const notify = (changes, area) => listeners.forEach((listener) => listener(changes, area));
    const browser = {
      windows: { getCurrent: async () => ({ id: 1 }) },
      storage: {
        session: { get: async () => ({}) },
        local: {
          get: async () => ({ ...stored }),
          async set(values) {
            const changes = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { newValue: value, oldValue: stored[key] }]));
            Object.assign(stored, values);
            notify(changes, "local");
            changed(values);
          },
        },
        onChanged: { addListener: (listener) => listeners.push(listener) },
      },
      // ponytail: settings affect this demo only; real Firefox windows require loading the extension.
      sidebarAction: {
        async open() { host.dataset.view = "sidebar"; },
        async close() { host.dataset.view = "popup"; },
      },
    };
"use strict";
const $ = (id) => document.getElementById(id);
let resultKey;
let resultChanged = false;
const sidebarView = new URLSearchParams(location.search).get("view") === "sidebar";
document.documentElement.dataset.view = sidebarView ? "sidebar" : "popup";
const number = (value) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
function setAppearance(appearance) {
  document.documentElement.dataset.appearance = appearance;
  $("dark-mode").checked = appearance === "dark";
}
setAppearance(matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}
function detail(list, title, value, color) {
  const row = document.createElement("div"), description = document.createElement("dd");
  if (color) {
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.setAttribute("aria-hidden", "true");
    swatch.style.backgroundColor = color;
    description.append(swatch);
  }
  if (color && value.startsWith("rgb(")) {
    for (const letter of "rgb") description.append(textElement("span", letter, `rgb-${letter}`));
    description.append(document.createTextNode(value.slice(3)));
  } else description.append(document.createTextNode(value));
  const rgba = color && globalThis.ContrastMath.parseColor(color);
  if (rgba) description.append(document.createTextNode(` · ${globalThis.ContrastMath.hexLabel(rgba)}`));
  row.append(textElement("dt", title), description);
  list.append(row);
}
function render(report) {
  $("results").replaceChildren();
  $("source").hidden = report?.state !== "ready";
  $("scope").hidden = report?.state !== "ready";
  if (report?.state !== "ready") {
    $("message").hidden = false;
    $("message").dataset.state = report?.state ?? "empty";
    $("message").textContent = report?.state === "loading" ? "Checking text…" : report?.message ?? "Right-click selected text and choose Check Contrast.";
    return;
  }
  $("message").hidden = true;
  $("source").textContent = `${report.source} · ${report.groups.length} ${report.groups.length === 1 ? "text style" : "text styles"}`;
  for (const group of report.groups) {
    const card = document.createElement("section");
    card.className = `result ${group.status}`;
    const sample = textElement("p", `"${group.text}"`, "sample");
    sample.lang = group.lang ?? "";
    sample.dir = "auto";
    card.append(sample);
    const manual = group.status === "manual";
    if (group.status !== "measured") {
      card.append(textElement("h2", manual ? "Manual check needed" : "No contrast requirement"));
      card.append(textElement("p", group.reason));
    }
    if (group.status === "exempt") {
      $("results").append(card);
      continue;
    }
    if (Number.isFinite(group.ratio)) {
      // Round the display down so a failed 4.499… never looks like 4.50.
      const ratio = textElement("p", "", "ratio");
      ratio.append(textElement("strong", manual ? "Estimated contrast: " : "Contrast: "), document.createTextNode(`${number(Math.floor(group.ratio * 100) / 100)}:1`));
      card.append(ratio);
    } else {
      card.append(textElement("p", "Contrast unavailable.", "muted"));
    }
    if (Number.isFinite(group.aaRequired)) {
      const outcomes = document.createElement("div");
      outcomes.className = "outcomes";
      for (const level of group.aaa ? ["aaa"] : ["aa", "aaa"]) {
        const passed = group[level];
        const [kind, symbol, label] = passed === null ? ["", "–", "Unable to assess"]
          : passed ? ["pass", "✓", "Passed"] : ["fail", "✕", "Failed"];
        const outcome = document.createElement("div");
        outcome.className = `outcome ${kind}`;
        const heading = textElement("div", "", "outcome-heading");
        const status = textElement("span", symbol);
        status.setAttribute("role", "img");
        status.setAttribute("aria-label", manual && passed !== null ? `${label} based on CSS colors` : label);
        heading.append(textElement("span", `${level.toUpperCase()}${manual ? " (CSS)" : ""}: `), status);
        outcome.append(heading);
        outcome.append(textElement("small", `Required ${number(group[`${level}Required`])}:1`));
        outcomes.append(outcome);
      }
      card.append(outcomes);
    }
    const list = document.createElement("dl");
    detail(list, "Text", group.foreground ?? "Unknown", group.foreground);
    detail(list, "Background", group.background ?? "Unknown", group.background);
    const size = Number.isFinite(group.size) ? `${number(group.size)} px` : "Unknown";
    const textClass = typeof group.large === "boolean" ? ` · ${group.large ? "large text" : "regular text"}` : "";
    detail(list, "Size", size + textClass);
    detail(list, "Weight", Number.isFinite(group.weight) ? String(group.weight) : "Unknown");
    const details = document.createElement("details");
    details.append(textElement("summary", "Colors and text"), list);
    card.append(details);
    if (group.link) card.append(textElement("p", "This result uses the unvisited link color. Check the visited link color manually.", "warning"));
    $("results").append(card);
  }
}

$("dark-mode").addEventListener("change", async () => {
  const previous = document.documentElement.dataset.appearance;
  setAppearance($("dark-mode").checked ? "dark" : "light");
  $("dark-mode").disabled = true;
  $("settings-error").hidden = true;
  try { await browser.storage.local.set({ appearance: document.documentElement.dataset.appearance }); }
  catch (error) {
    console.error(error);
    setAppearance(previous);
    $("settings-error").textContent = "Could not save the appearance setting. Try again.";
    $("settings-error").hidden = false;
  } finally { $("dark-mode").disabled = false; }
});
$("side-panel").addEventListener("change", () => {
  const sidePanel = $("side-panel").checked;
  $("side-panel").disabled = true;
  $("settings-error").hidden = true;
  // Dispatch both requests before opening/closing a view can destroy this document.
  const saving = browser.storage.local.set({ sidePanel });
  const opening = sidePanel ? browser.sidebarAction.open() : browser.sidebarAction.close();
  void Promise.all([saving, opening]).then(() => {
    if (sidePanel && !sidebarView) window.close();
  }).catch((error) => {
    console.error(error);
    $("settings-error").textContent = "Could not switch views. Try again.";
    $("settings-error").hidden = false;
  }).finally(() => { $("side-panel").disabled = false; });
});
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && resultKey && changes[resultKey]) {
    resultChanged = true;
    render(changes[resultKey].newValue);
  }
  if (area === "local" && changes.appearance && ["light", "dark"].includes(changes.appearance.newValue)) setAppearance(changes.appearance.newValue);
  if (area === "local" && changes.sidePanel) $("side-panel").checked = changes.sidePanel.newValue === true;
});

async function initialize() {
  try {
    const current = await browser.windows.getCurrent();
    resultKey = `result:${current.id}`;
    const [session, settings] = await Promise.all([browser.storage.session.get(resultKey), browser.storage.local.get(["appearance", "sidePanel"])]);
    if (["light", "dark"].includes(settings.appearance)) setAppearance(settings.appearance);
    // A newer storage event can arrive while the initial snapshot is in flight.
    if (!resultChanged) render(session[resultKey]);
    $("side-panel").checked = settings.sidePanel === true;
    $("dark-mode").disabled = false;
    $("side-panel").disabled = false;
  } catch (error) {
    console.error(error);
    render({ state: "error", message: "Could not load the result. Reopen the panel and try again." });
  }
}
const initialized = initialize();

    return { ready: Promise.all([initialized, styled]), update: render };
  }
  const host = document.getElementById('contrast-panel');
  const sample = document.getElementById('contrast-sample');
  const buttons = [...document.querySelectorAll('[data-contrast]')];
  const presets = { low: 154, edge: 119, clear: 51 };
  const panel = mountPanel(host, {
    appearance: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    sidePanel: false,
  }, () => {});
  function update(button) {
    const channel = presets[button.dataset.contrast];
    sample.style.color = `rgb(${channel}, ${channel}, ${channel})`;
    for (const item of buttons) {
      item.setAttribute('aria-pressed', String(item === button));
      item.disabled = item === button;
    }
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(sample);
    selection.removeAllRanges();
    selection.addRange(range);
    const report = globalThis.ContrastSelection.analyze();
    selection.removeAllRanges();
    if (report.state === 'ready') report.source = 'Portfolions demo';
    panel.update(report);
  }
  panel.ready.then(() => {
    for (const button of buttons) button.addEventListener('click', () => update(button));
    host.hidden = false;
    update(buttons.find(button => button.getAttribute('aria-pressed') === 'true'));
  }).catch(error => {
    console.error(error);
    host.hidden = true;
    document.getElementById('contrast-error').hidden = false;
  });
})();
