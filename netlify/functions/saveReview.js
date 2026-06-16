export async function handler(event) {
  const body = JSON.parse(event.body);

  const url = process.env.APPS_SCRIPT_URL;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}
