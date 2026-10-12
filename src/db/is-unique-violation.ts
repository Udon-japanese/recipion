type PostgresError = { code?: unknown; constraint?: unknown; cause?: unknown };

// 一意制約への違反か（Drizzle は、元のエラーを cause に入れることがある）。
export function isUniqueViolation(error: unknown, constraint: string): boolean {
	for (
		let current: unknown = error;
		typeof current === "object" && current !== null;
		current = (current as PostgresError).cause
	) {
		const { code, constraint: name } = current as PostgresError;

		if (code === "23505" && name === constraint) {
			return true;
		}
	}

	return false;
}
