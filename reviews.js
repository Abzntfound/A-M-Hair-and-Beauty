// Reviews Management System — Google Sheets API

const SHEET_ID       = '12Q0Kp1-K4PnA5SsMQNovmcIAKdqVJsV_BKqItwMNFy4';
const API_KEY        = 'AIzaSyAfvqiFKatwdVPvuNyDDGEgCnbnafo779c';
const SHEET_NAME     = 'Sheet1';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5c0TS4jt2ebmKeKdPrrNTgMVxfSHmB_RzUvyEzLKth4DkoIq4Xfly3lS4EhQDdoNAMw/exec';

const DEV_EMAILS = ['vuyo_ncanywa@yahoo.co.uk', 'adube6113@outlook.com'];

const PROFANITY_LIST = [
    'damn','hell','crap','shit','fuck','ass','bitch','bastard','dick',
    'piss','cock','pussy','whore','slut','fag','nigger','cunt','asshole','motherfucker'
];

// ── Helpers ──────────────────────────────────────────────

function containsProfanity(text) {
    return PROFANITY_LIST.some(word => new RegExp('\\b' + word + '\\b', 'i').test(text));
}

function isRealEmail(email) {
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,6}$/.test(email)) return false;
    const fake = ['test.com','fake.com','example.com','mail.com','asdf.com','abc.com'];
    return !fake.includes(email.split('@')[1].toLowerCase());
}

// ── FIX: getCurrentUser reads from ALL possible storage locations ──
// Checks localStorage, then cookie. Also re-reads on every call so it
// picks up changes made by checkAuthStatus() or handleLogout().
function getCurrentUser() {
    try {
        const raw = localStorage.getItem('amUserData');
        if (raw) { const p = JSON.parse(raw); if (p && p.email) return p; }
    } catch(e) {}
    try {
        for (const c of document.cookie.split(';')) {
            const t = c.trimStart();
            if (t.startsWith('amUserData=')) {
                const p = JSON.parse(decodeURIComponent(t.slice('amUserData='.length)));
                if (p && p.email) return p;
            }
        }
    } catch(e) {}
    return null;
}

// ── FIX: isDevUser now always re-reads live storage ──
// Previously it could be stale if the user was logged out after page load.
function isDevUser() {
    const user = getCurrentUser();
    return !!(user && user.email && DEV_EMAILS.includes(user.email.toLowerCase()));
}

function getCurrentUserPfp() {
    const user = getCurrentUser();
    return user && user.pfp ? user.pfp : null;
}

function generateStars(rating) {
    let s = '';
    for (let i = 0; i < 5; i++) s += i < rating ? '★' : '☆';
    return s;
}

function formatDate(dateString) {
    const d = Math.floor(Math.abs(new Date() - new Date(dateString)) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return '1 day ago';
    if (d < 7)  return `${d} days ago`;
    if (d < 14) return '1 week ago';
    if (d < 30) return `${Math.floor(d/7)} weeks ago`;
    if (d < 60) return '1 month ago';
    return `${Math.floor(d/30)} months ago`;
}

function sanitizeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function buildAvatar(pfp, name) {
    if (pfp && pfp.startsWith('data:image'))
        return `<img src="${pfp}" alt="${sanitizeHTML(name)}" class="review-avatar review-avatar-img">`;
    return `<div class="review-avatar">${sanitizeHTML(name.charAt(0).toUpperCase())}</div>`;
}

// ── Default reviews (fallback) ────────────────────────────

function getDefaultReviews() {
    return [
        { sheetRowIndex: null, name:"Sarah M.",   rating:5, review:"The hair growth oil is amazing! My hair has never felt so healthy and strong. I've noticed significant growth in just 3 weeks!", date:new Date(Date.now()-14*86400000).toISOString(), pfp:"", reply:"", replyAuthor:"" },
        { sheetRowIndex: null, name:"Jessica T.", rating:5, review:"Best satin bonnet I've ever owned! Keeps my hair protected all night and the quality is outstanding.", date:new Date(Date.now()-7*86400000).toISOString(), pfp:"", reply:"", replyAuthor:"" },
        { sheetRowIndex: null, name:"Maria L.",   rating:5, review:"Natural ingredients, visible results! My hair is shinier and healthier. Highly recommend A&M products!", date:new Date(Date.now()-3*86400000).toISOString(), pfp:"", reply:"", replyAuthor:"" },
        { sheetRowIndex: null, name:"Aisha K.",   rating:5, review:"This rosemary oil is a game changer! My edges are filling in and my scalp feels so nourished.", date:new Date(Date.now()-5*86400000).toISOString(), pfp:"", reply:"", replyAuthor:"" }
    ];
}

// ── Read reviews ──────────────────────────────────────────

async function getReviews() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            const rows = data.values;
            if (!rows || rows.length <= 1) return getDefaultReviews();
            return rows.slice(1).map((row, i) => ({
                sheetRowIndex: i + 2,   // real 1-based sheet row (row 1 = header)
                name:        row[0] || '',
                rating:      parseInt(row[1]) || 5,
                review:      row[2] || '',
                date:        row[3] || new Date().toISOString(),
                pfp:         row[4] || '',
                reply:       row[5] || '',
                replyAuthor: row[6] || ''
            }));
        }
    } catch(e) {
        console.log('Sheets read failed, using fallback:', e);
    }
    const stored = localStorage.getItem('amReviews');
    if (stored) return JSON.parse(stored);
    return getDefaultReviews();
}

