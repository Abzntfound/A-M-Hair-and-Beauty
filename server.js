const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://amhairandbeauty.com");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.get("/", (req, res) => {
  res.send("A&M Hair & Beauty email server is running ✅");
});

app.post("/feedback", async (req, res) => {
  try {
    const { name, email, inquiry, page } = req.body;

    if (!name || !inquiry) {
      return res.status(400).json({
        error: "Name and feedback are required."
      });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY missing");

      return res.status(500).json({
        error: "RESEND_API_KEY is missing on Render."
      });
    }

    const sendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",

      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        from: "A&M Feedback <onboarding@resend.dev>",

        to: [
          process.env.FEEDBACK_EMAIL
        ],

        subject: `New website feedback from ${name}`,

        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            
            <h2>New A&M Hair & Beauty Feedback</h2>

            <p>
              <strong>Name:</strong>
              ${name}
            </p>

            <p>
              <strong>Email:</strong>
              ${email || "Not provided"}
            </p>

            <p>
              <strong>Feedback:</strong>
            </p>

            <p>
              ${inquiry}
            </p>

            <hr>

            <p>
              <strong>Page:</strong>
              ${page || "Unknown"}
            </p>

          </div>
        `
      })
    });

    const result = await sendResponse.json();

    console.log("RESEND RESPONSE:", result);

    if (!sendResponse.ok) {
      console.error("RESEND FAILED:", result);

      return res.status(500).json({
        error: "Resend failed",
        details: result
      });
    }

    console.log("EMAIL SENT:", result);

    res.json({
      success: true,
      message: "Feedback email sent.",
      resend: result
    });

  } catch (error) {
    console.error("FEEDBACK ERROR:", error);

    res.status(500).json({
      error: "Failed to send feedback."
    });
  }
});

app.listen(PORT, () => {
  console.log(`A&M email server running on port ${PORT}`);
});
