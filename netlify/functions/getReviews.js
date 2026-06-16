export async function handler() {
  try {
    const SHEET_ID = "12Q0Kp1-K4PnA5SsMQNovmcIAKdqVJsV_BKqItwMNFy4";
    const SHEET_NAME = "Sheet1";
    const API_KEY = process.env.SHEETS_API_KEY;

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.toString() })
    };
  }
}
