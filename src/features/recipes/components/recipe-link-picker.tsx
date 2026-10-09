import { useEffect, useRef, useState } from "react";
import { filterLinkTargets } from "../domain/filter-link-targets";
import type { RecipeLinkTarget } from "../domain/recipe-links";
import * as styles from "./recipe-link-picker.css";

type RecipeLinkPickerProps = {
	title: string;
	targets: readonly RecipeLinkTarget[];
	status: "loading" | "ready" | "error";
	onSelect: (target: RecipeLinkTarget) => void;
	onClose: () => void;
};

const maxShown = 30;

// リンクするレシピを、一覧から選ぶ（名前で絞れる）。入力欄の下に開く。
export function RecipeLinkPicker({
	title,
	targets,
	status,
	onSelect,
	onClose,
}: RecipeLinkPickerProps) {
	const [query, setQuery] = useState("");
	const searchRef = useRef<HTMLInputElement>(null);
	const shown = filterLinkTargets(targets, query, maxShown);

	useEffect(() => {
		searchRef.current?.focus();
	}, []);

	return (
		<section className={styles.picker} aria-label={title}>
			<div className={styles.header}>
				<p className={styles.title}>{title}</p>
				<button type="button" onClick={onClose}>
					閉じる
				</button>
			</div>

			<input
				ref={searchRef}
				className={styles.search}
				aria-label="レシピを探す"
				placeholder="レシピの名前で探す"
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				onKeyDown={(event) => {
					// Enter で、入力欄のあるフォーム（レシピの保存）が、送信されないようにする。変換中の Enter は、IME に任せる。
					if (event.key === "Enter") {
						event.preventDefault();
					}

					if (event.key === "Escape" && !event.nativeEvent.isComposing) {
						onClose();
					}
				}}
			/>

			{status === "loading" ? (
				<p className={styles.message}>読み込んでいます…</p>
			) : null}
			{status === "error" ? (
				<p className={styles.message} role="alert">
					レシピの一覧を読み込めませんでした。
				</p>
			) : null}
			{status === "ready" && targets.length === 0 ? (
				<p className={styles.message}>リンクできるレシピが、まだありません。</p>
			) : null}
			{status === "ready" && targets.length > 0 && shown.length === 0 ? (
				<p className={styles.message}>見つかりません。</p>
			) : null}

			{shown.length > 0 ? (
				<ul className={styles.list}>
					{shown.map((target) => (
						<li key={target.publicId}>
							<button
								type="button"
								className={styles.item}
								onClick={() => onSelect(target)}
							>
								{target.name}
							</button>
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}
