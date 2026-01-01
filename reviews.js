const REPO = "Abzntfound/A-M-Hair-and-Beauty";

// Load reviews for the currently shown product
async function loadReviews() {
  const product = document.querySelector(".product-detail.show");
  if (!product) return;

  const issue = product.dataset.issue;
  const reviewsDiv = document.getElementById("reviews");

  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/issues/${issue}/comments`
    );

    if (!res.ok) throw new Error("Failed to fetch reviews");

    const comments = await res.json();

    if (comments.length === 0) {
      reviewsDiv.innerHTML = "<p>No reviews yet. Be the first to submit one!</p>";
      return;
    }

    reviewsDiv.innerHTML = comments
      .map(c => `
        <div class="review" style="margin-bottom:10px;">
          <strong>${c.user.login}</strong> says:
          <p>${c.body.replace(/\n/g, "<br>")}</p>
          <hr>
        </div>
      `)
      .join("");
  } catch (err) {
    reviewsDiv.innerHTML = `<p style="color:red;">Error loading reviews: ${err.message}</p>`;
  }
}

// Call this on page load
loadReviews();

// Optional: Refresh reviews if the user navigates between products
document.querySelectorAll(".product-detail").forEach(p => {
  p.addEventListener("click", () => {
    setTimeout(loadReviews, 300); // wait a little for show class to be applied
  });
});
