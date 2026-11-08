import { useEffect, useState } from "react";
import { Field, SelectBox } from "#/components/field/field";
import { Note } from "#/components/note/note";
import { showToast } from "#/components/toast/toast-store";
import { maxHouseholdSize, minHouseholdSize } from "../domain/household-size";

type HouseholdSizeSettingProps = {
	// うちの人数を読む（設定していなければ null）。
	load: () => Promise<number | null>;
	// うちの人数を保存する（null は、設定しない）。
	save: (householdSize: number | null) => Promise<unknown>;
};

const notSet = "none";

const sizes = Array.from(
	{ length: maxHouseholdSize - minHouseholdSize + 1 },
	(_, index) => minHouseholdSize + index,
);

type LoadState =
	| { status: "loading" }
	| { status: "ready"; value: number | null }
	| { status: "error" };

// うちの人数。「人分」のレシピを、最初からこの人数の量で見せる（買い物メモへ・つくった にも使う）。
// 選んだら、すぐに保存する（失敗したら、元の値に戻して知らせる）。
export function HouseholdSizeSetting({
	load,
	save,
}: HouseholdSizeSettingProps) {
	const [state, setState] = useState<LoadState>({ status: "loading" });
	// 保存できなかったとき（保存できたことは、画面の上のお知らせで伝える）。
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		let isCancelled = false;

		load()
			.then((value) => {
				if (!isCancelled) {
					setState({ status: "ready", value });
				}
			})
			.catch(() => {
				if (!isCancelled) {
					setState({ status: "error" });
				}
			});

		return () => {
			isCancelled = true;
		};
	}, [load]);

	async function handleChange(raw: string) {
		if (state.status !== "ready") {
			return;
		}

		const previous = state.value;
		const next = raw === notSet ? null : Number(raw);

		setState({ status: "ready", value: next });
		setErrorMessage(null);
		setIsSaving(true);

		try {
			await save(next);
			showToast({
				id: "household-size-saved",
				message: "うちの人数を保存しました",
				icon: "check",
			});
		} catch {
			setState({ status: "ready", value: previous });
			setErrorMessage(
				"保存できませんでした。通信を確認して、もう一度お試しください",
			);
		} finally {
			setIsSaving(false);
		}
	}

	if (state.status === "error") {
		return <Note tone="error">うちの人数を読み込めませんでした。</Note>;
	}

	return (
		<Field
			label="うちの人数"
			hint="「◯人分」のレシピを、最初からこの人数の量で見せます（買い物メモへ・つくった も、この量で数えます）。"
		>
			{(control) => (
				<>
					<SelectBox
						{...control}
						value={
							state.status === "ready" && state.value !== null
								? String(state.value)
								: notSet
						}
						disabled={state.status === "loading" || isSaving}
						onChange={(event) => void handleChange(event.target.value)}
					>
						<option value={notSet}>設定しない（レシピの量のまま）</option>
						{sizes.map((size) => (
							<option key={size} value={String(size)}>
								{size}人
							</option>
						))}
					</SelectBox>
					{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}
				</>
			)}
		</Field>
	);
}
