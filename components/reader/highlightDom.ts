import type { HighlightColor, HighlightDTO } from "@/lib/types";

/**
 * DOM helpers that anchor highlights to character offsets in the article body's textContent.
 * Offsets (not DOM paths) survive re-rendering and are independent of how marks split text nodes.
 */

function textNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  return nodes;
}

export type SelectionOffsets = { start: number; end: number; text: string };

/** Converts a live Range inside `root` to trimmed character offsets, or null if it isn't a usable selection. */
export function offsetsFromRange(root: HTMLElement, range: Range): SelectionOffsets | null {
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const pre = document.createRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  const rawStart = pre.toString().length;
  const raw = range.toString();
  const lead = raw.length - raw.trimStart().length;
  const text = raw.trim();
  if (!text) return null;
  const start = rawStart + lead;
  return { start, end: start + text.length, text };
}

export function clearHighlights(root: HTMLElement): void {
  const marks = root.querySelectorAll("mark.ms-hl");
  if (!marks.length) return;
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
  root.normalize();
}

function wrapRange(root: HTMLElement, h: Pick<HighlightDTO, "id" | "startOffset" | "endOffset" | "color" | "note">): void {
  let position = 0;
  for (const node of textNodes(root)) {
    const length = node.data.length;
    const nodeStart = position;
    position += length;
    if (position <= h.startOffset) continue;
    if (nodeStart >= h.endOffset) break;
    if (!node.data.trim()) continue;

    const from = Math.max(h.startOffset - nodeStart, 0);
    const to = Math.min(h.endOffset - nodeStart, length);
    const middle = from > 0 ? node.splitText(from) : node;
    if (to - from < middle.data.length) middle.splitText(to - from);

    const mark = document.createElement("mark");
    mark.className = "ms-hl";
    mark.dataset.hid = h.id;
    mark.dataset.color = h.color;
    mark.dataset.hasNote = h.note ? "true" : "false";
    middle.parentNode?.insertBefore(mark, middle);
    mark.appendChild(middle);
  }
}

/** Re-renders all highlights. Highlights whose stored text no longer matches the content are skipped. */
export function applyHighlights(root: HTMLElement, highlights: HighlightDTO[]): void {
  clearHighlights(root);
  const full = root.textContent ?? "";
  for (const h of highlights) {
    if (full.slice(h.startOffset, h.endOffset) !== h.text) continue;
    wrapRange(root, h);
  }
}

export function isHighlightColor(value: string | undefined): value is HighlightColor {
  return value === "yellow" || value === "green" || value === "blue" || value === "pink";
}
