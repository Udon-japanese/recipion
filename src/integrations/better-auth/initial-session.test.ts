import { describe, expect, it } from "vitest";
import { type InitialSession, resolveSession } from "./initial-session";

const initialSession: InitialSession = {
	user: { id: "u1", name: "山田", email: "yamada@example.com" },
};

const pendingStore = { data: null, isPending: true };

describe("resolveSession", () => {
	it("最初の取得が終わるまでは、サーバーで確認したログイン状態をそのまま使う", () => {
		expect(resolveSession(pendingStore, initialSession, false)).toEqual({
			data: initialSession,
			isPending: false,
		});
	});

	it("サーバーが未ログインと確認していれば、取得中でもゲストとして扱う", () => {
		expect(resolveSession(pendingStore, null, false)).toEqual({
			data: null,
			isPending: false,
		});
	});

	it("サーバーの結果がなければ、これまでどおり取得中として扱う", () => {
		expect(resolveSession(pendingStore, undefined, false)).toEqual({
			data: null,
			isPending: true,
		});
	});

	it("取得が終わったあとの再取得（ログイン直後など）では、サーバーの古い値を使わず取得中として扱う", () => {
		expect(resolveSession(pendingStore, null, true)).toEqual({
			data: null,
			isPending: true,
		});
	});

	it("クライアントの取得が終わったら、ストアの値を優先し、表示に使う項目だけを返す", () => {
		const store = {
			data: {
				user: { id: "u2", name: "佐藤", email: "sato@example.com" },
				session: { token: "secret" },
			},
			isPending: false,
		};

		expect(resolveSession(store, initialSession, true)).toEqual({
			data: { user: { id: "u2", name: "佐藤", email: "sato@example.com" } },
			isPending: false,
		});
	});

	it("ログアウトしたあとは、サーバーの初期値に戻らずゲストになる", () => {
		expect(
			resolveSession({ data: null, isPending: false }, initialSession, true),
		).toEqual({ data: null, isPending: false });
	});
});
