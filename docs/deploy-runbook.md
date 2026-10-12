# 本番デプロイの手順書

本番に出すときの手順を、1か所にまとめたもの。**コア機能（買い物メモなど）が終わってからの、デプロイと同じタイミングで使う。**
秘密の値・アカウントの ID は、ここに書かない（`wrangler secret put` と、各サービスの画面で扱う）。

コマンドは、ni 系（`nr` / `nlx`）で書く。

## 0. 前提と注意

- 本番の URL は `https://recipion.app`。Worker は `recipion`。デプロイは、手元から `nr deploy`（= ビルド → `wrangler deploy`）だけ（CI なし）。
- **`BETTER_AUTH_SECRET` は、変えない。** ログインだけでなく、①限定公開のパスフレーズの暗号化の鍵、②永久停止のメールアドレスのハッシュの鍵、にも使っている。変えると、保存済みのパスフレーズが読めなくなり、永久停止の記録が効かなくなる。
- **マイグレーションは、リリース前に 1 本（`drizzle/0000_baseline.sql`）にまとめてある**（2026-10-12。以前の `0000`〜`0018` は、この 1 本に含まれる。スキーマは、完全に一致することを確認済み）。**本番の DB が、以前の 19 本を適用した状態なら、この 1 本とは合わない。13 の手順で、DB を作り直す**（本番に、守るべき利用者のデータがないことが前提。実行は、運営者が行う）。
- リリース後は、まとめない。スキーマを変えるたびに、新しいマイグレーションを足す。

## 1. 出す前の確認（手元）

- [ ] `main` に、出したい変更がすべてマージされている（`git status` がきれい、`git log -1`）。
- [ ] ゲート：`nr check:fix` / `nlx --local tsc --noEmit` / `nr test` / `nr build` がすべて通る。
- [ ] `docs/deploy-runbook.md`（このファイル）の「未完了の確認事項」（末尾）を、読み直す。

## 2. 本番 DB の状態を確認する

本番の DB（Neon の `production` ブランチ）に、どこまでマイグレーションが適用されているかを見る。

```sql
select id, created_at from drizzle.__drizzle_migrations order by id;
```

- 手元の `drizzle/` には、`0000_baseline.sql` の 1 本だけがある。
- 本番の結果が **19 行**（以前の 19 本）なら、**13 の手順で作り直す**。**0 行**（まだ何も適用していない空の DB）か、13 のあとの **1 行** なら、6 に進む。

## 3. バックアップを取る（必須）

- Neon のダッシュボードで、`production` の子ブランチを作る（例：`production-backup-before-<日付>`）。
- 古い `production-backup-before-lots` は、問題がなければ、このタイミングで削除してよい。

## 4. シークレットを確認・追加する

`nlx --local wrangler secret put <名前>` で設定する（値は、画面に出ない入力で渡す）。

| 名前 | 用途 | 状態 |
|---|---|---|
| `BETTER_AUTH_SECRET` | 認証、パスフレーズの暗号化、永久停止のハッシュ | 設定済み。**変えない** |
| `BETTER_AUTH_URL` | `https://recipion.app` | 設定済み |
| `RESEND_API_KEY` | ログイン用コード・退会の確認メール・管理者への通知メール | 設定済み |
| `TURNSTILE_SECRET_KEY` | ログイン画面のボット対策 | 設定済み |
| `ADMIN_EMAILS` | 管理者のメール（カンマ区切り）。管理者の画面の許可と、**管理者への通知メールの宛先**にも使う | **新規**（管理者の画面） |
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

- 適用後、2 のクエリで、1 行になったことを確認する。

## 7. Hyperdrive の専用ユーザーに権限を付ける（必須）

マイグレーションは `neondb_owner` で実行するので、新しいテーブルは、`hyperdrive-user`（Worker の接続ユーザー）には、権限がない。**全テーブルに、まとめて GRANT する。今後のテーブルにも効くよう、既定の権限も設定する**（一度で済む）。

