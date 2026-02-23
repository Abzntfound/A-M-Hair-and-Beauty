// Reviews Management System using Google Sheets (CSP-COMPLIANT)
// FREE shared reviews visible to ALL users — with profile picture support

const SHEET_BEST_URL = 'https://api.sheetbest.com/sheets/de9f4919-1fda-4381-b13f-df7942993356';
const USE_GOOGLE_SHEETS = true;

// Profanity filter
const PROFANITY_LIST = [
    'damn', 'hell', 'crap', 'shit', 'fuck', 'ass', 'bitch',
    'bastard', 'dick', 'piss', 'cock', 'pussy', 'whore',
    'slut', 'fag', 'nigger', 'cunt', 'asshole', 'motherfucker'
];

function containsProfanity(text) {
    const lowerText = text.toLowerCase();
    for (let word of PROFANITY_LIST) {
        const regex = new RegExp('\\b' + word + '\\b', 'i');
        if (regex.test(lowerText)) return true;
    }
    return false;
}

function generateStars(rating) {
    let stars = '';
    for (let i = 0; i < 5; i++) {
        stars += i < rating ? '★' : '☆';
    }
    return stars;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

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

// ── Get the current user's profile picture from storage ──
function getCurrentUserPfp() {
    try {
        // Try localStorage first (set by auth.js)
        const raw = localStorage.getItem('amUserData');
        if (raw) {
            const u = JSON.parse(raw);
            if (u.pfp) return u.pfp;
        }
        // Fallback: try cookie
        const cookieMatch = document.cookie
            .split('; ')
            .find(row => row.startsWith('amUserData='));
        if (cookieMatch) {
            const u = JSON.parse(decodeURIComponent(cookieMatch.split('=').slice(1).join('=')));
            if (u.pfp) return u.pfp;
        }
    } catch (e) {
        console.warn('Could not read user pfp:', e);
    }
    return null;
}

// ── Build the avatar element for a review card ──
// pfp: base64 string or null/empty
// name: reviewer's name for initial fallback
function buildAvatar(pfp, name) {
    if (pfp && pfp.startsWith('data:image')) {
        return `<img src="${pfp}" alt="${sanitizeHTML(name)}" class="review-avatar review-avatar-img">`;
    }
    const initial = sanitizeHTML(name.charAt(0).toUpperCase());
    return `<div class="review-avatar">${initial}</div>`;
}

function getDefaultReviews() {
    return [
        {
            name: "Sarah M.",
            rating: 5,
            review: "The hair growth oil is amazing! My hair has never felt so healthy and strong. I've noticed significant growth in just 3 weeks!",
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            pfp: ""
        },
        {
            name: "Jessica T.",
            rating: 5,
            review: "Best satin bonnet I've ever owned! Keeps my hair protected all night and the quality is outstanding.",
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            pfp: ""
        },
        {
            name: "Maria L.",
            rating: 5,
            review: "Natural ingredients, visible results! My hair is shinier and healthier. Highly recommend A&M products!",
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            pfp: ""
        },
        {
            name: "Aisha K.",
            rating: 5,
            review: "This rosemary oil is a game changer! My edges are filling in and my scalp feels so nourished.",
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            pfp: ""
        }
    ];
}

async function getReviews() {
    if (USE_GOOGLE_SHEETS) {
        try {
            const response = await fetch(SHEET_BEST_URL);
            if (response.ok) {
                const reviews = await response.json();
                return reviews.map(r => ({
                    ...r,
                    rating: parseInt(r.rating),
                    pfp: r.pfp || ""
                }));
            }
        } catch (error) {
            console.log('Using local storage fallback:', error);
        }
    }

    const storedReviews = localStorage.getItem('amReviews');
    if (storedReviews) {
        return JSON.parse(storedReviews);
    }

    return getDefaultReviews();
}

async function saveReview(review) {
    if (USE_GOOGLE_SHEETS) {
        try {
            const response = await fetch(SHEET_BEST_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(review)
            });

            if (response.ok) {
                console.log('Review saved to Google Sheets');
                return true;
            }
        } catch (error) {
            console.log('Cloud save failed, using local storage');
        }
    }

    const reviews = await getReviews();
    reviews.unshift(review);
    localStorage.setItem('amReviews', JSON.stringify(reviews));
    return true;
}

