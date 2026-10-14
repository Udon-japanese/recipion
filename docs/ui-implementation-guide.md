# UI/UX を実装する人のための手引き — 2026-10-14

読みながら、自分で UI を直せるようにするための資料。**見た目を変えるときに、何を触ってよく、何を触ってはいけないか**が中心。
正確さのために、コードの場所（パス）を多く書いた。内容が古くなったら、コードが正。

## 1. 最初に

### 1.1 起動と確認

```bash
mise trust && mise install && pnpm install   # 初回だけ
pnpm db:migrate                              # 初回と、スキーマが変わったとき
pnpm dev                                     # http://localhost:3000
```

- `.env.local` が要る（変数の一覧は [`README.md`](../README.md) の「セットアップ」）。
- **確認ページ**（開発中だけ。本番は 404）：`/dev/ui`（共通部品を並べたページ）、`/dev/inventory`（在庫の画面の見本。ログイン不要）。
- 買い物メモ（`/shopping`）は、**ログインなしで見られる**（データは、この端末の IndexedDB）。ログインが要るのは、在庫・レシピ。
- 開発サーバーは、Workers AI を**本物の Cloudflare 上で動かす**（無料枠を使う）。公開前の審査を触らないなら、影響はない。

### 1.2 変更したら、4つ（この順）

```bash
pnpm check:fix            # Biome。ファイルを書き換えることがあるので、実行後に git diff を見る
pnpm exec tsc --noEmit    # 型
pnpm test                 # jsdom（unit）と Chromium（browser）の両方
pnpm build                # 本番ビルド（後工程でオフライン用のシェルも作る）
```

- 負荷やフォーカスの影響を避けるため、**開発サーバーは止めてから、`pnpm test` を回すのが無難**（これ自体が原因だと確認できた事例はない。念のため）。
- 落ちたら、まず**そのテストファイルだけ**を単独で回す：`pnpm exec vitest run path/to/file.test.tsx`。単独で通るのに、全体で落ちるときは、**別のテストの CSS／import のエラーの巻き添え**を疑う（実際に、無効な CSS セレクタ1つで、無関係なブラウザテストが十数件落ちたことがある）。

### 1.3 見た目の確認のしかた（実機の代わり）

- スマホ幅は 390px 前後、PC は 1280px。**幅の境目は 768px（左ナビ↔下部ナビ）と 1024px（シートが「下から」↔「右から」）。1280px 以上で、在庫の食材パネルが固定表示になる。**
- 買い物メモに見本の項目を入れたいときは、ブラウザの開発者ツールのコンソールで、Dexie のデータベース `recipion-local` に直接書くと速い（テーブル：`shoppingItems`・`shoppingStores`・`shoppingBranches`・`shoppingStoreDefaults`・`inventoryPurchaseOutbox`・`inventorySnapshots`）。項目の形は `src/test/builders/build-shopping-item.ts` を見る。
- **開発サーバー（4173 ではなく 3000）と、`pnpm preview`（4173）は、別のオリジン**。IndexedDB も別なので、「データが消えた」ように見えたら、まずオリジンを見る。

## 2. 全体像

### 2.1 機能の分け方

`src/features/<機能>/` は、同じ分け方をしている。**UI を直すときに触るのは、ほぼ `components/` だけ。**

| 層 | 中身 | UI を直すとき |
|---|---|---|
| `domain/` | 規則・純粋関数（数量の換算、並び替え、判定） | **触らない**（テストが、振る舞いを守っている） |
| `application/` | ユースケース・リポジトリの型 | 触らない |
| `infrastructure/` | Dexie・DB・ストレージ | 触らない |
| `server/` | サーバー関数（認可はここ） | 触らない |
| `hooks/` | 画面の状態（読み込み・追加・並び替え） | 原則、触らない。足りないときだけ相談 |
| `components/` | 画面と部品（`*.tsx` と `*.css.ts`） | **ここを直す** |

### 2.2 データの場所

| 機能 | 保存先 | 補足 |
|---|---|---|
| 買い物メモ | **端末の IndexedDB（Dexie）**。ゲストも同じ | `src/local-db/database.ts`。画面は `liveQuery` で、変更が自動で反映される |
| 在庫・レシピ・プロフィール | **サーバーの DB（PostgreSQL）**。ログインが要る | サーバー関数を呼ぶ。在庫の一覧は、通信できないとき、端末のキャッシュを使う |
| 画面の設定（表示の切り替え・期限の目安の設定など） | localStorage | `src/local-storage/`。**キーは `keys.ts` の登録簿に足す** |

