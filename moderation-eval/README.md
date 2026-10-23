# 文章の判定の評価

文章の判定（`src/features/moderation`）の精度を、実際のモデルで確かめる。

## 用意するもの
- `ok-samples*.txt`（このリポジトリに入っている。複数のファイルを、まとめて読む）：**かならず通したい**文章（調理の言葉、コメント欄のひとこと、など）。「---」だけの行で、1件ずつに分ける。重複は、自動で除く。
- `borderline-samples.txt`（このリポジトリに入っている）：**判断が分かれる**文章（「くそうまい」「やばいおいしさ」など）。止めなければ（通す・怪しいとする）合格。
- **同じ文章を、複数の区分に入れない**（`ok-samples.txt`・`borderline-samples.txt`・`ng-*.local`）。入っていると、結果の先頭に、警告が出る。
- **`ng-seeds*.local`**（手元だけ。`*.local` は `.gitignore` 済み。`ng-seeds.local`・`ng-seeds-slang.local` のように、複数のファイルに分けてよい）：悪い語・言い回しの「元」。**1行に1つ**。「#」で始まる行は、コメント。書き換えのパターン（伏せ字・区切り・カタカナ・絵文字・見えない文字など）は、こちらで増やす。
- **`ng-samples.local`**（任意・手元だけ）：すでに、書き換えられた形で集めた、悪い文章。1行に1件。
- **`eval.env.local`**（手元だけ）：
  ```
  CLOUDFLARE_ACCOUNT_ID=...
  CLOUDFLARE_API_TOKEN=...   # Workers AI の権限（Read・Edit）のトークン
  MODERATION_EVAL_MODEL=@cf/google/gemma-4-26b-a4b-it
  ```

## 実行
短い形（`package.json` の scripts）：
```sh
nr eval:lexicon     # 語の一覧だけ（AI なし・無料枠を使わない）
nr eval:ai          # AI あり・700件を無作為に抜き取る（無料枠を使う）
nr eval:openrouter  # OpenRouter で、同じ評価（別の事業者。下の「OpenRouter」を参照）
nr eval:ai:full     # AI あり・全件（約10k Neurons。1日の枠を使い切る）
MODERATION_EVAL_LIMIT=300 nr eval:ai          # 件数を変える
MODERATION_EVAL_SEED=<種> nr eval:ai          # 同じ抜き取りで、もう一度
```
下は、同じことを、scripts なしで書いた形。

語の一覧だけの結果（AI なし）：
```sh
RUN_MODERATION_EVAL=1 MODERATION_EVAL_LEXICON_ONLY=1 mise exec -- pnpm exec vitest run --project unit src/features/moderation/eval
```
AI を含む結果（Workers AI の無料枠を使う）：
```sh
RUN_MODERATION_EVAL=1 mise exec -- node --env-file=moderation-eval/eval.env.local node_modules/vitest/vitest.mjs run --project unit src/features/moderation/eval
```
結果は、`moderation-eval/report.local` に出る（誤って弾いたもの・通したものの一覧）。

## 件数を絞る（無作為の抜き取り）
Workers AI の無料枠（1日 10,000 Neurons）に収めるため、`MODERATION_EVAL_LIMIT=700` のように、悪い文章の件数を絞れる。**全体から無作為に抜き取る**（先頭に偏らない）。元の語ごとの書き換えの選び方（`MODERATION_EVAL_PER_SEED`、既定3件）も無作為。

- 抜き取りは、実行のたびに変わる。**種は `report.local` の先頭に出る**。同じ抜き取りで、もう一度試したい（プロンプトの前後を比べる、など）ときは、`MODERATION_EVAL_SEED=<種>` を付ける。
- 例：`RUN_MODERATION_EVAL=1 MODERATION_EVAL_LIMIT=700 MODERATION_EVAL_SEED=2583772388 mise exec -- node --env-file=moderation-eval/eval.env.local node_modules/vitest/vitest.mjs run --project unit src/features/moderation/eval`

## OpenRouter（別の事業者で、同じモデルを試す）
同じモデルでも、事業者（量子化・実行の設定）が違うと、結果が少しずれうる。Workers AI と OpenRouter の両方で評価し、数字が近いことを確かめる（両方の結果を、`report.local` の「モデル」の行で見分ける。実行のたびに上書きされるので、1回ごとに、別の名前に移しておく）。**ES に載せる主な数字は、本番と同じ Workers AI のもの**。

- `eval.env.local` に足す：
  ```
  OPENROUTER_API_KEY=...
  OPENROUTER_MODEL=google/gemma-4-26b-a4b-it
  ```
  末尾に `:free` を付けると無料枠（公式の資料では、1分に20回・1日に50回。10クレジット以上を購入済みなら1日1,000回。**無料枠は、送った文章が学習に使われうる**）。評価は、まとめて10件ずつ送るので、700件なら、悪い文章だけで70回になる（よい文章の分は別）。**50回の枠では足りない**ので、`:free` なしの有料のモデル（少額）にするか、件数を絞る。
- 429 のときは、`Retry-After` の秒数だけ待って、3回までやり直す。
- 同じ抜き取りで比べるには、Workers AI の実行の種（`report.local` の先頭）を、`MODERATION_EVAL_SEED=<種> nr eval:openrouter` で、そのまま使う。
