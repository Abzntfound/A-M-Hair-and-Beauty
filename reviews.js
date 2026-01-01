const reviewForm = document.getElementById("review-form");
const nameInput = document.getElementById("name");
const ratingInput = document.getElementById("rating");
const commentInput = document.getElementById("comment");

// Open review overlay
document.getElementById('review').addEventListener('click', () => {
    reviewForm.reset();
    document.getElementById('review-overlay').style.display = 'flex';
});

// Close overlay
function closeReviewForm() {
    document.getElementById('review-overlay').style.display = 'none';
}

// Get currently active product
function getActiveProduct() {
    return document.querySelector('.product-detail.show');
}

// Submit review
reviewForm.addEventListener("submit", e => {
    e.preventDefault();

    const activeProduct = getActiveProduct();
    if (!activeProduct) {
        alert("Please open a product first!");
        return;
    }

    const productName = activeProduct.querySelector("h1")?.innerText || "Unknown Product";

    // Create review content
    const reviewEl = document.createElement("div");
    reviewEl.style.marginBottom = "1rem";
    reviewEl.innerHTML = `<strong>${nameInput.value}</strong> (${ratingInput.value}/5): <p>${commentInput.value}</p>`;

    // Append to reviews container
    document.getElementById("reviews").appendChild(reviewEl);

    reviewForm.reset();
    closeReviewForm();

    alert("Review submitted successfully!");
});
