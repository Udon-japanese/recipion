# 本番デプロイの手順書

本番に出すときの手順を、1か所にまとめたもの。**コア機能（買い物メモなど）が終わってからの、デプロイと同じタイミングで使う。**
秘密の値・アカウントの ID は、ここに書かない（`wrangler secret put` と、各サービスの画面で扱う）。

コマンドは、ni 系（`nr` / `nlx`）で書く。

## 0. 前提と注意

- 本番の URL は `https://recipion.app`。Worker は `recipion`。デプロイは、手元から `nr deploy`（= ビルド → `wrangler deploy`）だけ（CI なし）。
- **`BETTER_AUTH_SECRET` は、変えない。** ログインだけでなく、①限定公開のパスフレーズの暗号化の鍵、②永久停止のメールアドレスのハッシュの鍵、にも使っている。変えると、保存済みのパスフレーズが読めなくなり、永久停止の記録が効かなくなる。
- マイグレーションは、新しいテーブルを足す形（0013・0014 は、列とテーブルの追加だけ）。**古い Worker のコードのままでも、DB は壊れない**（ロールバックが安全）。

## 1. 出す前の確認（手元）

- [ ] `main` に、出したい変更がすべてマージされている（`git status` がきれい、`git log -1`）。
- [ ] ゲート：`nr check:fix` / `nlx --local tsc --noEmit` / `nr test` / `nr build` がすべて通る。
- [ ] `docs/deploy-runbook.md`（このファイル）の「未完了の確認事項」（末尾）を、読み直す。

## 2. 本番 DB の状態を確認する

本番の DB（Neon の `production` ブランチ）に、どこまでマイグレーションが適用されているかを見る。

```sql
select id, created_at from drizzle.__drizzle_migrations order by id;
```

- 手元の `drizzle/` には、`0000`〜`0014` の 15 本がある。行数が 15 未満なら、足りない分が、保留中。
- 参考：`0009`（ハンドル）・`0010`（リンク）は適用済みのはず。`0011`〜`0014` は、状況を確認する。

## 3. バックアップを取る（必須）

- Neon のダッシュボードで、`production` の子ブランチを作る（例：`production-backup-before-<日付>`）。
- 古い `production-backup-before-lots` は、問題がなければ、このタイミングで削除してよい。

## 4. シークレットを確認・追加する

`nlx --local wrangler secret put <名前>` で設定する（値は、画面に出ない入力で渡す）。

| 名前 | 用途 | 状態 |
|---|---|---|
| `BETTER_AUTH_SECRET` | 認証、パスフレーズの暗号化、永久停止のハッシュ | 設定済み。**変えない** |
| `BETTER_AUTH_URL` | `https://recipion.app` | 設定済み |
| `RESEND_API_KEY` | ログイン用コード・退会の確認メール | 設定済み |
| `TURNSTILE_SECRET_KEY` | ログイン画面のボット対策 | 設定済み |
| `ADMIN_EMAILS` | 管理者のメール（カンマ区切り） | **新規**（管理者の画面） |
| `CF_ACCESS_TEAM_DOMAIN` | 例：`https://<チーム名>.cloudflareaccess.com` | **新規** |
| `CF_ACCESS_AUD` | Access のアプリケーションの AUD タグ | **新規**（次の手順のあとで分かる） |

> `DATABASE_URL` は、Worker には要らない（Hyperdrive が接続情報を持つ）。`drizzle-kit` が手元で使うだけ。

## 5. Cloudflare Access（管理者の画面を守る）

- Zero Trust → Access → Applications で、**セルフホストのアプリケーション**を作る。
  - 対象：`recipion.app/admin/*`
  - ポリシー：許可は、運営者のメールだけ。
- 作ったあと、**Audience（AUD）タグ**と、**チーム名のドメイン**を控えて、4 のシークレットに設定する。
- 設定が足りないとき、管理者の画面は、**誰も通さない**（安全側）。

## 6. マイグレーションを適用する

`neondb_owner` の**直接の接続**（`-pooler` なし）で実行する。

```bash
DATABASE_URL='<本番の直接の接続文字列>' nr db:migrate
```

- 適用後、2 のクエリで、15 行になったことを確認する。

## 7. Hyperdrive の専用ユーザーに権限を付ける（必須）

マイグレーションは `neondb_owner` で実行するので、新しいテーブルは、`hyperdrive-user`（Worker の接続ユーザー）には、権限がない。**テーブルごとに GRANT する。**

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON
  recipe_link,
  recipe_report,
  account_suspension,
  banned_email,
  moderation_cache,
  moderation_violation,
  suspension_appeal,
  recipe_unlock,
  recipe_unlock_attempt
