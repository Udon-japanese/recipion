import { type ComponentProps, forwardRef, type ReactNode, useId } from "react";
import { Icon } from "../icon/icon";
import { PickerSelect } from "../select/picker-select";
import * as styles from "./field.css";

type ControlProps = {
	id: string;
	"aria-invalid": true | undefined;
	"aria-describedby": string | undefined;
};

type FieldProps = {
	label: string;
	// 任意の欄の印（「任意」）。
	optional?: boolean;
	// ラベルを画面に出さず、読み上げだけにする（入力欄の意味が、まわりから明らかなとき）。
	hideLabel?: boolean;
	hint?: ReactNode;
	// エラーの文。あると、欄が赤くなり、文が読み上げられる。
	error?: string | null;
	// 欄そのもの。渡される props（id・aria-*）を、欄に付ける。
	children: (control: ControlProps) => ReactNode;
};

// ラベル・補足・エラーの文と、欄の結びつき（for / aria-describedby / aria-invalid）をまとめる。
export function Field({
	label,
	optional,
	hideLabel,
	hint,
	error,
	children,
}: FieldProps) {
	const id = useId();
	const hintId = `${id}-hint`;
	const errorId = `${id}-error`;
	const describedBy =
		[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
		undefined;

	return (
		<div className={styles.field}>
			<label
				className={hideLabel ? styles.hiddenLabel : styles.label}
				htmlFor={id}
			>
				{label}
				{optional ? <span className={styles.optional}>任意</span> : null}
			</label>
			{children({
				id,
				"aria-invalid": error ? true : undefined,
				"aria-describedby": describedBy,
			})}
			{hint ? (
				<p className={styles.hint} id={hintId}>
					{hint}
				</p>
			) : null}
			{error ? (
				<p className={styles.error} id={errorId} role="alert">
					<Icon name="alert-triangle" size={20} />
					{error}
				</p>
			) : null}
		</div>
	);
}

type TextInputProps = Omit<ComponentProps<"input">, "className" | "style">;

// 1行の入力欄（丸い形。枠が濃い＝入力できると分かる）。
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
	function TextInput(props, ref) {
		return <input {...props} ref={ref} className={styles.input} />;
	},
);

type TextAreaProps = Omit<ComponentProps<"textarea">, "className" | "style">;

// 複数行の入力欄。
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
	function TextArea(props, ref) {
		return (
			<textarea
				{...props}
				ref={ref}
				className={`${styles.input} ${styles.textarea}`}
			/>
		);
	},
);

type SelectBoxProps = Omit<ComponentProps<"select">, "className" | "style">;

// 選択（本物の select を残し、開くときだけ、PC は一覧・スマホはボトムシート）。
export const SelectBox = forwardRef<HTMLSelectElement, SelectBoxProps>(
	function SelectBox(props, ref) {
		return (
			<PickerSelect
				{...props}
				ref={ref}
				className={`${styles.input} ${styles.select}`}
			/>
		);
	},
);
