# 本番デプロイの手順書

本番に出すときの手順を、1か所にまとめたもの。**コア機能（買い物メモなど）が終わってからの、デプロイと同じタイミングで使う。**
秘密の値・アカウントの ID は、ここに書かない（`wrangler secret put` と、各サービスの画面で扱う）。

コマンドは、ni 系（`nr` / `nlx`）で書く。

## 0. 前提と注意

- 本番の URL は `https://recipion.app`。Worker は `recipion`。デプロイは、手元から `nr deploy`（= ビルド → `wrangler deploy`）だけ（CI なし）。
- **`BETTER_AUTH_SECRET` は、変えない。** ログインだけでなく、①限定公開のパスフレーズの暗号化の鍵、②永久停止のメールアドレスのハッシュの鍵、にも使っている。変えると、保存済みのパスフレーズが読めなくなり、永久停止の記録が効かなくなる。
- **マイグレーションは、リリース前に整理してある**（2026-10-12。以前の `0000`〜`0018` は、`drizzle/0000_baseline.sql` の 1 本に含まれる。スキーマは、完全に一致することを確認済み）。そのあとに、`0001_inventory_capacity.sql`（在庫の満タン量。新しいテーブルなし）を足した。**本番の DB が、以前の 19 本を適用した状態なら、この 2 本とは合わない。13 の手順で、DB を作り直す**（本番に、守るべき利用者のデータがないことが前提。実行は、運営者が行う）。
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

- 手元の `drizzle/` には、`0000_baseline.sql` と `0001_inventory_capacity.sql` の 2 本がある。
- 本番の結果が **19 行**（以前の 19 本）なら、**13 の手順で作り直す**（作り直したあとは、6 の適用で 2 行になる）。**0 行**（まだ何も適用していない空の DB）か、**1 行**（`0000_baseline` だけ適用済み）なら、6 に進む。**2 行**なら、適用済み（6 は不要）。

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
  - 対象（パブリックのホスト名）は、**2つ登録する**：`recipion.app/admin` と `recipion.app/admin/*`。`/admin/*` だけだと、`/admin` そのものが対象にならないことがある。
  - ポリシー：許可（Allow）は、運営者のメールだけ。**ここのメールは、Access のログインで使う ID プロバイダーが返すメール**（ワンタイム PIN なら、PIN を受け取るアドレス。ID プロバイダーが「Cloudflare」なら、Cloudflare アカウントのメール）。アプリ（Better Auth）のログインとは、別。
  - ログイン方法（Login methods）に、使う方法が有効になっていること。
- 作ったあと、**Audience（AUD）タグ**と、**チーム名のドメイン**を控えて、4 のシークレットに設定する。
- **`ADMIN_EMAILS` には、Access のトークンに入るメール（上のポリシーと同じアドレス）を入れる**。アプリのログインのメールとは、関係ない（管理者の画面は、アプリのログインではなく、Access のトークンで確かめる）。
- 設定が足りないとき、管理者の画面は、**誰も通さない**（安全側）。管理者でない人には、管理者の画面があることも知らせず、「ページが見つかりません」を出す（ナビも出さない）。
- 管理者の画面へのリンクは、ページを読み込み直す（`reloadDocument`）。Access のログインは、ページの読み込みのときだけ求められるため。管理者の画面は、ブックマーク、または URL の直接入力で開く（`/admin`）。
- 「That account does not have access」は、Cloudflare 側が、ポリシーで断っている。ポリシーのメールと、ログインしたアカウントのメールが、一致しているかを確認する。

## 6. マイグレーションを適用する

`neondb_owner` の**直接の接続**（`-pooler` なし）で実行する。

```bash
DATABASE_URL='<本番の直接の接続文字列>' nr db:migrate
```

- 適用後、2 のクエリで、2 行になったことを確認する。

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

- [x] **最大サイズのレシピの CPU 時間**（2026-10-12 に実測）：上限いっぱい（材料100件・下準備50件・作り方50件・約11,800文字）で、手元（Node）の計測は、保存の準備が約0.3ms、公開時の語の一覧の照合が、2回目以降で約6ms、起動直後の1回目で約15ms（AI と DB の待ち時間は含まない。待ちは CPU に数えられない）。**非公開の保存は問題なし。最大サイズの公開は、Workers 無料枠の CPU（1回約10ms）に近く、起動直後は超えうる**。ふつうのレシピ（数千文字）は、1ms 前後。超えたときは、そのリクエストだけが失敗する（再試行で通ることが多い）。デプロイ後に、Workers のメトリクスで CPU 時間を確認する。
- [x] AI のプロンプトの再評価（2026-10-12。プロンプトは変えず、現状を再測定。悪い文章は600件に絞った。Workers AI の約3,000 Neurons を使用）：悪い文章のうち、**止めた59%・怪しいとした22%・通した10%**（前回の1,500件では、通した15%）。よい文章1,103件は、**通した1,082・誤って止めた1・判定できなかった20**。通してしまう文章の多くは、文脈のないカタカナの俗語（作り方の1行に紛れたもの）。**判定できなかった（unavailable）は、すべて Cloudflare 側の一時的な混雑（429、code 3040）で、無料枠の上限ではない**。公開の審査でこれが起きると、その公開は断られる（再試行で通る）。誤って止めた1件は、「冷蔵庫の中出し入れ」（前回は「怪しい」。AI の判定は毎回少し揺れる）。
  - **プロンプトの強化（同日）**：「料理と無関係なネットミーム・語録だけの行」を ng（irrelevant）に、「料理と関係があるか分からず、意味も分からない、独立した短い行」を unsure に、足した（普通の感想・相づちは対象外と明記）。同じ条件で再評価：悪い文章は**止めた83%・怪しいとした10%・通した7%**（強化前の、判定できた分では、66%・24%・10%）。よい文章1,103件は**通した1,101・誤って止めた1（同じ「中出し入れ」）・怪しいとした1（「またやろ。」）**。判定できなかったのは0件。残りの通過は、単独では普通の日本語として読める句（「あーさっぱりした」「あっ、そっかぁ...」など）が中心なので、これ以上は絞らない。
