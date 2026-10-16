import { ShortcutKeys } from "#/features/shortcuts/components/shortcut-keys";

// 補完メニューの操作の案内。変換中は、素の矢印を IME が使うので、Alt（Option）+↑↓ で選ぶ。
export function CompletionHint({ isComposing }: { isComposing: boolean }) {
	return isComposing ? (
		<>
			<ShortcutKeys keys={["alt", "up-down"]} />
			で選び、
			<ShortcutKeys keys={["tab"]} />
			で決定
		</>
	) : (
		<>
			<ShortcutKeys keys={["up-down"]} />
			で選び、
			<ShortcutKeys keys={["tab"]} />
			で決定（
			<ShortcutKeys keys={["esc"]} />
			で閉じる）
		</>
	);
}