- 購入を確定すると、買い物メモの項目が「購入済み」になり、**在庫への反映は、購入の記録（outbox）に積んで、あとで同期する**（オフラインでも買い物メモは壊れない）。
- 画面が「ログインしているか」は、`useOwnerScope()`（`guest`／`user:○○`／読み込み中は `null`）。**これは表示の切り替え用で、認可ではない**（認可はサーバー関数の中）。

### 2.3 描画の方式

- **`/shopping`・`/inventory`・`/recipes/new`・編集画面は、ブラウザだけで描画（`ssr: false`）**。ビルドの後工程が、静的な HTML を作って置く（Worker を起動しない）。
- **レシピの参照・一覧、プロフィール、管理者は、サーバーで描画（SSR）**。
- 画面で、`window`・`localStorage`・`matchMedia` を使うときは、**最初の描画は、サーバーと同じ値**にして、ブラウザで切り替える（`useMediaQuery`・`useStorageItem` は、そうなっている）。そうしないと、ハイドレーションの不一致になる。

### 2.4 ルートと枠

- ルートは `src/routes/`（ファイルベース）。**新しいルートを足したら、`pnpm waf:allowlist` で式を作り直し、本番の WAF のルールを更新する**（足し忘れると、本番で 403 になる）。
- 画面の枠（スマホのヘッダー＋下部ナビ、PC の左ナビ）は `src/features/shell/`。**枠を出さない画面**（`/login`・`/account-deleted`・`/dev` 以下）は、`getShellLayout`（`shell-layout.ts`）で決まる。
- ページの見出し（`h1`）は、各画面が持つ。**スマホは、枠のヘッダーに名前があるので、買い物メモは、見出しを画面には出さず、読み上げだけにしている**（`shopping-page.css.ts` の `title`）。

## 3. 見た目を変えるときの原則

1. **見た目だけを変える。振る舞い・データ・テストの意味は変えない。** 変えたくなったら、先に相談する。
2. **色・余白・文字は、`src/styles.css` の CSS 変数（`--color-*`・`--space-*`・`--font-*`・`--radius-*`・`--shadow-*`）で書く。色を直書きしない。** トークンを足したいときは、`styles.css` に足して、`src/components/css-custom-properties.d.ts` を見る。
3. **部品を使う。** 新しい `button`／`input` を、素の HTML で作らない（下の「4. 部品」）。足りない部品は、`src/components/` に足して、`/dev/ui` に並べる。
4. スタイルは、**vanilla-extract**（`*.css.ts`）。コンポーネントと同じフォルダに置き、`import * as styles from "./xxx.css"`。

### 3.1 vanilla-extract の作法と、はまりやすい点

- 書き方：`export const card = style({ display: "grid", gap: 16 })`。値のないプロパティは、数値（px）でも書ける（`gap: 16`）。
- **`selectors` のキーは、必ず `&`（自分自身）を対象にしなければならない。** `"& > p"` のような、**子孫を狙う書き方は、エラー**（`Invalid selector`）になり、**ビルドやテスト全体が壊れる**。子の見た目は、子に別のクラスを付けて指定する（または `globalStyle`）。親の状態で子を変えるときは、`selectors: { [`${parent}:hover &`]: … }` の形（親のクラスを変数で参照する）。
- **このアプリは、`box-sizing` の全体のリセットがない（要素は content-box）。** 幅・高さと余白（padding）を一緒に指定するときは、`boxSizing: "border-box"` を書く。
- メディアクエリ：`"@media": { "(min-width: 768px)": { … } }`。幅の境目は 768／1024／1280。
- `data-*` 属性で状態を切り替えるのが、このリポジトリの流儀：`selectors: { '&[data-tone="error"]': {…} }`。部品の props から `data-tone` を付ける。
- インラインの `style` は、**実行時に決まる値（位置など）だけ**。それ以外は、`*.css.ts`。

### 3.2 見た目の約束（デザイン）

- 押せるもの＝**枠がある・濃い**（チップ・ボタン・入力欄）。押せないもの＝**枠なし**（タグ）。選ばれている＝**黄色の地＋濃い枠＋✓**（色だけに頼らない）。
- 入力欄・ボタンは丸い（`--radius-control`）。カードは 20px（`--radius-card`）。
- **押せる範囲は 44px 以上**（見た目が小さいアイコンボタンは、`::before` で広げてある）。
- 白地の文字に、黄色は使えない（コントラストが足りない）。強調の文字は `--color-accent-text`（`#7a5200`）。
- アニメーションは、`prefers-reduced-motion` のとき止める（れしぽよ・シートは対応済み）。

