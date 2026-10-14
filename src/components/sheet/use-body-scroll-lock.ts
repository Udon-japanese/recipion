import { useEffect } from "react";

// 開いているシートの数。0 → 1 でロックし、1 → 0 で解除する（重なっても、先に解除しない）。
let lockCount = 0;
let previousOverflow = "";

export function useBodyScrollLock(active: boolean) {
	useEffect(() => {
		if (!active) {
			return;
		}

		if (lockCount === 0) {
			previousOverflow = document.body.style.overflow;
			document.body.style.overflow = "hidden";
		}

		lockCount += 1;

		return () => {
			lockCount -= 1;

			if (lockCount === 0) {
				document.body.style.overflow = previousOverflow;
			}
		};
	}, [active]);
}
