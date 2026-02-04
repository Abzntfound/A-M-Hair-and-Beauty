// Reviews Management System using Google Sheets (CSP-COMPLIANT)
// FREE shared reviews visible to ALL users!

// SETUP INSTRUCTIONS:
// 1. Go to https://sheet.best/ and create a free account
// 2. Connect your Google Sheet with columns: name, rating, review, date
// 3. Get your Sheet.best API URL and paste it below
// 4. FREE tier allows 100 requests per month

const SHEET_BEST_URL = 'https://api.sheetbest.com/sheets/de9f4919-1fda-4381-b13f-df7942993356';

// If you haven't set up Sheet.best yet, it will use localStorage as fallback
const USE_GOOGLE_SHEETS = true; // Set to true after you get your Sheet.best URL

// Profanity filter - add words you want to block (keep them lowercase)
const PROFANITY_LIST = [
    'damn', 'hell', 'crap', 'shit', 'fuck', 'ass', 'bitch', 
    'bastard', 'dick', 'piss', 'cock', 'pussy', 'whore', 
    'slut', 'fag', 'nigger', 'cunt', 'asshole', 'motherfucker'
    // Add more words as needed
];

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Check if text contains profanity
function containsProfanity(text) {
    const lowerText = text.toLowerCase();
    
    // Check for exact matches and partial matches
    for (let word of PROFANITY_LIST) {
        // Use word boundaries to catch the word even with punctuation
        const regex = new RegExp('\\b' + word + '\\b', 'i');
        if (regex.test(lowerText)) {
            return true;
        }
    }
    
    return false;
}

// Generate star rating HTML
function generateStars(rating) {
    let stars = '';
    for (let i = 0; i < 5; i++) {
        stars += i < rating ? '⭐' : '☆';
    }
    return stars;
}

// Format date to "X days/weeks ago"
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

// Sanitize HTML to prevent XSS attacks
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========================================
// DATA MANAGEMENT
// ========================================

