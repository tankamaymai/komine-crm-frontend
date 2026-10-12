# 区画図のマスを動かす・保存する 実装計画

> 設計: `docs/superpowers/specs/2026-10-12-plot-map-drag-design.md`

**Goal:** 区画図で、空白をつかんでスクロールし、マスを空白マスへ移し、「修正を保存」で全員の区画図に残す。

**Architecture:** Excel 由来の配置（`generated-layouts.ts`）はそのまま。backend の `plot_map_cell_positions` に「元の行・列 → 新しい行・列」を区ごとに保存し、画面で元の配置に重ねる。画面は区画図の下書きを持ち、保存時に元の配置との差分だけを送る。

**Tech Stack:** Express + Prisma + zod + Jest（backend）、Next.js + React + Testing Library + Jest（frontend）。ドラッグは Pointer Events。

## Global Constraints

- マスの目印は元の行・列。番号は確認用（同じ番号が複数ある区がある）。
- 移せるのは区画図の中の空白マスだけ。入れ替えはしない。
- 権限: viewer / operator / manager / admin。
- 保存は区ごとの丸ごと置き換え（後から保存した人の並びになる）。

---

### Task 1: backend 保存テーブルとサービス

**Files:**
- Modify: `komine-crm-backend/prisma/schema.prisma`
- Create: `komine-crm-backend/prisma/migrations/20261012120000_add_plot_map_cell_positions/migration.sql`
- Create: `komine-crm-backend/src/plots/services/plotMapPositionService.ts`
- Test: `komine-crm-backend/tests/plots/services/plotMapPositionService.test.ts`

**Produces:**
- `interface PlotMapCellPosition { originRow: number; originCol: number; plotLabel: string; row: number; col: number }`
- `getPlotMapPositions(prisma, mapId): Promise<PlotMapCellPosition[]>`
- `replacePlotMapPositions(prisma, { mapId, positions, staffId }): Promise<PlotMapCellPosition[]>`（1 トランザクションで deleteMany → createMany）

### Task 2: backend 入力チェック・API

**Files:**
- Modify: `komine-crm-backend/src/validations/plotMapValidation.ts`（`plotMapPositionsBodySchema`）
- Modify: `komine-crm-backend/src/plots/controllers/getPlotMap.ts`（`positions` を返す）
- Create: `komine-crm-backend/src/plots/controllers/putPlotMapPositions.ts`
- Modify: `komine-crm-backend/src/plots/controllers/index.ts`, `komine-crm-backend/src/plots/plotRoutes.ts`（`PUT /plots/inventory/map/positions`）
- Test: `komine-crm-backend/tests/plots/plotMapPositions.test.ts`

### Task 3: frontend 配置の計算

**Files:**
- Modify: `komine-crm-frontend/src/lib/plot-maps/types.ts`（`PlotMapCellPosition`、`PlotMapLayoutCell` に `originRow` / `originCol` は持たせず、別の `PlotMapPlacedCell` を足す）
- Create: `komine-crm-frontend/src/lib/plot-maps/positions.ts`
- Test: `komine-crm-frontend/src/__tests__/lib/plot-maps/positions.test.ts`

**Produces:**
- `interface PlotMapPlacedCell extends PlotMapLayoutCell { originRow: number; originCol: number }`
- `placeCells(definition, positions): PlotMapPlacedCell[]` 保存済みの場所を重ねる（範囲外・番号違い・重なりは元の場所）
- `canDropAt(cells, definition, origin, target): boolean`
- `moveCell(cells, origin, target): PlotMapPlacedCell[]`
- `toPositions(cells): PlotMapCellPosition[]` 元の場所と違うマスだけ
- `layoutSignature(cells): string` 未保存かどうかの比較用

### Task 4: frontend API とフック

**Files:**
- Modify: `komine-crm-frontend/src/lib/api/plot-map.ts`（`positions` 受け取り、`savePlotMapPositions`）
- Modify: `komine-crm-frontend/src/hooks/usePlotMap.ts`（`positions`、`savePositions`、`isSaving`）

### Task 5: frontend 区画図の画面

**Files:**
- Modify: `komine-crm-frontend/src/lib/plot-maps/overlay.ts`（`overlayLayoutWithPlots` が `originRow` / `originCol` を引き継ぐ）
- Modify: `komine-crm-frontend/src/components/plot-map/PlotSectionMap.tsx`
- Modify: `komine-crm-frontend/src/components/plot-map/PlotMapSection.tsx`
- Modify: `komine-crm-frontend/src/components/plot-availability-management.tsx`（未保存のまま閉じる・別の区を開くときの確認）
- Test: `komine-crm-frontend/src/__tests__/components/plot-map/plot-section-map.test.tsx`

### Task 6: 確認

- backend: `npx prisma generate`、`npx jest tests/plots`、`npx tsc --noEmit`、`npm run lint`
- frontend: `npx jest src/__tests__/lib/plot-maps src/__tests__/components/plot-map`、`npx tsc --noEmit`、`npm run lint`
- ブラウザ（モックデータ）で、空白ドラッグ・マス移動・置けない場所・保存・戻す・閉じる確認を目で見る
