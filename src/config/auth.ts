import authData from "../../shared-data/auth.json";

// アプリ（Kotlin）と共通の値は、shared-data/auth.json に置く。
// コードの桁数は、4 桁では総当たりに弱いので 6 桁。
export const OTP_LENGTH = authData.otpLength;

export const OTP_EXPIRES_IN_SECONDS = authData.otpExpiresInSeconds;

// 1 つのコードに対する、入力の試行回数の上限。超えたコードは無効になる（再送が必要）。
export const OTP_ALLOWED_ATTEMPTS = 5;

export const OTP_RESEND_COOLDOWN_SECONDS = authData.otpResendCooldownSeconds;

// セッションの期限（秒）。使うたびに、この長さだけ先まで延びる（30日間使わなければ切れる）。
export const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30;

// セッションの期限を延ばす間隔（秒）。前回の延長からこれだけたったあとに使われたら、期限を延ばす。
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;
