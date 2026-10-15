import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { Button } from "#/components/button/button";
import { Note } from "#/components/note/note";
import { describeError } from "./user-facing-error";

type RouteErrorProps = ErrorComponentProps & {
	// 何を表示できなかったか（例：「レシピ」）。
	subject?: string;
};

// 画面の読み込みに失敗したときの表示。内部の事情（SQL・接続の失敗など）は出さず、利用者向けの文だけにする。
export function RouteError({ error, reset, subject }: RouteErrorProps) {
	const router = useRouter();
	const title = subject
		? `${subject}を表示できませんでした`
		: "表示できませんでした";

	return (
		<Note
			tone="error"
			action={
				<Button
					variant="secondary"
					size="sm"
					onClick={() => {
						reset();
						void router.invalidate();
					}}
				>
					もう一度読み込む
				</Button>
			}
		>
			{title}。{describeError(error)}
		</Note>
	);
}