TO "hyperdrive-user";
```

確認：権限のないテーブルが、1つもないこと（結果が空であること）。

```sql
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not has_table_privilege('hyperdrive-user', c.oid, 'INSERT');
```

> 今後のテーブルにも、自動で権限を付けたいときは、`ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "hyperdrive-user";` を、一度実行する（すでにあるテーブルには効かない。現在は、見送り中）。

## 8. デプロイする

```bash
nr deploy
```

- マイグレーション適用（6）から、デプロイまでの間に、時間をあけない（旧コードが、新しい制約と合わない操作をしないように）。
- `wrangler.jsonc` に、次のバインディングが入っている：`hyperdrive`、`ai`（Workers AI）、`ratelimits`（ログイン用 3 つと、`LINK_SEARCH_LIMITER`）。
- ビルドのたびに、サービスワーカーのビルド ID が変わる（想定どおり）。
- ビルドの後処理が、静的ページ（`terms.html`・`privacy.html`）と、シェルのコピー（`shopping.html`・`inventory.html`・`recipes/new.html`）を、`dist/client` に作る（`dist` は、ビルドのたびに作り直される）。デプロイは、必ず `nr deploy`（ビルド込み）で行う。規約・ポリシーの文面を変えたら、デプロイで、静的ファイルが更新される。

## 9. WAF の許可リストを更新する

このアプリが提供するパス以外を、Block するルールの式を、作り直して、ダッシュボードのルールを更新する。

```bash
nr waf:allowlist
```

- Cloudflare ダッシュボード → Security → Security rules → カスタムルール（許可リスト以外を Block）の式を、出力で置き換える。
- 前回から増えたパス：`/profile`、`/terms`、`/privacy`、`/account-deleted`、`/admin/reports`、`/admin/appeals` ほか（式は、出力が正）。

## 10. デプロイ後の確認

最初に、自分の目で確認する（本番の DB に、実際のデータが入る。テスト用のレシピは、あとで消す）。

- [ ] `https://recipion.app/`、`/terms`、`/privacy` が開く。
- [ ] ログイン（コードのメールが届く → ログインできる）。
- [ ] レシピを、**全体公開**で保存できる（AI の審査が動く。Workers AI の使用量が増える）。公開できない内容が、止まる。
- [ ] **限定公開**で保存 → パスフレーズが表示される → 別のアカウントで、パスフレーズを入れて開ける。
- [ ] 別のアカウントで、`[[@` → ユーザー → レシピ → リンクが入る。
- [ ] 他の人のレシピに、通報ボタンがある。通報が、管理者の画面に載る。
- [ ] `/admin/reports`、`/admin/appeals` が、運営者のメールだけで開く（Access のログインが出る）。
- [ ] プロフィールの名前の変更が、審査される。
- [ ] **退会**：テスト用のアカウントで、確認メール → リンク → 削除される。
- [ ] **静的ページが、Worker を通っていない**：`/terms`、`/privacy`、`/shopping`、`/inventory`、`/recipes/new` を開いても、Cloudflare ダッシュボードの Workers のリクエスト数が増えない（静的ファイルは、無料・無制限）。`/terms/`（末尾にスラッシュ）は、`/terms` に転送される。ログイン済みで `/shopping` を開いたとき、ログイン画面が一瞬見えない（「ログイン状態を確認しています…」→ ログイン中の表示）。
- [ ] Workers Logs に、エラーが出ていない（Observability）。
- [ ] 最大サイズ（12,000 文字）のレシピを、公開できる（CPU の上限に当たらない。下の「未完了」）。
- [ ] **Windows**（VM）で、変換中の候補のクリックが、置き換わる（Mac の Chrome・Safari は、確認済み）。

## 11. ロールバック

| 問題 | 対処 |
|---|---|
| コードの不具合 | `nlx --local wrangler rollback`（直前のバージョンに戻す）。0013・0014 は追加だけなので、DB は、そのままでよい。 |
| DB の不具合 | 3 のバックアップのブランチから、復元する（コードも、戻す）。 |
| 管理者の画面に入れない | 4 のシークレット（`ADMIN_EMAILS`・`CF_ACCESS_*`）と、5 の Access のポリシーを確認する。 |

## 12. 運用のメモ

- **Workers AI（審査）**：無料枠は、1日 10,000 Neurons。使い切ると、公開の審査が `unavailable` になり、**公開できなくなる**（非公開の保存は、できる）。1人1日 20 回までの上限（`maxAiChecksPerDay`）がある。
- **Resend**：送信が増えたら、他のプロバイダに替える方針。送信は、`send-login-code.ts` と `send-delete-account-email.ts` の2か所。
- **Workers 無料枠**：1日 10 万リクエスト（超えると Error 1027）。1回の処理の CPU は約 10ms。WAF で止めた分は、Worker を起動しない。
- **管理者の操作**：`/admin/reports`（通報・自動検知）、`/admin/appeals`（停止への申し立て。永久停止は、ここで確定）。

## 未完了の確認事項（デプロイの前までに）

- [ ] **最大サイズのレシピの CPU 時間**の実測（上限の値は、`recipes/domain/recipe-limits.ts`）。
- [ ] AI のプロンプトの再評価（悪い文章を通す率。Workers AI の枠が戻ってから）。
- [ ] **Neon の復元用の履歴の設定の確認**（Console の Settings → Instant restore）。プライバシーポリシーの第6項に、「最長6時間（現在の設定）」と書いてある。無料プランの上限は6時間（2026-10-12 時点の公式の資料）。プランや設定を変えたら、ポリシーも直す。
- [ ] プライバシーポリシーの、外国の委託先（Cloudflare・Resend・Neon）の記載は、書いた（国名・目的・同意）。**法的に足りているかは、専門家の確認を受けていない。** 運営者の氏名・住所は、**公表しない方針**（運営者の判断）。
- [ ] 情報漏えいが起きたときの手順は、`docs/incident-response.md`。
- [ ] 商標：J-PlatPat で「れしぴょん」は、出なかった。念のため、`recipion`・`レシピオン` でも確認する。
- [ ] Windows での、変換中のクリックの確認（デプロイ後に、本番で。上の確認項目）。
