# 🚶 ウォーキングコース提案アプリ

現在地からあなただけの散歩道を見つけよう。自然・歴史・街歩きの3コースを完全無料で提案します。

## 特徴

- **完全無料** — 使用するAPIはすべて無料（OpenStreetMap / OSRM / Nominatim）
- **APIキー不要** — 設定ゼロで起動できます
- **PWA対応** — スマートフォンのホーム画面に追加可能
- **地図アプリ連携** — Google Maps / Apple Maps でそのままナビ開始

## 技術スタック

| 役割 | 技術 |
|------|------|
| フレームワーク | Next.js 14 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| 地図 | Leaflet.js + OpenStreetMap |
| スポット取得 | Overpass API (OSM) |
| ルート計算 | OSRM Public API |
| ジオコーディング | Nominatim (OSM) |
| ホスティング | Vercel (無料) |

## セットアップ

```bash
# 1. 依存関係インストール
npm install

# 2. 環境変数設定（そのまま使えます、変更不要）
cp .env.local .env.local   # すでに存在します

# 3. 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## Vercel へのデプロイ

```bash
# Vercel CLI をインストール
npm i -g vercel

# デプロイ
vercel
```

環境変数の設定は不要です（有料APIを一切使用しないため）。

## ディレクトリ構成

```
walking-course-app/
├── app/
│   ├── page.tsx                  # ホーム（検索UI）
│   ├── courses/[id]/page.tsx     # コース詳細
│   ├── api/courses/route.ts      # コース生成APIエンドポイント
│   └── layout.tsx / globals.css
├── components/
│   ├── LocationPicker.tsx        # 位置情報取得
│   ├── DurationSelector.tsx      # 時間選択ボタン
│   ├── CourseCard.tsx            # コース一覧カード
│   ├── CourseMap.tsx             # Leaflet地図（SSR無効化）
│   ├── CheckpointList.tsx        # チェックポイント一覧
│   ├── MapAppButtons.tsx         # Google/Apple Maps連携
│   └── ShareButton.tsx           # シェアボタン
├── lib/
│   ├── overpass.ts               # Overpass APIクライアント
│   ├── nominatim.ts              # Nominatim ジオコーディング
│   ├── osrm.ts                   # OSRMルート計算
│   ├── course-generator.ts       # ルールベースコース生成
│   ├── course-templates.ts       # コース名・説明テンプレート
│   └── utils.ts                  # ユーティリティ
├── types/course.ts               # 型定義
└── public/manifest.json          # PWAマニフェスト
```

## 注意事項

- **Nominatim**: 利用規約により1リクエスト/秒の制限あり。大規模トラフィックには注意。
- **OSRM Public API**: 個人・開発用途向け。商用・大規模利用時は自己ホストを検討。
- **Leaflet**: Next.js App RouterでSSRエラーが出るため `dynamic(() => import(...), { ssr: false })` で読み込んでいます。

## ライセンス

MIT