## 4. 部品（`src/components/`）

| 部品 | 使うとき | メモ |
|---|---|---|
| `Button`（`button/`） | ふつうのボタン | `variant`（primary／secondary／danger／ghost）・`size`（sm／md／lg）・`fullWidth`・`leadingIcon`・`disabledReason`（無効のとき、押すと理由が出る）。**非同期の操作は、`status` を渡すと、「待機→処理中（れしぽよ）→完了→失敗」に変形する**。`useButtonAction().run(async () => …)`（false を返すか例外で失敗）が、状態を持つ |
| `ButtonLink` | 画面移動をボタンの見た目に | |
| `IconButton` | アイコンだけのボタン | `label` が必須（読み上げ）。`size`（sm＝見た目36px／std＝44px）、`tone`（muted／plain／danger／on） |
| `Chip` / `ChipGroup` | 選ぶ・数量を押す・絞り込み | `pressed` で選択状態。`size="qty"`（大きな数字） |
| `Tag` | 状態・場所・期限の札（押せない） | `tone`、`icon`、`approximate`（「約」の破線） |
| `Field` + `TextInput`／`TextArea`／`SelectBox` | ラベルつきの入力 | `Field` が、ラベル・補足・エラー（`aria-describedby`・`aria-invalid`）を結ぶ。`hideLabel`（読み上げだけ）。**入力欄を、素の `<input>` で作らない** |
| `SegmentedControl` | 2〜3つの切り替え | |
| `Checkbox` | チェック | `label` が必須 |
| `Card` | 白い面 | |
| `ListRow` / `ListRowName` / `ListRowMeta` | 一覧の行（先頭＝チェック、中央＝名前と補足、後ろ＝操作） | |
| `Menu` | 「その他」・並べ替えなどのメニュー | 矢印キー・Esc・外を押すで閉じる。`items` に `{ label, icon, tone, disabled, onSelect }` |
| `Sheet` | 下から出るシート（スマホ）／右から出るパネル（PC） | `placement`（bottom／right）、`snapPoints`、`footer`。**PC かどうかは、`useMediaQuery("(min-width: 1024px)")` で決めている**。つかんで下げて閉じる・勢い・ゴムの抵抗は、`sheet-physics.ts`（純粋関数）と `sheet.tsx` |
| `ConfirmDialog` | 取り消せない操作の確認 | `danger` で赤 |
| `PickerSelect` | `<select>` の置き換え | 本物の select を残し、押すと、PC は一覧、スマホは下から出る一覧。新しい select は `SelectBox` を使う |
| `Note` | お知らせ（同期・エラー・注意） | `tone` |
| `Toast` | 操作の結果の短い知らせ（「元に戻す」つき） | |
| `Avatar` / `Mascot` / `Icon` | アバター／れしぽよ／アイコン | `Icon`：`name` と `size`（16／20／24）。**アイコンは `icon-definitions.tsx` の一覧から選ぶ**（足すときは、同じ形式で足す） |

- **れしぽよ**：`<Mascot motion="tap" | "loop" | "still" />`。**ボタンの処理中以外は、止めておく**（押したときだけ1回跳ねる）。
- ボタンの完了表示は、**ラベルを書き換えず**、`aria-busy` と、見えない `<output>` で読み上げる（変えるときは、`button.tsx` の読み上げの仕組みを壊さない）。

## 5. 画面ごとの手引き

### 5.1 買い物メモ（`src/features/shopping/`、ルート `src/routes/shopping.tsx`）

