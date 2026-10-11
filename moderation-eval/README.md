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
語の一覧だけの結果（AI なし）：
```sh
RUN_MODERATION_EVAL=1 MODERATION_EVAL_LEXICON_ONLY=1 mise exec -- pnpm exec vitest run --project unit src/features/moderation/eval
```
AI を含む結果（Workers AI の無料枠を使う）：
```sh
RUN_MODERATION_EVAL=1 mise exec -- node --env-file=moderation-eval/eval.env.local node_modules/vitest/vitest.mjs run --project unit src/features/moderation/eval
```
結果は、`moderation-eval/report.local` に出る（誤って弾いたもの・通したものの一覧）。
