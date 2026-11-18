/* WCAG 2.2 sRGB contrast calculation; usable in Firefox and Node checks. */
(() => {
  "use strict";
  function parseColor(value) {
    const match = /^rgba?\(([^)]+)\)$/i.exec(value.trim());
    if (!match) return null;
    const parts = match[1].trim().split(/[\s,/]+/);
    if (parts.length !== 3 && parts.length !== 4) return null;
    const values = parts.map((part, index) => {
      const number = Number(part.replace(/%$/, ""));
      return part.endsWith("%") ? number / 100 : index < 3 ? number / 255 : number;
    });
    if (!values.every(Number.isFinite)) return null;
    if (values.length === 3) values.push(1);
    return values.map((number) => Math.min(1, Math.max(0, number)));
  }
  function over(front, back) {
    const alpha = front[3] + back[3] * (1 - front[3]);
    return [0, 1, 2].map((index) => alpha ? (front[index] * front[3] + back[index] * back[3] * (1 - front[3])) / alpha : 0).concat(alpha);
  }
  function luminance(color) {
    const linear = color.slice(0, 3).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  }
  function contrast(front, back) {
    const a = luminance(front), b = luminance(back);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }
  function evaluate(ratio, size, weight) {
    const large = size >= 24 || (size >= 14 * 96 / 72 && weight >= 700);
    const aaRequired = large ? 3 : 4.5, aaaRequired = large ? 4.5 : 7;
    const known = Number.isFinite(ratio);
    return { large, aaRequired, aaaRequired, aa: known ? ratio >= aaRequired : null, aaa: known ? ratio >= aaaRequired : null };
  }
  function colorLabel(color) {
    return `rgb(${color.slice(0, 3).map((value) => Math.round(value * 255)).join(", ")})`;
  }
  function hexLabel(color) {
    const channels = color[3] === 1 ? color.slice(0, 3) : color;
    const hex = channels.map((value) => Math.round(value * 255).toString(16).padStart(2, "0")).join("");
    return `#${hex.toUpperCase()}`;
  }
  const api = { parseColor, over, luminance, contrast, evaluate, colorLabel, hexLabel };
  globalThis.ContrastMath = api;
  if (typeof module !== "undefined") module.exports = api;
})();
