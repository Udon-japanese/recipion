import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<nav aria-label="機能">
			<ul>
				<li>
					<Link to="/shopping">買い物メモ</Link>
				</li>
				<li>
					<Link to="/inventory">在庫</Link>
				</li>
				<li>
					<Link to="/recipes">レシピ登録</Link>
				</li>
			</ul>
		</nav>
	);
}
