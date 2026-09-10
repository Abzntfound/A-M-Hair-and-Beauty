const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://amhairandbeauty.com"
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>A&M Hair & Beauty</title>
      </head>

      <body style="
        margin:0;
        background:#fff7fb;
        font-family:Arial,sans-serif;
        display:flex;
        align-items:center;
        justify-content:center;
        min-height:100vh;
      ">

        <div style="
          background:white;
          border-radius:24px;
          padding:40px;
          max-width:500px;
          text-align:center;
          box-shadow:0 20px 60px rgba(0,0,0,.08);
        ">

          <div style="
            font-size:42px;
            margin-bottom:15px;
          ">
            💗
          </div>

          <h1 style="
            margin:0 0 10px;
            color:#111;
          ">
            A&M Hair & Beauty
          </h1>

          <p style="
            color:#777;
            margin:0;
          ">
            Feedback email server is online.
          </p>

        </div>

      </body>
    </html>
  `);
});


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ==========================================
// FEEDBACK ROUTE
// ==========================================

app.post("/feedback", async (req, res) => {
  try {

    const {
      name,
      email,
      inquiry,
      page,
      viewport,
      userAgent
    } = req.body;


    // ======================================
    // VALIDATION
    // ======================================

    if (!name || !inquiry) {
      return res.status(400).json({
        error: "Name and feedback are required."
      });
    }


    if (!process.env.RESEND_API_KEY) {

      console.error("RESEND_API_KEY missing");

      return res.status(500).json({
        error: "Email configuration is missing."
      });

    }


    if (!process.env.FEEDBACK_EMAIL) {

      console.error("FEEDBACK_EMAIL missing");

      return res.status(500).json({
        error: "Feedback recipient is missing."
      });

    }


    // ======================================
    // CLEAN USER INPUT
    // ======================================

    const safeName =
      escapeHtml(name);

    const safeEmail =
      escapeHtml(email || "Not provided");

    const safeInquiry =
      escapeHtml(inquiry)
        .replace(/\n/g, "<br>");

    const safePage =
      escapeHtml(page || "Unknown");

    const safeViewport =
      escapeHtml(viewport || "Unknown");


    // ======================================
    // DATE
    // ======================================

    const submittedAt =
      new Intl.DateTimeFormat(
        "en-GB",
        {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: "Europe/London"
        }
      ).format(new Date());


    // ======================================
    // REPLY BUTTON
    // ======================================

    const replyButton = email
      ? `
        <tr>
          <td
            align="center"
            style="
              padding:10px 35px 35px;
            "
          >

            <a
              href="mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
                `Re: Your A&M Hair & Beauty enquiry`
              )}"
              style="
                display:inline-block;
                background:#111111;
                color:#ffffff;
                text-decoration:none;
                font-size:14px;
                font-weight:700;
                padding:15px 28px;
                border-radius:999px;
                letter-spacing:.2px;
              "
            >
              Reply to Customer →
            </a>

          </td>
        </tr>
      `
      : "";


    // ======================================
    // EMAIL HTML
    // ======================================

    const emailHtml = `
<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>
    New A&M Hair & Beauty Feedback
  </title>

</head>


<body
  style="
    margin:0;
    padding:0;
    background:#f8f5f7;
    font-family:Arial,Helvetica,sans-serif;
    color:#181818;
  "
>


<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  border="0"
  style="
    background:#f8f5f7;
    padding:40px 16px;
  "
>

<tr>

<td align="center">


<!-- MAIN CARD -->

<table
  role="presentation"
  width="100%"
  cellspacing="0"
  cellpadding="0"
  border="0"
  style="
    max-width:620px;
    background:#ffffff;
    border-radius:28px;
    overflow:hidden;
    box-shadow:0 20px 60px rgba(0,0,0,.08);
  "
>


<!-- BRAND HEADER -->

<tr>

<td
  style="
    padding:0;
    background:
      linear-gradient(
        135deg,
        #d946a6 0%,
        #ec4899 50%,
        #f472b6 100%
      );
  "
>

  <div
    style="
      padding:38px 38px 34px;
    "
  >

    <div
      style="
        display:inline-block;
        background:rgba(255,255,255,.18);
        color:#ffffff;
        border:1px solid rgba(255,255,255,.35);
        border-radius:999px;
        padding:7px 13px;
        font-size:11px;
        font-weight:700;
        letter-spacing:1.4px;
        text-transform:uppercase;
        margin-bottom:18px;
      "
    >
      Customer Feedback
    </div>


    <h1
      style="
        margin:0;
        color:#ffffff;
        font-size:32px;
        line-height:1.15;
        letter-spacing:-1px;
      "
    >
      New message received
    </h1>


    <p
      style="
        margin:10px 0 0;
        color:rgba(255,255,255,.9);
        font-size:15px;
        line-height:1.6;
      "
    >
      Someone has contacted A&M Hair & Beauty
      through your website.
    </p>

  </div>

</td>

</tr>



<!-- CUSTOMER DETAILS -->

<tr>

