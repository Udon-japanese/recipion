# れしぴょん（recipion）

日本語の家庭料理向けに、**買い物メモ、購入記録、食材の在庫、レシピ**をつなぐ Web アプリです。リポジトリ名と内部の識別子は `recipion`、ユーザーに見える表示名は「れしぴょん」です（表示名は `src/config/app.ts` の `APP_DISPLAY_NAME`）。

買い物メモはログインなしでも使え、データは端末内（IndexedDB）に保存されます。ログインすると、在庫とレシピがサーバー側（PostgreSQL）に保存されます。PWA として、買い物メモをオフラインで使えます。

## 機能

**実装済み**

- **買い物メモ**（`/shopping`）：追加・編集・削除・チェック・並び替え（ドラッグ、売り場順）、カテゴリの推定、数量プリセットと別名、仕入れ単位から在庫単位への換算。ゲストでも使えます。
- **在庫**（`/inventory`）：ログインユーザーごとの食材・在庫の管理、購入確定時の在庫の加算、手動の増減、単位換算、購入記録の同期（オフライン時の再送を含む）。
- **レシピ**（`/recipes`）：一覧、参照（`/recipes/$publicId`）、登録（`/recipes/new`）。材料・下準備・作り方を貼り付けて読み取り、保存前に手で訂正できます（材料名・分量の編集、グループの作成・名前の変更・移動、材料の追加・削除）。引用元の URL を任意で保存できます。
- **認証**：メールアドレスとパスワードによるログイン・新規登録（Better Auth）。
- **PWA**：ホーム画面へのインストールと、オフラインでの起動（静的シェルとビルドごとのプリキャッシュ）。

**未実装・構想中**

作り方の中で材料の分量を示す表示、派生レシピとレシピ間のリンク、レシピの公開閲覧、食材マスタと g への換算表示、レシピから在庫消費への接続、材料の並び替え（ドラッグ）など。

## 技術スタック

| 領域 | 使用技術 |
|---|---|
| フロント | React 19、TanStack Start / Router、TypeScript、Vite、vanilla-extract、destyle.css |
| 検証・型 | Valibot |
| ローカルデータ | Dexie（IndexedDB） |
| 認証 | Better Auth |
| サーバー | Cloudflare Workers、Hyperdrive、PostgreSQL、Drizzle ORM |
| 品質 | Biome、TypeScript、Vitest（jsdom と Chromium） |

依存のバージョンは、`package.json` とロックファイルが正です。

## セットアップ

