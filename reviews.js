/* ============================================================
   A&M Hair & Beauty — reviews.js
   Loads from Google Sheets, falls back to defaults.
   ============================================================ */

const FUNCTION_URL = '/.netlify/functions/reviews';
const SHEET_ID = '12Q0Kp1-K4PnA5SsMQNovmcIAKdqVJsV_BKqItwMNFy4';
const SHEET_NAME = 'Sheet1';

// ---- Profanity filter ----
const BAD_WORDS = ['damn','hell','crap','shit','fuck','ass','bitch','bastard','dick','piss','cock','pussy','whore','slut','fag','nigger','cunt','asshole','motherfucker'];
function hasProfanity(text) {
    return BAD_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(text));
}

// ---- Helpers ----
function stars(n) { return Array.from({length:5},(_,i)=>i<n?'★':'☆').join(''); }

function timeAgo(dateStr) {
    const d = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return '1 day ago';
    if (d < 7)   return `${d} days ago`;
    if (d < 14)  return '1 week ago';
    if (d < 30)  return `${Math.floor(d/7)} weeks ago`;
    if (d < 60)  return '1 month ago';
    return `${Math.floor(d/30)} months ago`;
}

function safe(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function avatar(pfp, name) {
    if (pfp && pfp.startsWith('data:image'))
        return `<img src="${pfp}" alt="${safe(name)}" class="review-avatar-img">`;
    return `<div class="review-avatar">${safe((name||'?').charAt(0).toUpperCase())}</div>`;
}

// ---- Default reviews (fallback) ----
function defaultReviews() {
    const now = Date.now();
    return [
        { name:'Sarah M.',   rating:5, review:"The hair growth oil is amazing! My hair has never felt so healthy and strong. Noticeable growth in just 3 weeks!", date:new Date(now-14*86400000).toISOString(), pfp:'' },
        { name:'Jessica T.', rating:5, review:"Best satin bonnet I've ever owned! Keeps my hair protected all night — woke up with zero frizz.", date:new Date(now-7*86400000).toISOString(), pfp:'' },
        { name:'Maria L.',   rating:5, review:"Natural ingredients, visible results! My hair is shinier and healthier. Highly recommend A&M products!", date:new Date(now-3*86400000).toISOString(), pfp:'' },
        { name:'Aisha K.',   rating:5, review:"This rosemary oil is a game changer! My edges are filling in and my scalp feels so nourished.", date:new Date(now-5*86400000).toISOString(), pfp:'' },
        { name:'Priya S.',   rating:5, review:"I was sceptical at first but the results speak for themselves. The turmeric soap left my skin glowing.", date:new Date(now-10*86400000).toISOString(), pfp:'' },
    ];
}

// ---- Fetch from Google Sheets ----
async function fetchReviews() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1`;

        const res = await fetch(url);
        const data = await res.json();

        const values = data.values;

        if (!values || values.length <= 1) {
            return defaultReviews();
        }

        return values.slice(1).map((row, i) => ({
            id: i + 2,
            name: row[0] || 'Anonymous',
            rating: parseInt(row[1]) || 5,
            review: row[2] || '',
            date: row[3] || new Date().toISOString(),
            pfp: row[4] || '',
            reply: row[5] || '',
            replyAuthor: row[6] || ''
        }));

    } catch (e) {
        console.warn("Fetch failed:", e.message);
        return defaultReviews();
    }
}
// ---- Save review ----
async function saveReview(review) {
    try {
        const res = await fetch('/.netlify/functions/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'ADD_REVIEW',
                ...review
            })
        });

        const data = await res.json();
        return data.success;

    } catch (e) {
        console.warn(e);
        return false;
    }
}

// ---- Render ----
async function displayReviews(containerId = 'reviews-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#aaa">Loading reviews…</div>';
    const reviews = await fetchReviews();
    reviews.sort((a,b) => new Date(b.date) - new Date(a.date));

    if (!reviews.length) {
        container.innerHTML = '<p style="text-align:center;color:#aaa">No reviews yet. Be the first!</p>';
        return;
    }

    container.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-header">
        ${avatar(r.pfp, r.name)}
        <div class="review-info">
          <h3>${safe(r.name)}</h3>
          <div class="review-rating">${stars(r.rating)}</div>
        </div>
      </div>
      <p class="review-text">"${safe(r.review)}"</p>

      ${r.reply ? `
        <div class="review-reply">
          <strong>${safe(r.replyAuthor || 'Owner')} replied:</strong>
          <p>${safe(r.reply)}</p>
        </div>
      ` : ''}
      <p class="review-date">${timeAgo(r.date)}</p>
    </div>`).join('');
}

