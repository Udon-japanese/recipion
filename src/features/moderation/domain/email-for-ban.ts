// 永久停止のとき、同じメールアドレスで再登録されないよう、メールアドレスをそろえる。
// 大文字小文字、`+` 以降（エイリアス）、Gmail のドットの違いを、同じアドレスとして扱う。
// 別のアドレスを作られることまでは、防げない。

const gmailDomains = new Set(["gmail.com", "googlemail.com"]);

export function normalizeEmailForBan(email: string): string {
	const lowered = email.trim().toLowerCase();
	const at = lowered.lastIndexOf("@");

	if (at <= 0) {
		return lowered;
	}

	let local = lowered.slice(0, at);
	let domain = lowered.slice(at + 1);

	const plus = local.indexOf("+");

	if (plus > 0) {
		local = local.slice(0, plus);
	}

	if (gmailDomains.has(domain)) {
		local = local.replaceAll(".", "");
		domain = "gmail.com";
	}

	return `${local}@${domain}`;
}
