# 小嶺霊園CRM — フロントエンド（komine-crm-frontend）

霊園・墓地の**区画管理**を中核とする CRM のフロントエンド。区画（plots）・合祀（collective-burials）・スタッフ・書類・請求/入金・在庫を扱う。

> モノレポ `komine--cemetery-crm` の一部。全体構成・データモデル・API 仕様は ルートの `CLAUDE.md` および `komine-crm-frontend/CLAUDE.md` を参照（**開発ガイドとして最も正確なのは CLAUDE.md**）。

## 技術スタック

- **Next.js 16.4**（App Router）/ **React 19** / **Node.js 24**
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**（Radix ベース）
- **React Hook Form** + **Zod**（フォーム・バリデーション）
- **Supabase Auth**（JWT、`src/contexts/auth-context.tsx`）
- **@komine/types**（バックエンドと共有する型。`file:../packages/types` 依存）
- テスト: **Jest**（ユニット）/ **Playwright**（E2E）

バックエンドは別リポジトリ（Express + Prisma + PostgreSQL, port 4000）。フロントは REST（Bearer JWT）で連携する。

## セットアップ

```bash
# 1. 共有型パッケージをビルド（初回・型変更時に必要）
cd ../packages/types && npm install && npm run build

# 2. フロントエンドの依存をインストール
cd ../../komine-crm-frontend && npm install

# 3. 環境変数を設定（.env.local を作成。下記「環境変数」参照）
```

`@komine/types` は `node_modules/@komine/types` → `../../packages/types` のシンボリックリンクで解決される。型を変更したら `packages/types` で `npm run build` を実行すれば、リンク経由で即反映される。

### 環境変数（`.env.local`）

| 変数 | 説明 | 既定 |
|------|------|------|
| `NEXT_PUBLIC_API_URL` | バックエンド URL | `http://localhost:4000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | — |

API 未接続時はモックデータにフォールバックする（`src/lib/api/client.ts` の `shouldUseMockData`）。

## 開発コマンド

```bash
npm run dev            # 開発サーバー（http://localhost:3000）
npm run build          # 本番ビルド（next.config.ts は ignoreBuildErrors: true）
npm start              # 本番サーバー起動
npm run lint           # ESLint
npm test               # Jest ユニットテスト
npm run test:watch     # Jest watch
npm run test:e2e       # Playwright E2E
npm run test:e2e:ui    # Playwright UI モード
```

## 画面構成（App Router）

| パス | 画面 | 説明 |
|------|------|------|
| `/` | ログイン | Supabase Auth |
| `/plots` | 台帳問い合わせ | 区画一覧（検索・ページネーション） |
| `/plots/[id]` | 区画詳細 | 関連データを含む区画詳細・編集 |
| `/collective-burials` | 合祀管理 | 合祀の管理 |
| `/staff` | スタッフ管理 | スタッフ一覧 |
| `/dashboard` | ダッシュボード | 概況 |

## 主要な実装パターン

- **API クライアント**: `src/lib/api/`（`plots.ts` が中心。`@komine/types` を使用、モック切替対応）
- **マスタ**: `src/hooks/useMasters.ts`（全マスタをキャッシュ取得）/ `src/lib/api/masters.ts`
- **区画フォーム**: `src/components/plot-form/`（BasicInfo / WorkBilling / Contacts / BurialInfo / History の多タブ）
- **データ取得フック**: `useAsyncData`（単発）/ `useAsyncList`（ページング）
- **UI コンポーネント**: `src/components/ui/`（shadcn/ui）
- **認証**: `src/contexts/auth-context.tsx`（Supabase）

## レスポンシブ方針

モバイルファースト。最小サポートは **iPhone SE（375px幅）**。`sm:`/`md:`/`lg:` で段階的に拡張する。詳細は `CLAUDE.md` の「レスポンシブデザイン」セクション参照。

## ディレクトリ概要

```
src/
├── app/              # App Router（ルーティング・ページ）
├── components/       # 画面・フォーム・UI コンポーネント
│   ├── plot-form/    # 区画の多タブフォーム
│   └── ui/           # shadcn/ui
├── contexts/         # 認証等の React Context
├── hooks/            # データ取得・マスタ等のフック
├── lib/
│   ├── api/          # バックエンド API クライアント（@komine/types 使用）
│   └── validations/  # Zod スキーマ
└── types/            # フロント固有の型・定数
```

## 関連リポジトリ

| Repo | URL |
|------|-----|
| Backend | https://github.com/zaitsu82/komine-crm-backend |
| Types | https://github.com/zaitsu82/komine-types |
| Docs | https://github.com/zaitsu82/komine-docs |

課題管理は各リポジトリの GitHub Issues。
