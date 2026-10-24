# CLAUDE.md

## 必読（共通ルール）

作業前にリポジトリ直下の **`AGENTS.md` を必ず読むこと**（Codex / Cursor と共有）。

**ファイルを編集する前に** `AGENTS.md` の「変更前ゲート」に従い、作業ブランチを切ること。main 直編集は禁止。完了後は PR → マージまで行う（commit / push / PR はユーザー依頼時）。

小嶺霊園CRM フロントエンドプロジェクトのガイド

## プロジェクト概要

Next.js 16 + React 19 + TypeScript で構築されたCRMフロントエンド。Node.js 24 で動かす。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **実行環境**: Node.js 24
- **UI**: React 19, Tailwind CSS, Radix UI
- **状態管理**: React Context + カスタムフック
- **フォーム**: React Hook Form + Zod
- **テスト**: Jest, Playwright

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start

# テスト
npm test
npm run test:watch
npm run test:ci

# E2Eテスト
npm run test:e2e
npm run test:e2e:ui

# Lint
npm run lint
```

## ディレクトリ構造

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # ホーム（ログイン）
│   ├── dashboard/         # ダッシュボード
│   ├── plots/             # 区画管理
│   ├── collective-burials/# 合祀管理
│   └── staff/             # スタッフ管理
├── components/
│   ├── ui/                # 共通UIコンポーネント
│   ├── layout/            # レイアウトコンポーネント
│   └── [feature]/         # 機能別コンポーネント
├── contexts/              # React Context
│   └── auth-context.tsx   # 認証コンテキスト
├── hooks/                 # カスタムフック
│   ├── useAsyncData.ts   # 非同期データ取得
│   └── useAsyncList.ts   # ページネーション付きリスト
├── lib/                   # ユーティリティ
│   ├── api/              # APIクライアント（plots.ts, auth.ts, masters.ts等）
│   ├── validations/      # Zodスキーマ（plot-form.ts）
│   └── utils.ts          # 共通ユーティリティ
├── config/               # 設定
│   └── api.ts            # API設定
└── types/                # 型定義
    └── index.ts          # 共通型
```

## 主要画面

| パス | 画面 | 説明 |
|------|------|------|
| `/` | ログイン | Supabase認証 |
| `/dashboard` | ダッシュボード | 概要表示 |
| `/plots` | 台帳問い合わせ | 区画一覧・検索 |
| `/plots/[id]` | 区画詳細 | 顧客・契約情報 |
| `/collective-burials` | 合祀管理 | 合祀一覧・登録 |
| `/staff` | スタッフ管理 | スタッフ一覧 |

## API連携

### 設定

```typescript
// src/config/api.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
```

### APIクライアント

```typescript
// src/lib/api.ts
import { API_BASE_URL } from '@/config/api';

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  });
  return response.json();
}
```

## 認証

Supabase Auth を使用。`auth-context.tsx`で認証状態を管理。

```typescript
// 使用例
const { user, login, logout, isAuthenticated } = useAuth();
```

## コンポーネント設計

### 共通UIコンポーネント（src/components/ui/）

- `Button` - ボタン
- `Input` - 入力フィールド
- `Select` - セレクトボックス
- `Dialog` - モーダルダイアログ
- `Table` - テーブル
- `Tabs` - タブ
- `StatCard` - KPI/統計値表示カード（`theme`: matsu/cha/ai/kohaku/beni/sumi）
- `EmptyState` - データ0件時の空状態表示（icon + title + description + action）
- `StatusBadge` - 支払い/契約/区画状態バッジ（色+パターン記号で色覚対応）
- `PageSection` - セクション見出し+コンテンツの統一レイアウト

### デザインシステム（カラー・タイポグラフィ）

#### 和モダンカラートークン

全トークンは`globals.css`でCSS変数として定義、`tailwind.config.ts`で参照。ライト/ダークモード自動切替。

| トークン | 用途 | 例 |
|---|---|---|
| `matsu`（松葉） | プライマリ（主要アクション） | `bg-matsu`（ボタン）、`text-matsu`（リンク） |
| `cha`（茶） | セカンダリ | `bg-cha-50 border-cha-200`（情報カード） |
| `ai`（藍） | アクセント・情報系 | 情報タイプバッジ、リンク強調 |
| `kohaku`（琥珀） | 警告・未完了 | 「未入金」「要対応」 |
| `beni`（紅） | エラー・破壊的操作 | 「滞納」「削除」 |
| `sumi`（墨） | テキスト（本文） | `text-sumi` |
| `hai`（灰） | テキスト（補足・muted） | `text-hai` |
| `gin`（銀） | ボーダー | `border-gin` |
| `shiro`（白） | カード背景 | `bg-shiro`、`bg-white` |
| `kinari`（生成） | muted背景 | `bg-kinari` |

**shadcn互換エイリアス**（新規shadcn系コンポーネント用）: `card` / `muted` / `input` / `ring` / `destructive` など

#### 使用ルール

- **Tailwind標準色（`gray-*`/`red-*`/`green-*`等）は極力使わない**。既存の和モダントークンに置き換える（既存コードで混在しているのは徐々に置換）
- **状態色は `StatusBadge` 経由**で表現する。生の `bg-red-*` 等を直接使わない
- **新規コンポーネントは `StatCard` / `EmptyState` / `StatusBadge` / `PageSection` を再利用**してスタイルを統一

