# Role
世界最高峰の React Native / Expo エンジニアとして、以下の要件に基づき実装を行ってください。

# Context
アプリ名「Members」の利用者情報入力フォームを実装します。
セキュリティのため、クライアントから直接RapidAPIは叩かず、GAS（Google Apps Script）をプロキシとして利用します。

# Task
以下の「テーブル定義」に基づき、3つのファイルを新規作成（または更新）してください。
1. `lib/schema/member.ts`: Zodによる厳密なバリデーションスキーマ
2. `types/member.ts`: TypeScriptの型定義（Zodから推論）
3. `app/(tabs)/create.tsx`: React Hook Form と NativeWind v4 を使用した入力フォーム画面

# テーブル定義（実装対象項目）
| 日本語名 | カラム名 | 型・制約 | 選択肢・備考 |
| :--- | :--- | :--- | :--- |
| UUID | id | string (uuid) | 自動生成 |
| 姓 / 名 | last_name / first_name | string | 必須 |
| 姓 / 名（かな） | last_name_kana / first_name_kana | string | |
| 生年月日 | birth_date | date | |
| 年齢 | age | number | |
| 電話番号 | phone_number | string | |
| 郵便番号 | postal_code | string | |
| 住所A / B | address_1 / address_2 | string | |
| 保険証 | insurance_type | enum | 国保, 社保, なし |
| 雇用形態 | employment_status | enum | 正社員, 個人事業主, フリーター, 生活保護等 |
| 暮らし | living_status | enum | 単身, シェアハウス, 実家, 同棲など |
| 障害者手帳 | disability_handbook | enum | 精神, なし |
| 通院歴 | hospital_visit_history | boolean | |
| 症状 | symptoms | text | |
| 病院名 | hospital_name | string | |
| 職業 / 職場 | occupation / workplace | string | |
| 既婚 or 未婚 | marital_status | enum | 既婚, 未婚 |
| 昨年度年収 | annual_income | number | |
| 生活保護 | is_on_welfare | boolean | |
| 過去の福祉利用 | past_welfare_usage | boolean | |
| 経緯 / 関わり | background / involvement | text | |
| 生データ | raw_data | string (json) | RapidAPIからのレスポンスをそのまま保持 |

# Implementation Requirements
- **Form**: `react-hook-form` を使用。
- **UI**: `NativeWind v4` を使い、モバイルで入力しやすい高さのある入力フィールドとカード型のUI。
- **Input Types**: 
  - boolean項目は `Switch` コンポーネントを使用。
  - Enum項目は `SegmentedControl` またはカスタムの `Select` コンポーネントを想定（モックでOK）。
- **Data Handling**: 
  - 送信時は `raw_data` フィールドに外部APIから取得したJSONを `JSON.stringify` して含める構造にすること。
  - 送信先は環境変数 `process.env.EXPO_PUBLIC_GAS_ENDPOINT` を使用。

# Security & Style
- 全てのコンポーネントは TypeScript で型安全に記述すること。
- 日本語フォントで見やすいよう、適切な間隔（padding/margin）を保つこと。
- バリデーションエラー時は、各入力の下に赤字でエラーメッセージを表示すること。