<td style="padding:34px 35px 12px;">


  <p
    style="
      margin:0 0 15px;
      color:#d946a6;
      font-size:11px;
      font-weight:800;
      letter-spacing:1.5px;
      text-transform:uppercase;
    "
  >
    Customer Details
  </p>


  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="
      border-collapse:separate;
      border-spacing:0;
      background:#fff8fc;
      border:1px solid #f7dcea;
      border-radius:18px;
    "
  >


    <tr>

      <td
        style="
          padding:18px 20px;
          border-bottom:1px solid #f3e4ec;
        "
      >

        <div
          style="
            color:#888;
            font-size:11px;
            text-transform:uppercase;
            letter-spacing:1px;
            font-weight:700;
            margin-bottom:5px;
          "
        >
          Name
        </div>

        <div
          style="
            font-size:16px;
            font-weight:700;
            color:#181818;
          "
        >
          ${safeName}
        </div>

      </td>

    </tr>



    <tr>

      <td
        style="
          padding:18px 20px;
        "
      >

        <div
          style="
            color:#888;
            font-size:11px;
            text-transform:uppercase;
            letter-spacing:1px;
            font-weight:700;
            margin-bottom:5px;
          "
        >
          Email
        </div>

        <div
          style="
            font-size:15px;
            color:#181818;
          "
        >

          ${
            email
              ? `
                <a
                  href="mailto:${escapeHtml(email)}"
                  style="
                    color:#d946a6;
                    text-decoration:none;
                    font-weight:700;
                  "
                >
                  ${safeEmail}
                </a>
              `
              : safeEmail
          }

        </div>

      </td>

    </tr>

  </table>


</td>

</tr>



<!-- MESSAGE -->

<tr>

<td style="padding:18px 35px;">


  <p
    style="
      margin:0 0 15px;
      color:#d946a6;
      font-size:11px;
      font-weight:800;
      letter-spacing:1.5px;
      text-transform:uppercase;
    "
  >
    Their Message
  </p>


  <div
    style="
      background:#111111;
      border-radius:20px;
      padding:25px;
      color:#ffffff;
      font-size:15px;
      line-height:1.8;
    "
  >
    ${safeInquiry}
  </div>


</td>

</tr>



<!-- SUBMISSION DETAILS -->

<tr>

<td style="padding:18px 35px;">


  <p
    style="
      margin:0 0 15px;
      color:#d946a6;
      font-size:11px;
      font-weight:800;
      letter-spacing:1.5px;
      text-transform:uppercase;
    "
  >
    Submission Details
  </p>


  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="
      background:#f8f8f8;
      border-radius:18px;
    "
  >


    <tr>

      <td
        style="
          padding:17px 20px;
          border-bottom:1px solid #eaeaea;
        "
      >

        <div
          style="
            color:#999;
            font-size:11px;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing:.8px;
            margin-bottom:5px;
          "
        >
          Received
        </div>

        <div
          style="
            font-size:13px;
            color:#333;
          "
        >
          ${submittedAt}
        </div>

      </td>

    </tr>



    <tr>

      <td
        style="
          padding:17px 20px;
          border-bottom:1px solid #eaeaea;
        "
      >

        <div
          style="
            color:#999;
            font-size:11px;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing:.8px;
            margin-bottom:5px;
          "
        >
          Website Page
        </div>

        <div
          style="
            font-size:13px;
            color:#333;
            word-break:break-all;
          "
        >
          ${safePage}
        </div>

      </td>

    </tr>



    <tr>

      <td
        style="
          padding:17px 20px;
        "
      >

        <div
          style="
            color:#999;
            font-size:11px;
            font-weight:700;
            text-transform:uppercase;
            letter-spacing:.8px;
            margin-bottom:5px;
          "
        >
          Screen Size
        </div>

        <div
          style="
            font-size:13px;
            color:#333;
          "
        >
          ${safeViewport}
        </div>

      </td>

    </tr>


  </table>


</td>

</tr>



${replyButton}



<!-- FOOTER -->

<tr>

<td
  align="center"
  style="
    padding:28px 35px 32px;
    background:#111111;
  "
>


  <div
    style="
      color:#ffffff;
      font-weight:800;
      font-size:17px;
      margin-bottom:7px;
    "
  >
    A&M Hair & Beauty
  </div>


  <div
    style="
      color:#aaa;
      font-size:12px;
      line-height:1.6;
    "
  >
    Beautiful Hair, Made Effortlessly.
  </div>


  <div
    style="
      margin-top:12px;
      color:#777;
      font-size:11px;
    "
  >
    This email was automatically generated
    from your website feedback form.
  </div>


</td>

</tr>


</table>

<!-- END MAIN CARD -->


</td>

</tr>

</table>


</body>

</html>
`;


    // ======================================
    // SEND THROUGH RESEND
    // ======================================

    const sendResponse = await fetch(
      "https://api.resend.com/emails",
      {

        method: "POST",

        headers: {
          Authorization:
            `Bearer ${process.env.RESEND_API_KEY}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          from:
            "A&M Feedback <onboarding@resend.dev>",

          to: [
            process.env.FEEDBACK_EMAIL
          ],

          subject:
            `💬 New feedback from ${name} | A&M Hair & Beauty`,

          html:
            emailHtml

        })

      }
    );


    const result =
      await sendResponse.json();


    console.log(
      "RESEND RESPONSE:",
      result
    );


    // ======================================
    // RESEND ERROR
    // ======================================

    if (!sendResponse.ok) {

      console.error(
        "RESEND FAILED:",
        result
      );

      return res.status(500).json({
        error: "Resend failed",
        details: result
      });

    }


    // ======================================
    // SUCCESS
    // ======================================

    console.log(
      "EMAIL SENT:",
      result
    );


    return res.json({
      success: true,
      message: "Feedback email sent.",
      emailId: result.id
    });


  } catch (error) {

    console.error(
      "FEEDBACK ERROR:",
      error
    );


    return res.status(500).json({
      error: "Failed to send feedback."
    });

  }
});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

  console.log(
    `A&M email server running on port ${PORT}`
  );

});
