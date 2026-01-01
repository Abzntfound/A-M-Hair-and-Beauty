const reviewForm = document.getElementById("review-form");

reviewForm.addEventListener("submit", async e => {
  e.preventDefault();

  const activeProduct = document.querySelector(".product-detail[style*='display: block']");
  if (!activeProduct) return alert("Select a product first!");

  const ISSUE_NUMBER = activeProduct.dataset.issue;

  const name = document.getElementById("name");
  const rating = document.getElementById("rating");
  const comment = document.getElementById("comment");

  const body = `
**Name:** ${name.value}
**Rating:** ${rating.value}/5

${comment.value}
  `;

  // This is unsafe in the browser:
  // You should call a backend endpoint instead of calling GitHub directly here
  try {
    await fetch("/submit-review", { // <-- your server endpoint
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issue: ISSUE_NUMBER,
        review: body
      })
    });

    alert("Review submitted for approval!");
    reviewForm.reset();
    closeReviewForm();
  } catch (err) {
    console.error(err);
    alert("Failed to submit review.");
  }
});
