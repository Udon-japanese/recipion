import { type ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "#/components/icon/icon";
import type { IconName } from "#/components/icon/icon-definitions";
import { MASCOT_DISPLAY_NAME } from "#/config/app";
import type {
	InventoryFridgeZone,
	InventoryTile,
	InventoryZoneId,
} from "../../domain/inventory-fridge";
import { Pet, type PetMood } from "./pet";
import { describePetMessage } from "./pet-message";
import { type OpenPart, RoomArt } from "./room-art";
import * as styles from "./scene.css";
import { SceneInterior } from "./scene-interior";
import { type Point, useHopWalker } from "./use-hop-walker";

type Target = "fridge" | "table";
type Spot = Point & { mood: PetMood };

// れしぽよの巡回（層の中の %。x は 800 幅、y は 640 高さ）。夜は、クッションで寝たまま。
const spots: Spot[] = [
	{ x: 32, y: 64, mood: "idle" },
	{ x: 51, y: 67, mood: "look" },
	{ x: 43, y: 79, mood: "idle" },
	{ x: 62.5, y: 92.5, mood: "sleep" },
];
const cushionIndex = 3;
// ページを開いて最初の1回だけ、ふきだしを自動で出した（出し終えたら true）。
let introShown = false;
const startSpot: Spot = { x: 32, y: 64, mood: "idle" };

type HitSpec = {
	id: string;
	label: string;
	icon: IconName;
	target: Target;
	zone: InventoryZoneId;
	// 絵の座標（中央の400×640）での位置。
	box: { x: number; y: number; w: number; h: number };
	tagAlign: "start" | "center";
	// 開く部位（絵）。
	opens: OpenPart;
};

const camera: Record<
	Target,
	{ cx: number; cy: number; zoom: number; aim: number }
> = {
	fridge: { cx: 63.25, cy: 36.7, zoom: 2.05, aim: 46 },
	table: { cx: 42.5, cy: 79, zoom: 1.75, aim: 58 },
};

const hits: HitSpec[] = [
	{
		id: "fridge",
		label: "冷蔵室",
		icon: "zone-fridge",
		target: "fridge",
		zone: "fridge",
		box: { x: 234, y: 74, w: 140, h: 126 },
		tagAlign: "start",
		opens: "top",
	},
	{
		id: "pocket",
		label: "ドアポケット",
		icon: "zone-door",
		target: "fridge",
		zone: "door",
		box: { x: 234, y: 204, w: 140, h: 38 },
		tagAlign: "start",
		opens: "top",
	},
	{
		id: "freezer",
		label: "冷凍室",
		icon: "zone-freezer",
		target: "fridge",
		zone: "freezer",
		box: { x: 234, y: 248, w: 140, h: 68 },
		tagAlign: "start",
		opens: "freezer",
	},
	{
		id: "vegetable",
		label: "野菜室",
		icon: "zone-vegetable",
		target: "fridge",
		zone: "vegetable",
		box: { x: 234, y: 322, w: 140, h: 74 },
		tagAlign: "start",
		opens: "veg",
	},
	{
		id: "table",
		label: "机の上",
		icon: "zone-table",
		target: "table",
		zone: "table",
		box: { x: 20, y: 456, w: 240, h: 100 },
		tagAlign: "center",
		opens: null,
	},
];

type InventorySceneProps = {
	zones: readonly InventoryFridgeZone[];
	// 夜の絵にするか。
	night: boolean;
	// れしぽよを出すか。
	petVisible: boolean;
	// 操作のボタン（絵の上部に重ねる）。
	toolbar: ReactNode;
	selectedItemId: string | null;
	highlightedItemIds?: ReadonlySet<string>;
	onOpen: (tile: InventoryTile) => void;
	// 開いている食材のパネルを閉じる（場所を移るとき、おうちにもどるとき）。
	onDismissPanel: () => void;
};

// 在庫の「おうち」表示：奥に冷蔵庫、手前に丸いテーブル。押すとズームして、その場所の食材が見える。
export function InventoryScene({
	zones,
	night,
	petVisible,
	toolbar,
	selectedItemId,
	highlightedItemIds,
	onOpen,
	onDismissPanel,
}: InventorySceneProps) {
	const [target, setTarget] = useState<Target | null>(null);
	const [opened, setOpened] = useState(false);
	const [openPart, setOpenPart] = useState<OpenPart>(null);
	const [inside, setInside] = useState(false);
	const [zone, setZone] = useState<InventoryZoneId>("fridge");
	const timers = useRef<number[]>([]);
	const frameRef = useRef<HTMLElement>(null);
	const isPanelOpen = selectedItemId !== null;

	const zoomed = target !== null;

	const [spotIndex, setSpotIndex] = useState(0);
	const [arrivedAt, setArrivedAt] = useState<Spot | null>(null);
	const [cheer, setCheer] = useState(false);
	// ふきだし：最初の5秒（ページを開いて1回だけ）・乗せた間・つついたあとの4秒。
	const [isIntro, setIsIntro] = useState(false);
	const [isAttended, setIsAttended] = useState(false);
	const [isTalking, setIsTalking] = useState(false);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const hopRef = useRef<HTMLSpanElement>(null);
	const spot = spots[night ? cushionIndex : spotIndex] ?? startSpot;
	const arrived = arrivedAt === spot;

	useHopWalker({
		buttonRef,
		hopRef,
		target: spot,
		active: !zoomed && petVisible,
		start: startSpot,
		onArrive: () => setArrivedAt(spot),
	});

	// 着いたら、しばらく休んで、次の場所へ。
	useEffect(() => {
		if (!arrived || zoomed || night) {
			return;
		}

		const dwell = spotIndex === cushionIndex ? 24000 : 14000;
		const timer = window.setTimeout(() => {
			setSpotIndex((value) => (value + 1) % spots.length);
		}, dwell);

		return () => window.clearTimeout(timer);
	}, [arrived, zoomed, night, spotIndex]);

	useEffect(() => {
		if (!petVisible || introShown) {
			return;
		}

		setIsIntro(true);
		const timer = window.setTimeout(() => {
			introShown = true;
			setIsIntro(false);
		}, 5000);

		return () => window.clearTimeout(timer);
	}, [petVisible]);

	useEffect(() => {
		if (!isTalking) {
			return;
		}

		const timer = window.setTimeout(() => setIsTalking(false), 4000);

		return () => window.clearTimeout(timer);
	}, [isTalking]);

	useEffect(() => {
		if (!cheer) {
			return;
		}

		const timer = window.setTimeout(() => setCheer(false), 1500);

		return () => window.clearTimeout(timer);
	}, [cheer]);

	const petMessage = describePetMessage(
		zones.flatMap((item) => item.tiles),
		night,
	);
	const mood: PetMood = cheer ? "cheer" : arrived ? spot.mood : "walk";

	function clearTimers() {
		for (const timer of timers.current) {
			window.clearTimeout(timer);
		}

		timers.current = [];
	}

	function later(run: () => void, ms: number) {
		timers.current.push(window.setTimeout(run, ms));
	}

	useEffect(
		() => () => {
			for (const timer of timers.current) {
				window.clearTimeout(timer);
			}
		},
		[],
	);

	function enter(spec: HitSpec) {
		clearTimers();
		setZone(spec.zone);
		setOpenPart(spec.opens);
		setTarget(spec.target);
		later(() => setOpened(true), 760);
		later(() => setInside(true), 1180);
	}

	// 庫内の縦タブで別の場所へ：いまの扉を閉じてから、次を開く。
	function switchZone(next: InventoryZoneId) {
		const spec = hits.find((hit) => hit.zone === next);

		if (!spec || next === zone) {
			return;
		}

		clearTimers();
		onDismissPanel();

		// 机と冷蔵庫の行き来：扉を閉じ、カメラを動かしてから開く。
		if (spec.target !== target) {
			setZone(next);
			setOpened(false);
			setTarget(spec.target);
			later(() => {
				setOpenPart(spec.opens);
				setOpened(true);
			}, 760);

			return;
		}

		// 冷蔵室とドアは同じ扉：開いたまま、視点だけ少し変える。
		if (spec.opens === openPart) {
			setZone(next);

			return;
		}

		setZone(next);
		setOpened(false);
		later(() => {
			setOpenPart(spec.opens);
			setOpened(true);
		}, 480);
	}

	function leave() {
		// 閉じたあと、開いたときの場所のボタンへ、キーボードの位置を戻す。
		const hitId = hits.find((hit) => hit.zone === zone)?.id;

		clearTimers();
		onDismissPanel();
		setInside(false);
		later(() => setOpened(false), 200);
		later(() => setTarget(null), 420);
		later(() => {
			frameRef.current
				?.querySelector<HTMLElement>(`[data-hit="${hitId}"]`)
				?.focus();
		}, 520);
	}

	// Esc で、おうちにもどる（食材のパネルを開いているときは、そちらが先。変換中の Esc は除く）。
	useEffect(() => {
		if (!inside || isPanelOpen) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape" && !event.isComposing) {
				leave();
			}
		}

		document.addEventListener("keydown", handleKeyDown);

		return () => document.removeEventListener("keydown", handleKeyDown);
	});

	const base = target ? camera[target] : null;
	// ドアポケットは、冷蔵室より少し下・右を見る。
	const view =
		base && zone === "door"
			? { ...base, cy: base.cy + 3, cx: base.cx + 0.5 }
			: base;
	const tilesOf = (id: InventoryZoneId) =>
		zones.find((item) => item.id === id)?.tiles ?? [];

	return (
		<div className={styles.stage}>
			<section
				ref={frameRef}
				className={styles.frame}
				aria-label={`${MASCOT_DISPLAY_NAME}のおうち`}
			>
				<div className={styles.bar}>{toolbar}</div>

				{inside ? (
					<button
						className={styles.backdrop}
						type="button"
						aria-label="おうちにもどる"
						tabIndex={-1}
						onClick={leave}
					/>
				) : null}

				<div
					className={styles.camera}
					style={
						view
							? ({
									"--cx": view.cx,
									"--cy": view.cy,
									"--zoom": view.zoom,
									"--aim": view.aim,
								} as React.CSSProperties)
							: undefined
					}
				>
					<RoomArt
						night={night}
						open={opened ? openPart : null}
						tableTiles={tilesOf("table")}
					/>

					{hits.map((spec) => {
						const tiles = tilesOf(spec.zone);
						const alerts = tiles.filter((tile) => tile.expiry).length;

						return (
							<button
								className={styles.hit}
								type="button"
								key={spec.id}
								data-hit={spec.id}
								data-hidden={zoomed}
								tabIndex={zoomed ? -1 : 0}
								aria-label={`${spec.label}をひらく（${tiles.length}件${alerts ? `、期限が近いもの${alerts}件` : ""}）`}
								style={{
									left: `${((spec.box.x + 200) / 800) * 100}%`,
									top: `${(spec.box.y / 640) * 100}%`,
									width: `${(spec.box.w / 800) * 100}%`,
									height: `${(spec.box.h / 640) * 100}%`,
									justifyContent:
										spec.tagAlign === "center" ? "center" : "flex-start",
								}}
								onClick={() => enter(spec)}
							>
								<span className={styles.tag} aria-hidden>
									<Icon name={spec.icon} size={16} />
									{spec.label} {tiles.length}
									{alerts > 0 ? (
										<span className={styles.alert}>{alerts}</span>
									) : null}
								</span>
							</button>
						);
					})}

					{zoomed || !petVisible ? null : (
						<Pet
							mood={mood}
							buttonRef={buttonRef}
							hopRef={hopRef}
							boundsRef={frameRef}
							message={petMessage}
							showMessage={isIntro || isAttended || isTalking}
							onAttention={setIsAttended}
							onPoke={() => {
								setCheer(true);
								setIsTalking(true);
							}}
						/>
					)}
				</div>

				{inside && target ? (
					<SceneInterior
						zones={zones}
						zone={zone}
						night={night}
						petVisible={petVisible}
						selectedItemId={selectedItemId}
						highlightedItemIds={highlightedItemIds}
						onZoneChange={switchZone}
						onOpen={onOpen}
						onBack={leave}
					/>
				) : null}
			</section>
		</div>
	);
}
