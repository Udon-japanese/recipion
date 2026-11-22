import type { InferRequestType } from "hono/client";

import { apiClient, readApiResponse } from "#/api/client";

// 管理者の API（/api/v1/admin）を、画面から呼ぶ関数。失敗は ApiError を投げる。
const admin = apiClient.api.v1.admin;

// 管理者の画面を開いてよいか。管理者でない・確かめられない（鍵の取得の失敗など）ときは false（画面は「見つかりません」）。
export async function isAdmin(): Promise<boolean> {
	try {
		await readApiResponse(await admin.check.$get());

		return true;
	} catch {
		return false;
	}
}

export async function getSummary() {
	return readApiResponse(await admin.summary.$get());
}

export async function searchUsers(input: { query: string }) {
	return readApiResponse(await admin.users.$get({ query: input }));
}

export async function suspendUser(
	input: InferRequestType<typeof admin.users.suspend.$post>["json"],
) {
	return (
		await readApiResponse(await admin.users.suspend.$post({ json: input }))
	).result;
}

export async function liftSuspension(input: { userId: string }) {
	return (await readApiResponse(await admin.users.lift.$post({ json: input })))
		.result;
}

export async function listOpenAppeals() {
	return readApiResponse(await admin.appeals.$get());
}

export async function listResolvedAppeals() {
	return readApiResponse(await admin.appeals.resolved.$get());
}

export async function resolveAppeal(
	input: InferRequestType<typeof admin.appeals.resolve.$post>["json"],
) {
	return (
		await readApiResponse(await admin.appeals.resolve.$post({ json: input }))
	).result;
}

export async function listOpenReports() {
	return readApiResponse(await admin.reports.$get());
}

export async function listResolvedReports() {
	return readApiResponse(await admin.reports.resolved.$get());
}

// 通報されたレシピの内容。削除されていれば null。
export async function getReportedRecipe(input: { reportId: string }) {
	return readApiResponse(await admin.reports.recipe.$get({ query: input }));
}

export async function resolveReport(
	input: InferRequestType<typeof admin.reports.resolve.$post>["json"],
) {
	return (
		await readApiResponse(await admin.reports.resolve.$post({ json: input }))
	).result;
}

export async function listOpenUserReports() {
	return readApiResponse(await admin["user-reports"].$get());
}

export async function listResolvedUserReports() {
	return readApiResponse(await admin["user-reports"].resolved.$get());
}

export async function resolveUserReport(
	input: InferRequestType<
		(typeof admin)["user-reports"]["resolve"]["$post"]
	>["json"],
) {
	return (
		await readApiResponse(
			await admin["user-reports"].resolve.$post({ json: input }),
		)
	).result;
}