- [x] **Neon の復元用の履歴の設定**：Neon の API で確認した（`history_retention_seconds` = 21600 = 6時間）。プライバシーポリシーの第6項の「最長6時間」と一致。プランや設定を変えたら、ポリシーも直す。
- [ ] プライバシーポリシーの、外国の委託先（Cloudflare・Resend・Neon）の記載は、書いた（国名・目的・同意）。**法的に足りているかは、専門家の確認を受けていない。** 運営者の氏名・住所は、**公表しない方針**（運営者の判断）。
- [x] 情報漏えいが起きたときの手順は、`docs/incident-response.md`（2026-10-12 に、個人情報保護委員会の公式のページで、期限と報告の方法を確認して見直した）。
- [x] 商標：J-PlatPat で確認済み（運営者）。
- [x] Windows での、変換中のクリックの確認：済み（運営者）。

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

3. 6 のとおり、マイグレーションを適用する（2 行になる）。
4. 7 のとおり、権限を付ける（確認のクエリが空になる）。
5. 8 以降へ進む。

> 手元の開発用 DB は、同じ手順で作り直し済み（2026-10-12）。スキーマが、以前の 19 本を適用した状態と、完全に一致すること（列 181・制約 243・索引 66、差 0）を、確認してから、作り直した。

- **Dexie（ブラウザの IndexedDB）**：すでに 1 つのバージョンにまとめてある（データベース名は `recipion-local`）。古い `app-local` は、使われない（DevTools で消せる）。

## 14. 確認用アカウント（デモ用。期間限定）

見てもらう人が、メールを受け取れないと、ログインできない。そこで、固定のコードでログインできる確認用アカウントを、期間だけ有効にする。コードは `src/integrations/demo-login/` の1か所にまとめてある。**環境変数（シークレット）の2つがそろったときだけ有効**で、削除すれば無効に戻る（コードの再デプロイは要らない）。管理者の権限は付かない（管理者のメールが指定されたら、無効にする）。コードの送信・検証の回数制限と Turnstile は、ほかのアドレスと同じにかかる。

有効にする（運営者が実行する。本番の DB は、ユーザーが操作する）：

1. 確認用アカウントのデータを入れる。メールアドレスは、`demo-<ランダムな文字列>@recipion.app` の形で、未指定なら、スクリプトが作って表示する（`DEMO_LOGIN_EMAIL` を渡すと、そのアドレスで入れ直す。何度でも実行できる）。
   ```sh
   DATABASE_URL='<neondb_owner の直接接続>' nlx tsx scripts/seed-demo-account.ts           # 接続先と内容の確認だけ（書かない）
   DATABASE_URL='<neondb_owner の直接接続>' nlx tsx scripts/seed-demo-account.ts --confirm # 入れる
   ```
2. 表示されたメールアドレスと、決めた6桁のコードを、シークレットに設定する。
   ```sh
   printf '%s' 'demo-xxxx@recipion.app' | nlx --local wrangler secret put DEMO_LOGIN_EMAIL
   printf '%s' '123456' | nlx --local wrangler secret put DEMO_LOGIN_CODE
   ```
3. 本番で、そのアドレスと6桁のコードでログインし、レシピ（5件）と在庫（14件）が見えることを確認する。

**不要になったら、必ず無効にする**：

```sh
nlx --local wrangler secret delete DEMO_LOGIN_EMAIL
nlx --local wrangler secret delete DEMO_LOGIN_CODE
```

データ（確認用ユーザーと、そのレシピ・在庫）は、不要になったら、スクリプトで入れ直す代わりに、アカウントの削除（ログインして「アカウントの削除」）か、DB で `delete from "user" where email = '<確認用のアドレス>'` で消す（レシピ・在庫は連鎖で消える）。コードごと外すときは、このブランチのマージコミットを `git revert -m 1` する。

## 15. `/teapot` に 418 I'm a teapot を返す

