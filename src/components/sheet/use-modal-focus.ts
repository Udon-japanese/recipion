import { type RefObject, useEffect } from "react";

const focusableSelector = [
	"a[href]",
	"button:not([disabled])",
	"input:not([disabled])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	'[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusable(container: HTMLElement): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>(focusableSelector)].filter(
		(element) =>
			!element.hasAttribute("inert") &&
			element.getAttribute("aria-hidden") !== "true",
	);
}

// モーダルの、フォーカスの扱い：開いたら中へ、Tab は中で一周、背景は inert、閉じたら元の場所へ戻す。
export function useModalFocus(
	active: boolean,
	containerRef: RefObject<HTMLElement | null>,
	portalRef: RefObject<HTMLElement | null>,
) {
	useEffect(() => {
		const container = containerRef.current;

		if (!active || !container) {
			return;
		}

		const opener =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;

		// 背景を操作できなくする（フォーカス・読み上げ・クリックの対象から外す）。
		const inerted: HTMLElement[] = [];

		for (const child of document.body.children) {
			if (
				child instanceof HTMLElement &&
				child !== portalRef.current &&
				!child.hasAttribute("inert") &&
				child.tagName !== "SCRIPT"
			) {
				child.setAttribute("inert", "");
				inerted.push(child);
			}
		}

		// 初めに、中の「自動で選ぶ」ものか、枠そのものへ。
		const initial =
			container.querySelector<HTMLElement>("[data-autofocus]") ?? container;
		initial.focus({ preventScroll: true });

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== "Tab" || !container) {
				return;
			}

			const focusable = getFocusable(container);
			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (!first || !last) {
				event.preventDefault();
				container.focus();

				return;
			}

			const current = document.activeElement;

			if (event.shiftKey && (current === first || current === container)) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && current === last) {
				event.preventDefault();
				first.focus();
			}
		}

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);

			for (const element of inerted) {
				element.removeAttribute("inert");
			}

			// 押したボタンが、まだ画面にあれば、そこへ戻す。
			if (opener?.isConnected) {
				opener.focus({ preventScroll: true });
			}
		};
	}, [active, containerRef, portalRef]);
}