// ── Save review ───────────────────────────────────────────

async function saveReview(review) {
    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ADD_REVIEW', ...review })
        });
        if (res.ok) { console.log('Review saved to Sheets'); return true; }
    } catch(e) {
        console.log('Apps Script save failed, falling back to localStorage:', e);
    }
    // localStorage fallback
    const reviews = await getReviews();
    reviews.unshift(review);
    localStorage.setItem('amReviews', JSON.stringify(reviews));
    return true;
}

// ── Save reply ────────────────────────────────────────────

// sheetRowIndex is already the real sheet row number (e.g. 2, 3, 4…).
// Pass it straight to the Apps Script — DO NOT add 2 again.
async function saveReply(sheetRowIndex, replyText, replyAuthor) {
    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action:      'ADD_REPLY',
                reviewIndex: sheetRowIndex,   // already the real row number
                reply:       replyText,
                replyAuthor
            })
        });
        if (res.ok) { console.log('Reply saved to row', sheetRowIndex); return true; }
    } catch(e) {
        console.log('Reply save failed:', e);
    }
    return false;
}

// ── Display reviews ───────────────────────────────────────

async function displayReviews() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    const reviews = await getReviews();
    reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = '';

    if (!reviews.length) {
        container.innerHTML = '<p style="text-align:center;color:#666;">No reviews yet. Be the first to leave a review!</p>';
        return;
    }

    const devUser = isDevUser();

    reviews.forEach(review => {
        const card = document.createElement('div');
        card.className = 'review-card';

        const replyHTML = review.reply
            ? `<div class="review-reply">
                 <span class="review-reply-author">${sanitizeHTML(review.replyAuthor)} - Dev</span>
                 <p style="margin:0;">${sanitizeHTML(review.reply)}</p>
               </div>`
            : '';

        card.innerHTML = `
            <div class="review-header">
                ${buildAvatar(review.pfp || '', review.name)}
                <div class="review-info">
                    <h3>${sanitizeHTML(review.name)}</h3>
                    <div class="review-rating">${generateStars(review.rating)}</div>
                </div>
            </div>
            <p class="review-text">"${sanitizeHTML(review.review)}"</p>
            <p class="review-date">${formatDate(review.date)}</p>
            ${replyHTML}
            ${devUser && !review.reply ? `
                <button class="am-reply-btn" style="margin-top:0.8rem;background:linear-gradient(135deg,#d946a6,#ec4899);color:white;border:none;padding:0.4rem 1rem;border-radius:50px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:'Poppins',sans-serif;box-shadow:0 2px 10px rgba(217,70,166,0.3);">Reply</button>
                <div class="am-reply-form" style="display:none;margin-top:0.8rem;">
                    <textarea class="am-reply-input" placeholder="Write your reply..." style="width:100%;padding:0.7rem 1rem;border:2px solid #f0a8d4;border-radius:10px;font-family:'Poppins',sans-serif;font-size:0.9rem;resize:vertical;min-height:70px;outline:none;box-sizing:border-box;"></textarea>
                    <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                        <button class="am-reply-submit" style="background:linear-gradient(135deg,#d946a6,#ec4899);color:white;border:none;padding:0.5rem 1.2rem;border-radius:50px;font-size:0.85rem;font-weight:600;cursor:pointer;font-family:'Poppins',sans-serif;">Post Reply</button>
                        <button class="am-reply-cancel" style="background:#f0f0f0;color:#666;border:none;padding:0.5rem 1.2rem;border-radius:50px;font-size:0.85rem;font-weight:600;cursor:pointer;font-family:'Poppins',sans-serif;">Cancel</button>
                    </div>
                </div>
            ` : ''}
        `;

        container.appendChild(card);

        if (devUser && !review.reply) {
            const replyBtn   = card.querySelector('.am-reply-btn');
            const replyForm  = card.querySelector('.am-reply-form');
            const replyInput = card.querySelector('.am-reply-input');
            const submitBtn  = card.querySelector('.am-reply-submit');
            const cancelBtn  = card.querySelector('.am-reply-cancel');

            replyBtn.addEventListener('click', e => {
                e.stopPropagation();
                replyForm.style.display = 'block';
                replyBtn.style.display = 'none';
                replyInput.focus();
            });
            cancelBtn.addEventListener('click', e => {
                e.stopPropagation();
                replyForm.style.display = 'none';
                replyBtn.style.display = 'inline-block';
                replyInput.value = '';
            });
            submitBtn.addEventListener('click', async e => {
                e.stopPropagation();
                const text = replyInput.value.trim();
                if (!text) { alert('Please write a reply first'); return; }
                if (containsProfanity(text)) { alert('Reply contains inappropriate language'); return; }

                submitBtn.disabled = true;
                submitBtn.textContent = 'Posting...';

                const devUserData  = getCurrentUser();
                const replyAuthor  = devUserData ? devUserData.name.split(' ')[0] : 'Dev';
                const saved        = await saveReply(review.sheetRowIndex, text, replyAuthor);

                if (saved) {
                    await displayReviews();
                } else {
                    replyForm.style.display = 'none';
                    replyBtn.style.display  = 'none';
                    card.insertAdjacentHTML('beforeend', `
                        <div class="review-reply">
                            <span class="review-reply-author">${sanitizeHTML(replyAuthor)} - Dev</span>
                            <p style="margin:0;">${sanitizeHTML(text)}</p>
                        </div>`);
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Post Reply';
                }
            });
        }
    });
}

