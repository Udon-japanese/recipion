import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ButtonLink } from "#/components/button/button-link";
import { Icon } from "#/components/icon/icon";
import type { IconName } from "#/components/icon/icon-definitions";
import { Mascot } from "#/components/mascot/mascot";
import { Tag } from "#/components/tag/tag";
import { useAppSession } from "#/integrations/better-auth/use-app-session";
import {
	type CountState,
	useInventoryExpiry,
	useRecipeCount,
	useShoppingRemaining,
} from "../hooks/use-home-counts";
import * as styles from "./home.css";

type Destination = "/shopping" | "/inventory" | "/recipes";

// ホーム。ゲストは機能の入口（在庫・レシピは、ログインが要る）、ログイン後は、件数つきの入口。
export function HomePage() {
	const { data: session, isPending } = useAppSession();

	// data-page は、静的シェルに、ページの内容が紛れ込んでいないかの確認に使う。
	return (
		<div data-page="home">
			{isPending ? null : session ? (
				<MemberHome userId={session.user.id} name={session.user.name} />
			) : (
				<GuestHome />
			)}
		</div>
	);
}

function GuestHome() {
	const shopping = useShoppingRemaining();

	return (
		<div className={styles.page}>
			<div className={styles.hero}>
				<Mascot size={64} />
			</div>

			<div className={styles.cards}>
				<GuestCard to="/shopping" icon="shopping-bag" title="買い物メモ">
					{shopping.status === "ready" ? (
						<Tag icon="square-rounded">{shopping.value}</Tag>
					) : null}
				</GuestCard>
				<GuestCard to="/inventory" icon="inventory-box" title="在庫" locked />
				<GuestCard to="/recipes" icon="book" title="レシピ" locked />
			</div>

			<div className={styles.loginRow}>
				<ButtonLink to="/login" size="lg" fullWidth>
					ログイン
				</ButtonLink>
			</div>
		</div>
	);
}

type GuestCardProps = {
	to: Destination;
	icon: IconName;
	title: string;
	locked?: boolean;
	children?: ReactNode;
};

function GuestCard({
	to,
	icon,
	title,
	locked = false,
	children,
}: GuestCardProps) {
	return (
		<Link to={to} className={styles.card} data-locked={locked}>
			<span className={styles.iconTile}>
				<Icon name={icon} size={24} />
			</span>
			<div className={styles.text}>
				<h2 className={styles.cardTitle}>{title}</h2>
				{children}
			</div>
			<span className={styles.chevron}>
				<Icon name={locked ? "lock" : "chevron-right"} size={24} />
			</span>
			{locked ? (
				<span className={styles.visuallyHidden}>ログインが必要です</span>
			) : null}
		</Link>
	);
}

function MemberHome({ userId, name }: { userId: string; name: string }) {
	const shopping = useShoppingRemaining();
	const inventory = useInventoryExpiry(userId);
	const recipes = useRecipeCount(userId);

	return (
		<div className={styles.page}>
			<div className={styles.greeting}>
				<Mascot size={49} />
				<div>
					<h1 className={styles.greetingTitle}>こんにちは</h1>
					<p className={styles.greetingName}>{name}</p>
				</div>
			</div>

			<div className={styles.cards}>
				<CountCard
					to="/shopping"
					icon="shopping-bag"
					caption="買い物メモ・残り"
					state={shopping}
					value={(count) => count}
				/>
				<CountCard
					to="/inventory"
					icon="inventory-box"
					caption="在庫・期限が近い"
					state={inventory}
					value={(summary) => summary.soon}
					extra={(summary) =>
						summary.expired > 0 ? (
							<Tag tone="error" icon="alert-circle">
								期限切れ {summary.expired}
							</Tag>
						) : null
					}
				/>
				<CountCard
					to="/recipes"
					icon="book"
					caption="レシピ"
					state={recipes}
					value={(count) => count}
				/>
			</div>
		</div>
	);
}

type CountCardProps<T> = {
	to: Destination;
	icon: IconName;
	caption: string;
	state: CountState<T>;
	value: (data: T) => number;
	extra?: (data: T) => ReactNode;
};

function CountCard<T>({
	to,
	icon,
	caption,
	state,
	value,
	extra,
}: CountCardProps<T>) {
	return (
		<Link to={to} className={styles.card}>
			<span className={styles.iconTile}>
				<Icon name={icon} size={24} />
			</span>
			<div className={styles.text}>
				<span className={styles.caption}>{caption}</span>
				<div className={styles.countRow}>
					{state.status === "ready" ? (
						<>
							<span className={styles.count}>{value(state.value)}</span>
							<span className={styles.unit}>件</span>
						</>
					) : state.status === "loading" ? (
						<>
							<span className={styles.count} aria-hidden="true">
								–
							</span>
							<span className={styles.unit}>読み込んでいます…</span>
						</>
					) : (
						<span className={styles.unit}>件数を読み込めませんでした</span>
					)}
				</div>
				{state.status === "ready" && extra ? extra(state.value) : null}
			</div>
			<span className={styles.chevron}>
				<Icon name="chevron-right" size={24} />
			</span>
		</Link>
	);
}
