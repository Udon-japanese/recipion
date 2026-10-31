import {
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { IconButton } from "#/components/icon-button/icon-button";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { type DishPlacement, dishCoverLimits } from "../domain/dish-cover";
import { dishArtViewSize, findDishPart } from "../domain/dish-part";
import {
	type DishPartCategory,
	dishPartCategories,
	partsInCategory,
} from "../domain/dish-part-category";
import {
	type Bounds,
	boundsCorners,
	type Point,
} from "../domain/dish-placement-geometry";
import { type DishPreset, dishPresets } from "../domain/dish-preset";
import {
	addDishPart,
	duplicateDishPart,
	findDishPartAt,
	flipDishPart,
	moveDishPart,
	nudgeDishPart,
	removeDishPart,
	reorderDishPart,
	scaleDishPart,
	setDishPartRotate,
	setDishPartScale,
	snapRotation,
	tintDishPart,
	turnDishPart,
} from "../domain/edit-dish-cover";
import { DishArt, DishArtLayers, DishPartPreview } from "./dish-art";
import * as styles from "./dish-cover-editor.css";

// 「セット」に並べる組み合わせ。background は、見本の地の色（アバターの背景など）。
export type DishEditorPreset = DishPreset & { background?: string };

type DishCoverEditorProps = {
	placements: readonly DishPlacement[];
	onChange: (placements: DishPlacement[]) => void;
	// ここから下は、料理の絵以外（アバター）で使うときの設定。省略すると、料理の絵のまま。
	maxParts?: number;
	presets?: readonly DishEditorPreset[];
	// セットを選んだとき（背景も一緒に変えるときなど）。
	onChoosePreset?: (preset: DishEditorPreset) => void;
	// 絵の地の色。
	background?: string;
	// 丸く切り抜いて使う絵（丸の外を薄く暗くして、見える範囲を示す）。
	round?: boolean;
	// 最初に開く、部品の分類。
	initialCategoryId?: string;
	// 編集面の読み上げの名前（最初の文）。
	label?: string;
	// 「色」の下に足す欄（背景の色など）。
	extra?: ReactNode;
};

// 指・ポインターの操作の種類。
type Gesture =
	| { kind: "move"; index: number; offsetX: number; offsetY: number }
	| { kind: "scale"; index: number; startDistance: number; startScale: number }
	| { kind: "rotate"; index: number; startAngle: number; startRotate: number }
	| {
			kind: "pinch";
			index: number;
			startDistance: number;
			startAngle: number;
			startScale: number;
			startRotate: number;
	  };

type Tab = "parts" | "sets";

const tabOptions = [
	{ value: "parts", label: "パーツ" },
	{ value: "sets", label: "セット" },
] as const;

// 範囲が測れないとき（テスト環境など）の、部品の範囲。
const fallbackBounds: Bounds = { x: 20, y: 20, width: 60, height: 60 };

// 履歴に残す数。
const historyLimit = 50;

// 拡大のつまみの cursor。部品が回っていても、つまみの向きに合う斜めの矢印にする。
function resizeCursor(from: Point, to: Point): string {
	const degrees = ((angleDegrees(from, to) % 180) + 180) % 180;

	if (degrees < 22.5 || degrees >= 157.5) return "ew-resize";
	if (degrees < 67.5) return "nwse-resize";
	if (degrees < 112.5) return "ns-resize";

	return "nesw-resize";
}

function distance(a: Point, b: Point): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleDegrees(from: Point, to: Point): number {
	return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

function keepInside(point: Point, margin: number): Point {
	return {
		x: Math.min(dishArtViewSize - margin, Math.max(margin, point.x)),
		y: Math.min(dishArtViewSize - margin, Math.max(margin, point.y)),
	};
}

// 料理の絵を組み立てる画面。触って動かす（移動・つまみで拡大と回転・2本指・棚から置く）。
export function DishCoverEditor({
	placements,
	onChange,
	maxParts = dishCoverLimits.maxParts,
	presets = dishPresets,
	onChoosePreset,
	background,
	round = false,
	initialCategoryId,
	label = "料理の絵。",
	extra,
}: DishCoverEditorProps) {
	const [selected, setSelected] = useState(-1);
	// 触って動かしている間の cursor（つまみから指・マウスが離れても、変わらないようにする）。
	const [dragCursor, setDragCursor] = useState<string | null>(null);
	// 空から始めるときは、土台になる「セット」から。
	const [tab, setTab] = useState<Tab>(
		placements.length === 0 ? "sets" : "parts",
	);
	const [categoryId, setCategoryId] = useState(
		initialCategoryId ?? dishPartCategories[0]?.id ?? "",
	);
	// 戻す・進む用。変える前の並びを積む。
	const [history, setHistory] = useState<DishPlacement[][]>([]);
	const [future, setFuture] = useState<DishPlacement[][]>([]);
	// 棚からマウスで運んでいる部品。
	const [carrying, setCarrying] = useState<{
		partId: string;
		x: number;
		y: number;
	} | null>(null);
	// 部品ごとの、絵の中の範囲（選択の枠と、触れる範囲に使う）。
	const [boundsByPart, setBoundsByPart] = useState<Record<string, Bounds>>({});
	// 絵の表示の幅（px）。つまみの大きさを、画面の上で一定にするため。
	const [canvasWidth, setCanvasWidth] = useState(320);
	const canvas = useRef<SVGSVGElement>(null);
	const measure = useRef<SVGSVGElement>(null);
	const gesture = useRef<Gesture | null>(null);
	const pointers = useRef(new Map<number, Point>());
	// この操作で、戻す用の記録をもう積んだか（触れただけでは積まない）。
	const recorded = useRef(false);
	// 棚の部品をドラッグしたあとの click（中央に置く）を無視する。
	const justCarried = useRef(false);
	const latest = useRef(placements);

	latest.current = placements;

	const category: DishPartCategory | undefined =
		dishPartCategories.find((candidate) => candidate.id === categoryId) ??
		dishPartCategories[0];
	const selectedPlacement = placements[selected];
	const selectedPart = selectedPlacement
		? findDishPart(selectedPlacement.partId)
		: undefined;
	const carriedPart = carrying ? findDishPart(carrying.partId) : undefined;
	const partIdsKey = [...new Set(placements.map((item) => item.partId))]
		.sort()
		.join(",");

	// 置いてある部品の範囲を測る（画面の外に隠した絵を、ブラウザに測らせる）。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 部品の種類が変わったときだけ測る
	useLayoutEffect(() => {
		const root = measure.current;

		if (!root) return;

		const next: Record<string, Bounds> = {};

		for (const element of root.querySelectorAll<SVGGElement>("g[data-part]")) {
			const id = element.dataset.part;

			if (id && typeof element.getBBox === "function") {
				const box = element.getBBox();

				if (box.width > 0 && box.height > 0) {
					next[id] = {
						x: box.x,
						y: box.y,
						width: box.width,
						height: box.height,
					};
				}
			}
		}

		setBoundsByPart(next);
	}, [partIdsKey]);

	useEffect(() => {
		const element = canvas.current;

		if (!element || typeof ResizeObserver === "undefined") return;

		const observer = new ResizeObserver(() => {
			setCanvasWidth(element.getBoundingClientRect().width || 320);
		});

		observer.observe(element);

		return () => observer.disconnect();
	}, []);

	function boundsOf(partId: string): Bounds | undefined {
		return boundsByPart[partId];
	}

	function record() {
		if (recorded.current) return;

		recorded.current = true;
		setHistory((previous) => [
			...previous.slice(-(historyLimit - 1)),
			[...latest.current],
		]);
		setFuture([]);
	}

	// ボタンなど、1回で終わる変更。
	function commit(next: DishPlacement[]) {
		recorded.current = false;
		record();
		onChange(next);
	}

	// 触って動かす間の変更（最初の1回だけ、戻す用に記録する）。
	function change(next: DishPlacement[]) {
		record();
		onChange(next);
	}

	function undo() {
		const previous = history.at(-1);

		if (!previous) return;

		setHistory(history.slice(0, -1));
		setFuture((items) => [[...latest.current], ...items]);
		setSelected(-1);
		onChange(previous);
	}

	function redo() {
		const next = future[0];

		if (!next) return;

		setFuture(future.slice(1));
		setHistory((items) => [...items, [...latest.current]]);
		setSelected(-1);
		onChange(next);
	}

	// Cmd/Ctrl+Z：戻す。Cmd/Ctrl+Shift+Z と Cmd/Ctrl+Y：進む。
	const shortcut = useRef<(event: globalThis.KeyboardEvent) => void>(() => {});

	shortcut.current = (event) => {
		if (!(event.metaKey || event.ctrlKey) || event.isComposing) return;

		const target = event.target;

		if (
			target instanceof HTMLElement &&
			(target.isContentEditable ||
				/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
		) {
			return;
		}

		const key = event.key.toLowerCase();

		if (key === "z" && !event.shiftKey) {
			event.preventDefault();
			undo();
		} else if ((key === "z" && event.shiftKey) || key === "y") {
			event.preventDefault();
			redo();
		}
	};

	useEffect(() => {
		const handler = (event: globalThis.KeyboardEvent) =>
			shortcut.current(event);

		document.addEventListener("keydown", handler);

		return () => document.removeEventListener("keydown", handler);
	}, []);

	function toViewBox(clientX: number, clientY: number): Point {
		const rect = canvas.current?.getBoundingClientRect();

		if (!rect || rect.width === 0) return { x: 0, y: 0 };

		return {
			x: ((clientX - rect.left) / rect.width) * dishArtViewSize,
			y: ((clientY - rect.top) / rect.height) * dishArtViewSize,
		};
	}

	function startPinch(index: number) {
		const [first, second] = [...pointers.current.values()];
		const target = latest.current[index];

		if (!first || !second || !target) return;

		recorded.current = false;
		gesture.current = {
			kind: "pinch",
			index,
			startDistance: Math.max(1, distance(first, second)),
			startAngle: angleDegrees(first, second),
			startScale: target.scale ?? 1,
			startRotate: target.rotate ?? 0,
		};
	}

	function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
		const point = toViewBox(event.clientX, event.clientY);

		pointers.current.set(event.pointerId, point);
		event.currentTarget.setPointerCapture(event.pointerId);

		// 2本目の指：選んでいる部品を、つまんで拡大・回転する。
		if (pointers.current.size === 2) {
			if (selected >= 0) startPinch(selected);
			else gesture.current = null;

			return;
		}

		if (pointers.current.size > 2) return;

		recorded.current = false;

		const handle =
			event.target instanceof Element
				? event.target.closest("[data-handle]")?.getAttribute("data-handle")
				: null;
		const target = placements[selected];

		if (handle === "delete" && target) {
			commit(removeDishPart(placements, selected));
			setSelected(-1);
			pointers.current.clear();

			return;
		}

		if (handle === "scale" && target) {
			setDragCursor(resizeCursor(target, point));
			gesture.current = {
				kind: "scale",
				index: selected,
				startDistance: Math.max(1, distance(point, target)),
				startScale: target.scale ?? 1,
			};

			return;
		}

		if (handle === "rotate" && target) {
			setDragCursor("grabbing");
			gesture.current = {
				kind: "rotate",
				index: selected,
				startAngle: angleDegrees(target, point),
				startRotate: target.rotate ?? 0,
			};

			return;
		}

		const index = findDishPartAt(placements, point.x, point.y, boundsOf);

		setSelected(index);

		const hit = placements[index];

		setDragCursor(hit ? "grabbing" : null);
		gesture.current = hit
			? {
					kind: "move",
					index,
					offsetX: hit.x - point.x,
					offsetY: hit.y - point.y,
				}
			: null;
	}

	function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
		if (!pointers.current.has(event.pointerId)) return;

		const current = gesture.current;
		const point = toViewBox(event.clientX, event.clientY);

		pointers.current.set(event.pointerId, point);

		if (!current) return;

		const target = latest.current[current.index];

		if (!target) return;

		switch (current.kind) {
			case "move":
				change(
					moveDishPart(
						latest.current,
						current.index,
						point.x + current.offsetX,
						point.y + current.offsetY,
					),
				);
				break;
			case "scale":
				change(
					setDishPartScale(
						latest.current,
						current.index,
						(current.startScale * distance(point, target)) /
							current.startDistance,
					),
				);
				break;
			case "rotate":
				change(
					setDishPartRotate(
						latest.current,
						current.index,
						snapRotation(
							current.startRotate +
								angleDegrees(target, point) -
								current.startAngle,
						),
					),
				);
				break;
			case "pinch": {
				const [first, second] = [...pointers.current.values()];

				if (!first || !second) break;

				change(
					setDishPartRotate(
						setDishPartScale(
							latest.current,
							current.index,
							(current.startScale * distance(first, second)) /
								current.startDistance,
						),
						current.index,
						snapRotation(
							current.startRotate +
								angleDegrees(first, second) -
								current.startAngle,
						),
					),
				);
				break;
			}
		}
	}

	function handlePointerEnd(event: PointerEvent<SVGSVGElement>) {
		pointers.current.delete(event.pointerId);
		setDragCursor(null);

		// つまんでいた指が1本残っても、そのまま動かし始めない（位置が飛ぶため）。
		if (gesture.current?.kind === "pinch" || pointers.current.size === 0) {
			gesture.current = null;
		}
	}

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (selected < 0 || event.metaKey || event.ctrlKey) return;

		const arrows: Record<string, [-1 | 0 | 1, -1 | 0 | 1]> = {
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0],
			ArrowUp: [0, -1],
			ArrowDown: [0, 1],
		};
		const arrow = arrows[event.key];

		if (arrow) {
			event.preventDefault();
			commit(nudgeDishPart(placements, selected, arrow[0], arrow[1]));
		} else if (event.key === "Delete" || event.key === "Backspace") {
			event.preventDefault();
			commit(removeDishPart(placements, selected));
			setSelected(-1);
		} else if (event.key === "+" || event.key === "=") {
			commit(scaleDishPart(placements, selected, 1));
		} else if (event.key === "-") {
			commit(scaleDishPart(placements, selected, -1));
		}
	}

	function reorder(direction: 1 | -1) {
		const result = reorderDishPart(placements, selected, direction);

		commit(result.placements);
		setSelected(result.selected);
	}

	function addAt(partId: string, point?: Point) {
		const added = addDishPart(placements, partId, maxParts);

		if (added.length === placements.length) return;

		const last = added.length - 1;

		commit(point ? moveDishPart(added, last, point.x, point.y) : added);
		setSelected(last);
	}

	// 棚の部品を、マウスでキャンバスへ運ぶ（タッチは、押して中央に置く）。
	function handleShelfPointerDown(
		event: PointerEvent<HTMLButtonElement>,
		partId: string,
	) {
		if (event.pointerType === "touch") return;

		const startX = event.clientX;
		const startY = event.clientY;
		const element = event.currentTarget;
		let moved = false;

		element.setPointerCapture(event.pointerId);

		function onMove(moveEvent: globalThis.PointerEvent) {
			if (
				!moved &&
				Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 6
			) {
				return;
			}

			moved = true;
			setCarrying({ partId, x: moveEvent.clientX, y: moveEvent.clientY });
		}

		function onUp(upEvent: globalThis.PointerEvent) {
			element.removeEventListener("pointermove", onMove);
			element.removeEventListener("pointerup", onUp);
			element.removeEventListener("pointercancel", onUp);
			setCarrying(null);

			if (!moved) return;

			justCarried.current = true;

			const rect = canvas.current?.getBoundingClientRect();

			if (
				rect &&
				upEvent.clientX >= rect.left &&
				upEvent.clientX <= rect.right &&
				upEvent.clientY >= rect.top &&
				upEvent.clientY <= rect.bottom
			) {
				addAt(partId, toViewBox(upEvent.clientX, upEvent.clientY));
			}
		}

		element.addEventListener("pointermove", onMove);
		element.addEventListener("pointerup", onUp);
		element.addEventListener("pointercancel", onUp);
	}

	// 選んだ部品の枠とつまみ。枠は、部品の範囲にぴったり合わせる。
	function renderFrame(placement: DishPlacement) {
		const unit = dishArtViewSize / canvasWidth;
		const bounds = boundsOf(placement.partId) ?? fallbackBounds;
		const [topLeft, topRight, bottomRight, bottomLeft] = boundsCorners(
			placement,
			bounds,
		);
		const radians = ((placement.rotate ?? 0) * Math.PI) / 180;
		const up = { x: Math.sin(radians), y: -Math.cos(radians) };
		const topCenter = {
			x: (topLeft.x + topRight.x) / 2,
			y: (topLeft.y + topRight.y) / 2,
		};
		const rotateHandle = keepInside(
			{
				x: topCenter.x + up.x * 36 * unit,
				y: topCenter.y + up.y * 36 * unit,
			},
			14 * unit,
		);
		const scaleHandle = keepInside(bottomRight, 14 * unit);
		const deleteHandle = keepInside(topLeft, 14 * unit);
		const visual = 14 * unit;
		const hit = 26 * unit;
		const ink = "var(--color-focus)";

		return (
			<g>
				<polygon
					points={[topLeft, topRight, bottomRight, bottomLeft]
						.map((corner) => `${corner.x},${corner.y}`)
						.join(" ")}
					fill="none"
					stroke={ink}
					strokeWidth={1.5}
					vectorEffect="non-scaling-stroke"
					pointerEvents="none"
				/>
				<line
					x1={topCenter.x}
					y1={topCenter.y}
					x2={rotateHandle.x}
					y2={rotateHandle.y}
					stroke={ink}
					strokeWidth={1.5}
					vectorEffect="non-scaling-stroke"
					pointerEvents="none"
				/>
				<g data-handle="rotate" className={styles.rotateHandle}>
					<circle
						cx={rotateHandle.x}
						cy={rotateHandle.y}
						r={hit}
						fill="transparent"
					/>
					<circle
						cx={rotateHandle.x}
						cy={rotateHandle.y}
						r={visual}
						fill="var(--color-surface)"
						stroke={ink}
						strokeWidth={1.5}
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={`M${rotateHandle.x + visual * 0.5} ${rotateHandle.y - visual * 0.1}A${visual * 0.5} ${visual * 0.5} 0 1 0 ${rotateHandle.x + visual * 0.3} ${rotateHandle.y + visual * 0.4}`}
						fill="none"
						stroke={ink}
						strokeWidth={1.5}
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
				<g
					data-handle="scale"
					className={styles.scaleHandle}
					// 部品が回っていても、つまみの向きに合う矢印にする。
					style={{ cursor: resizeCursor(placement, scaleHandle) }}
				>
					<circle
						cx={scaleHandle.x}
						cy={scaleHandle.y}
						r={hit}
						fill="transparent"
					/>
					<circle
						cx={scaleHandle.x}
						cy={scaleHandle.y}
						r={visual}
						fill="var(--color-surface)"
						stroke={ink}
						strokeWidth={1.5}
						vectorEffect="non-scaling-stroke"
					/>
					<path
						d={`M${scaleHandle.x - visual * 0.45} ${scaleHandle.y + visual * 0.45}L${scaleHandle.x + visual * 0.45} ${scaleHandle.y - visual * 0.45}M${scaleHandle.x + visual * 0.05} ${scaleHandle.y - visual * 0.45}h${visual * 0.4}v${visual * 0.4}M${scaleHandle.x - visual * 0.05} ${scaleHandle.y + visual * 0.45}h${-visual * 0.4}v${-visual * 0.4}`}
						fill="none"
						stroke={ink}
						strokeWidth={1.5}
						strokeLinecap="round"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
				<g data-handle="delete" className={styles.deleteHandle}>
					<circle
						cx={deleteHandle.x}
						cy={deleteHandle.y}
						r={hit}
						fill="transparent"
					/>
					<circle
						cx={deleteHandle.x}
						cy={deleteHandle.y}
						r={visual}
						fill="var(--color-error)"
					/>
					<path
						d={`M${deleteHandle.x - visual * 0.4} ${deleteHandle.y - visual * 0.4}l${visual * 0.8} ${visual * 0.8}M${deleteHandle.x + visual * 0.4} ${deleteHandle.y - visual * 0.4}l${-visual * 0.8} ${visual * 0.8}`}
						stroke="var(--color-surface)"
						strokeWidth={2}
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				</g>
			</g>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.stage}>
				<div className={styles.group}>
					<h3 className={styles.groupTitle}>やり直し</h3>
					<div className={styles.toolbar}>
						<IconButton
							size="std"
							icon="undo"
							label="ひとつ戻す"
							disabled={history.length === 0}
							onClick={undo}
						/>
						<IconButton
							size="std"
							icon="redo"
							label="ひとつ進む"
							disabled={future.length === 0}
							onClick={redo}
						/>
						<IconButton
							size="std"
							icon="trash"
							tone="danger"
							label="全部消す"
							disabled={placements.length === 0}
							onClick={() => {
								commit([]);
								setSelected(-1);
							}}
						/>
					</div>
				</div>

				<div
					className={styles.canvasFrame}
					role="application"
					aria-label={`${label}部品を触って動かせます。矢印キーで動かし、プラスとマイナスで大きさを変え、Delete で消します。`}
					// biome-ignore lint/a11y/noNoninteractiveTabindex: 矢印キーで部品を動かす編集面なので、キーボードの対象にする
					tabIndex={0}
					onKeyDown={handleKeyDown}
				>
					<svg
						ref={canvas}
						className={styles.canvas}
						viewBox={`0 0 ${dishArtViewSize} ${dishArtViewSize}`}
						aria-hidden="true"
						data-sheet-no-drag
						style={{
							...(dragCursor ? { cursor: dragCursor } : {}),
							...(background ? { background } : {}),
						}}
						onPointerDown={handlePointerDown}
						onPointerMove={handlePointerMove}
						onPointerUp={handlePointerEnd}
						onPointerCancel={handlePointerEnd}
					>
						<DishArtLayers placements={placements} />
						{round ? (
							// 丸の外（切り抜かれる所）を薄く暗くする。
							<path
								d={`M0 0H${dishArtViewSize}V${dishArtViewSize}H0Z M50 0A50 50 0 1 0 50 ${dishArtViewSize}A50 50 0 1 0 50 0Z`}
								fillRule="evenodd"
								fill="var(--color-overlay)"
								pointerEvents="none"
							/>
						) : null}
						{selectedPlacement ? renderFrame(selectedPlacement) : null}
					</svg>
				</div>

				<div className={styles.group}>
					<h3 className={styles.groupTitle}>
						{selectedPart ? `${selectedPart.label}を調整` : "選んだ部品を調整"}
					</h3>
					<div className={styles.contextBar}>
						<IconButton
							size="std"
							icon="flip"
							tone="accent"
							label="左右を反転"
							disabled={!selectedPlacement}
							onClick={() => commit(flipDishPart(placements, selected))}
						/>
						<IconButton
							size="std"
							icon="rotate-right"
							tone="accent"
							label="90度回す"
							disabled={!selectedPlacement}
							onClick={() => commit(turnDishPart(placements, selected, 90))}
						/>
						<IconButton
							size="std"
							icon="copy"
							tone="accent"
							label="複製"
							disabled={!selectedPlacement}
							onClick={() => {
								const next = duplicateDishPart(placements, selected, maxParts);

								commit(next);
								setSelected(next.length - 1);
							}}
						/>
						<IconButton
							size="std"
							icon="arrow-up"
							tone="accent"
							label="手前へ"
							disabled={!selectedPlacement || selected >= placements.length - 1}
							onClick={() => reorder(1)}
						/>
						<IconButton
							size="std"
							icon="arrow-down"
							tone="accent"
							label="後ろへ"
							disabled={!selectedPlacement || selected <= 0}
							onClick={() => reorder(-1)}
						/>
					</div>
					{/* 色の欄は、いつも同じ高さで置く（部品によって出たり消えたりすると、絵の位置がずれるため）。 */}
					<div className={styles.swatchGroup}>
						<h3 className={styles.groupTitle}>色</h3>
						{selectedPlacement &&
						selectedPart &&
						selectedPart.tints.length > 1 ? (
							<div className={styles.swatches}>
								{selectedPart.tints.map((tint) => (
									<button
										key={tint}
										type="button"
										className={styles.swatch}
										style={{ background: tint }}
										aria-label={`色 ${tint}`}
										aria-pressed={
											(selectedPlacement.tint ?? selectedPart.tints[0]) === tint
										}
										onClick={() =>
											commit(tintDishPart(placements, selected, tint))
										}
									/>
								))}
							</div>
						) : (
							<p className={styles.swatchNote}>
								{selectedPlacement
									? "この部品は、色を選べません。"
									: "パーツで色を選べるものは、ここで変えられます。"}
							</p>
						)}
					</div>
					{extra}
				</div>
			</div>

			<div className={styles.side}>
				<SegmentedControl
					label="部品の選び方"
					options={tabOptions}
					value={tab}
					onChange={setTab}
				/>

				{tab === "parts" ? (
					<>
						<div className={styles.categoryTabs}>
							{dishPartCategories.map((candidate) => (
								<button
									key={candidate.id}
									type="button"
									className={styles.categoryTab}
									aria-pressed={candidate.id === category?.id}
									onClick={() => setCategoryId(candidate.id)}
								>
									{candidate.label}
								</button>
							))}
						</div>
						{category ? (
							<div className={styles.shelf}>
								{partsInCategory(category).map((part) => (
									<button
										key={part.id}
										type="button"
										className={styles.shelfItem}
										onPointerDown={(event) =>
											handleShelfPointerDown(event, part.id)
										}
										onClick={() => {
											if (justCarried.current) {
												justCarried.current = false;

												return;
											}

											addAt(part.id);
										}}
									>
										<DishPartPreview part={part} size={56} />
										{part.label}
									</button>
								))}
							</div>
						) : null}
					</>
				) : (
					<div className={styles.presets}>
						{presets.map((preset) => (
							<button
								key={preset.id}
								type="button"
								className={styles.preset}
								onClick={() => {
									commit([...preset.placements]);
									setSelected(-1);
									onChoosePreset?.(preset);
								}}
							>
								<DishArt
									placements={preset.placements}
									size={88}
									background={preset.background}
								/>
								{preset.label}
							</button>
						))}
					</div>
				)}
			</div>

			{/* 部品の範囲を測るための、見えない絵。 */}
			<svg ref={measure} className={styles.measure} aria-hidden="true">
				{[...new Set(placements.map((item) => item.partId))].map((partId) => (
					<g key={partId} data-part={partId}>
						<DishArtLayers placements={[{ partId, x: 50, y: 50 }]} />
					</g>
				))}
			</svg>

			{carriedPart && carrying ? (
				<div
					className={styles.carried}
					style={{ left: carrying.x, top: carrying.y }}
					aria-hidden="true"
				>
					<DishPartPreview part={carriedPart} size={56} />
				</div>
			) : null}
		</div>
	);
}
