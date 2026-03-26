// Reviews Management System — Google Sheets API
// Dev reply system, real email validation, full auth sync

const SHEET_ID = '12Q0Kp1-K4PnA5SsMQNovmcIAKdqVJsV_BKqItwMNFy4';
const API_KEY = 'AIzaSyAfvqiFKatwdVPvuNyDDGEgCnbnafo779c';
const SHEET_NAME = 'Sheet1';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5c0TS4jt2ebmKeKdPrrNTgMVxfSHmB_RzUvyEzLKth4DkoIq4Xfly3lS4EhQDdoNAMw/exec';

// Dev accounts that can reply to reviews
const DEV_EMAILS = ['vuyo_ncanywa@yahoo.co.uk', 'adube6113@outlook.com'];

// Profanity filter
const PROFANITY_LIST = [
    'damn', 'hell', 'crap', 'shit', 'fuck', 'ass', 'bitch',
    'bastard', 'dick', 'piss', 'cock', 'pussy', 'whore',
    'slut', 'fag', 'nigger', 'cunt', 'asshole', 'motherfucker'
];

// ── Helpers ──────────────────────────────────────────────

function containsProfanity(text) {
    const lower = text.toLowerCase();
    return PROFANITY_LIST.some(word => new RegExp('\\b' + word + '\\b', 'i').test(lower));
}

function isRealEmail(email) {
    // Must match standard email format AND have a real-looking TLD (2-6 chars)
    const regex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,6}$/;
    if (!regex.test(email)) return false;

    // Block obviously fake domains
    const fakeDomains = ['test.com', 'fake.com', 'example.com', 'mail.com', 'asdf.com', 'abc.com'];
    const domain = email.split('@')[1].toLowerCase();
    if (fakeDomains.includes(domain)) return false;

    return true;
}

function getCurrentUser() {
    try {
        const raw = localStorage.getItem('amUserData');
        if (raw) return JSON.parse(raw);
        const cookieMatch = document.cookie.split('; ').find(r => r.startsWith('amUserData='));
        if (cookieMatch) return JSON.parse(decodeURIComponent(cookieMatch.split('=').slice(1).join('=')));
    } catch (e) {}
    return null;
}

function isDevUser() {
    const user = getCurrentUser();
    return user && DEV_EMAILS.includes(user.email.toLowerCase());
}

function getCurrentUserPfp() {
    const user = getCurrentUser();
    return user && user.pfp ? user.pfp : null;
}

function generateStars(rating) {
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < rating ? '★' : '☆';
    return stars;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const diffDays = Math.floor(Math.abs(new Date() - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return '1 month ago';
    return `${Math.floor(diffDays / 30)} months ago`;
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function buildAvatar(pfp, name) {
    if (pfp && pfp.startsWith('data:image')) {
        return `<img src="${pfp}" alt="${sanitizeHTML(name)}" class="review-avatar review-avatar-img">`;
    }
    return `<div class="review-avatar">${sanitizeHTML(name.charAt(0).toUpperCase())}</div>`;
}

// ── Default reviews ───────────────────────────────────────

function getDefaultReviews() {
    return [
        { name: "Sarah M.", rating: 5, review: "The hair growth oil is amazing! My hair has never felt so healthy and strong. I've noticed significant growth in just 3 weeks!", date: new Date(Date.now() - 14 * 86400000).toISOString(), pfp: "" },
        { name: "Jessica T.", rating: 5, review: "Best satin bonnet I've ever owned! Keeps my hair protected all night and the quality is outstanding.", date: new Date(Date.now() - 7 * 86400000).toISOString(), pfp: "" },
        { name: "Maria L.", rating: 5, review: "Natural ingredients, visible results! My hair is shinier and healthier. Highly recommend A&M products!", date: new Date(Date.now() - 3 * 86400000).toISOString(), pfp: "" },
        { name: "Aisha K.", rating: 5, review: "This rosemary oil is a game changer! My edges are filling in and my scalp feels so nourished.", date: new Date(Date.now() - 5 * 86400000).toISOString(), pfp: "" }
    ];
}

// ── Read / Write reviews ──────────────────────────────────

async function getReviews() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            const rows = data.values;
            if (!rows || rows.length <= 1) return getDefaultReviews();
            // Columns: name, rating, review, date, pfp, reply, replyAuthor
            return rows.slice(1).map(row => ({
                name: row[0] || '',
                rating: parseInt(row[1]) || 5,
                review: row[2] || '',
                date: row[3] || new Date().toISOString(),
                pfp: row[4] || '',
                reply: row[5] || '',
                replyAuthor: row[6] || ''
            }));
        }
    } catch (error) {
        console.log('Sheets read failed, using fallback:', error);
    }
    const stored = localStorage.getItem('amReviews');
    if (stored) return JSON.parse(stored);
    return getDefaultReviews();
}

