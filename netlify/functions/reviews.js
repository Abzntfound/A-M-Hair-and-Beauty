export async function handler() {
  const SHEET_ID = "12Q0Kp1-K4PnA5SsMQNovmcIAKdqVJsV_BKqItwMNFy4";
  const SHEET_NAME = "Sheet1";

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${process.env.SHEETS_API_KEY}`;

  try {
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
