# 開発者向けの情報

れしぴょん（recipion）を手元で動かす・変更するための情報です。アプリの紹介は [README](README.md) にあります。

## セットアップ

Node.js と pnpm は、[mise](https://mise.jdx.dev/) で固定しています（`mise.toml`）。初回は次を実行します。

```bash
mise trust && mise install
pnpm install
```

リポジトリ直下に、Git 管理外の `.env.local` を作り、次の変数を設定します（`.env.example` はありません）。

| 変数 | 用途 |
|---|---|
| `DATABASE_URL` | PostgreSQL の接続先。`drizzle-kit`（マイグレーション）が読みます（`drizzle.config.ts`） |
| `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` | ローカル（開発サーバー・プレビュー・ビルド）で、バインディング `HYPERDRIVE`（`wrangler.jsonc`）が接続する DB。通常は `DATABASE_URL` と同じ |
| `BETTER_AUTH_SECRET` | Better Auth のシークレット。限定公開のパスフレーズの暗号化にも使います |
| `BETTER_AUTH_URL` | アプリの URL（ローカルでは `http://localhost:3000`） |
| `RESEND_API_KEY` | （任意）未設定なら、メールは送らず、ログイン用コードを開発サーバーのコンソールに出します |
| `ADMIN_EMAILS` | （任意）管理者のメール（カンマ区切り）。開発サーバーでは、ログイン中のメールがここにあれば `/admin` を開けます |

- 本番では、同名のシークレットを `wrangler secret put` で設定します。本番だけに要るもの（`TURNSTILE_SECRET_KEY`、`CF_ACCESS_TEAM_DOMAIN`、`CF_ACCESS_AUD`）は、手順書の「4. シークレット」にあります。
- ローカルの Turnstile は、Cloudflare のテスト用キーを組み込んであります。
- 開発サーバーは、Workers AI のバインディングを、**本物の Cloudflare 上で動かします**（無料枠を使います）。公開前の審査を動かさないなら、影響はありません。

DB にマイグレーションを適用して、開発サーバーを起動します。

```bash
pnpm db:migrate
pnpm dev
```

開発サーバーは <http://localhost:3000> で起動します。

## 日常の検証

変更したら、次の4つを順に実行します。

```bash
pnpm check:fix
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

- `check:fix` は Biome で書き換えることがあります。実行後に差分を確認してください。
- `test` は、jsdom の単体テスト（`unit`）と、Chromium のブラウザテスト（`browser`）の両方を実行します。ブラウザテストには Playwright の Chromium が必要です（未導入なら `pnpm exec playwright install chromium`）。片方だけなら `pnpm test:unit`、`pnpm test:browser`。
- jsdom には、`execCommand` や CSS のレイアウトがありません。入力欄の補完・元に戻す・レイアウトは、ブラウザテスト（`*.browser.test.tsx`）か、実機で確認します。
- 実際の DB を使う確認は、トランザクション内で実行して必ずロールバックします（本番の DB には接続しません）。

**PWA・オフラインの確認は、本番ビルドで行います。** サービスワーカーは、本番ビルドでだけ登録されます。

```bash
pnpm build
pnpm preview
```

プレビュー（<http://localhost:4173>）は、開発サーバーとは別のオリジンなので、IndexedDB も別です。「データが消えた」ように見えたら、まずオリジンを確認してください。

## データベース

テーブル定義は、各機能の `*.sql.ts` にあり、`src/db/schema.ts` から公開しています。

```bash
pnpm db:generate   # スキーマの変更から、新しいマイグレーションを生成
pnpm db:migrate    # マイグレーションを適用
```

- マイグレーションは、リリース前に `drizzle/0000_baseline.sql` の1本にまとめています。リリース後は、まとめず、スキーマを変えるたびに足します。生成された SQL は、適用の前に確認してください。
- 端末側（Dexie）も同じ方針で、`version(1)` にまとめています（`src/local-db/database.ts`）。
- Hyperdrive の接続ユーザーには、権限が要ります。`ALTER DEFAULT PRIVILEGES` で、新しいテーブルにも自動で付く設定にします（手順書の7）。

## ビルドとデプロイ

`pnpm build` は、`vite build` のあとに `scripts/postbuild-app-shell.ts` を実行します。この後工程が、次を作ります。

- `dist/client/_shell.html`：誰のセッション情報も含まない、ルートだけの静的シェル（オフライン起動用）。
- `dist/client/sw-build.js`：今回のビルドのファイル一覧とビルド ID。`public/sw.js` が、これを使ってプリキャッシュします。
- `dist/client/*.html`：ブラウザだけで描画する画面（`/shopping` など）と、規約・ポリシーの静的ファイル。Worker を起動せずに配信します。

デプロイは、GitHub Actions の `Deploy`（`.github/workflows/deploy.yml`）から、手動で実行します。ゲート（Biome・型・テスト・ビルド）を通ってから、デプロイします。セキュリティ更新の自動マージのあとにも、自動で動きます。手元からも実行できます。`pnpm deploy` は pnpm の別の組み込みコマンドなので、`run` を付けます。

```bash
pnpm run deploy
```

これは `pnpm run build && wrangler deploy` です。**手順の全体（バックアップ、シークレット、Cloudflare Access、マイグレーション、権限、WAF、確認、ロールバック）は、[`docs/deploy-runbook.md`](docs/deploy-runbook.md) にあります。** 本番の DB の操作は、運営者が行います。

Cloudflare の設定は `wrangler.jsonc`、Vite の設定（Cloudflare プラグインを含む）は `vite.config.ts` です。

## 公開時の bot 対策

- セッション Cookie のないリクエストは、**DB に接続せずに**扱います。
- `workers_dev: false`、`preview_urls: false`。ゾーンの保護が及ばない入口を残しません。
- ゾーン側（ダッシュボード）：Bot Fight Mode、WAF のカスタムルール（このアプリのパス以外を遮断。式は `pnpm waf:allowlist` で作ります。**ルートや `public/` のファイルを足したら、作り直して更新します**）、`/api/auth/` のレート制限。ログイン用コードの送信・検証と、リンク検索の制限は、アプリ側（`wrangler.jsonc` の `ratelimits`）にあります。

## ディレクトリ構成

```
src/
  routes/          ファイルベースのルート
  features/
    shopping/      買い物メモ（店・条件つきのメモ・購入確定）
    inventory/     在庫（ロット・期限・管理方法・単位）
    ingredients/   食材カタログ（読み仮名・換算・期限の目安）
    recipes/       レシピ（解析・エディタ・リンク・公開範囲・消費）
    quantity/      数量の入力と表示（分数・単位別のボタン）
    auth/          ログイン UI
    profile/       表示名・ハンドル・退会
    moderation/    公開前の文章の審査
    reports/       通報
    admin/         管理者の画面・通知
    legal/         利用規約・プライバシーポリシー
    pwa/           サービスワーカーとビルド用の補助
    shortcuts/     ショートカットの表記
  integrations/    Better Auth、Cloudflare Access、メール
  local-db/        Dexie（IndexedDB）の定義
  local-storage/   localStorage のラッパー（キーの登録簿つき）
  db/              PostgreSQL への接続とスキーマの公開
  test/            テスト用の偽のリポジトリ（fakes）と、項目のビルダー（builders）
scripts/           ビルドの後工程、WAF の許可リストの生成
drizzle/           マイグレーション
docs/              デプロイの手順書、情報漏えい時の手順
moderation-eval/   審査の精度の評価用データと手順（アプリには入りません）
public/            manifest、アイコン、サービスワーカー
```

各機能は、`domain`（規則・純粋関数）、`application`（ユースケース）、`infrastructure`（DB・IndexedDB）、`server`（サーバー関数）、`components`（UI）に分けています。

## 設計上の約束

- **認可は、サーバー関数の中で行います。** 各サーバー関数が `auth.api.getSession` でセッションを確認し、ユーザー専用のリポジトリを作って `userId` で絞ります。クライアントの `useSession` は、表示の切り替え用で、認可の代わりにはしません。
- **在庫の単位と、買い物メモの単位は、役割が違います。** 在庫は、食材のカタログにある単位（g・ml・本・玉・枚など）だけ。メモは、買うときの好きな単位で、購入を確定すると在庫の単位に換算します。
- **テストでは、`vi.fn()` を並べず、`src/test/fakes/` の偽のリポジトリと、`src/test/builders/` のビルダーを使います。** 項目の型にフィールドを足しても、直すのはビルダーだけで済みます。
- **オフライン用の静的シェルは、TanStack Start の内部実装**（`TSS_PRERENDERING` 環境変数と `X-TSS_SHELL` ヘッダー）に依存しています。**TanStack Start を更新したら、`pnpm build` が通ることと、`dist/client/_shell.html` がルートだけの骨組みであることを必ず確認してください。** 後工程は自己検証し、違えばビルドを失敗させます。
- **サービスワーカーは自前の実装です。** `vite-plugin-pwa` は、TanStack Start との併用で、`vite build` の PWA 処理が実行されない問題があるため、使っていません（[TanStack/router#4988](https://github.com/TanStack/router/issues/4988)）。
- サーバーの実装（`cloudflare:workers` を使うもの）が、クライアントのコードに紛れ込まないよう、UI はサーバー関数を直接 import せず、props で受け取ります。
- 悪い語の一覧（`*.local.ts`）は、リポジトリに入れません。ない環境では、AI の判定だけで審査します。
