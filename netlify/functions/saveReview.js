export async function handler(event) {
  try {
    const body = JSON.parse(event.body || '{}');

    // TEMP TEST RESPONSE (to confirm it works)
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        received: body
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.toString()
      })
    };
  }
}
