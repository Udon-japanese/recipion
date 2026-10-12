import { Link } from "@tanstack/react-router";
import type { RecipeVisibility } from "../domain/recipe-link-permission";
import * as styles from "./recipe-visibility-field.css";

type RecipeVisibilityFieldProps = {
	value: RecipeVisibility;
	onChange: (value: RecipeVisibility) => void;
	// 引用元のURLが入っているか（入っているレシピは、公開できない）。
	hasSourceUrl: boolean;
};

// 公開範囲の選択。
export function RecipeVisibilityField({
	value,
	onChange,
	hasSourceUrl,
}: RecipeVisibilityFieldProps) {
	return (
		<fieldset className={styles.fieldset}>
			<legend className={styles.legend}>公開範囲</legend>

			<label className={styles.option}>
				<input
					type="radio"
					name="recipe-visibility"
					checked={value === "private"}
					onChange={() => onChange("private")}
				/>
				<span>非公開（自分だけ）</span>
			</label>

			<label className={styles.option}>
				<input
					type="radio"
					name="recipe-visibility"
					checked={value === "unlisted"}
					disabled={hasSourceUrl}
					onChange={() => onChange("unlisted")}
				/>
				<span>
					限定公開（ログインした人のうち、パスフレーズを知っている人だけ）
				</span>
			</label>

			<label className={styles.option}>
				<input
					type="radio"
					name="recipe-visibility"
					checked={value === "public"}
					disabled={hasSourceUrl}
					onChange={() => onChange("public")}
				/>
				<span>全体公開（ログインした人なら、誰でも見られる）</span>
			</label>

			{hasSourceUrl ? (
				<p className={styles.note}>
					引用元のURLがあるレシピは、公開できません。
				</p>
			) : null}

			{value === "unlisted" ? (
				<p className={styles.note}>
					パスフレーズは、保存すると自動で作られ、レシピの画面で確認できます。パスフレーズを知っている人は、誰にでも伝えられます。漏れたと思ったら、作り直してください（これまでに開けた人は、新しいパスフレーズが必要になります）。
				</p>
			) : null}

			{value === "public" || value === "unlisted" ? (
				<div className={styles.consent}>
					<p>
						自分で考えた、または自分の言葉で書いたレシピだけを、公開してください。
						公開する前に、書かれた文章が、公開してよい内容かを、自動で確認します（
						<Link to="/terms" target="_blank" rel="noreferrer">
							利用規約
						</Link>
						）。
					</p>
					<p>
						公開されるのは、レシピと、あなたの表示名・ハンドルだけです（メールアドレスは、見えません）。表示名・ハンドルは、
						<Link to="/profile" target="_blank" rel="noreferrer">
							プロフィール
						</Link>
						で変えられます。
					</p>
				</div>
			) : null}
		</fieldset>
	);
}
