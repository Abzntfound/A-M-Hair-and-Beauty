// Reviews Management System using Google Sheets
// FREE shared reviews visible to ALL users!

// SETUP INSTRUCTIONS:
// 1. Go to https://sheet.best/ and create a free account
// 2. Connect your Google Sheet with columns: name, rating, review, date
// 3. Get your Sheet.best API URL and paste it below
// 4. FREE tier allows 100 requests per month

const SHEET_BEST_URL = 'https://api.sheetbest.com/sheets/de9f4919-1fda-4381-b13f-df7942993356'; // REPLACE THIS!

// If you haven't set up Sheet.best yet, it will use localStorage as fallback
const USE_GOOGLE_SHEETS = true; // Set to true after you get your Sheet.best URL

// Profanity filter - add words you want to block (keep them lowercase)
const PROFANITY_LIST = [
    'damn', 'hell', 'crap', 'shit', 'fuck', 'ass', 'bitch', 
    'bastard', 'dick', 'piss', 'cock', 'pussy', 'whore', 
    'slut', 'fag', 'nigger', 'cunt', 'asshole', 'motherfucker', 'nigga', 'nga', 'dumbass'
    // Add more words as needed
];

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

// Sanitize HTML to prevent XSS attacks
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Display all reviews
async function displayReviews() {
    const reviewsContainer = document.getElementById('reviews-container');
    if (!reviewsContainer) return;
    
    // Show loading state
    reviewsContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;"><div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #dba9c8; border-radius: 50%; animation: spin 1s linear infinite;"></div><p style="margin-top: 10px;">Loading reviews...</p></div>';
    
    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    if (!document.getElementById('spinner-style')) {
        style.id = 'spinner-style';
        document.head.appendChild(style);
    }
    
    const reviews = await getReviews();
    
    // Sort reviews by date (newest first)
    reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Clear container
    reviewsContainer.innerHTML = '';
    
    if (reviews.length === 0) {
        reviewsContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;"><p>No reviews yet. Be the first to leave a review!</p></div>';
        return;
    }
    
    // Add each review
    reviews.forEach(review => {
        const reviewCard = document.createElement('div');
        reviewCard.className = 'review-card';
        reviewCard.style.cssText = 'background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); transition: transform 0.2s ease;';
        
        reviewCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="font-size: 1.1rem;">${sanitizeHTML(review.name)}</strong>
                <span style="color: gold; font-size: 1.2rem;">${generateStars(review.rating)}</span>
            </div>
            <p style="color: #666; font-style: italic; margin-bottom: 10px;">"${sanitizeHTML(review.review)}"</p>
            <p style="color: #999; font-size: 0.85rem;">${formatDate(review.date)}</p>
        `;
        
        // Add hover effect
        reviewCard.addEventListener('mouseenter', () => {
            reviewCard.style.transform = 'translateY(-5px)';
            reviewCard.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
        });
        reviewCard.addEventListener('mouseleave', () => {
            reviewCard.style.transform = 'translateY(0)';
            reviewCard.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        });
        
        reviewsContainer.appendChild(reviewCard);
    });
}

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
    submitButton.style.opacity = '0.6';
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
    submitButton.style.opacity = '1';
    submitButton.textContent = 'Submit Review';
    
    // Show success message
    showSuccessMessage();
    
    // Scroll to reviews section
    setTimeout(() => {
        document.getElementById('customer-reviews').scrollIntoView({ behavior: 'smooth' });
    }, 500);
}

// Show success message
function showSuccessMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
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
    `;
    message.innerHTML = '<strong>✓ Thank you for your review!</strong><br><small>' + 
        (USE_GOOGLE_SHEETS ? 'Everyone can now see it!' : 'Note: Reviews are stored locally on your device') + 
        '</small>';
    
    document.body.appendChild(message);
    
    // Remove after 4 seconds
    setTimeout(() => {
        message.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => message.remove(), 300);
    }, 4000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Display reviews
    displayReviews();
    
    // Attach form submit handler
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
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
    `;
    document.head.appendChild(style);
});
