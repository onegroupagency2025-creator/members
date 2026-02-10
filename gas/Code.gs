/**
 * Members アプリ用 Google Apps Script
 * - GET ?action=searchPostalCode&postal_code=XXXXXXX … 郵便番号で住所検索（zipcloud API）
 * - POST ?action=submitMember … フォーム送信（スプレッドシートに追記）
 *
 * デプロイ: エディタで「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 * 実行ユーザー: 自分、アクセス: 全員
 */

const SHEET_NAME = "Members";

function doGet(e) {
  const params = e?.parameter || {};
  const action = params.action;
  const out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);

  try {
    if (action === "searchPostalCode") {
      const postalCode = (params.postal_code || "").replace(/\D/g, "");
      if (postalCode.length !== 7) {
        return respondJson(out, 200, { ok: false, error: "郵便番号は7桁で入力してください。" });
      }
      const result = searchPostalCode(postalCode);
      return respondJson(out, 200, result);
    }

    respondJson(out, 400, { ok: false, error: "不明な action です。" });
  } catch (err) {
    respondJson(out, 500, { ok: false, error: err.message || "サーバーエラー" });
  }
  return out;
}

function doPost(e) {
  const out = ContentService.createTextOutput();
  out.setMimeType(ContentService.MimeType.JSON);

  try {
    const params = e?.parameter || {};
    const action = params.action;

    if (action === "submitMember") {
      let payload = {};
      if (e.postData && e.postData.contents) {
        try {
          payload = JSON.parse(e.postData.contents);
        } catch (parseErr) {
          return respondJson(out, 400, { ok: false, error: "JSON の形式が不正です。" });
        }
      }
      const result = submitMember(payload);
      return respondJson(out, 200, result);
    }

    return respondJson(out, 400, { ok: false, error: "不明な action です。" });
  } catch (err) {
    return respondJson(out, 500, { ok: false, error: err.message || "サーバーエラー" });
  }
}

/**
 * 郵便番号検索（zipcloud API を GAS から呼び出し）
 */
function searchPostalCode(postalCode) {
  const url = "https://zipcloud.ibsnet.co.jp/api/search?zipcode=" + encodeURIComponent(postalCode);
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const data = JSON.parse(res.getContentText());

  const results = data.results;
  if (!results || results.length === 0) {
    return { ok: false, error: "該当する住所が見つかりません。" };
  }

  const r = results[0];
  const address1 = (r.address1 || "") + (r.address2 || "");
  const address2 = r.address3 || "";
  return {
    ok: true,
    address_1: address1,
    address_2: address2,
  };
}

/**
 * 会員データをスプレッドシートに追記
 */
function submitMember(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(SHEET_NAME);
  }

  const headers = [
    "id", "last_name", "first_name", "last_name_kana", "first_name_kana",
    "birth_date", "age", "phone_number", "postal_code", "address_1", "address_2",
    "insurance_type", "employment_status", "living_status", "disability_handbook",
    "hospital_visit_history", "symptoms", "hospital_name", "occupation", "workplace",
    "marital_status", "annual_income", "is_on_welfare", "past_welfare_usage",
    "background", "involvement", "raw_data"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  const row = headers.map(function (key) {
    const v = payload[key];
    return v === undefined || v === null ? "" : v;
  });
  sheet.appendRow(row);

  return { ok: true };
}

function respondJson(output, statusCode, obj) {
  output.setContent(JSON.stringify(obj));
  return output;
}
