import { OTP_LENGTH } from "#/config/auth";

// デモ用のアカウント（メールを受け取れない人でも、ログインして画面を見られるようにするためのもの）。
//
// 有効にするのは、環境変数（シークレット）の2つが、両方そろったときだけ。1つでも欠けるか、形が正しくなければ、無効（既定）。
//   DEMO_LOGIN_EMAIL … 確認用のメールアドレス（実在のメールボックスは要らない。メールは送らない）
//   DEMO_LOGIN_CODE  … 固定の6桁のコード
// 取り外しは、シークレットの削除（`wrangler secret delete`）。コードの再デプロイは要らない。
// このアドレスだけに効く。コードの送信・検証の回数制限と Turnstile は、ほかのアドレスと同じにかかる。
// 管理者のメール（ADMIN_EMAILS）が指定されたら、無効にする（管理者の権限を、固定のコードで渡さないため）。

export type DemoLoginConfig = {
	// 正規化したメールアドレス（前後の空白を除き、小文字）。
	email: string;
	code: string;
};

type DemoLoginEnv = {
	DEMO_LOGIN_EMAIL?: string;
	DEMO_LOGIN_CODE?: string;
	ADMIN_EMAILS?: string;
};

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

// 環境変数から設定を読む。無効なら null。
export function readDemoLoginConfig(env: DemoLoginEnv): DemoLoginConfig | null {
	const email = normalizeEmail(env.DEMO_LOGIN_EMAIL ?? "");
	const code = (env.DEMO_LOGIN_CODE ?? "").trim();

	if (!email.includes("@") || !new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
		return null;
	}

	const adminEmails = (env.ADMIN_EMAILS ?? "")
		.split(",")
		.map(normalizeEmail)
		.filter((value) => value !== "");

	if (adminEmails.includes(email)) {
		return null;
	}

	return { email, code };
}

// このメールアドレスが、確認用アカウントか。
export function isDemoLoginEmail(
	config: DemoLoginConfig | null,
	email: string,
): boolean {
	return config !== null && normalizeEmail(email) === config.email;
}

// Better Auth の generateOTP 用。確認用のアドレスなら固定のコード。ほかは undefined（通常のコードを使う）。
export function generateDemoLoginCode(
	config: DemoLoginConfig | null,
	email: string,
): string | undefined {
	return config && isDemoLoginEmail(config, email) ? config.code : undefined;
}