#### タイポグラフィ

| 種類 | Tailwindクラス | 用途 |
|---|---|---|
| 明朝 | `font-mincho` | 見出し（h1〜h3）、タイトル |
| ゴシック（デフォルト） | `font-sans` | 本文・ラベル |
| 等幅数字 | `tabular-nums` | 金額・数値（ゼロ幅揃え） |

ルール:
- **明朝は見出しのみ**。本文で使うと可読性低下
- **数値は必ず `tabular-nums`** を付ける（特にテーブルのカラム揃え）
- フォントサイズはモバイルベース（`text-xs` → `md:text-sm` のように段階的に）

### カスタムフック

```typescript
// useAsyncData - 単一データ取得
const { data, isLoading, error, refetch } = useAsyncData(() => fetchPlot(id));

// useAsyncList - ページネーション付きリスト
const { items, total, page, setPage, isLoading } = useAsyncList(fetchPlots);
```

## 環境変数

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## コーディング規約

- **命名**: camelCase（変数・関数）、PascalCase（コンポーネント・型）
- **インポート順**: React → 外部ライブラリ → 内部モジュール
- **コンポーネント**: 関数コンポーネント + TypeScript

## レスポンシブデザイン

UI改修時は必ずレスポンシブデザインに対応すること。最小サポート端末は **iPhone SE（375px幅）**。

### PC専用画面（DesktopOnlyGate 適用）

操作系の以下7画面は **画面幅 768px 未満では PC 推奨ガード画面に置き換える**（`DesktopOnlyGate` コンポーネントでラップ）。スマホ閲覧ニーズが薄く、375px で UI が破綻するため。

| Route | 用途 |
|---|---|
| `/plots/new` | 区画新規作成 |
| `/plots/[id]/edit` | 区画編集 |
| `/plots/[id]/documents/create` | 書類作成 |
| `/plots/[id]/documents` | 書類履歴（区画コンテキスト） |
| `/documents` | 書類発行・一覧 |
| `/masters` | マスタ管理 |
| `/staff` | スタッフ管理 |
| `/yucho` | ゆうちょ連携（CSV出力） |

これ以外（`/plots`, `/plots/[id]`, `/collective-burials`, `/plot-availability`, `/profile`, `/login` 等）はモバイル対応必須。


### ブレークポイント（Tailwind CSS）

| プレフィックス | 幅 | 用途 |
|---|---|---|
| (なし) | 0px〜 | モバイル（iPhone SE 375px をベース） |
| `sm:` | 640px〜 | 大きめスマホ・小タブレット |
| `md:` | 768px〜 | タブレット |
| `lg:` | 1024px〜 | デスクトップ |

### モバイル対応ルール

- **モバイルファースト**: デフォルトスタイルは375px幅で横スクロールが出ないように書き、`sm:`/`md:`/`lg:`で拡張する
- **テーブル**: カラム数が多い場合は `hidden sm:table-cell` / `hidden md:table-cell` で段階的に非表示にする。モバイルでは主要3〜4カラムのみ表示
- **パディング**: `p-3 md:p-6`、`px-2 md:px-4` のようにモバイルで小さく、デスクトップで広く
- **フォントサイズ**: `text-xs md:text-sm`、`text-base md:text-xl` のように段階的に
- **サイドバー**: モバイルではオーバーレイドロワー（`-translate-x-full md:translate-x-0`）で実装済み
- **ダイアログ**: モバイルでは下からスライドアップするシートスタイル（BaseDialog実装済み）
- **フィルター/検索**: モバイルで不要な高度なフィルター（あいうえおタブ等）は `hidden md:block` で非表示にし、検索バーで代替可能にする
- **グリッド**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` のように段階的にカラム数を増やす
- **固定ヘッダー**: PageHeaderのみ固定。フィルター・検索エリアはスクロール領域に含める

## テスト

### ユニットテスト（Jest）

```bash
npm test
npm run test:watch
```

### E2Eテスト（Playwright）

```bash
npm run test:e2e
npm run test:e2e:ui
```

## データモデル（区画ベース）

システムは**区画（Plot）を中心**に設計。顧客中心ではない。

```
PhysicalPlot (物理区画)
  ↓ 1:N
ContractPlot (契約区画)
  ↓ 1:1
SaleContract (販売契約)
  ↓ N:M via roles
Customer (顧客 — 申込者・契約者)
```

### 主要モジュール

- `src/lib/api/plots.ts` — 区画APIクライアント（@komine/types使用）
- `src/components/plot-form/` — 区画フォーム（BasicInfo, WorkBilling, Contacts, BurialInfo, History）
- `src/lib/validations/plot-form.ts` — Zodバリデーション
- `src/components/plot-registry/` — 区画一覧（テーブル・フィルタ・モバイルカード）
- `src/components/plot-detail-view.tsx` — 区画詳細表示

---

## トラブルシューティング

### CORS エラー

バックエンドの`ALLOWED_ORIGINS`にフロントエンドURLを追加。

### 認証エラー

1. Supabase環境変数を確認
2. トークンの有効期限を確認
3. バックエンドのSupabase設定を確認

### ビルドエラー

```bash
rm -rf .next node_modules
npm install
npm run build
```
