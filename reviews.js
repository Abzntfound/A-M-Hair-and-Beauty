/* ============================================================
   A&M Hair & Beauty — reviews.js (SUPABASE VERSION FIXED)
   ============================================================ */

// ===================== SUPABASE =====================
const supabase = (() => {
    if (!window.supabase) {
        console.error("Supabase CDN not loaded");
        return null;
    }
})();

// ===================== ADMIN =====================
const ADMIN_EMAILS = ["adube6113@outlook.com"];

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('amUserData') || '{}');
    } catch {
        return {};
    }
}

function isAdmin() {
    const user = getUser();
    return ADMIN_EMAILS.includes(user.email);
}

// ===================== PROFANITY FILTER =====================
const BAD_WORDS = ['damn','hell','crap','shit','fuck','ass','bitch','bastard','dick','piss','cock','pussy','whore','slut','fag','nigger','cunt','asshole','motherfucker'];

function hasProfanity(text) {
    return BAD_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(text));
}

// ===================== HELPERS =====================
function stars(n) {
    return Array.from({length:5},(_,i)=>i<n?'★':'☆').join('');
}

function timeAgo(dateStr) {
    const d = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return '1 day ago';
    if (d < 7) return `${d} days ago`;
    if (d < 14) return '1 week ago';
    if (d < 30) return `${Math.floor(d/7)} weeks ago`;
    if (d < 60) return '1 month ago';
    return `${Math.floor(d/30)} months ago`;
}

function safe(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function avatar(pfp, name) {
    if (pfp && pfp.startsWith('data:image')) {
        return `<img src="${pfp}" class="review-avatar-img">`;
    }
    return `<div class="review-avatar">${(name||'?').charAt(0).toUpperCase()}</div>`;
}

// ===================== FETCH REVIEWS =====================
async function fetchReviews() {
    const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error(error);
        return [];
    }

    return data || [];
}

// ===================== SAVE REVIEW =====================
async function saveReview(review) {
    const { error } = await supabase
        .from('reviews')
        .insert([{
            name: review.name,
            rating: review.rating,
            review: review.review,
            date: new Date().toISOString(),
            pfp: review.pfp || ''
        }]);

    if (error) {
        console.error(error);
        return false;
    }

    return true;
}

// ===================== ADD REPLY (ADMIN ONLY) =====================
async function addReply(id, reply, author) {
    if (!isAdmin()) {
        alert("Not allowed");
        return;
    }

    const { error } = await supabase
        .from('reviews')
        .update({
            reply,
            reply_author: author
        })
        .eq('id', id);

    if (error) console.error(error);
}

// ===================== ANALYTICS =====================
async function getStats() {
    const { data } = await supabase
        .from('reviews')
        .select('rating');

    if (!data || data.length === 0) {
        return { total: 0, average: 0 };
    }

    const ratings = data.map(r => r.rating);
    const avg = ratings.reduce((a,b)=>a+b,0) / ratings.length;

    return {
        total: ratings.length,
        average: avg.toFixed(1)
    };
}

// ===================== REALTIME =====================
function subscribeToReviews(onUpdate) {
    if (!supabase) return;

    supabase
        .channel('reviews')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'reviews'
            },
            (payload) => {
                console.log("Realtime update:", payload);
                onUpdate(payload);
            }
        )
        .subscribe();
}

// ===================== RENDER =====================
async function displayReviews(containerId = 'reviews-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:2rem;color:#aaa">Loading reviews…</div>';

    const reviews = await fetchReviews();

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
                    <strong>${safe(r.reply_author || 'Admin')} replied:</strong>
                    <p>${safe(r.reply)}</p>
                </div>
            ` : ''}

            <p class="review-date">${timeAgo(r.date)}</p>
        </div>
    `).join('');
}

// ===================== SUBMIT REVIEW =====================
async function handleReviewSubmit(e) {
    e.preventDefault();

    const nameEl = document.getElementById('review-name');
    const textEl = document.getElementById('review-text');
    const ratingEl = document.getElementById('review-rating');
    const submitBtn = document.getElementById('review-submit-btn');
    const successEl = document.getElementById('review-success-message');

    if (!nameEl.value.trim() || !textEl.value.trim() || !ratingEl.value) {
        alert("Fill all fields");
        return;
    }

    if (hasProfanity(nameEl.value) || hasProfanity(textEl.value)) {
        alert("Inappropriate language detected");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const pfp = getUser().pfp || '';

    await saveReview({
        name: nameEl.value.trim(),
        rating: parseInt(ratingEl.value),
        review: textEl.value.trim(),
        pfp
    });

    await displayReviews();

    if (successEl) successEl.classList.add('show');

    setTimeout(() => {
        document.getElementById('review-modal-overlay')?.classList.remove('active');
        document.body.style.overflow = '';
        e.target.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Review";
        successEl?.classList.remove('show');
    }, 1500);
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    displayReviews();
    initStarRating();
    initReviewScroll();

    let refreshTimeout;

    subscribeToReviews(() => {
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
            displayReviews();
        }, 200);
    });

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

// ===================== STAR RATING =====================
function initStarRating() {
    const wrap = document.getElementById('star-rating');
    const input = document.getElementById('review-rating');
    if (!wrap || !input) return;

    wrap.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', () => {
            input.value = star.dataset.rating;
        });
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

// ===================== STYLE INJECT =====================
(() => {
    const s = document.createElement('style');
    s.textContent = `
    .review-avatar-img{width:50px;height:50px;border-radius:50%;object-fit:cover}
    .review-reply{margin-top:10px;padding:10px;border-left:3px solid #d946a6;background:#f7f7f7}
    `;
    document.head.appendChild(s);
})();

console.log("✅ Supabase reviews system loaded");
