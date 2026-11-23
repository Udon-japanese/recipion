# P0 の試作（捨てる。main にはマージしない）

- `shared`：quantity を Kotlin に移したもの（android・jvm・js）。
- `androidApp`：メール OTP でログインし、bearer のトークンで API を呼ぶだけの Android の雛形。

## 動かし方（リポジトリの直下で）

```bash
mise install
```

```bash
cd kmp && mise exec -- ./gradlew :shared:jvmTest :shared:jsNodeTest :shared:jsBrowserProductionLibraryDistribution
```

Web の単体テストを、Kotlin の版で回す（TS 版のテストをそのまま使う）。

```bash
KMP_QUANTITY=1 nr test
```

Android（先に `nr dev` を起動し、エミュレーターを起動しておく）。

```bash
adb reverse tcp:3000 tcp:3000 && cd kmp && mise exec -- ./gradlew :androidApp:installDebug
```
