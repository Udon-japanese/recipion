import type { ReactNode } from "react";
import { Modal } from "#/components/dialog/modal";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";

type RecipeDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	headerLeading?: ReactNode;
	footer?: ReactNode;
	// 読む文章や、縦に並べる選択は、幅を狭くする（PC のとき）。
	narrow?: boolean;
	children: ReactNode;
};

// レシピの画面の、重ねて開く画面。PC は中央のダイアログ、スマホは下からのシート。
export function RecipeDialog({
	open,
	onOpenChange,
	title,
	headerLeading,
	footer,
	narrow,
	children,
}: RecipeDialogProps) {
	const isWide = useMediaQuery("(min-width: 768px)");

	if (isWide) {
		return (
			<Modal
				open={open}
				onOpenChange={onOpenChange}
				title={title}
				headerLeading={headerLeading}
				footer={footer}
				narrow={narrow}
			>
				{children}
			</Modal>
		);
	}

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
			title={title}
			placement="bottom"
			snapPoints={[0.7, 0.92]}
			headerLeading={headerLeading}
			footer={footer}
		>
			{children}
		</Sheet>
	);
}
