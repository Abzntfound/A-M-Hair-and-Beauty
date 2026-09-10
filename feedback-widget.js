(() => {
  if (window.__amFeedbackLoaded) return;
  window.__amFeedbackLoaded = true;

  const isHome =
    location.pathname === '/' ||
    location.pathname === '/index.html';

  if (!isHome) return;

  // =========================================
  // CHANGE THIS TO YOUR REAL RENDER URL
  // Example:
  // https://am-hair-beauty.onrender.com
  // =========================================
  const RENDER_URL = 'https://a-m-hair-and-beauty.onrender.com/';

  // =========================================
  // KEEP MEDIA3 SECTION + VIDEO
  // =========================================
  const oldPromo = document.querySelector('.media3-section');

  if (oldPromo) {
    oldPromo.style.display = 'flex';
    oldPromo.style.visibility = 'visible';
    oldPromo.style.opacity = '1';

    oldPromo.innerHTML = `
      <div class="media3-content scroll-reveal-left revealed">
        <span class="media3-eyebrow">Featured Product</span>

        <h2>Rosemary Hair Oil 60ml</h2>

        <p>
          Nourish your scalp and give your hair the care it deserves
          with our Rosemary Hair Oil — a lightweight botanical formula
          designed to support stronger, healthier-looking hair.
        </p>

        <div
          style="
            display:flex;
            align-items:center;
            gap:18px;
            flex-wrap:wrap;
            margin-bottom:1.6rem;
          "
        >
          <strong
            style="
              font-size:1.65rem;
              color:#151515;
            "
          >
            £4.99
          </strong>

          <span
            style="
              padding:.45rem .8rem;
              border-radius:999px;
              background:#fdf2f8;
              color:#d946a6;
              font-size:.8rem;
              font-weight:800;
            "
          >
            A&M HAIR & BEAUTY
          </span>
        </div>

        <a
          href="/products?id=rosemary-hair-oil-60ml"
          class="btn btn-primary btn-lg"
        >
          View Product →
        </a>
      </div>

      <div class="media3-video-wrap scroll-reveal-right revealed">
        <video
          class="media3-video"
          controls
          playsinline
          preload="metadata"
          poster="/small hair oil.jpg"
          aria-label="A&M Hair & Beauty Rosemary Hair Oil promotional video"
        >
          <source src="/video.mp4" type="video/mp4">

          Your browser does not support the video tag.
        </video>
      </div>
    `;
  }

  // =========================================
  // STYLES
  // =========================================
  const css = `
    .media3-section::before{
      background:none!important;
      content:none!important;
    }

    .media3-section::after{
      background:none!important;
      content:none!important;
    }

    .media3-section{
      display:flex!important;
      visibility:visible!important;
      opacity:1!important;
      background:linear-gradient(
        135deg,
        #fff 0%,
        #fdf2f8 100%
      )!important;
    }

    .media3-video-wrap{
      display:block!important;
      visibility:visible!important;
      opacity:1!important;
      background:#111!important;
      aspect-ratio:auto!important;
      max-width:460px!important;
    }

    .media3-video{
      display:block!important;
      width:100%!important;
      height:auto!important;
      object-fit:contain!important;
    }

    @media(max-width:900px){
      .media3-section{
        flex-direction:column!important;
      }

      .media3-video-wrap{
        width:100%!important;
        max-width:650px!important;
        margin:0 auto!important;
      }
    }

    .am-feedback-btn{
      position:fixed;
      right:max(18px,env(safe-area-inset-right));
      bottom:max(18px,env(safe-area-inset-bottom));
      z-index:1450;
      border:0;
      border-radius:999px;
      padding:14px 19px;
      background:#151515;
      color:#fff;
      font:700 14px/1 Poppins,sans-serif;
      box-shadow:0 16px 44px rgba(0,0,0,.23);
      cursor:pointer;
      display:flex;
      align-items:center;
      gap:9px;
      transition:
        transform .35s cubic-bezier(.16,1,.3,1),
        box-shadow .35s ease,
        background .25s ease;
    }

    .am-feedback-btn:hover{
      transform:translateY(-4px) scale(1.02);
      background:#d946a6;
      box-shadow:0 22px 55px rgba(217,70,166,.28);
    }

    .am-feedback-btn .am-feedback-icon{
      font-size:17px;
    }

    .am-feedback-overlay{
      position:fixed;
      inset:0;
      z-index:2400;
      background:rgba(10,10,10,.48);
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
      display:grid;
      place-items:end;
      padding:24px;
      opacity:0;
      pointer-events:none;
      transition:opacity .28s ease;
    }

    .am-feedback-overlay.open{
      opacity:1;
      pointer-events:auto;
    }

    .am-feedback-card{
      width:min(470px,100%);
      background:#fff;
      border-radius:28px;
      padding:28px;
      border:1px solid rgba(21,21,21,.08);
      box-shadow:0 30px 100px rgba(0,0,0,.24);
      transform:translateY(38px) scale(.97);
      transition:transform .45s cubic-bezier(.16,1,.3,1);
      max-height:min(82vh,720px);
      overflow:auto;
    }

    .am-feedback-overlay.open .am-feedback-card{
      transform:none;
    }

    .am-feedback-top{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:20px;
      margin-bottom:22px;
    }

    .am-feedback-kicker{
      color:#d946a6;
      font-weight:800;
      font-size:12px;
      letter-spacing:.14em;
      text-transform:uppercase;
      margin-bottom:6px;
    }

    .am-feedback-card h3{
      font-size:clamp(1.7rem,4vw,2.2rem);
      line-height:1;
      letter-spacing:-.04em;
      margin:0;
    }

    .am-feedback-close{
      border:0;
      background:#f5f5f5;
      width:38px;
      height:38px;
      border-radius:50%;
      font-size:20px;
      cursor:pointer;
    }

    .am-feedback-field{
      margin-top:15px;
    }

    .am-feedback-field label{
      display:block;
      font-size:13px;
      font-weight:700;
      margin-bottom:7px;
      color:#333;
    }

    .am-feedback-field input,
    .am-feedback-field textarea{
      width:100%;
      border:1px solid #dedede;
      background:#fafafa;
      border-radius:15px;
      padding:13px 14px;
      font:500 14px/1.5 Poppins,sans-serif;
      outline:none;
      transition:
        border-color .2s,
        box-shadow .2s,
        background .2s;
      box-sizing:border-box;
    }

    .am-feedback-field textarea{
      min-height:135px;
      resize:vertical;
    }

    .am-feedback-field input:focus,
    .am-feedback-field textarea:focus{
      border-color:#d946a6;
      background:#fff;
      box-shadow:0 0 0 4px rgba(217,70,166,.1);
    }

    .am-feedback-submit{
      width:100%;
      margin-top:18px;
      border:0;
      border-radius:999px;
      padding:14px 18px;
      background:linear-gradient(135deg,#d946a6,#ec4899);
      color:#fff;
      font:800 14px Poppins,sans-serif;
      cursor:pointer;
      box-shadow:0 12px 28px rgba(217,70,166,.25);
    }

    .am-feedback-submit:disabled{
      opacity:.6;
      cursor:wait;
    }

    .am-feedback-status{
      min-height:22px;
      margin-top:11px;
      font-size:13px;
      font-weight:600;
    }

    .am-feedback-status.success{
      color:#15803d;
    }

    .am-feedback-status.error{
      color:#b91c1c;
    }

    @media(max-width:720px){
      .am-feedback-btn{
        right:14px;
        bottom:max(14px,env(safe-area-inset-bottom));
        padding:13px;
        width:48px;
        height:48px;
        justify-content:center;
      }

      .am-feedback-btn .am-feedback-label{
        display:none;
      }

      .am-feedback-overlay{
        padding:0;
        place-items:end center;
      }

      .am-feedback-card{
        width:100%;
        border-radius:26px 26px 0 0;
        padding:
          24px
          20px
          calc(22px + env(safe-area-inset-bottom));
        max-height:88vh;
      }
    }

    @media(max-width:380px){
      .am-feedback-btn{
        width:44px;
        height:44px;
      }

      .am-feedback-card{
        padding-left:16px;
        padding-right:16px;
      }
    }

    @media(
      orientation:landscape
    ) and (max-height:520px){

      .am-feedback-overlay{
        place-items:center;
        padding:12px;
      }

      .am-feedback-card{
        max-height:94vh;
        border-radius:22px;
      }

      .am-feedback-btn{
        bottom:12px;
        right:12px;
      }
    }

    @media(prefers-reduced-motion:reduce){
      .am-feedback-btn,
      .am-feedback-overlay,
      .am-feedback-card{
        transition:none!important;
      }
    }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // =========================================
  // FEEDBACK HTML
  // =========================================
  document.body.insertAdjacentHTML(
    'beforeend',
    `
      <button
        class="am-feedback-btn"
        id="am-feedback-btn"
        type="button"
        aria-haspopup="dialog"
        aria-controls="am-feedback-dialog"
      >
        <span class="am-feedback-icon">💬</span>
        <span class="am-feedback-label">Feedback</span>
      </button>

      <div
        class="am-feedback-overlay"
        id="am-feedback-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="am-feedback-title"
      >
        <form
          class="am-feedback-card"
          id="am-feedback-form"
        >

          <div class="am-feedback-top">
            <div>
              <div class="am-feedback-kicker">
                We’re listening
              </div>

              <h3 id="am-feedback-title">
                Send us feedback
              </h3>
            </div>

            <button
              class="am-feedback-close"
              type="button"
              aria-label="Close feedback"
            >
              ×
            </button>
          </div>

          <div class="am-feedback-field">
            <label for="am-feedback-name">
              Your name
            </label>

            <input
              id="am-feedback-name"
              name="name"
              maxlength="80"
              autocomplete="name"
              required
            >
          </div>

          <div class="am-feedback-field">
            <label for="am-feedback-email">
              Email (optional)
            </label>

            <input
              id="am-feedback-email"
              name="email"
              type="email"
              maxlength="160"
              autocomplete="email"
            >
          </div>

          <div class="am-feedback-field">
            <label for="am-feedback-message">
              Feedback / enquiry
            </label>

            <textarea
              id="am-feedback-message"
              name="inquiry"
              maxlength="2000"
              required
              placeholder="Tell us what you think or how we can help..."
            ></textarea>
          </div>

          <button
            class="am-feedback-submit"
            type="submit"
          >
            Send feedback
          </button>

          <div
            class="am-feedback-status"
            id="am-feedback-status"
            aria-live="polite"
          ></div>

        </form>
      </div>
    `
  );

  const button =
    document.getElementById('am-feedback-btn');

  const overlay =
    document.getElementById('am-feedback-dialog');

  const form =
    document.getElementById('am-feedback-form');

  const close =
    overlay.querySelector('.am-feedback-close');

  const status =
    document.getElementById('am-feedback-status');

  let lastFocus = null;

  // =========================================
  // OPEN / CLOSE MODAL
  // =========================================
  const open = () => {
    lastFocus = document.activeElement;

    overlay.classList.add('open');

    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      document
        .getElementById('am-feedback-name')
        ?.focus();
    }, 50);
  };

  const shut = () => {
    overlay.classList.remove('open');

    document.body.style.overflow = '';

    lastFocus?.focus?.();
  };

  button.addEventListener('click', open);

  close.addEventListener('click', shut);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      shut();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      overlay.classList.contains('open')
    ) {
      shut();
    }
  });

  // =========================================
  // SEND FEEDBACK TO RENDER
  // =========================================
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submit =
      form.querySelector('.am-feedback-submit');

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      inquiry: form.inquiry.value.trim(),
      page: location.href,
      viewport:
        `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent
    };

    if (!payload.name || !payload.inquiry) {
      status.textContent =
        'Please enter your name and feedback.';

      status.className =
        'am-feedback-status error';

      return;
    }

    submit.disabled = true;
    submit.textContent = 'Sending…';

    status.textContent = '';
    status.className = 'am-feedback-status';

    try {
      console.log(
        'Sending feedback to:',
        `${RENDER_URL}/feedback`
      );

      const response = await fetch(
        `${RENDER_URL}/feedback`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify(payload)
        }
      );

      const result =
        await response.json().catch(() => ({}));

      console.log(
        'Feedback server response:',
        result
      );

      if (!response.ok) {
        throw new Error(
          result.details?.message ||
          result.error ||
          'Could not send feedback.'
        );
      }

      status.textContent =
        'Thank you — your feedback has been sent.';

      status.classList.add('success');

      form.reset();

      setTimeout(shut, 1600);

    } catch (error) {
      console.error(
        'Feedback request failed:',
        error
      );

      status.textContent =
        error.message ||
        'Something went wrong. Please try again.';

      status.classList.add('error');

    } finally {
      submit.disabled = false;

      submit.textContent =
        'Send feedback';
    }
  });
})();
