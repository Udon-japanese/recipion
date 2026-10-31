import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Avatar } from "#/components/avatar/avatar";
import { ButtonLink } from "#/components/button/button-link";
import { Icon } from "#/components/icon/icon";
import type { IconName } from "#/components/icon/icon-definitions";
import { Mascot } from "#/components/mascot/mascot";
import { APP_DISPLAY_NAME } from "#/config/app";
import { useAppSession } from "#/integrations/better-auth/use-app-session";
import { getShellLayout } from "../domain/shell-layout";
import * as styles from "./app-shell.css";

type NavItem = {
	to: "/shopping" | "/inventory" | "/recipes";
	label: string;
	icon: IconName;
	activeIcon: IconName;
};

const navItems: readonly NavItem[] = [
	{
		to: "/shopping",
		label: "買い物メモ",
		icon: "shopping-bag",
		activeIcon: "shopping-bag-fill",
	},
	{
		to: "/inventory",
		label: "在庫",
		icon: "inventory-box",
		activeIcon: "inventory-box-fill",
	},
	{
		to: "/recipes",
		label: "レシピ",
		icon: "book",
		activeIcon: "book-fill",
	},
];

// アプリの枠：スマホは上のヘッダー（ロゴ・アカウント）と下のナビ、PC は左のナビ。
// ログイン状態の確認中は、アカウントの所を空けておく（静的なページに、誰の情報も焼き込まないため）。
export function AppShell({ children }: { children: ReactNode }) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const layout = getShellLayout(pathname);

	if (!layout.frame) {
		return <>{children}</>;
	}

	return (
		<div className={styles.root}>
			<SideNav />

			<header className={styles.header}>
				<Link to="/" className={styles.logo}>
					<Mascot size={22} />
					{APP_DISPLAY_NAME}
				</Link>
				<Link
					to="/settings"
					className={styles.headerIconLink}
					aria-label="設定"
				>
					<Icon name="sliders" size={24} />
				</Link>
				<HeaderAccount />
			</header>

			<main className={styles.main}>
				<div className={styles.content}>{children}</div>
			</main>

			{layout.bottomNav ? <BottomNav /> : null}
		</div>
	);
}

function HeaderAccount() {
	const { data: session, isPending } = useAppSession();

	return (
		<div className={styles.accountSlot}>
			{isPending ? null : session ? (
				<Link
					to="/profile"
					className={styles.avatarLink}
					aria-label="プロフィール"
				>
					<Avatar name={session.user.name} />
				</Link>
			) : (
				<ButtonLink to="/login" size="sm">
					ログイン
				</ButtonLink>
			)}
		</div>
	);
}

function BottomNav() {
	return (
		<nav className={styles.bottomNav} aria-label="機能">
			{navItems.map((item) => (
				<Link key={item.to} to={item.to} className={styles.bottomItem}>
					{({ isActive }) => (
						<>
							<span className={styles.pill}>
								<Icon name={isActive ? item.activeIcon : item.icon} size={24} />
							</span>
							{item.label}
						</>
					)}
				</Link>
			))}
		</nav>
	);
}

function SideNav() {
	const { data: session, isPending } = useAppSession();

	return (
		<aside className={styles.side}>
			<Link to="/" className={styles.brand}>
				<Mascot size={26} />
				{APP_DISPLAY_NAME}
			</Link>

			<nav className={styles.sideNav} aria-label="機能">
				{navItems.map((item) => (
					<Link key={item.to} to={item.to} className={styles.sideItem}>
						<Icon name={item.icon} size={24} />
						{item.label}
					</Link>
				))}
			</nav>

			<Link
				to="/settings"
				className={`${styles.sideItem} ${styles.sideSettings}`}
			>
				<Icon name="sliders" size={24} />
				設定
			</Link>

			{isPending ? null : session ? (
				<Link to="/profile" className={styles.me}>
					<Avatar name={session.user.name} />
					<span className={styles.meName}>{session.user.name}</span>
				</Link>
			) : (
				<div className={styles.guestSlot}>
					<ButtonLink to="/login" fullWidth>
						ログイン
					</ButtonLink>
				</div>
			)}
		</aside>
	);
}
