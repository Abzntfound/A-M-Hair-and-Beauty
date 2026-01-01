const reviewForm = document.getElementById("review-form");
const nameInput = document.getElementById("name");
const ratingInput = document.getElementById("rating");
const commentInput = document.getElementById("comment");

// Open overlay
document.getElementById('review').addEventListener('click', () => {
    reviewForm.reset();
    document.getElementById('review-overlay').style.display = 'flex';
});

// Close overlay
function closeReviewForm() {
    document.getElementById('review-overlay').style.display = 'none';
}

// Get active product (the one visible)
function getActiveProduct() {
    return document.querySelector('.product-detail.show');
}

// Submit review
reviewForm.addEventListener("submit", async e => {
    e.preventDefault();

    const activeProduct = getActiveProduct();
    if (!activeProduct) {
        alert("Please open a product first!");
        return;
    }

    const issueNumber = activeProduct.dataset.issue; // your dataset issue
    const productName = activeProduct.querySelector("h1")?.innerText || "Unknown Product";

    const reviewBody = {
        product: productName,
        name: nameInput.value,
        rating: ratingInput.value,
        comment: commentInput.value,
        issue: issueNumber
    };

    // Temporarily log instead of GitHub fetch
    console.log("Review to send:", reviewBody);

    // Append locally so people see it immediately
    const reviewEl = document.createElement("div");
    reviewEl.style.marginBottom = "1rem";
    reviewEl.innerHTML = `<strong>${nameInput.value}</strong> (${ratingInput.value}/5) for <em>${productName}</em>: <p>${commentInput.value}</p>`;
    document.getElementById("reviews").appendChild(reviewEl);

    reviewForm.reset();
    closeReviewForm();

    alert("Review submitted! It will appear publicly once approved.");
});
