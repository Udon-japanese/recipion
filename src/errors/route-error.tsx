import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { Button } from "#/components/button/button";
import { ButtonLink } from "#/components/button/button-link";
import { Note } from "#/components/note/note";
import {
	describeError,
	GENERIC_ERROR_MESSAGE,
	isAuthRequiredError,
} from "./user-facing-error";

const RETRY_GUIDANCE = "時間をおいてもう一度お試しください。";

type RouteErrorProps = ErrorComponentProps & {
	// 何を表示できなかったか（例：「レシピ」）。
	subject?: string;
	// ログインしていないとき（認証が必要なとき）の案内。読み込み直しても、見られないので、ログインへの案内を出す。
	loginMessage?: string;
};

// 画面の読み込みに失敗したときの表示。内部の事情（SQL・接続の失敗など）は出さず、利用者向けの文だけにする。
export function RouteError({
	error,
	reset,
	subject,
	loginMessage = "ログインすると利用できます",
}: RouteErrorProps) {
	const router = useRouter();

	if (isAuthRequiredError(error)) {
		return (
			<Note
				tone="info"
				action={
					<ButtonLink to="/login" size="sm">
						ログイン
					</ButtonLink>
				}
			>
				{loginMessage}
			</Note>
		);
	}

	const title = subject
		? `${subject}を表示できませんでした`
		: "表示できませんでした";

	// 原因が分からない（内部の事情を隠した、汎用の文の）ときは、「うまく処理できませんでした」を重ねず、案内だけにする。
	// 利用者に伝えてよい原因（入力の誤りなど）があるときは、それを添える。
	const detail = describeError(error);
	const guidance = detail === GENERIC_ERROR_MESSAGE ? RETRY_GUIDANCE : detail;

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
			{title}。{guidance}
		</Note>
	);
}
