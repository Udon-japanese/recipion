import { style } from "@vanilla-extract/css";

export const page = style({
	display: "grid",
	alignContent: "start",
	gap: 32,
	width: "min(100% - 32px, 560px)",
	marginInline: "auto",
	paddingBlock: 16,
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: "var(--line-height-tight)",
});

export const section = style({
	display: "grid",
	gap: 12,
});

export const sectionTitle = style({
	margin: 0,
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
});

export const sectionHead = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
});

export const sectionNote = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const email = style({
	display: "grid",
	gap: 4,
	margin: 0,
});

export const emailLabel = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const emailValue = style({
	margin: 0,
	overflowWrap: "anywhere",
});

export const signOut = style({
	display: "grid",
	justifyItems: "start",
	gap: 12,
});
