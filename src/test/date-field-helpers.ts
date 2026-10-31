import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { formatDisplayDate } from "#/components/date-picker/calendar";

type User = ReturnType<typeof userEvent.setup>;

// 日付の欄（DateField。PC の入力欄）に、日付（YYYY-MM-DD）を打って、確定する（欄から出る）。
export async function typeDate(user: User, label: string, isoDate: string) {
	const input = screen.getByLabelText(label);

	await user.clear(input);
	await user.type(input, formatDisplayDate(isoDate));
	await user.tab();
}

// 日付の欄の、いまの日付（YYYY-MM-DD。空なら、空）を確かめる文字。
export function displayedDate(isoDate: string): string {
	return formatDisplayDate(isoDate);
}
