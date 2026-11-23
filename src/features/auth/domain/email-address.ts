import * as v from "valibot";

const emailSchema = v.pipe(v.string(), v.trim(), v.email());

// 送る前に、メールアドレスの形を確かめる（最終的な判定はサーバー）。読めなければ null。
// アプリ（Kotlin）にも同じ判定があり、shared-data/test-cases/email-address.json で一致を確かめる。
export function parseEmailAddress(text: string): string | null {
	const result = v.safeParse(emailSchema, text);

	return result.success ? result.output : null;
}
