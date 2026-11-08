import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastViewport } from "#/components/toast/toast-viewport";
import { HouseholdSizeSetting } from "./household-size-setting";

// 画面の上のお知らせ（showToast）を、見えるようにする。
beforeEach(() => {
	render(<ToastViewport />);
});

afterEach(cleanup);

async function findSelect() {
	const select = await screen.findByRole("combobox", { name: "うちの人数" });

	await waitFor(() => expect(select).toBeEnabled());

	return select;
}

describe("HouseholdSizeSetting", () => {
	it("読み込んだ値を出し、選ぶとすぐに保存する。「設定しない」は null で保存する", async () => {
		const save = vi.fn(async () => {});

		render(<HouseholdSizeSetting load={async () => 3} save={save} />);

		const select = await findSelect();

		expect(select).toHaveValue("3");

		fireEvent.change(select, { target: { value: "4" } });

		expect(
			await screen.findByText("うちの人数を保存しました"),
		).toBeInTheDocument();
		expect(save).toHaveBeenLastCalledWith(4);

		fireEvent.change(await findSelect(), { target: { value: "none" } });

		await waitFor(() => expect(save).toHaveBeenLastCalledWith(null));
	});

	it("保存できなかったときは、元の値に戻して知らせる", async () => {
		const save = vi.fn(async () => {
			throw new Error("network");
		});

		render(<HouseholdSizeSetting load={async () => null} save={save} />);

		const select = await findSelect();

		expect(select).toHaveValue("none");

		fireEvent.change(select, { target: { value: "2" } });

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"保存できませんでした",
		);
		expect(await findSelect()).toHaveValue("none");
	});
});
