/* A&M Hair & Beauty — feedback.js */
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FEEDBACK_EMAIL = process.env.FEEDBACK_EMAIL || 'help.amhairandbeauty@gmail.com';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': 'https://amhairandbeauty.com',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

function clean(value, max) {
  return String(value || '').trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeSupabaseError(status, detail) {
  const text = String(detail || '');

  if (/PGRST205|not.*schema cache|relation.*feedback.*does not exist/i.test(text)) {
    return 'Supabase Data API cannot see public.feedback yet. Make sure public is exposed in Project Settings → Data API, then run the feedback grants/reload SQL.';
  }

  if (status === 401 || status === 403 || /invalid.*api.?key|permission denied|JWT|42501/i.test(text)) {
    return 'Supabase rejected access to feedback. Check the server key and run the feedback service_role GRANT statements in the SQL Editor.';
  }

  return `Supabase error ${status}. Check the Netlify function log for details.`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, {});
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  if (!SUPABASE_URL) {
    console.error('Feedback: SUPABASE_URL is missing');
    return json(500, { error: 'SUPABASE_URL is missing in Netlify environment variables.' });
  }

  if (!SUPABASE_KEY) {
    console.error('Feedback: Supabase server key is missing');
    return json(500, { error: 'Add SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables.' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const name = clean(body.name, 80);
    const email = clean(body.email, 160);
    const inquiry = clean(body.inquiry, 2000);
    const page = clean(body.page, 500);
    const viewport = clean(body.viewport, 40);
    const userAgent = clean(body.userAgent, 500);

    if (!name || !inquiry) {
      return json(400, { error: 'Name and feedback are required.' });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { error: 'Please enter a valid email address.' });
    }

    const headers = {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Content-Profile': 'public',
      'Accept-Profile': 'public',
      Prefer: 'return=minimal'
    };

    if (SUPABASE_KEY.startsWith('eyJ')) {
      headers.Authorization = `Bearer ${SUPABASE_KEY}`;
    }

    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name,
        email: email || null,
        inquiry,
        page: page || null,
        viewport: viewport || null,
        user_agent: userAgent || null
      })
    });

    if (!insertResponse.ok) {
      const detail = await insertResponse.text();
      console.error('Feedback Supabase insert failed:', insertResponse.status, detail);
      return json(500, {
        error: safeSupabaseError(insertResponse.status, detail),
        supabaseStatus: insertResponse.status
      });
    }

    let emailSent = false;

    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'A&M Feedback <help.amhairandbeauty@gmail.com>',
          to: [FEEDBACK_EMAIL],
          subject: `New website feedback from ${name}`,
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:650px;margin:auto">
              <h2 style="color:#d946a6">New A&M website feedback</h2>
              <p><strong>Name:</strong> ${escapeHtml(name)}</p>
              <p><strong>Email:</strong> ${escapeHtml(email || 'Not provided')}</p>
              <p><strong>Inquiry:</strong></p>
              <div style="padding:16px;background:#fdf2f8;border-radius:12px;white-space:pre-wrap">${escapeHtml(inquiry)}</div>
              <hr style="border:0;border-top:1px solid #eee;margin:24px 0">
              <p style="font-size:12px;color:#777"><strong>Page:</strong> ${escapeHtml(page || 'Unknown')}<br><strong>Viewport:</strong> ${escapeHtml(viewport || 'Unknown')}</p>
            </div>`
        })
      });

      if (!resendResponse.ok) {
        console.error('Feedback email failed:', resendResponse.status, await resendResponse.text());
      } else {
        emailSent = true;
      }
    } else {
      console.warn('Feedback saved, but RESEND_API_KEY is not configured.');
    }

    return json(200, { ok: true, emailSent });
  } catch (error) {
    console.error('Feedback function error:', error);
    return json(500, { error: 'Something went wrong while sending feedback.' });
  }
};
