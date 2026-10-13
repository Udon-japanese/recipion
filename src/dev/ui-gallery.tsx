import type { CSSProperties } from "react";
import { Button } from "#/components/button/button";
import { ButtonLink } from "#/components/button/button-link";
import { useButtonAction } from "#/components/button/use-button-action";
import { Mascot } from "#/components/mascot/mascot";

// 開発中だけの、部品の確認用ページの中身（/dev/ui。本番では、404）。
// 部品を足したら、ここに並べる。デザインの依頼の、スクリーンショットにも使う。
const page: CSSProperties = {
	display: "grid",
	gap: 32,
	maxWidth: 880,
	margin: "0 auto",
	padding: 24,
};
const row: CSSProperties = {
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 16,
};
const note: CSSProperties = {
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 13,
};

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section style={{ display: "grid", gap: 12 }}>
			<h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
			{description ? <p style={note}>{description}</p> : null}
			{children}
		</section>
	);
}

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// 押すと、決まった時間のあと、成功または失敗になるボタン。
function PlayButton({
	label,
	ms,
	ok,
	variant = "primary",
}: {
	label: string;
	ms: number;
	ok: boolean;
	variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
	const action = useButtonAction();

	return (
		<Button
			variant={variant}
			status={action.status}
			successLabel="追加しました"
			errorLabel="失敗しました"
			onClick={() =>
				action.run(async () => {
					await wait(ms);
					return ok;
				})
			}
		>
			{label}
		</Button>
	);
}

// 処理中の、白い丸の中のれしぽよ。ボタンが縮んだときの形を、そのまま再現する。
function LoadingCircle({
	background,
	mascotColor,
	outlineColor,
	outlineWidth,
}: {
	background: string;
	mascotColor?: string;
	outlineColor?: string;
	outlineWidth?: string;
}) {
	return (
		<span
			style={{
				display: "inline-grid",
				placeItems: "center",
				width: 44,
				height: 44,
				boxSizing: "border-box",
				border: "1px solid var(--color-border-strong)",
				borderRadius: "50%",
				background,
				boxShadow: "var(--shadow-sm)",
				overflow: "hidden",
				"--color-mascot": mascotColor,
				"--mascot-outline-color": outlineColor,
				"--mascot-outline-width": outlineWidth,
			}}
		>
			<Mascot size={19 * (44 / 52)} />
		</span>
	);
}

function ColorOption({
	name,
	detail,
	children,
}: {
	name: string;
	detail: string;
	children: React.ReactNode;
}) {
	return (
		<div
			style={{ display: "grid", justifyItems: "center", gap: 8, width: 150 }}
		>
			{children}
			<strong style={{ fontSize: 14 }}>{name}</strong>
			<span style={{ ...note, textAlign: "center" }}>{detail}</span>
		</div>
	);
}

export function UiGallery() {
	return (
		<div style={page}>
			<h1 style={{ margin: 0 }}>部品の確認（開発用）</h1>

			<Section
				title="れしぽよの色（処理中の丸）"
				description="処理中のボタンは、この丸になる。黄色の体の見え方の案。白地・薄い黄色の地、どちらも並べている。"
			>
				<div style={row}>
					<ColorOption name="A. 現在" detail="体 #E9A900。丸は白">
						<LoadingCircle background="var(--color-surface)" />
					</ColorOption>
					<ColorOption
						name="B. 濃い縁"
						detail="体は同じ。縁に #C78A00（1.5px）"
					>
						<LoadingCircle
							background="var(--color-surface)"
							outlineColor="var(--color-primary-pressed)"
							outlineWidth="1.5px"
						/>
					</ColorOption>
					<ColorOption name="C. 体を濃く" detail="体 #D99600。縁なし">
						<LoadingCircle
							background="var(--color-surface)"
							mascotColor="var(--color-primary-hover)"
						/>
					</ColorOption>
					<ColorOption
						name="D. 薄い黄色の丸"
						detail="丸の背景が #FFF3C4。体は現在のまま"
					>
						<LoadingCircle background="var(--color-primary-soft)" />
					</ColorOption>
				</div>
				<p style={note}>拡大した姿（体の幅 60px）：</p>
				<div style={row}>
					<ColorOption name="A" detail="現在">
						<div
							style={{ background: "var(--color-surface)", borderRadius: 16 }}
						>
							<Mascot size={60} />
						</div>
					</ColorOption>
					<ColorOption name="B" detail="濃い縁">
						<div
							style={{
								background: "var(--color-surface)",
								borderRadius: 16,
								"--mascot-outline-color": "var(--color-primary-pressed)",
								"--mascot-outline-width": "3px",
							}}
						>
							<Mascot size={60} />
						</div>
					</ColorOption>
					<ColorOption name="C" detail="体を濃く">
						<div
							style={{
								background: "var(--color-surface)",
								borderRadius: 16,
								"--color-mascot": "var(--color-primary-hover)",
							}}
						>
							<Mascot size={60} />
						</div>
					</ColorOption>
					<ColorOption name="D" detail="薄い黄色の地">
						<div
							style={{
								background: "var(--color-primary-soft)",
								borderRadius: 16,
							}}
						>
							<Mascot size={60} />
						</div>
					</ColorOption>
				</div>
			</Section>

			<Section
				title="ボタンの種類と大きさ"
				description="通常の状態。hover・押下・フォーカス（Tab）も、ここで確かめる。"
			>
				{(["primary", "secondary", "danger", "ghost"] as const).map(
					(variant) => (
						<div key={variant} style={row}>
							<code style={{ width: 80 }}>{variant}</code>
							<Button variant={variant} size="sm">
								小さい
							</Button>
							<Button variant={variant}>ふつう</Button>
							<Button variant={variant} size="lg">
								大きい
							</Button>
							<Button variant={variant} disabled>
								無効
							</Button>
						</div>
					),
				)}
			</Section>

			<Section
				title="無効の理由（押したときだけ出る）"
				description="無効のボタンを押す（タップ・Enter）と、短い理由が一瞬出る。"
			>
				<div style={row}>
					<Button disabled disabledReason="メールアドレスを入力してください">
						コードを送る
					</Button>
					<Button
						variant="secondary"
						disabled
						disabledReason="先に、食材の名前を入れてください"
					>
						在庫に追加
					</Button>
				</div>
			</Section>

			<Section
				title="押すと変形するボタン"
				description="処理中 → 完了/失敗。短い処理（30ms）は、れしぽよを出さず、すぐ完了へ。完了・失敗の表示中も、続けて押せる。"
			>
				<div style={row}>
					<PlayButton label="成功（2.5秒）" ms={2500} ok />
					<PlayButton label="成功（30ms）" ms={30} ok />
					<PlayButton label="失敗（1.2秒）" ms={1200} ok={false} />
				</div>
				<div style={row}>
					<PlayButton variant="secondary" label="副（1.5秒）" ms={1500} ok />
					<PlayButton variant="danger" label="危険（1.5秒）" ms={1500} ok />
					<PlayButton variant="ghost" label="ghost（1.5秒）" ms={1500} ok />
				</div>
				<div style={{ ...row, flexWrap: "nowrap" }}>
					<PlayButton label="隣の要素がある行" ms={1500} ok />
					<span>← 広がると、この文字が押される</span>
				</div>
			</Section>

			<Section
				title="アイコン付きと、リンクのボタン"
				description="アイコンは、差し込み口の確認用の記号（実際のアイコンは、デザインで決める）。"
			>
				<div style={row}>
					<Button leadingIcon={<span>＋</span>}>追加する</Button>
					<Button variant="secondary" leadingIcon={<span>↩</span>}>
						元に戻す
					</Button>
					<ButtonLink to="/" variant="primary">
						ホームへ（リンク）
					</ButtonLink>
					<ButtonLink to="/" variant="secondary">
						ホームへ（副）
					</ButtonLink>
					<ButtonLink to="/" variant="ghost">
						ホームへ（ghost）
					</ButtonLink>
				</div>
			</Section>

			<Section title="れしぽよの大きさ">
				<div style={row}>
					<Mascot size={19} />
					<Mascot size={40} />
					<Mascot size={80} />
					<Mascot size={120} active={false} />
				</div>
				<p style={note}>右端は、動かないとき（動きを減らす設定）の姿勢。</p>
			</Section>
		</div>
	);
}
