# Members App

Expo (React Native) で構築した利用者登録アプリ。Web 版は静的エクスポートで Vercel / Netlify にデプロイ可能です。

## 開発

```bash
npm install
npm run web          # ブラウザで開発サーバー起動 (http://localhost:8081)
npm run build:web    # 本番用静的ビルド (dist/ に出力)
npm run serve:web    # dist/ をローカルで配信 (ビルド確認用)
```

## 本番デプロイ（URL でアプリを立ち上げる）

### ビルド

```bash
npm run build:web
```

`dist/` に静的ファイル（index.html と JS/CSS）が出力されます。

### Vercel でデプロイ

1. [Vercel](https://vercel.com) にログインし、プロジェクトをインポート（Git 連携または `vercel` CLI）。
2. ビルドコマンド・出力先は `vercel.json` の通り（`npm run build:web` / `dist`）。
3. **Environment Variables** で `EXPO_PUBLIC_GAS_ENDPOINT` に GAS の Web アプリ URL を設定。
4. デプロイ後、発行された URL（例: `https://members-xxx.vercel.app`）を開くとアプリが起動します。

CLI の場合:

```bash
npx vercel --prod
```

### Netlify でデプロイ

#### Netlify + GitHub でデプロイ（推奨）

1. **前提**: コードを GitHub リポジトリにプッシュ済みにします。
2. **Netlify でサイトを追加**: [Netlify](https://netlify.com) にログインし、「Add new site」→「Import an existing project」→「GitHub」を選択します。
3. **リポジトリを選択**: デプロイしたい GitHub リポジトリを選び、デプロイするブランチ（例: `main`）を指定します。
4. **ビルド設定の確認**: Netlify が `netlify.toml` を読み、ビルドコマンド `npm run build:web`・公開ディレクトリ `dist` と表示されることを確認します（変更不要でそのまま「Deploy site」で問題ありません）。
5. **環境変数の設定**: デプロイ後、「Site settings」→「Environment variables」で `EXPO_PUBLIC_GAS_ENDPOINT` を追加し、GAS の Web アプリ URL を設定します。設定後は「Trigger deploy」で再デプロイしてください。
6. **デプロイ**: 初回は「Deploy site」でデプロイを開始します。以降は GitHub へ push するたびに自動でデプロイされます。
7. **確認**: 発行された URL（例: `https://xxxx.netlify.app`）をブラウザで開き、アプリが起動することを確認します。

CLI の場合:

```bash
npm run build:web
npx netlify deploy --prod --dir=dist
```

### 環境変数

本番でも **EXPO_PUBLIC_GAS_ENDPOINT**（Google Apps Script の Web アプリ URL）を設定してください。ビルド時に埋め込まれるため、Vercel / Netlify のダッシュボードで環境変数を追加したうえでビルドし直します。
# members
