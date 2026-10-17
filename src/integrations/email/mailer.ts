export type EmailMessage = {
	to: string | readonly string[];
	subject: string;
	// HTML を表示できない環境のための本文。
	text: string;
	html: string;
};

// メールを送るもの。本番は Resend、開発中はコンソール（get-mailer.ts が選ぶ）。
export type Mailer = {
	send(message: EmailMessage): Promise<void>;
};
