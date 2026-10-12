// 管理者への通知の種類。
export const adminNotificationKinds = [
	"report",
	"auto-detected",
	"appeal",
] as const;

export type AdminNotificationKind = (typeof adminNotificationKinds)[number];

export const adminNotificationKindLabels: Record<
	AdminNotificationKind,
	string
> = {
	report: "利用者からの通報",
	"auto-detected": "自動検知",
	appeal: "停止への申し立て",
};

// 開く画面。
export const adminNotificationPaths: Record<AdminNotificationKind, string> = {
	report: "/admin/reports",
	"auto-detected": "/admin/reports",
	appeal: "/admin/appeals",
};

// 同じ種類のお知らせを送る、最短の間隔（続けて来ても、メールが溢れないように）。
export const adminNotificationIntervalMs = 30 * 60 * 1000;
