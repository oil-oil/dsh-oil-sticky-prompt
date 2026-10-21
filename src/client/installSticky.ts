import { flattenPromptText } from "./flattenPrompt.ts";
import { pickPinnedRow } from "./pickStuckRow.ts";

const HOST_ATTR = "data-oil-sticky-host";
const EASE = "220ms cubic-bezier(0.22, 1, 0.36, 1)";
const hideTimers = new WeakMap<HTMLElement, number>();

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\'");
}

function reducedMotion(): boolean {
  return typeof matchMedia === "function"
    && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Node slot wrapper the chat flow renders inside every row. Harness 0.2.x keeps
 * the slot key stable while its CSS-module class hashes change per build.
 */
const NODE_SLOT = '[data-slot="conversation.chat.node"]';

/**
 * The user bubble. Its class keeps the stable `_bubble` suffix behind the
 * hashed CSS-module prefix, so suffix matching survives rebuilds.
 */
const USER_BUBBLE = '[class*="_bubble"]';

function userNode(row: HTMLElement): HTMLElement | null {
  return row.querySelector<HTMLElement>(NODE_SLOT);
}

function bubbleOf(row: HTMLElement): HTMLElement {
  const node = userNode(row);
  const bubble = node?.querySelector<HTMLElement>(USER_BUBBLE);
  if (bubble instanceof HTMLElement) return bubble;
  if (node instanceof HTMLElement) return node;
  return row;
}

function textOf(row: HTMLElement): string {
  return flattenPromptText(bubbleOf(row).textContent ?? "");
}

function boxesOf(scroller: HTMLElement): { key: string; top: number; row: HTMLElement }[] {
  const rows: { key: string; top: number; row: HTMLElement }[] = [];
  for (const row of scroller.querySelectorAll<HTMLElement>('[data-chat-flow-kind="user"][data-chat-anchor-key]')) {
    const key = row.dataset.chatAnchorKey;
    if (key === undefined || key === "") continue;
    rows.push({ key, top: row.getBoundingClientRect().top, row });
  }
  return rows;
}

function ensureHost(scroller: HTMLElement): HTMLElement {
  const existing = scroller.querySelector<HTMLElement>(`:scope > [${HOST_ATTR}]`);
  if (existing !== null) return existing;
  const host = document.createElement("div");
  host.setAttribute(HOST_ATTR, "");
  host.innerHTML = '<div class="oilStickyBar" hidden><button type="button" class="oilStickyPrompt"><span class="oilStickyPromptText"></span></button></div>';
  scroller.prepend(host);
  return host;
}

function clearTransform(prompt: HTMLElement): void {
  prompt.style.transition = "";
  prompt.style.transform = "";
  prompt.style.transformOrigin = "";
}

function placeFrom(prompt: HTMLElement, from: DOMRect, to: DOMRect): void {
  const scaleX = from.width / Math.max(to.width, 1);
  const scaleY = from.height / Math.max(to.height, 1);
  prompt.style.transition = "none";
  prompt.style.transformOrigin = "top left";
  prompt.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scaleX}, ${scaleY})`;
}

function animateToRest(prompt: HTMLElement): void {
  prompt.getBoundingClientRect();
  prompt.style.transition = `transform ${EASE}`;
  prompt.style.transform = "none";
}

function renderBar(scroller: HTMLElement): void {
  const host = ensureHost(scroller);
  const bar = host.querySelector<HTMLElement>(".oilStickyBar");
  const label = host.querySelector<HTMLElement>(".oilStickyPromptText");
  const prompt = host.querySelector<HTMLButtonElement>(".oilStickyPrompt");
  if (bar === null || label === null || prompt === null) return;

  const rows = boxesOf(scroller);
  const previous = host.dataset.oilPinnedKey;
  const next = pickPinnedRow(rows, scroller.getBoundingClientRect().top, previous);
  const match = rows.find((row) => row.key === next);

  if (next === undefined || match === undefined) {
    if (previous === undefined || bar.hidden || hideTimers.has(host)) return;
    hideBar(host, bar, prompt);
    return;
  }

  const pendingHide = hideTimers.get(host);
  if (pendingHide !== undefined) {
    window.clearTimeout(pendingHide);
    hideTimers.delete(host);
  }

  const text = textOf(match.row);
  if (text === "") {
    hideBar(host, bar, prompt);
    return;
  }

  const same = previous === next && !bar.hidden && pendingHide === undefined;
  if (same) {
    if (label.textContent !== text) label.textContent = text;
    bindJump(prompt, scroller, next);
    return;
  }

  const from = bubbleOf(match.row).getBoundingClientRect();
  label.textContent = text;
  host.dataset.oilPinnedKey = next;
  bar.hidden = false;
  bar.dataset.oilVisible = "1";
  bindJump(prompt, scroller, next);

  if (reducedMotion()) {
    clearTransform(prompt);
    return;
  }
  placeFrom(prompt, from, prompt.getBoundingClientRect());
  animateToRest(prompt);
}

function hideBar(
  host: HTMLElement,
  bar: HTMLElement,
  prompt: HTMLButtonElement,
): void {
  delete host.dataset.oilPinnedKey;
  if (bar.hidden) return;
  clearTransform(prompt);

  const finish = (): void => {
    hideTimers.delete(host);
    bar.hidden = true;
    delete bar.dataset.oilVisible;
    const label = bar.querySelector(".oilStickyPromptText");
    if (label !== null) label.textContent = "";
  };

  if (reducedMotion()) {
    finish();
    return;
  }

  delete bar.dataset.oilVisible;
  hideTimers.set(host, window.setTimeout(finish, 170));
}

function bindJump(prompt: HTMLButtonElement, scroller: HTMLElement, key: string): void {
  prompt.onclick = () => {
    const row = scroller.querySelector<HTMLElement>(
      `[data-chat-flow-kind="user"][data-chat-anchor-key="${cssEscape(key)}"]`,
    );
    row?.scrollIntoView({
      block: "start",
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  };
}

export function installStickyUserRows(): () => void {
  let frame = 0;
  const refresh = (scroller: HTMLElement): void => {
    if (frame !== 0) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      renderBar(scroller);
    });
  };

  const onScroll = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.hasAttribute("data-conversation-scroll")) return;
    refresh(target);
  };

  const onMutate = (): void => {
    for (const scroller of document.querySelectorAll<HTMLElement>("[data-conversation-scroll]")) {
      refresh(scroller);
    }
  };

  document.addEventListener("scroll", onScroll, { capture: true, passive: true });
  window.addEventListener("resize", onMutate);
  onMutate();

  return () => {
    document.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", onMutate);
    if (frame !== 0) window.cancelAnimationFrame(frame);
    for (const host of document.querySelectorAll("[data-oil-sticky-host]")) host.remove();
  };
}
