// 限定公開のパスフレーズを、保存するときの暗号化（AES-GCM）。鍵は、サーバーの秘密の値から作る。
// データベースだけが漏れても、秘密の値がなければ、読めない。

const textEncoder = new TextEncoder();
const version = "v1";

function toBase64(bytes: Uint8Array): string {
	let binary = "";

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
	const binary = atob(text);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
	const material = await crypto.subtle.importKey(
		"raw",
		textEncoder.encode(secret),
		"HKDF",
		false,
		["deriveKey"],
	);

	return crypto.subtle.deriveKey(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: new Uint8Array(),
			info: textEncoder.encode("recipion-recipe-passphrase"),
		},
		material,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

export async function encryptPassphrase(
	passphrase: string,
	secret: string,
): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const cipher = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		await deriveKey(secret),
		textEncoder.encode(passphrase),
	);

	return `${version}.${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`;
}

// 読めない（形が違う・鍵が違う・改ざん）ときは、null。
export async function decryptPassphrase(
	stored: string,
	secret: string,
): Promise<string | null> {
	const [storedVersion, iv, cipher] = stored.split(".");

	if (storedVersion !== version || !iv || !cipher) {
		return null;
	}

	try {
		const plain = await crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: fromBase64(iv) },
			await deriveKey(secret),
			fromBase64(cipher),
		);

		return new TextDecoder().decode(plain);
	} catch {
		return null;
	}
}
