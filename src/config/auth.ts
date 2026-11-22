// メールのワンタイムコード認証の設定。サーバー（Better Auth）、メールの文面、入力欄で、同じ値を使う。

// コードの桁数。4 桁は総当たりに弱いので、6 桁にする。
export const OTP_LENGTH = 6;

// コードの有効期限（秒）。
export const OTP_EXPIRES_IN_SECONDS = 300;

// 1 つのコードに対する、入力の試行回数の上限。超えたコードは無効になる（再送が必要）。
export const OTP_ALLOWED_ATTEMPTS = 5;

// 「コードを再送」できるようになるまでの待ち時間（秒）。
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

// セッションの期限（秒）。使うたびに、この長さだけ先まで延びる（30日間使わなければ切れる）。
export const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30;

// セッションの期限を延ばす間隔（秒）。前回の延長からこれだけたったあとに使われたら、期限を延ばす。
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;
