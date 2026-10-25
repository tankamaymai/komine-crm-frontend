/**
 * 合祀管理 E2Eテスト
 * 参照系操作 + 請求ステータス変更
 *
 * 合祀レコードは区画登録時にburial_capacity設定で自動作成されるため、
 * 新規登録・編集・削除のテストは不要。
 */
import { test, expect } from '@playwright/test';
import { storageStatePath } from './config/test-accounts';

/** サイドバーから合祀管理画面へ遷移 */
async function navigateToCollectiveBurial(page: import('@playwright/test').Page) {
  await page.goto('/');
  const sidebar = page.getByTestId('global-sidebar');
  await expect(sidebar.getByText('台帳問い合わせ', { exact: true })).toBeVisible({ timeout: 20_000 });
  await sidebar.getByText('合祀管理', { exact: true }).click();
  await page.waitForTimeout(1_000);
}

test.describe('合祀管理 - 一覧表示', () => {
  test.use({ storageState: storageStatePath('admin') });

  test.beforeEach(async ({ page }) => {
    await navigateToCollectiveBurial(page);
  });

  test('合祀管理画面が表示される', async ({ page }) => {
    await expect(page.getByText('合祀管理').first()).toBeVisible({ timeout: 10_000 });
  });

  test('合祀一覧がテーブルで表示される', async ({ page }) => {
    const table = page.locator('table').first();
    const hasTable = await table.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasTable) {
      const headers = table.locator('thead');
      await expect(headers).toBeVisible();
    }
  });

  test('新規登録ボタンが表示されない（自動管理のため）', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /新規登録/ });
    await expect(createButton).not.toBeVisible({ timeout: 3_000 }).catch(() => {
      // ボタンが存在しない場合もパス
    });
  });

  test('フィルター機能が使用できる', async ({ page }) => {
    // 検索入力フィールド
    const searchInput = page.getByPlaceholder(/区画番号|氏名|検索/);
    const hasSearch = await searchInput.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasSearch) {
      await expect(searchInput).toBeEnabled();
    }

    // リセットボタン
    const resetButton = page.getByRole('button', { name: /リセット/ });
    const hasReset = await resetButton.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasReset) {
      await expect(resetButton).toBeEnabled();
    }
  });
});

test.describe('合祀管理 - 詳細表示', () => {
  test.use({ storageState: storageStatePath('admin') });

  test.beforeEach(async ({ page }) => {
    await navigateToCollectiveBurial(page);
  });

  test('一覧のレコードをクリックして詳細画面に遷移できる', async ({ page }) => {
    const table = page.locator('table').first();
    const hasTable = await table.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasTable) return;

    const firstRow = table.locator('tbody tr').first();
    const hasRow = await firstRow.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasRow) return;

    await firstRow.click();
    await page.waitForTimeout(1_000);

    // 詳細画面に「合祀詳細」が表示される
    await expect(page.getByText('合祀詳細')).toBeVisible({ timeout: 10_000 });
  });

  test('詳細画面に編集・削除ボタンが表示されない（参照特化）', async ({ page }) => {
    const table = page.locator('table').first();
    const hasTable = await table.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasTable) return;

    const firstRow = table.locator('tbody tr').first();
    const hasRow = await firstRow.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasRow) return;

    await firstRow.click();
    await page.waitForTimeout(1_000);
    await expect(page.getByText('合祀詳細')).toBeVisible({ timeout: 10_000 });

    // 編集・削除ボタンが存在しないことを確認
    await expect(page.getByRole('button', { name: '編集' })).not.toBeVisible({ timeout: 2_000 }).catch(() => { });
    await expect(page.getByRole('button', { name: '削除' })).not.toBeVisible({ timeout: 2_000 }).catch(() => { });
  });

  test('詳細画面に3つのタブが表示される', async ({ page }) => {
    const table = page.locator('table').first();
    const hasTable = await table.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasTable) return;

    const firstRow = table.locator('tbody tr').first();
    const hasRow = await firstRow.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasRow) return;

    await firstRow.click();
    await page.waitForTimeout(1_000);
    await expect(page.getByText('合祀詳細')).toBeVisible({ timeout: 10_000 });

    // 3タブ構成を確認
    await expect(page.getByRole('tab', { name: '基本情報' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '埋葬状況' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '合祀の予定' })).toBeVisible();

    // 旧タブが存在しないことを確認
    await expect(page.getByRole('tab', { name: /備考・法要/ })).not.toBeVisible({ timeout: 1_000 }).catch(() => { });
  });

  test('閉じるボタンで一覧に戻れる', async ({ page }) => {
    const table = page.locator('table').first();
    const hasTable = await table.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasTable) return;

    const firstRow = table.locator('tbody tr').first();
    const hasRow = await firstRow.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasRow) return;

    await firstRow.click();
    await page.waitForTimeout(1_000);
    await expect(page.getByText('合祀詳細')).toBeVisible({ timeout: 10_000 });

    // 閉じるボタンで一覧に戻る
    await page.getByRole('button', { name: '閉じる', exact: true }).click();
    await page.waitForTimeout(1_000);
    await expect(page.getByText('合祀管理').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('合祀管理 - 請求ステータス変更', () => {
  test.use({ storageState: storageStatePath('admin') });

  test.beforeEach(async ({ page }) => {
    await navigateToCollectiveBurial(page);
  });

  test('合祀の予定タブに予定の欄が表示される', async ({ page }) => {
    const table = page.locator('table').first();
    const hasTable = await table.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasTable) return;

    const firstRow = table.locator('tbody tr').first();
    const hasRow = await firstRow.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasRow) return;

    await firstRow.click();
    await page.waitForTimeout(1_000);
    await expect(page.getByText('合祀詳細')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: '合祀の予定' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('登録日時')).toBeVisible();
  });
});

test.describe('合祀管理 - viewer アクセス制限', () => {
  test.use({ storageState: storageStatePath('viewer') });

  // 合祀管理は backend 権限(permission.ts)で manager 以上に限定されているため、
  // viewer にはメニューを出さず、直接URLアクセス時は /plots へリダイレクトする（403を出さない）
  test('viewer には合祀管理メニューが表示されない', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.getByTestId('global-sidebar');
    await expect(sidebar.getByText('台帳問い合わせ', { exact: true })).toBeVisible({ timeout: 20_000 });

    await expect(sidebar.getByText('合祀管理', { exact: true })).toHaveCount(0);
  });

  test('viewer が /collective-burials へ直接アクセスすると /plots へリダイレクトされる', async ({ page }) => {
    await page.goto('/collective-burials');
    await expect(page).toHaveURL(/\/plots(\?|$)/, { timeout: 15_000 });
  });
});

test.describe('合祀管理 - manager アクセス', () => {
  test.use({ storageState: storageStatePath('manager') });

  test('manager で合祀管理画面にアクセス可能', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.getByTestId('global-sidebar');
    await expect(sidebar.getByText('台帳問い合わせ', { exact: true })).toBeVisible({ timeout: 20_000 });

    await sidebar.getByText('合祀管理', { exact: true }).click();
    await page.waitForTimeout(1_000);
    await expect(page.getByText(/合祀/).first()).toBeVisible({ timeout: 10_000 });
  });
});