```sql
GRANT USAGE ON SCHEMA public TO "hyperdrive-user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "hyperdrive-user";
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "hyperdrive-user";
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

> `ALTER DEFAULT PRIVILEGES` は、そのあとに作るテーブルにだけ効く（すでにあるテーブルには、上の `ON ALL TABLES` が効く）。リリース後に、マイグレーションでテーブルを足しても、権限は自動で付く。

## 8. デプロイする

```bash
nr deploy
```

- マイグレーション適用（6）から、デプロイまでの間に、時間をあけない（旧コードが、新しい制約と合わない操作をしないように）。
- `wrangler.jsonc` に、次のバインディングが入っている：`hyperdrive`、`ai`（Workers AI）、`ratelimits`（ログイン用 3 つと、`LINK_SEARCH_LIMITER`）。
- ビルドは、数秒で終わる（後処理のプレビューは、`vite.config.ts` の `remoteBindings: !isPreview` で、リモートのバインディング（Workers AI）を使わない。公式のオプション。デプロイされる設定の `ai` には、影響しない）。ビルドが終わらないときは、この設定が外れていないかを確認する。
- ビルドのたびに、サービスワーカーのビルド ID が変わる（想定どおり）。
- ビルドの後処理が、静的ページ（`terms.html`・`privacy.html`）と、シェルのコピー（`shopping.html`・`inventory.html`・`recipes/new.html`）を、`dist/client` に作る（`dist` は、ビルドのたびに作り直される）。デプロイは、必ず `nr deploy`（ビルド込み）で行う。規約・ポリシーの文面を変えたら、デプロイで、静的ファイルが更新される。

## 9. WAF の許可リストを更新する

このアプリが提供するパス以外を、Block するルールの式を、作り直して、ダッシュボードのルールを更新する。

```bash
nr waf:allowlist
```

- Cloudflare ダッシュボード → Security → Security rules → カスタムルール（許可リスト以外を Block）の式を、出力で置き換える。
- 前回から増えたパス：`/profile`、`/terms`、`/privacy`、`/account-deleted`、`/admin`、`/admin/reports`、`/admin/appeals`、`/admin/users`、`/admin/user-reports` ほか（式は、出力が正）。

## 10. デプロイ後の確認

最初に、自分の目で確認する（本番の DB に、実際のデータが入る。テスト用のレシピは、あとで消す）。

- [ ] `https://recipion.app/`、`/terms`、`/privacy` が開く。
- [ ] ログイン（コードのメールが届く → ログインできる）。
- [ ] レシピを、**全体公開**で保存できる（AI の審査が動く。Workers AI の使用量が増える）。公開できない内容が、止まる。
- [ ] **限定公開**で保存 → パスフレーズが表示される → 別のアカウントで、パスフレーズを入れて開ける。
- [ ] 別のアカウントで、`[[@` → ユーザー → レシピ → リンクが入る。
- [ ] 他の人のレシピに、通報ボタンがある。通報が、管理者の画面に載る。
- [ ] `/admin`（入口）、`/admin/reports`、`/admin/user-reports`、`/admin/appeals`、`/admin/users` が、運営者のメールだけで開く（Access のログインが出る）。入口に、未対応の件数が出る。
- [ ] **管理者への通知メール**：テスト用のアカウントで、他の人のレシピを通報する → `ADMIN_EMAILS` にメールが届く（件数と画面のリンクだけ。30分以内の2通目は届かない）。
- [ ] 管理者の画面の「ユーザー」で、テスト用のアカウントを探して、停止 → 解除できる。**管理者自身のアカウントは、停止できない**。
- [ ] 他の人のレシピの作者に、「この作者のユーザー名を通報する」がある。
- [ ] 在庫：「有無だけ」の食材（塩・醤油など）が、「あり」と表示される。単位を変える・ロットの数量を直す・名前を変える・削除ができる。
- [ ] プロフィールの名前の変更が、審査される。
- [ ] **退会**：テスト用のアカウントで、確認メール → リンク → 削除される。
- [ ] **静的ページが、Worker を通っていない**：`/terms`、`/privacy`、`/shopping`、`/inventory`、`/recipes/new` を開いても、Cloudflare ダッシュボードの Workers のリクエスト数が増えない（静的ファイルは、無料・無制限）。`/terms/`（末尾にスラッシュ）は、`/terms` に転送される。ログイン済みで `/shopping` を開いたとき、ログイン画面が一瞬見えない（「ログイン状態を確認しています…」→ ログイン中の表示）。
- [ ] Workers Logs に、エラーが出ていない（Observability）。
- [ ] 最大サイズ（12,000 文字）のレシピを、公開できる（CPU の上限に当たらない。下の「未完了」）。
- [ ] **Windows**（VM）で、変換中の候補のクリックが、置き換わる（Mac の Chrome・Safari は、確認済み）。

## 11. ロールバック

