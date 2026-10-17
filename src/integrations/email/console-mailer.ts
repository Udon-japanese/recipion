import type { Mailer } from "./mailer";

// 開発用：メールは送らず、宛先・件名・本文（コードやリンクを含む）をコンソールに出す。
export const consoleMailer: Mailer = {
	async send({ to, subject, text }) {
		console.log(
			`[開発用] メール（宛先: ${[to].flat().join(", ")}）\n${subject}\n\n${text}`,
		);
	},
};