async function displayReviews() {
    const reviewsContainer = document.getElementById('reviews-container');
    if (!reviewsContainer) return;

    const reviews = await getReviews();

    reviews.sort((a, b) => new Date(b.date) - new Date(a.date));

    reviewsContainer.innerHTML = '';

    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '<p style="text-align: center; color: #666;">No reviews yet. Be the first to leave a review!</p>';
        return;
    }

    reviews.forEach(review => {
        const reviewCard = document.createElement('div');
        reviewCard.className = 'review-card';

        const stars = generateStars(review.rating);
        const avatarHTML = buildAvatar(review.pfp || "", review.name);

        reviewCard.innerHTML = `
            <div class="review-header">
                ${avatarHTML}
                <div class="review-info">
                    <h3>${sanitizeHTML(review.name)}</h3>
                    <div class="review-rating">${stars}</div>
                </div>
            </div>
            <p class="review-text">"${sanitizeHTML(review.review)}"</p>
            <p class="review-date">${formatDate(review.date)}</p>
        `;

        reviewsContainer.appendChild(reviewCard);
    });
}

async function handleReviewSubmit(event) {
    event.preventDefault();

    const form = document.getElementById('review-form');
    const nameInput = document.getElementById('review-name');
    const reviewTextarea = document.getElementById('review-text');
    const reviewRatingInput = document.getElementById('review-rating');
    const submitButton = document.getElementById('review-submit-btn');
    const reviewSuccessMessage = document.getElementById('review-success-message');

    const rating = parseInt(reviewRatingInput.value);

    if (!nameInput.value.trim()) {
        alert('Please enter your name');
        return;
    }

    if (rating === 0 || isNaN(rating)) {
        alert('Please select a rating');
        return;
    }

    if (!reviewTextarea.value.trim()) {
        alert('Please write a review');
        return;
    }

    if (containsProfanity(nameInput.value) || containsProfanity(reviewTextarea.value)) {
        alert('⚠️ Your review contains inappropriate language. Please revise and resubmit.');
        return;
    }

    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';

    // Attach the current user's pfp (if they have one) to the review
    const userPfp = getCurrentUserPfp() || "";

    const newReview = {
        name: nameInput.value.trim(),
        rating: rating,
        review: reviewTextarea.value.trim(),
        date: new Date().toISOString(),
        pfp: userPfp   // ← stored alongside the review in Sheets / localStorage
    };

    await saveReview(newReview);
    await displayReviews();

    const reviewModalOverlay = document.getElementById('review-modal-overlay');

    if (reviewSuccessMessage) reviewSuccessMessage.classList.add('show');

    setTimeout(() => {
        if (reviewModalOverlay) reviewModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        if (reviewSuccessMessage) reviewSuccessMessage.classList.remove('show');
        form.reset();
        document.querySelectorAll('.star').forEach(star => {
            star.classList.remove('active');
        });
        reviewRatingInput.value = '';
    }, 2000);

    submitButton.disabled = false;
    submitButton.textContent = originalText;

    const reviewsSection = document.getElementById('reviews');
    if (reviewsSection) {
        setTimeout(() => {
            reviewsSection.scrollIntoView({ behavior: 'smooth' });
        }, 500);
    }
}

// ── Inject avatar img styles into the page ──
// (so the circular pfp image looks consistent with the initial avatar)
(function injectAvatarStyles() {
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
    `;
    document.head.appendChild(style);
})();

document.addEventListener('DOMContentLoaded', function () {
    console.log('🌟 Reviews system initializing...');

    displayReviews();

    const reviewForm = document.getElementById('review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }

    console.log('✅ Reviews system loaded!');
});