必要なもの：Node.js、pnpm、PostgreSQL（Cloudflare Hyperdrive 経由で接続します）。`scripts/postbuild-app-shell.ts` を `node` で直接実行するため、TypeScript の型の取り除きが既定で有効な新しい Node.js が必要です（22.18 以降が目安です）。バージョンは [mise](https://mise.jdx.dev/) の `mise.toml` で固定しています（初回は `mise trust` と `mise install`）。

```bash
pnpm install
```

リポジトリのルートに、Git 管理外の `.env.local` を作り、次の変数を設定します。

| 変数 | 用途 |
|---|---|
| `DATABASE_URL` | PostgreSQL の接続先。`drizzle-kit`（マイグレーションなど）が読みます（`drizzle.config.ts`） |
| `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` | ローカル（開発サーバー、プレビュー、ビルド）で、Hyperdrive のバインディング `HYPERDRIVE`（`wrangler.jsonc`）が接続する DB |
| `BETTER_AUTH_SECRET` | Better Auth のシークレット |
| `BETTER_AUTH_URL` | アプリの URL（ローカルでは開発サーバーの URL） |

`BETTER_AUTH_SECRET` は、`pnpm dlx @better-auth/cli secret` で生成できます。`.env.example` は用意していません。

マイグレーションを適用してから、開発サーバーを起動します。

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

- `pnpm check:fix` は Biome でソースを書き換えることがあります。実行後に `git diff` で差分を確認してください。
- `pnpm test` は、jsdom の単体テストと、Chromium のブラウザテストの両方を実行します。ブラウザテストには Playwright の Chromium が必要です（未導入なら `pnpm exec playwright install chromium`）。
- UI を変えたときは、ブラウザで、貼り付け→手直し→保存まで実際に操作して確認します。

**PWA・オフラインの確認は、本番ビルドで行います。** サービスワーカーは本番ビルドでだけ登録されます（開発サーバーでは登録されません）。

```bash
pnpm build
pnpm preview
```

プレビュー（<http://localhost:4173>）は、開発サーバーとは別のオリジンなので、IndexedDB も別です。「データが消えた」ように見えたときは、まずオリジンを確認してください。

## データベース

テーブル定義は、各機能の `*.sql.ts`（`src/**/*.sql.ts`）にあり、`src/db/schema.ts` から公開しています。マイグレーションは `drizzle/` にあります。

```bash
pnpm db:generate   # スキーマの変更からマイグレーションを生成
pnpm db:migrate    # マイグレーションを適用
```

生成された SQL は、適用の前に内容を確認してください。

## ビルドとデプロイ

`pnpm build` は、`vite build` のあとに `scripts/postbuild-app-shell.ts` を実行します。この後工程が、次の2つを作ります。

- `dist/client/_shell.html`：ルートだけを描画した、誰のセッション情報も含まない静的シェル（オフライン起動用）。
- `dist/client/sw-build.js`：今回のビルドが出したファイルの一覧とビルド ID。`public/sw.js` が、これを使って全チャンクをプリキャッシュします。

デプロイは、手元から実行します（CI は未設定です）。

```bash
pnpm run deploy
```

これは `package.json` のスクリプトで、`pnpm run build && wrangler deploy` を実行します（pnpm には、別の組み込みコマンド `pnpm deploy` があるため、`run` を付けます）。Cloudflare Workers の設定は `wrangler.jsonc`、Vite の設定（Cloudflare プラグインを含む）は `vite.config.ts` です。

**初回の本番デプロイの前に確認すること**

- Worker 名は、`wrangler.jsonc` の `name`（`recipion`）です。
- 本番の DB には、`drizzle/` のマイグレーションを、番号の順に適用します。すでに一部が適用済みの場合は、適用状況の確認と、DB のバックアップを先に行ってください。
- 本番用の環境変数（`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`）は、Worker のシークレット・変数として設定します（シークレットは `wrangler secret put <名前>`）。
- 後工程は、`vite preview` を起動するため、`.env.local` がある環境で実行します。`.env.local` のない環境（将来 CI に載せる場合）で通るかは、未確認です。

## ディレクトリ構成

```
src/
  routes/              ファイルベースのルート（/、/shopping、/inventory、/recipes ほか）
  features/
    shopping/          買い物メモ
    inventory/         在庫と購入記録
    ingredients/       食材・別名
    recipes/           レシピ（材料のパーサー、エディタ、参照）
    auth/              ログイン UI
    pwa/               サービスワーカーの登録とビルド用の補助
  integrations/
    better-auth/       認証の設定、サーバー側のセッション確認
  local-db/            Dexie（IndexedDB）の定義
  db/                  PostgreSQL への接続とスキーマの公開
  config/              アプリの表示名など
scripts/               ビルドの後工程（静的シェルの生成）
drizzle/               マイグレーション
public/                manifest、アイコン、サービスワーカー
```

各機能は、`domain`（規則）、`application`（ユースケース）、`infrastructure`（DB・IndexedDB）、`server`（サーバー関数）、`components`（UI）に分けています。

## 設計上の約束

- **認可は、サーバー関数の中で行います。** 各サーバー関数が `auth.api.getSession` でセッションを確認し、ユーザー専用のリポジトリを作って、`userId` で絞り込みます。クライアントの `useSession` と、それを包む `useOwnerScope` は、表示の切り替え用で、認可の代わりにはしません。
- **ログイン状態の初回表示**は、ルートの loader が、サーバーで確認したセッションのうち、表示に使う最小項目だけを渡し、ちらつきを防いでいます（トークンは含めません）。
- **オフライン用の静的シェル**は、TanStack Start の内部実装（`TSS_PRERENDERING` 環境変数と `X-TSS_SHELL` ヘッダー）に依存しています。**TanStack Start を更新したら、`pnpm build` が通ることと、`dist/client/_shell.html` がルートだけの骨組みであること（ホームの内容やユーザー情報を含まないこと）を、必ず確認してください。** 後工程は、これを自己検証し、違えばビルドを失敗させます。
- **サービスワーカーは自前の実装です。** `vite-plugin-pwa` は、TanStack Start との併用で、`vite build` の PWA 処理が実行されない問題が報告されているため、使っていません（[TanStack/router#4988](https://github.com/TanStack/router/issues/4988)）。
- Cloudflare Workers の実行環境（`cloudflare:workers`）を使うサーバーの実装が、テストのクライアント側のコードに紛れ込まないよう、UI はサーバー関数を直接 import せず、props で受け取ります。