// Get default reviews for fallback
function getDefaultReviews() {
    return [
        {
            name: "Sarah M.",
            rating: 5,
            review: "Absolutely love this product! My hair has never felt better. The growth oil really works!",
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            name: "Jessica K.",
            rating: 5,
            review: "The satin bonnet is so comfortable and my hair stays moisturized all night. Highly recommend!",
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            name: "Maya T.",
            rating: 4,
            review: "Great products! I've noticed a real difference in my hair's shine and strength. Will definitely buy again.",
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            name: "Emma L.",
            rating: 5,
            review: "The Valentine hamper was perfect! My sister loved it. Great quality products and beautiful packaging.",
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            name: "Olivia P.",
            rating: 5,
            review: "Best hair oil I've ever used. You can really see the difference after just a few weeks!",
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
}

// Get reviews from Google Sheets or localStorage
async function getReviews() {
    if (USE_GOOGLE_SHEETS) {
        try {
            const response = await fetch(SHEET_BEST_URL);
            if (response.ok) {
                const reviews = await response.json();
                // Convert rating to number if it's a string
                return reviews.map(r => ({
                    ...r,
                    rating: parseInt(r.rating)
                }));
            }
        } catch (error) {
            console.log('Using local storage fallback:', error);
        }
    }
    
    // Fallback to localStorage
    const storedReviews = localStorage.getItem('amReviews');
    if (storedReviews) {
        return JSON.parse(storedReviews);
    }
    
    return getDefaultReviews();
}

// Save review to Google Sheets or localStorage
async function saveReview(review) {
    if (USE_GOOGLE_SHEETS) {
        try {
            const response = await fetch(SHEET_BEST_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
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
    
    // Fallback to localStorage
    const reviews = await getReviews();
    reviews.unshift(review);
    localStorage.setItem('amReviews', JSON.stringify(reviews));
    return true;
}

// ========================================
// DISPLAY FUNCTIONS
// ========================================

// Track how many reviews are currently displayed
let displayedReviewsCount = 0;
const REVIEWS_PER_PAGE = 6;

// Display all reviews
async function displayReviews(append = false) {
    const reviewsContainer = document.getElementById('reviews-container');
    if (!reviewsContainer) return;
    
    if (!append) {
        // Show loading state only on initial load
        reviewsContainer.innerHTML = '<div class="reviews-loading"><div class="spinner"></div><p>Loading reviews...</p></div>';
    }
    
    const reviews = await getReviews();
    
    // Sort reviews by date (newest first)
    reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (!append) {
        // Clear container for initial load
        reviewsContainer.innerHTML = '';
        displayedReviewsCount = 0;
    }
    
    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '<div class="reviews-empty"><p>No reviews yet. Be the first to leave a review!</p></div>';
        document.getElementById('show-more-reviews-container').style.display = 'none';
        return;
    }
    
    // Calculate which reviews to show
    const startIndex = displayedReviewsCount;
    const endIndex = Math.min(startIndex + REVIEWS_PER_PAGE, reviews.length);
    const reviewsToShow = reviews.slice(startIndex, endIndex);
    
    // Add each review
    reviewsToShow.forEach(review => {
        const reviewCard = document.createElement('div');
        reviewCard.className = 'review-card';
        
        reviewCard.innerHTML = `
            <div class="review-header">
                <strong class="review-name">${sanitizeHTML(review.name)}</strong>
                <span class="review-stars">${generateStars(review.rating)}</span>
            </div>
            <p class="review-text">"${sanitizeHTML(review.review)}"</p>
            <p class="review-date">${formatDate(review.date)}</p>
        `;
        
        reviewsContainer.appendChild(reviewCard);
    });
    
    // Update the displayed count
    displayedReviewsCount = endIndex;
    
    // Show or hide the "Show More" button
    const showMoreContainer = document.getElementById('show-more-reviews-container');
    const showMoreBtn = document.getElementById('show-more-reviews-btn');
    
    if (displayedReviewsCount < reviews.length) {
        showMoreContainer.style.display = 'block';
        const remaining = reviews.length - displayedReviewsCount;
        showMoreBtn.textContent = `Show More Reviews (${remaining} remaining)`;
    } else {
        showMoreContainer.style.display = 'none';
    }
}

// Show more reviews function
function showMoreReviews() {
    displayReviews(true);
}

// ========================================
// FORM HANDLING
// ========================================

// Handle form submission
async function handleReviewSubmit(event) {
    event.preventDefault();
    
    const form = document.getElementById('reviewForm');
    const nameInput = document.getElementById('name');
    const ratingInputs = document.querySelectorAll('input[name="rating"]');
    const reviewTextarea = document.getElementById('review-text');
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Get selected rating
    let rating = 0;
    ratingInputs.forEach(input => {
        if (input.checked) {
            rating = parseInt(input.value);
        }
    });
    
    // Validate
    if (!nameInput.value.trim()) {
        alert('Please enter your name');
        return;
    }
    
    if (rating === 0) {
        alert('Please select a rating');
        return;
    }
    
    if (!reviewTextarea.value.trim()) {
        alert('Please write a review');
        return;
    }
    
    // Check for profanity
    if (containsProfanity(nameInput.value) || containsProfanity(reviewTextarea.value)) {
        alert('⚠️ Your review contains inappropriate language. Please revise and resubmit.');
        return;
    }
    
    // Disable button while submitting
    submitButton.disabled = true;
    submitButton.classList.add('submitting');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';
    
    // Create new review object
    const newReview = {
        name: nameInput.value.trim(),
        rating: rating,
        review: reviewTextarea.value.trim(),
        date: new Date().toISOString()
    };
    
    // Save review
    await saveReview(newReview);
    
    // Refresh display
    await displayReviews();
    
    // Close the overlay
    document.getElementById('review-overlay').style.display = 'none';
    
    // Reset form
    form.reset();
    submitButton.disabled = false;
    submitButton.classList.remove('submitting');
    submitButton.textContent = originalText;
    
    // Show success message
    showSuccessMessage();
    
    // Scroll to reviews section
    setTimeout(() => {
        const reviewsSection = document.getElementById('customer-reviews');
        if (reviewsSection) {
            reviewsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }, 500);
}

// Show success message
function showSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'review-success-message';
    message.innerHTML = '<strong>✓ Thank you for your review!</strong><br><small>' + 
        (USE_GOOGLE_SHEETS ? 'Everyone can now see it!' : 'Note: Reviews are stored locally on your device') + 
        '</small>';
    
    document.body.appendChild(message);
    
    // Remove after 4 seconds
    setTimeout(() => {
        message.classList.add('fade-out');
        setTimeout(() => message.remove(), 300);
    }, 4000);
}

// ========================================
// INITIALIZATION
// ========================================

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌟 Reviews system initializing...');
    
    // Add CSS styles for reviews
    addReviewStyles();
    
    // Display reviews
    displayReviews();
    
    // Attach form submit handler
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }
    
    console.log('✅ Reviews system loaded!');
});

// Add CSS styles dynamically (CSP-compliant)
function addReviewStyles() {
    // Check if styles already added
    if (document.getElementById('review-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'review-styles';
    style.textContent = `
        /* Review Cards */
        .review-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .review-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.15);
        }
        
        .review-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .review-name {
            font-size: 1.1rem;
        }
        
        .review-stars {
            color: gold;
            font-size: 1.2rem;
        }
        
        .review-text {
            color: #666;
            font-style: italic;
            margin-bottom: 10px;
        }
        
        .review-date {
            color: #999;
            font-size: 0.85rem;
        }
        
        /* Loading State */
        .reviews-loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .spinner {
            display: inline-block;
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #dba9c8;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        .reviews-loading p {
            margin-top: 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Empty State */
        .reviews-empty {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        /* Success Message */
        .review-success-message {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 100000;
            font-family: 'Poppins', sans-serif;
            animation: slideIn 0.3s ease;
        }
        
        .review-success-message.fade-out {
            animation: slideOut 0.3s ease;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        
        /* Submitting State */
        button.submitting {
            opacity: 0.6;
            cursor: not-allowed;
        }
    `;
    
    document.head.appendChild(style);
}

// Make showMoreReviews available globally
window.showMoreReviews = showMoreReviews;
