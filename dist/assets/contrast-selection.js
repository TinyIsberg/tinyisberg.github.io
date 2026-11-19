(() => {
  "use strict";
  const math = globalThis.ContrastMath;
  const parent = (element) => element.parentElement ?? element.getRootNode().host ?? null;
  const manual = (reason) => ({ status: "manual", reason });

  function selectionLanguage(element) {
    for (let current = element; current; current = parent(current)) {
      const lang = current.getAttribute("lang") ?? current.getAttributeNS("http://www.w3.org/XML/1998/namespace", "lang");
      if (lang !== null) return lang;
    }
    return "";
  }

  function canvasColor() {
    const probe = document.createElement("span");
    probe.style.cssText = "all:initial!important;display:none!important;background-color:Canvas!important;";
    probe.style.setProperty("color-scheme", getComputedStyle(document.documentElement).colorScheme, "important");
    document.documentElement.append(probe);
    try { return math.parseColor(getComputedStyle(probe).backgroundColor); }
    finally { probe.remove(); }
  }

  function checkElement(element) {
    const style = getComputedStyle(element);
    const size = Number.parseFloat(style.fontSize), weight = Number.parseFloat(style.fontWeight);
    const details = { size, weight, lang: selectionLanguage(element) };
    if (style.visibility !== "visible") return { ...details, status: "exempt", reason: "The text is hidden." };
    if (element.closest(":disabled")) return { ...details, status: "exempt", reason: "Text in a disabled control is exempt from these contrast requirements." };
    const svg = element.namespaceURI === "http://www.w3.org/2000/svg";
    const foregroundColor = svg ? (CSS.supports("color", style.fill) ? style.fill : null)
      : style.getPropertyValue("-webkit-text-fill-color") || style.color;
    const foreground = foregroundColor && math.parseColor(foregroundColor);
    let reason;
    if (svg) reason = "SVG fills and other layers can affect contrast.";
    else if (element.namespaceURI !== "http://www.w3.org/1999/xhtml") reason = "Text outside HTML may render differently.";
    const layers = [];
    let covered = false;
    let backgroundColor, backgroundIssue;
    for (let current = element; current; current = parent(current)) {
      const css = getComputedStyle(current);
      if (css.display === "none" || Number(css.opacity) === 0) return { ...details, status: "exempt", reason: "The text is hidden." };
      if (!reason && (Number(css.opacity) !== 1 || css.filter !== "none" || (css.backdropFilter && css.backdropFilter !== "none") || css.mixBlendMode !== "normal" || (css.maskImage && css.maskImage !== "none"))) {
        reason = "Opacity, filters, masks, or blending can affect contrast.";
      }
      if (!reason && (css.textShadow !== "none" || Number.parseFloat(css.getPropertyValue("-webkit-text-stroke-width")) > 0 || css.backgroundClip.includes("text"))) {
        reason = "Text shadows, outlines, or background fills can affect contrast.";
      }
      if (!reason) {
        for (const pseudo of ["::before", "::after"]) {
          const generated = getComputedStyle(current, pseudo);
          if (!["none", "normal", '""', "''"].includes(generated.content) && generated.display !== "none" && generated.visibility === "visible") {
            reason = "Generated content near the text can affect the background.";
            break;
          }
        }
      }
      if (!covered && !backgroundIssue && css.visibility === "visible" && css.display !== "contents") {
        if (css.backgroundImage !== "none") reason ??= "A background image or gradient can affect contrast.";
        if (css.boxShadow.includes("inset")) reason ??= "An inset shadow can affect the background.";
        const color = math.parseColor(css.backgroundColor);
        if (!color) {
          backgroundColor ??= css.backgroundColor;
          backgroundIssue = "The background color uses a format this sRGB calculation cannot handle.";
        } else if (color[3] > 0) {
          backgroundColor ??= css.backgroundColor;
          layers.push(color);
          covered = color[3] === 1;
        }
      }
    }
    if (!covered && window !== window.top) backgroundIssue ??= "The background behind the transparent frame is unknown.";
    let background = backgroundIssue ? null : covered ? [0, 0, 0, 0] : canvasColor();
    if (background) {
      for (const layer of layers.reverse()) background = math.over(layer, background);
      backgroundColor = math.colorLabel(background);
    }
    let ratio;
    let textColor = foregroundColor;
    if (foreground && background) {
      const visibleForeground = math.over(foreground, background);
      ratio = math.contrast(visibleForeground, background);
      textColor = math.colorLabel(visibleForeground);
    }
    if (!foreground) {
      reason = foregroundColor ? "The text color uses a format this sRGB calculation cannot handle." : "The text has no solid CSS fill color.";
    } else if (!background) {
      reason = backgroundIssue ?? "Could not read the page's base color.";
    }
    const hasTextStyle = Number.isFinite(size) && Number.isFinite(weight);
    if (!hasTextStyle) reason ??= "Could not read the text size or weight.";
    const measurement = {
      ...details, ratio,
      foreground: textColor, background: backgroundColor,
      originalForeground: style.color,
      link: Boolean(element.closest("a[href]")),
      ...(hasTextStyle ? math.evaluate(ratio, size, weight) : {}),
    };
    if (reason) return { ...measurement, ...manual(reason) };
    return { ...measurement, status: "measured" };
  }

  function analyze(context = {}, sampleRange) {
    if (context.url && context.url !== location.href) return { state: "error", message: "The page changed. Select the text again and retry." };
    const parts = [];
    const target = context.targetElementId !== undefined ? browser.menus.getTargetElement(context.targetElementId) : null;
    if (target?.matches('input[type="password"]')) return { state: "error", message: "Contrast checking is unavailable for password fields." };
    if (target?.matches("input, textarea") && typeof target.selectionStart === "number" && target.selectionEnd > target.selectionStart) {
      parts.push({ element: target, text: target.value.slice(target.selectionStart, target.selectionEnd), rects: [...target.getClientRects()] });
    } else {
      const selection = window.getSelection();
      const ranges = sampleRange ? [sampleRange] : Array.from({ length: selection?.rangeCount ?? 0 }, (_, index) => selection.getRangeAt(index));
      for (const range of ranges) {
        if (range.collapsed) continue;
        const root = range.commonAncestorContainer;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node = root.nodeType === Node.TEXT_NODE ? root : walker.nextNode();
        let visited = 0;
        while (node) {
          if (++visited > 2000 || parts.length >= 1000) return { state: "error", message: "The selection is too large. Select a shorter passage." };
          if (range.intersectsNode(node)) {
            const start = range.startContainer === node ? range.startOffset : 0;
            const end = range.endContainer === node ? range.endOffset : node.length;
            const text = node.data.slice(start, end).trim();
            if (text && node.parentElement) {
              const selected = document.createRange();
              selected.setStart(node, start);
              selected.setEnd(node, end);
              parts.push({ element: node.parentElement, text, rects: [...selected.getClientRects()] });
            }
          }
          node = walker.nextNode();
        }
      }
    }
    if (!parts.length) return { state: "error", message: "No selected text was found. Select text on the page and choose Check Contrast again." };
    const media = [];
    for (const element of document.querySelectorAll("img, svg, canvas, video")) {
      if (media.length >= 1000) return { state: "error", message: "The page has too many image layers for a reliable check." };
      media.push({ element, rect: element.getBoundingClientRect() });
    }
    const cache = new Map(), groups = new Map();
    for (const part of parts) {
      if (!cache.has(part.element)) cache.set(part.element, checkElement(part.element));
      let measurement = cache.get(part.element);
      if (measurement.status === "measured" && media.some(({ element, rect }) =>
        !element.contains(part.element) && part.rects.some((text) =>
          text.width > 0 && text.height > 0 && rect.width > 0 && rect.height > 0 &&
          text.left < rect.right && text.right > rect.left && text.top < rect.bottom && text.bottom > rect.top))) {
        measurement = { ...measurement, ...manual("An image layer overlaps the text.") };
      }
      const key = JSON.stringify(measurement);
      const existing = groups.get(key);
      if (existing) existing.text = `${existing.text} ${part.text}`.slice(0, 160);
      else groups.set(key, { ...measurement, text: part.text.slice(0, 160) });
      if (groups.size > 100) return { state: "error", message: "The selection has too many text styles. Select a shorter passage." };
    }
    return { state: "ready", source: location.hostname || "Local page", groups: [...groups.values()] };
  }
  globalThis.ContrastSelection = { analyze };
})();