// ---- Auto-scroll ----
function initReviewScroll(containerId = 'reviews-container') {
    const el = document.getElementById(containerId);
    if (!el) return;
    let pos = 0, hovering = false;
    el.addEventListener('mouseenter', () => hovering = true);
    el.addEventListener('mouseleave', () => hovering = false);
    setInterval(() => {
        if (hovering) return;
        pos += 0.4;
        const max = el.scrollWidth - el.clientWidth;
        if (pos >= max) pos = 0;
        el.scrollLeft = pos;
    }, 30);
}

// ---- Review modal submit handler ----
async function handleReviewSubmit(e) {
    e.preventDefault();

    const nameEl    = document.getElementById('review-name');
    const textEl    = document.getElementById('review-text');
    const ratingEl  = document.getElementById('review-rating');
    const submitBtn = document.getElementById('review-submit-btn');
    const successEl = document.getElementById('review-success-message');

    if (!nameEl.value.trim())     { alert('Please enter your name'); return; }
    if (!ratingEl.value)          { alert('Please select a rating'); return; }
    if (!textEl.value.trim())     { alert('Please write a review'); return; }
    if (hasProfanity(nameEl.value) || hasProfanity(textEl.value)) {
        alert('⚠️ Your review contains inappropriate language. Please revise.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    // Get user pfp if logged in
    let pfp = '';
    try {
        const raw = localStorage.getItem('amUserData');
        if (raw) { const u = JSON.parse(raw); if (u.pfp) pfp = u.pfp; }
    } catch (e) {}

    const review = {
        name:   nameEl.value.trim(),
        rating: parseInt(ratingEl.value),
        review: textEl.value.trim(),
        date:   new Date().toISOString(),
        pfp,
    };

    await saveReview(review);
    await displayReviews();

    if (successEl) { successEl.classList.add('show'); }

    setTimeout(() => {
        const overlay = document.getElementById('review-modal-overlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        if (successEl) successEl.classList.remove('show');
        e.target.reset();
        document.querySelectorAll('.star').forEach(s => { s.classList.remove('active'); s.style.color = '#ddd'; });
        ratingEl.value = '';
    }, 2000);

    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Review';
}

// ---- Star rating ----
function initStarRating() {
    const wrap = document.getElementById('star-rating');
    const input = document.getElementById('review-rating');
    if (!wrap || !input) return;

    const starEls = wrap.querySelectorAll('.star');
    starEls.forEach(star => {
        star.addEventListener('click', () => {
            const r = star.dataset.rating;
            input.value = r;
            starEls.forEach(s => { s.style.color = s.dataset.rating <= r ? '#f59e0b' : '#ddd'; });
        });
        star.addEventListener('mouseenter', () => {
            const r = star.dataset.rating;
            starEls.forEach(s => { s.style.color = s.dataset.rating <= r ? '#f59e0b' : '#ddd'; });
        });
    });
    wrap.addEventListener('mouseleave', () => {
        const cur = input.value;
        starEls.forEach(s => { s.style.color = s.dataset.rating <= cur ? '#f59e0b' : '#ddd'; });
    });
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    displayReviews();
    initReviewScroll();
    initStarRating();

    const form = document.getElementById('review-form');
    if (form) form.addEventListener('submit', handleReviewSubmit);

    // Modal open/close
    const openBtn   = document.getElementById('leave-review-btn');
    const overlay   = document.getElementById('review-modal-overlay');
    const closeBtn  = document.getElementById('review-modal-close');
    const cancelBtn = document.getElementById('review-cancel-btn');

    function openModal()  { if (overlay) { overlay.classList.add('active'); document.body.style.overflow = 'hidden'; } }
    function closeModal() { if (overlay) { overlay.classList.remove('active'); document.body.style.overflow = ''; } }

    if (openBtn)   openBtn.addEventListener('click', openModal);
    if (closeBtn)  closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (overlay)   overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
});

// Inject avatar styles
(function() {
    const s = document.createElement('style');
    s.textContent = `.review-avatar-img{width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid rgba(217,70,166,.2);flex-shrink:0}`;
    document.head.appendChild(s);
})();

console.log('✅ reviews.js loaded');
