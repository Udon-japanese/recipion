import type { Avatar } from "../domain/avatar";
import { defaultAvatarFor } from "../domain/avatar-presets";
import { AvatarArt } from "./avatar-art";

type UserAvatarProps = {
	userId: string;
	// null は、まだ作っていない（ユーザーごとに決まったプリセットを出す）。
	avatar: Avatar | null;
	size?: number;
};

// ユーザーのアバター。作っていなければ、ユーザーごとに決まったプリセット。
export function UserAvatar({ userId, avatar, size }: UserAvatarProps) {
	return <AvatarArt avatar={avatar ?? defaultAvatarFor(userId)} size={size} />;
}
