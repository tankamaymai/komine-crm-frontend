# syntax=docker/dockerfile:1
# ============================================
# Stage 0: Build @komine/types
# ============================================
FROM node:24-alpine AS types

RUN apk add --no-cache git

WORKDIR /packages/types

# TYPES_REF: ビルドする @komine/types の git ref (commit SHA 固定)
# backend の Dockerfile と同方式（zaitsu82/komine-crm-backend#60 参照）。
# セキュリティ: main 追従だとリポジトリ汚染が即本番到達するため、commit SHA で固定。
# types 更新時はこの値を明示的に更新する。
ARG TYPES_REF=1f84838347e11271896188c799315a3cc703bc8b

RUN git clone https://github.com/zaitsu82/komine-types.git . && \
    git checkout ${TYPES_REF} && \
    npm ci && \
    npm install zod@4.6.7 && \
    npm run build

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:24-alpine AS deps

WORKDIR /app

# npm_config_install_links: file:依存（@komine/types）を常に実体コピーで解決する
# （backend Dockerfile と同方式。詳細: zaitsu82/komine-crm-backend#60）
ENV npm_config_install_links=true

# @komine/types パッケージを配置（file:../packages/types の解決用）
COPY --from=types /packages/types /packages/types

COPY package*.json ./
RUN npm ci

# ============================================
# Stage 2: Build
# ============================================
FROM node:24-alpine AS builder

WORKDIR /app

ENV npm_config_install_links=true
COPY --from=types /packages/types /packages/types
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* はビルド時にクライアントコードへ埋め込まれる。
# デプロイ先ごとに --build-arg で渡す（値を変えたら再ビルドが必要）。
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ============================================
# Stage 3: Production (next.config.ts の output: 'standalone' を使用)
# ============================================
FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# next/image の本番画像最適化に sharp が必要（standalone 出力には含まれないため個別導入）
RUN npm install --no-save --no-package-lock sharp

# セキュリティ: non-root ユーザーで実行
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs nextjs

# standalone サーバ + 静的アセット + public を配置
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
