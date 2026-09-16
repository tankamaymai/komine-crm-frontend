/**
 * 主要画面の smoke E2Eテスト（#140）
 *
 * これまで専用 E2E が無かった画面について、認証後にルートへ遷移し
 * ページが（バックエンド無しのモックモードでも）クラッシュせず主要な
 * 見出しを描画することを確認する。表示確認中心の軽量テスト。
 *
 * - すべて admin の storageState を使用（/masters は admin 限定のため）
 * - viewport は 1280x720（playwright.config.ts）のため DesktopOnlyGate は発動しない
 * - /payments は未実装ルートのためスコープ外
 * - /yucho は API モック未実装だが、PageHeader は取得結果に依存せず描画され、
 *   データ取得は useAsyncData がエラーを握るため、見出しの表示のみ確認する
 */
import { test, expect } from '@playwright/test';
import { storageStatePath } from './config/test-accounts';

test.describe('主要画面 smoke（#140）', () => {
  test.use({ storageState: storageStatePath('admin') });

  const TIMEOUT = 20_000;

  test('140-1: 区画残数管理が表示される', async ({ page }) => {
    await page.goto('/plot-availability');
    await expect(page.getByText('区画残数管理').first()).toBeVisible({ timeout: TIMEOUT });
  });

  test('140-2: 書類管理（一覧/テンプレート）が表示される', async ({ page }) => {
    await page.goto('/documents');
    await expect(page.getByText('書類管理').first()).toBeVisible({ timeout: TIMEOUT });
  });

  test('140-3: 区画別書類が表示される', async ({ page }) => {
    await page.goto('/plots/mock-plot-1/documents');
    // 顧客名ありなら「○○ 様の書類」、無ければ「書類管理」。いずれも「書類」を含む
    await expect(page.getByText(/書類/).first()).toBeVisible({ timeout: TIMEOUT });
  });

  test('140-4: マスタ管理（admin）が表示される', async ({ page }) => {
    await page.goto('/masters');
    await expect(page.getByText('マスタ管理').first()).toBeVisible({ timeout: TIMEOUT });
  });

  test('140-5: アカウント設定（プロフィール）が表示される', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('アカウント設定').first()).toBeVisible({ timeout: TIMEOUT });
  });

  test('140-6: ゆうちょ連携の見出しが表示される', async ({ page }) => {
    await page.goto('/yucho');
    await expect(page.getByText('ゆうちょ連携').first()).toBeVisible({ timeout: TIMEOUT });
  });

  test('140-7: 請求書一括印刷の見出しと対象一覧が表示される', async ({ page }) => {
    await page.goto('/bulk-invoice');
    await expect(page.getByText('請求書一括印刷').first()).toBeVisible({ timeout: TIMEOUT });
    await expect(page.getByLabel('請求対象年')).toBeVisible({ timeout: TIMEOUT });
  });

  test('140-8: 区画詳細の請求タブから前受金ダイアログを開ける', async ({ page }) => {
    // 区画詳細に直接遷移（smoke テストは画面表示確認が主目的）
    await page.goto('/plots/mock-plot-1');
    await page.waitForTimeout(2_000);
    
    // タブ名には件数バッジが付くため部分一致で拾う
    await page.getByRole('tab', { name: /請求/ }).first().click();
    await page.getByRole('button', { name: '前受金を一括登録' }).click();
    await expect(page.getByLabel('受領額')).toBeVisible({ timeout: 10_000 });
  });

  test('140-10: 未収金一覧の見出しが表示される', async ({ page }) => {
    await page.goto('/uncollected');
    await expect(page.getByText('未収金一覧').first()).toBeVisible({ timeout: TIMEOUT });
  });
});
