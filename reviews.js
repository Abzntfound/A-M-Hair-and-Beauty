// Reviews Management System
// This works with GitHub Pages by storing reviews in the browser's localStorage

// Initialize reviews from localStorage or use default reviews
function getReviews() {
    const storedReviews = localStorage.getItem('amReviews');
    if (storedReviews) {
        return JSON.parse(storedReviews);
    }
    
    // Default reviews if none exist
    return [
        {
            name: "Sarah M.",
            rating: 5,
            review: "Absolutely love this product! My hair has never felt better. The growth oil really works!",
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
        },
        {
            name: "Jessica K.",
            rating: 5,
            review: "The satin bonnet is so comfortable and my hair stays moisturized all night. Highly recommend!",
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week ago
        },
        {
            name: "Maya T.",
            rating: 4,
            review: "Great products! I've noticed a real difference in my hair's shine and strength. Will definitely buy again.",
            date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() // 2 weeks ago
        }
    ];
}

// Save reviews to localStorage
function saveReviews(reviews) {
    localStorage.setItem('amReviews', JSON.stringify(reviews));
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

// Display all reviews
function displayReviews() {
    const reviewsContainer = document.getElementById('reviews-container');
    if (!reviewsContainer) return;
    
    const reviews = getReviews();
    
    // Sort reviews by date (newest first)
    reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Clear container
    reviewsContainer.innerHTML = '';
    
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

// Sanitize HTML to prevent XSS attacks
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Handle form submission
function handleReviewSubmit(event) {
    event.preventDefault();
    
    const form = document.getElementById('reviewForm');
    const nameInput = document.getElementById('name');
    const ratingInputs = document.querySelectorAll('input[name="rating"]');
    const reviewTextarea = document.getElementById('review-text');
    
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
    
    // Create new review object
    const newReview = {
        name: nameInput.value.trim(),
        rating: rating,
        review: reviewTextarea.value.trim(),
        date: new Date().toISOString()
    };
    
    // Get existing reviews and add new one
    const reviews = getReviews();
    reviews.unshift(newReview); // Add to beginning of array
    
    // Save to localStorage
    saveReviews(reviews);
    
    // Refresh display
    displayReviews();
    
    // Close the overlay
    document.getElementById('review-overlay').style.display = 'none';
    
    // Reset form
    form.reset();
    
    // Show success message
    showSuccessMessage();
    
    // Scroll to reviews section
    document.getElementById('customer-reviews').scrollIntoView({ behavior: 'smooth' });
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
    message.textContent = '✓ Thank you for your review!';
    
    document.body.appendChild(message);
    
    // Remove after 3 seconds
    setTimeout(() => {
        message.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => message.remove(), 300);
    }, 3000);
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

// Export functions for potential external use
window.amReviews = {
    getReviews,
    saveReviews,
    displayReviews,
    handleReviewSubmit
};
