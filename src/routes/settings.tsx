import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as v from "valibot";
import { ButtonLink } from "#/components/button/button-link";
import { pageTitle } from "#/config/app";
import { SignOutButton } from "#/features/auth/components/sign-out-button";
import type {
	BackupExportDependencies,
	BackupImportDependencies,
} from "#/features/backup/application/backup-transfer";
import { BackupSettingsSection } from "#/features/backup/components/backup-settings-section";
import {
	exportBackupDictionaryServerFn,
	exportBackupInventoryServerFn,
	exportBackupRecipesServerFn,
} from "#/features/backup/server/export-backup";
import {
	importBackupRecipeLinksServerFn,
	importBackupRecipesServerFn,
	inspectBackupServerFn,
	mergeBackupDictionaryServerFn,
	replaceBackupInventoryServerFn,
} from "#/features/backup/server/import-backup";
import { IngredientDictionarySection } from "#/features/ingredients/components/ingredient-dictionary-section";
import {
	listIngredientDictionaryServerFn,
	manageIngredientDictionaryServerFn,
} from "#/features/ingredients/server/ingredient-dictionary";
import { createDexieInventoryPurchaseOutboxRepository } from "#/features/inventory/infrastructure/dexie-inventory-purchase-outbox-repository";
import { AccountDeletionSection } from "#/features/profile/components/account-deletion-section";
import { HouseholdSizeSetting } from "#/features/recipes/components/household-size-setting";
import {
	getHouseholdSizeServerFn,
	updateHouseholdSizeServerFn,
} from "#/features/recipes/server/household-size";
import { AccountSettingsSection } from "#/features/settings/components/account-settings-section";
import {
	SettingsPage,
	settingsTabs,
} from "#/features/settings/components/settings-page";
import * as settingsStyles from "#/features/settings/components/settings-page.css";
import { authClient } from "#/integrations/better-auth/auth-client";
import { useAppSession } from "#/integrations/better-auth/use-app-session";

export const Route = createFileRoute("/settings")({
	head: () => ({ meta: [{ title: pageTitle("設定") }] }),
	// tab：在庫（inventory）／材料（ingredients）／レシピ（recipe）／データ（data）／アカウント（account）。
	validateSearch: v.object({
		tab: v.optional(v.picklist(settingsTabs), "inventory"),
	}),
	// 設定は、この端末の保存（localStorage）から読む。
	ssr: false,
	component: SettingsRoute,
});

// うちの人数（画面の外に置く：いつも同じ関数にして、開いたときに1回だけ読む）。
function loadHouseholdSize() {
	return getHouseholdSizeServerFn();
}

function saveHouseholdSize(householdSize: number | null) {
	return updateHouseholdSizeServerFn({ data: { householdSize } });
}

const exportDependencies: BackupExportDependencies = {
	loadRecipePage: (offset) => exportBackupRecipesServerFn({ data: { offset } }),
	loadInventory: () => exportBackupInventoryServerFn(),
	loadDictionary: () => exportBackupDictionaryServerFn(),
};

function createImportDependencies(userId: string): BackupImportDependencies {
	return {
		inspect: (publicIds) => inspectBackupServerFn({ data: { publicIds } }),
		importRecipes: (recipes) =>
			importBackupRecipesServerFn({ data: { recipes } }),
		importLinks: (recipes) =>
			importBackupRecipeLinksServerFn({ data: { recipes } }),
		replaceInventory: (items) =>
			replaceBackupInventoryServerFn({ data: { items } }),
		mergeDictionary: (entries) =>
			mergeBackupDictionaryServerFn({ data: { entries } }),
		countPendingPurchases: async () =>
			(
				await createDexieInventoryPurchaseOutboxRepository().list(
					`user:${userId}`,
				)
			).length,
	};
}

function SettingsRoute() {
	const { data: session } = useAppSession();
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: "/settings" });

	return (
		<SettingsPage
			tab={tab}
			onTabChange={(next) => navigate({ search: { tab: next }, replace: true })}
			ingredients={
				session ? (
					<IngredientDictionarySection
						loadEntries={() =>
							listIngredientDictionaryServerFn({
								data: { expectedUserId: session.user.id },
							})
						}
						runCommand={(command) =>
							manageIngredientDictionaryServerFn({
								data: { expectedUserId: session.user.id, command },
							})
						}
					/>
				) : (
					<section
						className={settingsStyles.section}
						aria-labelledby="settings-ingredients"
					>
						<h2
							className={settingsStyles.sectionTitle}
							id="settings-ingredients"
						>
							材料
						</h2>
						<p className={settingsStyles.sectionNote}>
							ログインすると、自分の材料と呼び名を登録できます。
						</p>
						<div>
							<ButtonLink to="/login">ログイン</ButtonLink>
						</div>
					</section>
				)
			}
			recipe={
				session ? (
					<section
						className={settingsStyles.section}
						aria-labelledby="settings-recipe"
					>
						<h2 className={settingsStyles.sectionTitle} id="settings-recipe">
							レシピ
						</h2>
						<HouseholdSizeSetting
							load={loadHouseholdSize}
							save={saveHouseholdSize}
						/>
					</section>
				) : undefined
			}
			data={
				session ? (
					<BackupSettingsSection
						exportDependencies={exportDependencies}
						importDependencies={createImportDependencies(session.user.id)}
					/>
				) : (
					<section
						className={settingsStyles.section}
						aria-labelledby="settings-data"
					>
						<h2 className={settingsStyles.sectionTitle} id="settings-data">
							在庫とレシピ
						</h2>
						<p className={settingsStyles.sectionNote}>
							ログインすると、在庫とレシピを、ファイルに書き出したり、読み込んだりできます。
						</p>
						<div>
							<ButtonLink to="/login">ログイン</ButtonLink>
						</div>
					</section>
				)
			}
			account={
				session ? (
					<AccountSettingsSection
						email={session.user.email}
						signOut={<SignOutButton />}
						deletion={
							session.user.handle ? (
								<AccountDeletionSection
									handle={session.user.handle}
									onRequestDeletion={async () => {
										// 確認のメールを送る。メールのリンクを開くと、削除されて、/account-deleted に移る。
										const { error } = await authClient.deleteUser({
											callbackURL: "/account-deleted",
										});

										return error === null;
									}}
								/>
							) : null
						}
					/>
				) : undefined
			}
		/>
	);
}
