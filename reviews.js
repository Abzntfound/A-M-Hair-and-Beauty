// Select the review form and inputs
const reviewForm = document.getElementById("review-form");
const nameInput = document.getElementById("name");
const ratingInput = document.getElementById("rating");
const commentInput = document.getElementById("comment");

// Show review overlay
document.getElementById('review').addEventListener('click', () => {
    reviewForm.reset();
    document.getElementById('review-overlay').style.display = 'flex';
});

// Close overlay
function closeReviewForm() {
    document.getElementById('review-overlay').style.display = 'none';
}

// Get the currently visible product
function getActiveProduct() {
    return Array.from(document.querySelectorAll('.product-detail')).find(
        el => el.style.display === 'block'
    );
}

// Handle form submission
reviewForm.addEventListener("submit", e => {
    e.preventDefault();

    const activeProduct = getActiveProduct();
    if (!activeProduct) {
        alert("Please open a product first!");
        return;
    }

    const ISSUE_NUMBER = activeProduct.dataset.issue;
    const productName = activeProduct.querySelector("h1").innerText;

    const reviewBody = `
**Product:** ${productName}
**Name:** ${nameInput.value}
**Rating:** ${ratingInput.value}/5

${commentInput.value}
    `;

    // Append review to the reviews container
    const reviewsContainer = document.getElementById("reviews");
    const reviewEl = document.createElement("div");
    reviewEl.style.marginBottom = "1rem";
    reviewEl.innerHTML = `<strong>${nameInput.value}</strong> (${ratingInput.value}/5): <p>${commentInput.value}</p>`;
    reviewsContainer.appendChild(reviewEl);

    // Reset and close form
    reviewForm.reset();
    closeReviewForm();

    alert("Review submitted for approval.");

    // Optional: send review to GitHub
    const REPO = "USERNAME/product-reviews"; 
    fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
        method: "POST",
        headers: { "Accept": "application/vnd.github+json" },
        body: JSON.stringify({
            event_type: "submit-review",
            client_payload: {
                issue: ISSUE_NUMBER,
                review: reviewBody
            }
        })
    }).catch(err => console.log("GitHub dispatch failed:", err));
});