| 問題 | 対処 |
|---|---|
| コードの不具合 | `nlx --local wrangler rollback`（直前のバージョンに戻す）。マイグレーションは、追加と制約の緩和だけなので、DB は、そのままでよい。**ただし、「有無だけ」（`presence`）の在庫が作られたあとで、`0015` より前のコードに戻すと、その在庫の行が読めず、在庫の画面がエラーになる**（その場合は、DB も戻すか、`presence` の在庫を、量を追う管理に切り替える）。 |
| DB の不具合 | 3 のバックアップのブランチから、復元する（コードも、戻す）。 |
| 管理者の画面に入れない | 4 のシークレット（`ADMIN_EMAILS`・`CF_ACCESS_*`）と、5 の Access のポリシーを確認する。 |

## 12. 運用のメモ

- **Workers AI（審査）**：無料枠は、1日 10,000 Neurons。使い切ると、公開の審査が `unavailable` になり、**公開できなくなる**（非公開の保存は、できる）。1人1日 20 回までの上限（`maxAiChecksPerDay`）がある。
- **Resend**：送信が増えたら、他のプロバイダに替える方針。送信は、`send-login-code.ts` と `send-delete-account-email.ts` の2か所。
- **Workers 無料枠**：1日 10 万リクエスト（超えると Error 1027）。1回の処理の CPU は約 10ms。WAF で止めた分は、Worker を起動しない。
- **管理者の操作**：`/admin`（入口。未対応の件数）、`/admin/reports`（レシピの通報・自動検知）、`/admin/user-reports`（ユーザー名の通報）、`/admin/appeals`（停止への申し立て。永久停止は、ここで確定）、`/admin/users`（ユーザーを探して、停止・永久停止・解除）。各画面の下に、対応済みの履歴（直近100件）。
- **管理者への通知**：新しい通報・自動検知・停止への申し立て・ユーザー名の通報が来ると、`ADMIN_EMAILS` にメール（件数と画面のリンクだけ）。**同じ種類は30分に1通まで**（`admin_notification_log`）。メールが届かないときは、`RESEND_API_KEY`・`ADMIN_EMAILS` と、Resend の送信ログを確認する。

## 未完了の確認事項（デプロイの前までに）

- [ ] **最大サイズのレシピの CPU 時間**の実測（上限の値は、`recipes/domain/recipe-limits.ts`）。
- [ ] AI のプロンプトの再評価（悪い文章を通す率。Workers AI の枠が戻ってから）。
- [ ] **Neon の復元用の履歴の設定の確認**（Console の Settings → Instant restore）。プライバシーポリシーの第6項に、「最長6時間（現在の設定）」と書いてある。無料プランの上限は6時間（2026-10-12 時点の公式の資料）。プランや設定を変えたら、ポリシーも直す。
- [ ] プライバシーポリシーの、外国の委託先（Cloudflare・Resend・Neon）の記載は、書いた（国名・目的・同意）。**法的に足りているかは、専門家の確認を受けていない。** 運営者の氏名・住所は、**公表しない方針**（運営者の判断）。
- [ ] 情報漏えいが起きたときの手順は、`docs/incident-response.md`。
- [ ] 商標：J-PlatPat で「れしぴょん」は、出なかった。念のため、`recipion`・`レシピオン` でも確認する。
- [ ] Windows での、変換中のクリックの確認（デプロイ後に、本番で。上の確認項目）。

## 13. 本番の DB を作り直す（以前の 19 本を適用済みの DB を、整理後の 1 本にそろえる）

**運営者が行う。本番の DB の、すべてのデータ（ユーザー、レシピ、在庫、通報など）が消える。** 守るべきデータがないことを、確認してから行う。ログイン中のブラウザは、ログアウトされる（セッションも消えるため）。

1. 3 のとおり、バックアップのブランチを作る。
2. `neondb_owner` の**直接の接続**で、次を実行する（`psql`、または Neon の SQL エディタ）。

   ```sql
   DROP SCHEMA IF EXISTS drizzle CASCADE;
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT USAGE ON SCHEMA public TO PUBLIC;
   ```

3. 6 のとおり、マイグレーションを適用する（1 行になる）。
4. 7 のとおり、権限を付ける（確認のクエリが空になる）。
5. 8 以降へ進む。

> 手元の開発用 DB は、同じ手順で作り直し済み（2026-10-12）。スキーマが、以前の 19 本を適用した状態と、完全に一致すること（列 181・制約 243・索引 66、差 0）を、確認してから、作り直した。

- **Dexie（ブラウザの IndexedDB）**：すでに 1 つのバージョンにまとめてある（データベース名は `recipion-local`）。古い `app-local` は、使われない（DevTools で消せる）。
