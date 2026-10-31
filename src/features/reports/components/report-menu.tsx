import { useState } from "react";
import { Modal } from "#/components/dialog/modal";
import { Menu } from "#/components/menu/menu";
import type { CreateReportResult } from "../application/report-repository";
import type { ReportReason } from "../domain/report";
import type {
	CreateUserNameReportResult,
	UserNameReportReason,
} from "../domain/user-report";
import { ReportRecipeForm } from "./report-recipe-form";
import { ReportUserForm } from "./report-user-form";

type ReportMenuProps = {
	onReportRecipe: (input: {
		reason: ReportReason;
		detail: string;
	}) => Promise<CreateReportResult>;
	onReportUser: (input: {
		reason: UserNameReportReason;
		detail: string;
	}) => Promise<CreateUserNameReportResult>;
};

type Opened = "recipe" | "user" | null;

// 他の人のレシピの「その他」。通報を選ぶと、ダイアログでフォームを開く。
export function ReportMenu({ onReportRecipe, onReportUser }: ReportMenuProps) {
	const [opened, setOpened] = useState<Opened>(null);
	const close = () => setOpened(null);

	return (
		<>
			<Menu
				label="その他"
				icon="more-horizontal"
				items={[
					{
						label: "このレシピを通報",
						icon: "alert-triangle",
						onSelect: () => setOpened("recipe"),
					},
					{
						label: "作者の名前を通報",
						icon: "alert-triangle",
						onSelect: () => setOpened("user"),
					},
				]}
			/>
			<Modal
				open={opened !== null}
				onOpenChange={(open) => {
					if (!open) close();
				}}
				title={opened === "user" ? "作者の名前を通報" : "このレシピを通報"}
				narrow
			>
				{opened === "recipe" ? (
					<ReportRecipeForm onReport={onReportRecipe} onClose={close} />
				) : null}
				{opened === "user" ? (
					<ReportUserForm onReport={onReportUser} onClose={close} />
				) : null}
			</Modal>
		</>
	);
}