- **画面の本体**：`components/shopping-list.tsx`。状態は、3つのフック（`hooks/use-shopping-items.ts`、`use-shopping-stores.ts`、`use-shopping-branches.ts`）と、購入確定の `use-shopping-purchase.ts`。
- **見出し・追加・一覧・購入バーのスタイル**：`components/shopping-page.css.ts`。行は `shopping-item-row.tsx`＋共通の `ListRow`。追加・編集の欄は `shopping-item-fields.tsx`（名前・数量と単位・カテゴリ・店。追加と編集で共通）。
- **分類の見出し**：`domain/shopping-category-group.ts`（見出しの順は、先頭の項目の並び順。**並べ替えは同じ分類の中だけ**で、見出しの順は変わらない）。
- **店ごとの表示**：`groupShoppingItemsByStore`（`domain/shopping-store.ts`）。店の管理は `shopping-store-manager.tsx`。
- **旧い見た目のまま（R4b で直す）**：購入確定の期限シート（`purchase-expiry-review.tsx`）、在庫換算の設定（`shopping-item-inventory-conversion-form.tsx`）、条件つきのメモ（`shopping-branch-section.tsx`）、「レシピから入れる」の中身（`recipes/components/recipe-to-shopping-picker.tsx`＋`recipe-shopping-section.tsx`）。**旧い見た目の部品は、`shopping-list.css.ts` を使っている。R4b が終わったら、このファイルは消せる。**
- **守るべき振る舞い（テストが守っている）**：
  - 条件つきのメモの中の項目（`branchId` あり）は、**通常の一覧・購入確定・レシピからの重複判定に出さない**。新しく項目を読む処理を足すなら、`!item.branchId` で除く。
  - 購入確定は、**在庫に入る項目があれば、先に期限の確認を出す**。日用品（カテゴリ `household`）だけなら、確認なし。在庫換算がない項目は、確定せず、設定へ案内する。
  - 画面の追加は `upsertById`（同じ ID なら置き換え）。購読の更新が先に届いても、二重に出ないため。
  - 追加フォームは、**名前の欄に触れると、数量・単位・カテゴリ・店が開く**。空のまま外を押すか Esc で閉じる。追加したあとは、続けて入れられるよう、名前の欄に戻る。
- テストは、`shopping-list*.test.tsx`（jsdom）と `shopping-list.browser.test.tsx`（ドラッグ）。**テストは、ラベル（「卵のその他」「購入を確定（1件）」など）で、要素を探している。**ラベルを変えるときは、テストも直す。

### 5.2 在庫（`src/features/inventory/`）

- 画面：`components/inventory-list.tsx`。**冷蔵庫の絵**は `components/fridge/`（タイル・棚・水位）、**食材のパネル**は `components/panel/`（スマホ＝下のシート、1024px〜＝右のシート、1280px〜＝固定）、**在庫に追加**は `components/registration/`。
- **ゾーンの振り分け・水位・並び**：`domain/inventory-fridge.ts`（純粋関数。テストあり）。見た目を変えても、振り分けのルールは変えない。
- **満タンの量**（`inventory_item.capacity`）：数量を増やす操作で、サーバーが引き上げる。タイルの水位とパネルの量の絵に使う。
- 同期のお知らせ：`inventory-purchase-sync.tsx`・`guest-purchase-adoption.tsx`。

### 5.3 レシピ（`src/features/recipes/`）

- **エディタ**：`components/recipe-editor.tsx`（状態）、`recipe-body-textarea.tsx`（本文の入力欄・補完）、`recipe-ingredient-preview.tsx`（プレビューの手直し）。
- **⚠ 入力欄は、自前の元に戻す履歴を持っている**（`domain/text-history.ts`）。`execCommand` は使わない。**本文を書き換える処理は、必ず `recipe-body-textarea.tsx` の `edit`／`writeText` を通す**（通さないと、Ctrl+Z が壊れる）。
- **⚠ 補完メニューの位置と、日本語入力（IME）の変換中の動き**は、繊細：`measureTextareaCaret`・`placePopup`（位置）、`domain/choose-composition-strategy.ts`（ブラウザごとの方式）。**見た目を変えても、`recipe-body-textarea.browser.test.tsx` が通ること。** jsdom では確かめられないので、ブラウザテストか実機で。
- 参照：`recipe-view.tsx`（本体）、`recipe-view-with-links.tsx`（リンクのプレビュー）、`recipe-link-preview.tsx`。
- 「買い物メモに入れる」：`recipe-shopping-section.tsx`（計画は `domain/plan-shopping-from-recipe.ts`）。「作った」：`recipe-consume-section.tsx`。
- 入力の上限は `domain/recipe-limits.ts`（画面の保存前とサーバーで同じ関数を使う）。

### 5.4 そのほか

- ログイン：`features/auth/`（メール→6桁のコード）。**6桁の入力は、入力欄が1つで、透明にして、見た目の6つの枠の上に重ねている**（全角入力・変換中でも壊れないための作り。見た目を変えるときも、この構造は変えない）。ボット判定（Turnstile）と同意の文は、**必ず残す**。
- 規約・ポリシー：本文の正本は `features/legal/domain/*-content.ts`。ビルド時に静的ファイルになる。
- 管理者：`features/admin/`、`/admin/*`。一般の導線には出さない。

## 6. テスト

