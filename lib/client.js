window.__ModuleLoader__.load({
	id: "dsh-oil-sticky-prompt",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region src/client/flattenPrompt.ts
		/** Collapse original line breaks so a short first line does not hide the rest after clamp. */
		function flattenPromptText(text) {
			return text.replace(/\s+/g, " ").trim();
		}
		//#endregion
		//#region src/client/pickStuckRow.ts
		const PIN = .5;
		const RELEASE = 8;
		/** Last user row that has crossed the scrollport top, with hysteresis so compact styles cannot flicker. */
		function pickPinnedRow(rows, scrollerTop, currentKey) {
			let lastPast;
			let lastPastIndex = -1;
			for (const [index, row] of rows.entries()) if (row.top <= scrollerTop + PIN) {
				lastPast = row.key;
				lastPastIndex = index;
			}
			if (currentKey !== void 0) {
				const currentIndex = rows.findIndex((row) => row.key === currentKey);
				const current = currentIndex === -1 ? void 0 : rows[currentIndex];
				if (lastPastIndex > currentIndex) return lastPast;
				if (current !== void 0 && current.top <= scrollerTop + RELEASE) return currentKey;
			}
			return lastPast;
		}
		//#endregion
		//#region src/client/installSticky.ts
		const HOST_ATTR = "data-oil-sticky-host";
		const EASE = "220ms cubic-bezier(0.22, 1, 0.36, 1)";
		const hideTimers = /* @__PURE__ */ new WeakMap();
		function cssEscape(value) {
			if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
			return value.replace(/\\/g, "\\\\").replace(/"/g, "\\'");
		}
		function reducedMotion() {
			return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
		}
		/**
		* Node slot wrapper the chat flow renders inside every row. Harness 0.2.x keeps
		* the slot key stable while its CSS-module class hashes change per build.
		*/
		const NODE_SLOT = "[data-slot=\"conversation.chat.node\"]";
		/**
		* The user bubble. Its class keeps the stable `_bubble` suffix behind the
		* hashed CSS-module prefix, so suffix matching survives rebuilds.
		*/
		const USER_BUBBLE = "[class*=\"_bubble\"]";
		function userNode(row) {
			return row.querySelector(NODE_SLOT);
		}
		function bubbleOf(row) {
			const node = userNode(row);
			const bubble = node?.querySelector(USER_BUBBLE);
			if (bubble instanceof HTMLElement) return bubble;
			if (node instanceof HTMLElement) return node;
			return row;
		}
		function textOf(row) {
			return flattenPromptText(bubbleOf(row).textContent ?? "");
		}
		function boxesOf(scroller) {
			const rows = [];
			for (const row of scroller.querySelectorAll("[data-chat-flow-kind=\"user\"][data-chat-anchor-key]")) {
				const key = row.dataset.chatAnchorKey;
				if (key === void 0 || key === "") continue;
				rows.push({
					key,
					top: row.getBoundingClientRect().top,
					row
				});
			}
			return rows;
		}
		function ensureHost(scroller) {
			const existing = scroller.querySelector(`:scope > [${HOST_ATTR}]`);
			if (existing !== null) return existing;
			const host = document.createElement("div");
			host.setAttribute(HOST_ATTR, "");
			host.innerHTML = "<div class=\"oilStickyBar\" hidden><button type=\"button\" class=\"oilStickyPrompt\"><span class=\"oilStickyPromptText\"></span></button></div>";
			scroller.prepend(host);
			return host;
		}
		function clearTransform(prompt) {
			prompt.style.transition = "";
			prompt.style.transform = "";
			prompt.style.transformOrigin = "";
		}
		function placeFrom(prompt, from, to) {
			const scaleX = from.width / Math.max(to.width, 1);
			const scaleY = from.height / Math.max(to.height, 1);
			prompt.style.transition = "none";
			prompt.style.transformOrigin = "top left";
			prompt.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scaleX}, ${scaleY})`;
		}
		function animateToRest(prompt) {
			prompt.getBoundingClientRect();
			prompt.style.transition = `transform ${EASE}`;
			prompt.style.transform = "none";
		}
		function renderBar(scroller) {
			const host = ensureHost(scroller);
			const bar = host.querySelector(".oilStickyBar");
			const label = host.querySelector(".oilStickyPromptText");
			const prompt = host.querySelector(".oilStickyPrompt");
			if (bar === null || label === null || prompt === null) return;
			const rows = boxesOf(scroller);
			const previous = host.dataset.oilPinnedKey;
			const next = pickPinnedRow(rows, scroller.getBoundingClientRect().top, previous);
			const match = rows.find((row) => row.key === next);
			if (next === void 0 || match === void 0) {
				if (previous === void 0 || bar.hidden || hideTimers.has(host)) return;
				hideBar(host, bar, prompt);
				return;
			}
			const pendingHide = hideTimers.get(host);
			if (pendingHide !== void 0) {
				window.clearTimeout(pendingHide);
				hideTimers.delete(host);
			}
			const text = textOf(match.row);
			if (text === "") {
				hideBar(host, bar, prompt);
				return;
			}
			if (previous === next && !bar.hidden && pendingHide === void 0) {
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
		function hideBar(host, bar, prompt) {
			delete host.dataset.oilPinnedKey;
			if (bar.hidden) return;
			clearTransform(prompt);
			const finish = () => {
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
		function bindJump(prompt, scroller, key) {
			prompt.onclick = () => {
				scroller.querySelector(`[data-chat-flow-kind="user"][data-chat-anchor-key="${cssEscape(key)}"]`)?.scrollIntoView({
					block: "start",
					behavior: reducedMotion() ? "auto" : "smooth"
				});
			};
		}
		function installStickyUserRows() {
			let frame = 0;
			const refresh = (scroller) => {
				if (frame !== 0) return;
				frame = window.requestAnimationFrame(() => {
					frame = 0;
					renderBar(scroller);
				});
			};
			const onScroll = (event) => {
				const target = event.target;
				if (!(target instanceof HTMLElement) || !target.hasAttribute("data-conversation-scroll")) return;
				refresh(target);
			};
			const onMutate = () => {
				for (const scroller of document.querySelectorAll("[data-conversation-scroll]")) refresh(scroller);
			};
			document.addEventListener("scroll", onScroll, {
				capture: true,
				passive: true
			});
			window.addEventListener("resize", onMutate);
			onMutate();
			return () => {
				document.removeEventListener("scroll", onScroll, true);
				window.removeEventListener("resize", onMutate);
				if (frame !== 0) window.cancelAnimationFrame(frame);
				for (const host of document.querySelectorAll("[data-oil-sticky-host]")) host.remove();
			};
		}
		//#endregion
		//#region src/client/index.tsx
		const STYLE_ID = "dsh-oil-sticky-prompt";
		const STYLES = `
[data-oil-sticky-host]{
  position:sticky;
  top:0;
  z-index:5;
  height:0;
  overflow:visible;
  pointer-events:none;
}
.oilStickyBar{
  position:absolute;
  left:0;
  right:0;
  top:0;
  display:flex;
  justify-content:center;
  padding:8px calc(var(--dsh-composer-side-clearance, 16px) + 16px);
  background:var(--dsw-alias-bg-base);
  box-shadow:0 16px 16px -12px var(--dsw-alias-bg-base);
  opacity:0;
  transition:opacity 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.oilStickyBar[data-oil-visible]{opacity:1}
.oilStickyBar[hidden]{display:none}
.oilStickyPrompt{
  display:block;
  box-sizing:border-box;
  width:100%;
  max-width:var(--dsh-chat-content-width, 748px);
  margin:0;
  padding:6px 12px;
  border:none;
  border-radius:16px;
  background:var(--dsw-specific-bubble);
  color:var(--dsw-alias-label-primary);
  font:inherit;
  font-size:13px;
  line-height:20px;
  text-align:left;
  pointer-events:auto;
  cursor:pointer;
  will-change:transform;
}
.oilStickyPrompt:focus-visible{
  outline:none;
  box-shadow:0 0 0 2px var(--dsw-alias-border-l3);
}
.oilStickyPromptText{
  display:-webkit-box;
  overflow:hidden;
  overflow-wrap:anywhere;
  white-space:normal;
  -webkit-box-orient:vertical;
  -webkit-line-clamp:2;
}
@media (prefers-reduced-motion:reduce){
  .oilStickyBar{box-shadow:none;opacity:1;transition:none}
  .oilStickyPrompt{transition:none}
}
`;
		const inject = [];
		function apply(ctx) {
			ctx.effect(() => {
				const existing = document.querySelector(`style[data-plugin-css=${JSON.stringify(STYLE_ID)}]`);
				const tag = existing instanceof HTMLStyleElement ? existing : document.createElement("style");
				tag.dataset.plugin = "dsh-oil-sticky-prompt";
				tag.dataset.pluginCss = STYLE_ID;
				tag.textContent = STYLES;
				if (existing === null) document.head.appendChild(tag);
				return () => {
					tag.remove();
				};
			}, "dsh-oil-sticky-prompt: styles");
			ctx.effect(() => installStickyUserRows(), "dsh-oil-sticky-prompt: stick");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map