/* ============================================================
   A&M Hair & Beauty — reviews.js (FULL FIXED VERSION)
   ============================================================ */

// ===================== SUPABASE =====================
const sb = window.supabaseClient;

// ===================== ADMIN =====================
const ADMIN_EMAILS = ["adube6113@outlook.com"];

// ===================== STATE =====================
let lastReviewTime = 0;

// ===================== USER =====================
function getUser() {
    try {
        return JSON.parse(localStorage.getItem('amUserData') || '{}');
    } catch {
        return {};
    }
}

function isAdmin() {
    const user = getUser();
    return user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}

// ===================== PROFANITY FILTER =====================
const BAD_WORDS = [
    'damn','hell','crap','shit','fuck','ass','bitch','bastard',
    'dick','piss','cock','pussy','whore','slut','fag','nigger',
    'cunt','asshole','motherfucker'
];

function hasProfanity(text) {
    return BAD_WORDS.some(w =>
        new RegExp(`\\b${w}\\b`, 'i').test(text)
    );
}

// ===================== HELPERS =====================
function stars(n) {
    return Array.from({ length: 5 }, (_, i) =>
        i < n ? '★' : '☆'
    ).join('');
}

function timeAgo(dateStr) {
    const d = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return '1 day ago';
    if (d < 7) return `${d} days ago`;
    if (d < 14) return '1 week ago';
    if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
    if (d < 60) return '1 month ago';
    return `${Math.floor(d / 30)} months ago`;
}

function safe(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function canPostReview() {
    return Date.now() - lastReviewTime > 30000; // 30 sec cooldown
}

// ===================== FETCH =====================
async function fetchReviews() {
    const { data, error } = await sb
        .from('reviews')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
}

// ===================== SAVE =====================
async function saveReview(review) {
    const { error } = await sb
        .from('reviews')
        .insert([review]);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}

// ===================== REPLY =====================
async function addReply(id, reply, author) {
    if (!isAdmin()) return;

    const { error } = await sb
        .from('reviews')
        .update({
            reply,
            reply_author: author
        })
        .eq('id', id);

    if (error) console.error(error);
}

// ===================== DELETE (ADMIN) =====================
async function deleteReview(id) {
    if (!isAdmin()) return;

    const { error } = await sb
        .from('reviews')
        .delete()
        .eq('id', id);

    if (error) console.error(error);
    displayReviews();
}

// ===================== STAR UI =====================
function initStarRating() {
    const wrap = document.getElementById('star-rating');
    const input = document.getElementById('review-rating');
    if (!wrap || !input) return;

    const starsEl = wrap.querySelectorAll('.star');

    function update(value) {
        starsEl.forEach(star => {
            star.style.color =
                star.dataset.rating <= value ? '#fbbf24' : '#ddd';
        });
    }

    starsEl.forEach(star => {
        star.addEventListener('click', () => {
            input.value = star.dataset.rating;
            update(star.dataset.rating);
        });

        star.addEventListener('mouseover', () => {
            update(star.dataset.rating);
        });
    });

    wrap.addEventListener('mouseleave', () => {
        update(input.value || 0);
    });
}

// ===================== AUTO SCROLL =====================
function initReviewScroll() {
    const el = document.getElementById('reviews-container');
    if (!el) return;

    let pos = 0;

    setInterval(() => {
        pos += 0.3;
        if (pos > el.scrollWidth) pos = 0;
        el.scrollLeft = pos;
    }, 30);
}

// ===================== RENDER =====================
async function displayReviews(containerId = 'reviews-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `<div style="text-align:center;padding:2rem;color:#aaa">Loading reviews…</div>`;

    const reviews = await fetchReviews();

    if (!reviews.length) {
        container.innerHTML = `<p style="text-align:center;color:#aaa">No reviews yet. Be the first!</p>`;
        return;
    }

    container.innerHTML = reviews.map(r => `
        <div class="review-card">
            <div class="review-header">
                <div class="review-avatar">
                    ${(r.name || '?')[0].toUpperCase()}
                </div>

                <div class="review-info">
                    <h3>${safe(r.name)}</h3>
                    <div class="review-rating">${stars(r.rating)}</div>
                </div>
            </div>

            <p class="review-text">"${safe(r.review)}"</p>

            ${r.reply ? `
                <div class="review-reply">
                    <strong>${safe(r.reply_author || 'Admin')} replied:</strong>
                    <p>${safe(r.reply)}</p>
                </div>
            ` : ''}

            <p class="review-date">${timeAgo(r.date)}</p>

            ${isAdmin() ? `
                <div style="margin-top:10px;display:flex;gap:10px">
                    <button onclick="openReply(${r.id})">Reply</button>
                    <button onclick="deleteReview(${r.id})">Delete</button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// ===================== ADMIN ACTIONS =====================
window.openReply = function(id) {
    const reply = prompt("Write admin reply:");
    if (!reply) return;

    const user = getUser();

    addReply(id, reply, user.email || "Admin")
        .then(() => displayReviews());
};

// ===================== SUBMIT =====================
async function handleReviewSubmit(e) {
    e.preventDefault();

    const nameEl = document.getElementById('review-name');
    const textEl = document.getElementById('review-text');
    const ratingEl = document.getElementById('review-rating');
    const submitBtn = document.getElementById('review-submit-btn');

    if (!nameEl.value || !textEl.value || !ratingEl.value) {
        alert("Fill all fields");
        return;
    }

    if (!canPostReview()) {
        alert("Please wait before posting again");
        return;
    }

    if (hasProfanity(nameEl.value) || hasProfanity(textEl.value)) {
        alert("Inappropriate language detected");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const user = getUser();

    await saveReview({
        name: nameEl.value.trim(),
        rating: parseInt(ratingEl.value),
        review: textEl.value.trim(),
        date: new Date().toISOString(),
        pfp: user.pfp || ''
    });

    lastReviewTime = Date.now();

    await displayReviews();

    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Review";

    document.getElementById('review-modal-overlay')
        ?.classList.remove('active');

    e.target.reset();
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    displayReviews();
    initStarRating();
    initReviewScroll();

    document.getElementById('review-form')
        ?.addEventListener('submit', handleReviewSubmit);

    const openBtn = document.getElementById('leave-review-btn');
    const overlay = document.getElementById('review-modal-overlay');

    openBtn?.addEventListener('click', () => {
        overlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    overlay?.addEventListener('click', e => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// ===================== STYLE =====================
(() => {
    const s = document.createElement('style');
    s.textContent = `
        .review-avatar{
            width:50px;height:50px;border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            background:#eee;font-weight:700;
        }

        .review-reply{
            margin-top:10px;
            padding:10px;
            border-left:3px solid #d946a6;
            background:#f7f7f7;
        }
    `;
    document.head.appendChild(s);
})();

console.log("✅ reviews.js fully loaded");