// ── Review submission ─────────────────────────────────────

async function handleReviewSubmit(event) {
    event.preventDefault();

    const nameInput   = document.getElementById('review-name');
    const emailInput  = document.getElementById('review-email');
    const reviewText  = document.getElementById('review-text');
    const ratingInput = document.getElementById('review-rating');
    const submitBtn   = document.getElementById('review-submit-btn');
    const successMsg  = document.getElementById('review-success-message');
    const rating      = parseInt(ratingInput.value);

    if (!nameInput.value.trim())    { alert('Please enter your name'); return; }
    if (!rating || isNaN(rating))   { alert('Please select a rating'); return; }
    if (!reviewText.value.trim())   { alert('Please write a review'); return; }
    if (emailInput?.value.trim() && !isRealEmail(emailInput.value.trim())) { alert('Please enter a valid email address'); return; }
    if (containsProfanity(nameInput.value) || containsProfanity(reviewText.value)) {
        alert('Your review contains inappropriate language. Please revise and resubmit.'); return;
    }

    submitBtn.disabled = true;
    const origText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';

    await saveReview({
        name:        nameInput.value.trim(),
        rating,
        review:      reviewText.value.trim(),
        date:        new Date().toISOString(),
        pfp:         getCurrentUserPfp() || '',
        reply:       '',
        replyAuthor: ''
    });
    await displayReviews();

    if (successMsg) successMsg.classList.add('show');
    setTimeout(() => {
        document.getElementById('review-modal-overlay')?.classList.remove('active');
        document.body.style.overflow = '';
        successMsg?.classList.remove('show');
        event.target.reset();
        document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
        ratingInput.value = '';
    }, 2000);

    submitBtn.disabled = false;
    submitBtn.textContent = origText;

    setTimeout(() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }), 500);
}

// ── Styles ────────────────────────────────────────────────

(function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
        .review-avatar-img { width:55px;height:55px;border-radius:50%;object-fit:cover;border:2px solid rgba(217,70,166,0.25);display:block; }
        .review-reply { margin-top:1rem;padding:0.8rem 1rem;background:rgba(217,70,166,0.08);border-left:3px solid #d946a6;border-radius:8px;font-size:0.9rem;color:#555; }
        .review-reply-author { font-weight:700;color:#d946a6;font-size:0.85rem;display:block;margin-bottom:0.3rem; }
        .am-reply-input:focus { border-color:#d946a6 !important;box-shadow:0 0 0 3px rgba(217,70,166,0.1); }
    `;
    document.head.appendChild(s);
})();

// ── Init ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    displayReviews();
    document.getElementById('review-form')?.addEventListener('submit', handleReviewSubmit);
});