async function saveReview(review) {
    if (APPS_SCRIPT_URL) {
        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'ADD_REVIEW', ...review })
            });
            if (response.ok) { console.log('Review saved to Sheets'); return true; }
        } catch (error) { console.log('Apps Script save failed, using localStorage'); }
    }
    const reviews = await getReviews();
    reviews.unshift(review);
    localStorage.setItem('amReviews', JSON.stringify(reviews));
    return true;
}

async function saveReply(reviewIndex, replyText, replyAuthor) {
    if (APPS_SCRIPT_URL) {
        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'ADD_REPLY', reviewIndex, reply: replyText, replyAuthor })
            });
            if (response.ok) { console.log('Reply saved to Sheets'); return true; }
        } catch (error) { console.log('Reply save failed'); }
    }
    return false;
}

// ── Display ───────────────────────────────────────────────

async function displayReviews() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    const reviews = await getReviews();
    reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = '';

    if (reviews.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;">No reviews yet. Be the first to leave a review!</p>';
        return;
    }

    const devUser = isDevUser();
    const user = getCurrentUser();

    reviews.forEach((review, index) => {
        const card = document.createElement('div');
        card.className = 'review-card';
        card.style.position = 'relative';

        const stars = generateStars(review.rating);
        const avatarHTML = buildAvatar(review.pfp || '', review.name);

        // Reply section HTML
        const replyHTML = review.reply
            ? `<div class="review-reply">
                <span class="review-reply-author">${sanitizeHTML(review.replyAuthor)} - Dev</span>
                <p>${sanitizeHTML(review.reply)}</p>
               </div>`
            : '';

        // Reply button — only visible on hover for dev accounts
        const replyBtnHTML = devUser && !review.reply
            ? `<button class="review-reply-btn" data-index="${index}">Reply</button>`
            : '';

        card.innerHTML = `
            <div class="review-header">
                ${avatarHTML}
                <div class="review-info">
                    <h3>${sanitizeHTML(review.name)}</h3>
                    <div class="review-rating">${stars}</div>
                </div>
            </div>
            <p class="review-text">"${sanitizeHTML(review.review)}"</p>
            <p class="review-date">${formatDate(review.date)}</p>
            ${replyHTML}
            ${replyBtnHTML}
            ${devUser && !review.reply ? `
            <div class="review-reply-form" id="reply-form-${index}" style="display:none;">
                <textarea class="review-reply-input" id="reply-input-${index}" placeholder="Write your reply..."></textarea>
                <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                    <button class="review-reply-submit" data-index="${index}">Post Reply</button>
                    <button class="review-reply-cancel" data-index="${index}">Cancel</button>
                </div>
            </div>` : ''}
        `;

        container.appendChild(card);
    });

    // Attach reply button events
    if (devUser) {
        container.querySelectorAll('.review-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = btn.getAttribute('data-index');
                document.getElementById(`reply-form-${idx}`).style.display = 'block';
                btn.style.display = 'none';
            });
        });

        container.querySelectorAll('.review-reply-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = btn.getAttribute('data-index');
                document.getElementById(`reply-form-${idx}`).style.display = 'none';
                container.querySelectorAll(`.review-reply-btn[data-index="${idx}"]`).forEach(b => b.style.display = '');
            });
        });

        container.querySelectorAll('.review-reply-submit').forEach(btn => {
            btn.addEventListener('click', async () => {
                const idx = parseInt(btn.getAttribute('data-index'));
                const input = document.getElementById(`reply-input-${idx}`);
                const replyText = input.value.trim();

                if (!replyText) { alert('Please write a reply first'); return; }
                if (containsProfanity(replyText)) { alert('Reply contains inappropriate language'); return; }

                btn.disabled = true;
                btn.textContent = 'Posting...';

                const devUserData = getCurrentUser();
                const replyAuthor = devUserData ? devUserData.name.split(' ')[0] : 'Dev';

                await saveReply(idx, replyText, replyAuthor);
                await displayReviews();
            });
        });
    }
}

// ── Review submission ─────────────────────────────────────