`/teapot` を開くと、ステータス 418 の急須のページが出る（JavaScript なしの CSS だけで、クリックするとお茶が注がれる。トップ（`/`）へ戻るリンクつき）。アプリのルート（`src/routes/teapot.ts`。本文は `src/config/teapot-418.html`）で、`/teapot` を開いた人にだけ Worker が動く。

**許可リスト以外のパス（ボットのスキャン・打ち間違いの URL）は、これまでどおり、WAF が 403 で止める**（Worker を起動しない。拒絶の意味で、403 のままにする）。WAF のカスタムレスポンス（ステータスと本文を替える機能）は、Pro プラン以上でしか使えない（公式：https://developers.cloudflare.com/waf/custom-rules/create-dashboard/ ）。Snippets も、Free では使えない。

デプロイの手順：

1. `nr waf:allowlist` で式を作り直す（完全一致に `/teapot` が増える）。
2. ダッシュボードの「Security → Security rules」で、許可リスト以外を遮断しているルール（"Block unknown paths"）の式を、新しい式に貼り替えて保存する（アクションは、`Block` のまま）。
3. デプロイして、確認する。
   ```sh
   curl -i https://recipion.app/teapot | /usr/bin/head -8   # HTTP/2 418、content-type: text/html
   curl -s -o /dev/null -w '%{http_code}\n' https://recipion.app/wp-login.php   # 403（WAF）
   ```
   ブラウザで `https://recipion.app/teapot` を開き、急須が出て、クリックするとお茶が注がれることを確認する。

アプリの中の 404（許可リストを通ったが、アプリが見つけられないパス。例：存在しないレシピ）は、これまでどおり、アプリの「見つかりません」の画面になる。

## 16. 依存関係の脆弱性への自動対応と、メンテ中スイッチ

### 仕組み（`.github/`）
- **検知**：Dependabot（`dependabot.yml`）が、脆弱性が見つかると PR を作る。毎日 09:00（日本時間）に `audit.yml` が `pnpm audit --prod`（high 以上）を実行し、見つかれば Issue を立てる（通知メールが届く）。
- **CI**：`ci.yml`（check・typecheck・test・build）。PR と `main` への push で動く。
- **自動マージ**：Dependabot の PR が patch / minor で、CI が通れば、自動でマージする（`dependabot-auto-merge.yml`）。**major は自動ではマージしない**（人が確認する）。
- **自動デプロイ**：マージした PR が**セキュリティ更新**のときだけ、`deploy.yml` を動かす（ゲートを再度通してからデプロイ）。通常の更新は、これまでどおり手元で `nr deploy`。
- **メンテ中のときは、自動デプロイは何もしない**（メンテ中を終わらせないため）。本番の状態が調べられなかったときは、失敗にして知らせる。

### GitHub の初回設定（運営者）
1. Settings → Advanced Security: **Dependabot alerts** と **Dependabot security updates** を有効にする。
2. Settings → Actions → General → Workflow permissions: 「Allow GitHub Actions to create and approve pull requests」は不要（`gh pr merge` だけ使う）。「Read and write permissions」でなくてよい（ワークフローごとに権限を指定している）。
3. Settings → Secrets and variables → Actions: **`CLOUDFLARE_API_TOKEN`**（Workers の編集権限だけのトークン。「Edit Cloudflare Workers」のテンプレートが目安。アカウントを絞る）と **`CLOUDFLARE_ACCOUNT_ID`**。
4. 通知：GitHub の通知設定で、Actions の失敗と Dependabot alerts のメールを有効にする。
5. （任意）ブランチ保護で `gate` を必須にすると、人の PR も CI が通るまでマージできなくなる。
6. 最初の Dependabot の PR で、自動マージが動くことを確認する。**pnpm の `minimumReleaseAge` が、公開直後の修正版の取り込みを止める場合がある**（その PR の CI が失敗する）。その場合は手元で `pnpm update <パッケージ>` し、`pnpm-workspace.yaml` の `minimumReleaseAgeExclude` に追加する。

### メンテ中スイッチ
- **入れる**：GitHub の Actions → **Maintenance** → Run workflow → `on`。手元なら `nr maintenance:on`（`wrangler login` 済みのとき）。数十秒で反映される。
- **効果**：アプリの Worker を、**どのパス・どのメソッドにも 503 とメンテ中の画面だけを返す Worker に差し替える**（`src/maintenance/`）。静的な画面（`/shopping`・`/terms` など）も含めて、WAF が止めていないパスは、すべてメンテ中の画面になる。DB・メール・AI へは、一切つながらない。
- **解除**：Actions → Maintenance → `off`（ゲートを通して、通常のアプリをデプロイし直す）。手元なら `nr maintenance:off`（= `nr deploy`）。
- **シークレットは消えない**。Hyperdrive・ratelimits・AI のバインディングは、解除のデプロイで戻る。
- 使いどき：critical の脆弱性が見つかり、修正版の PR がまだない／自動マージできない（major など）／悪用が疑われるとき。**自動では入らない**（誤検知でサービスが止まるリスクのほうが大きいため）。
- 初回に、`on` → 本番を開いて画面を確認 → `off` で戻ることを、一度確かめておく。
