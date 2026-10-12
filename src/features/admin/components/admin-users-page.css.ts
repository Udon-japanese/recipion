import { style } from "@vanilla-extract/css";

export {
	actions,
	button,
	container,
	dangerButton,
	error,
	item,
	list,
	meta,
	title,
} from "#/features/reports/components/admin-reports-page.css";

export const searchForm = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
	alignItems: "end",
	marginBottom: 16,
});

export const searchLabel = style({
	width: "100%",
	color: "var(--color-text-muted)",
	fontSize: 14,
});

export const searchInput = style({
	flex: 1,
	minWidth: 180,
	minHeight: 44,
	paddingInline: 12,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
});

export const userName = style({
	margin: 0,
	fontSize: 17,
	fontWeight: 700,
	overflowWrap: "anywhere",
});

export const badge = style({
	marginLeft: 8,
	paddingInline: 8,
	color: "var(--color-primary-text)",
	background: "var(--color-primary)",
	borderRadius: 6,
	fontSize: 13,
});

export const form = style({
	display: "grid",
	gap: 8,
});

export const field = style({
	display: "grid",
	gap: 4,
});

export const textarea = style({
	minHeight: 72,
	padding: 8,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
});

export const check = style({
	display: "flex",
	gap: 8,
	alignItems: "center",
});
