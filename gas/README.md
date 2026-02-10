# Google Apps Script（GAS）側の設定

Members アプリから呼び出す GAS のサンプルです。このフォルダの `Code.gs` を Google のスクリプトエディタにコピーして利用してください。

## 機能

| action | メソッド | 説明 |
|--------|----------|------|
| `searchPostalCode` | GET | 郵便番号で住所検索（zipcloud API）。`address_1` / `address_2` を返す |
| `submitMember` | POST | フォーム送信。スプレッドシートの「Members」シートに 1 行追記 |

## セットアップ手順

1. **スプレッドシートを用意**
   - [Google スプレッドシート](https://sheets.google.com) で新規作成（または既存のブックを開く）。

2. **スクリプトを追加**
   - メニュー「拡張機能」→「Apps Script」を開く。
   - 既定の `Code.gs` の内容を削除し、このリポジトリの `gas/Code.gs` の内容をすべて貼り付けて保存。

3. **ウェブアプリとしてデプロイ**
   - エディタで「デプロイ」→「新しいデプロイ」。
   - 種類で「ウェブアプリ」を選択。
   - 説明は任意（例: Members 用）。
   - 「次のユーザーとして実行」: **自分**。
   - 「アクセスできるユーザー」: **全員**（アプリから呼ぶため）。
   - 「デプロイ」を押し、表示される **ウェブアプリの URL** をコピー。

4. **アプリに URL を設定**
   - プロジェクトの `.env` に `EXPO_PUBLIC_GAS_ENDPOINT=<コピーしたURL>` を設定。
   - 本番（Vercel/Netlify）の環境変数にも同じ URL を設定し、ビルドし直す。

## シート名

- データの追記先シート名は `Code.gs` 先頭の `SHEET_NAME = "Members"` で変更できます。
- 初回実行時にヘッダー行がなければ自動で 1 行目にヘッダーを書き込みます。

## 郵便番号検索について

- GAS 側で [zipcloud](https://zipcloud.ibsnet.co.jp/) の API を呼び出しています。
- アプリはまず GAS の `searchPostalCode` を呼び、失敗時のみアプリ内で zipcloud にフォールバックします。GAS をデプロイしておくと、一貫して GAS 経由で検索されます。
