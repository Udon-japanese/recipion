import "react";

// インラインスタイルで CSS のカスタムプロパティ（--foo）を渡せるようにする。
declare module "react" {
	interface CSSProperties {
		[key: `--${string}`]: string | number | undefined;
	}
}