- **jsdom（`*.test.tsx`）**：部品・画面の振る舞い。**CSS のレイアウトは効かない**ので、見た目の確認には使えない。
- **ブラウザ（`*.browser.test.tsx`）**：実際の Chromium。ドラッグ・シート・入力欄の補完・フォーカス。
- **偽のリポジトリ（`src/test/fakes/`）とビルダー（`src/test/builders/`）を使う**。`vi.fn()` を並べない。項目の型にフィールドを足しても、直すのはビルダーだけで済む。
- **テストの探し方（ラベル）が壊れたら**：見た目を変えて、ボタンの名前・構造が変わっただけなら、**テストの選択子を直す**（意味を変えない）。意味（何が起きるか）が変わったなら、変更が正しいかを、先に相談する。
- 新しい部品は、`/dev/ui` に並べ、**振る舞いのテスト**（`menu.test.tsx` のような、開く・矢印・Esc・外を押す）を足す。

## 7. 落とし穴（過去に実際にあったもの）

| 症状 | 原因 | 対処 |
|---|---|---|
| テストやビルド全体が、急に壊れる | vanilla-extract の無効なセレクタ（`& > p` など） | 子に別のクラスを付ける（3.1） |
| 全体のテストでだけ、ブラウザテストが落ちる | 開発サーバーが動いている／別のテストの CSS・import のエラー | 開発サーバーを止める。落ちたファイルを単独で回す |
| 幅と余白を指定したのに、はみ出す | `box-sizing` がリセットされていない | `boxSizing: "border-box"` |
| 本番で、新しいページが 403 | WAF の許可リストに、ルートがない | `pnpm waf:allowlist` で作り直して更新 |
| ハイドレーションの警告 | 最初の描画が、サーバーと違う | `useMediaQuery`・`useStorageItem` を使う |
| 入力欄の Ctrl+Z がおかしい | 本文を `edit`／`writeText` を通さず書き換えた | 5.3 |
| 買い物メモの項目が、二重に出る | 追加を、単純な配列の追加にした | `upsertById` を使う |
| 「データが消えた」 | 開発サーバー（3000）とプレビュー（4173）は、別のオリジン | オリジンを確認 |
| 日用品・条件つきのメモの中の項目が、購入確定・重複判定に混ざる | `branchId` を除いていない | `!item.branchId` |

## 8. 新しい画面・部品を足す手順

1. **部品**：`src/components/<名前>/` に、`<名前>.tsx`・`<名前>.css.ts`・テストを作る。`/dev/ui`（`src/dev/ui-gallery.tsx`）に並べる。`label` など、読み上げに必要な props は、**必須にする**。
2. **画面（ルート）**：`src/routes/` にファイルを足す → `pnpm dev` で `routeTree.gen.ts` が更新される → **WAF の許可リストを作り直す**。枠を出さない画面なら、`shell-layout.ts` に足す。ブラウザだけで描画する画面なら、`ssr: false` と、ビルドの静的ページの一覧（`src/features/pwa/build/static-pages.ts`）を確認する。
3. **ユーザーが入力する欄を足すとき**：他の人に見える文章なら、**公開前の審査の登録簿**（`src/features/moderation/domain/moderation-target.ts`）に足し、保存するサーバー関数で `enforceModeration` を呼ぶ。長さの上限も足す。（UI だけの変更では、通常、不要。）
4. **文言**：画面に見える文字は、足しすぎない。読み上げ用の文は、見えなくても入れる。
5. 4つのゲート（1.2）を通す。

## 9. 残っているデザインの反映（状況）

| 段階 | 内容 | 状態 |
|---|---|---|
| R4b | 買い物メモ：購入確定の期限シート／在庫換算の設定／条件つきのメモ／「レシピから入れる」／同期のお知らせ | これから |
| R5 | レシピ：参照・エディタ・一覧・リンクのプレビュー・作った・買い物メモに入れる | これから |
| R6 | プロフィール・退会・規約・停止の画面・管理者の画面 | これから |
| R7 | 実機の確認（スマホ・PC・Safari・VoiceOver）、古いスタイルの削除、PWA のアイコン・色（`public/manifest.webmanifest` の `theme_color`・`background_color`、`public/recipion-icon.svg`） | これから |

詳しい計画と、承認済みの変更点は、[`design-rollout-plan.md`](design-rollout-plan.md)。AI に渡す資料は、[`design-ai-brief.md`](design-ai-brief.md)。

## 10. もっと詳しく知りたいとき

- 機能ごとの、実装済みの仕様の一覧（画面ごと）：[`design-feature-inventory.md`](design-feature-inventory.md)
- 設計上の約束・DB・デプロイ：[`README.md`](../README.md)、[`deploy-runbook.md`](deploy-runbook.md)
- 手元の引き継ぎ文書 `CLAUDE.md`（Git 管理外）には、決定の経緯が、時系列で全部ある。**長いので、必要な項目を検索して読む**。