async function handleReviewSubmit(event) {
    event.preventDefault();

    const nameInput = document.getElementById('review-name');
    const emailInput = document.getElementById('review-email');
    const reviewTextarea = document.getElementById('review-text');
    const reviewRatingInput = document.getElementById('review-rating');
    const submitButton = document.getElementById('review-submit-btn');
    const reviewSuccessMessage = document.getElementById('review-success-message');

    const rating = parseInt(reviewRatingInput.value);

    if (!nameInput.value.trim()) { alert('Please enter your name'); return; }
    if (rating === 0 || isNaN(rating)) { alert('Please select a rating'); return; }
    if (!reviewTextarea.value.trim()) { alert('Please write a review'); return; }

    // Validate email if provided
    if (emailInput && emailInput.value.trim()) {
        if (!isRealEmail(emailInput.value.trim())) {
            alert('Please enter a valid email address');
            return;
        }
    }

    if (containsProfanity(nameInput.value) || containsProfanity(reviewTextarea.value)) {
        alert('Your review contains inappropriate language. Please revise and resubmit.');
        return;
    }

    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';

    const newReview = {
        name: nameInput.value.trim(),
        rating,
        review: reviewTextarea.value.trim(),
        date: new Date().toISOString(),
        pfp: getCurrentUserPfp() || '',
        reply: '',
        replyAuthor: ''
    };

    await saveReview(newReview);
    await displayReviews();

    const reviewModalOverlay = document.getElementById('review-modal-overlay');
    if (reviewSuccessMessage) reviewSuccessMessage.classList.add('show');

    setTimeout(() => {
        if (reviewModalOverlay) reviewModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        if (reviewSuccessMessage) reviewSuccessMessage.classList.remove('show');
        event.target.reset();
        document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
        reviewRatingInput.value = '';
    }, 2000);

    submitButton.disabled = false;
    submitButton.textContent = originalText;

    const reviewsSection = document.getElementById('reviews');
    if (reviewsSection) setTimeout(() => reviewsSection.scrollIntoView({ behavior: 'smooth' }), 500);
}

// ── Inject styles ─────────────────────────────────────────

(function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .review-avatar-img {
            width: 55px;
            height: 55px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(217,70,166,0.25);
            display: block;
        }

        .review-reply {
            margin-top: 1rem;
            padding: 0.8rem 1rem;
            background: rgba(217,70,166,0.08);
            border-left: 3px solid #d946a6;
            border-radius: 8px;
            font-size: 0.9rem;
            color: #555;
        }

        .review-reply-author {
            font-weight: 700;
            color: #d946a6;
            font-size: 0.85rem;
            display: block;
            margin-bottom: 0.3rem;
        }

        .review-reply-btn {
            display: none;
            margin-top: 0.8rem;
            background: linear-gradient(135deg, #d946a6, #ec4899);
            color: white;
            border: none;
            padding: 0.4rem 1rem;
            border-radius: 50px;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            font-family: 'Poppins', sans-serif;
            transition: all 0.3s ease;
            box-shadow: 0 2px 10px rgba(217,70,166,0.3);
        }

        .review-reply-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(217,70,166,0.4);
        }

        .review-card:hover .review-reply-btn {
            display: inline-block;
        }

        .review-reply-form {
            margin-top: 0.8rem;
        }

        .review-reply-input {
            width: 100%;
            padding: 0.7rem 1rem;
            border: 2px solid #f0a8d4;
            border-radius: 10px;
            font-family: 'Poppins', sans-serif;
            font-size: 0.9rem;
            resize: vertical;
            min-height: 70px;
            outline: none;
            transition: border-color 0.3s;
        }

        .review-reply-input:focus {
            border-color: #d946a6;
            box-shadow: 0 0 0 3px rgba(217,70,166,0.1);
        }

        .review-reply-submit {
            background: linear-gradient(135deg, #d946a6, #ec4899);
            color: white;
            border: none;
            padding: 0.5rem 1.2rem;
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            font-family: 'Poppins', sans-serif;
            transition: all 0.3s ease;
        }

        .review-reply-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(217,70,166,0.4);
        }

        .review-reply-cancel {
            background: #f0f0f0;
            color: #666;
            border: none;
            padding: 0.5rem 1.2rem;
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            font-family: 'Poppins', sans-serif;
            transition: all 0.3s ease;
        }

        .review-reply-cancel:hover {
            background: #e0e0e0;
        }
    `;
    document.head.appendChild(style);
})();

// ── Init ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    displayReviews();

    const reviewForm = document.getElementById('review-form');
    if (reviewForm) reviewForm.addEventListener('submit', handleReviewSubmit);
});
