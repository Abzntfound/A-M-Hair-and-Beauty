const REPO = "Abzntfound/A-M-Hair-and-Beauty";

document.getElementById("review-form").addEventListener("submit", async e => {
  e.preventDefault();

  const product = document.querySelector(".product-detail.show");
  const issue = product.dataset.issue;

  const review = `
**Name:** ${name.value}
**Rating:** ${rating.value}/5

${comment.value}
`;

  await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json"
    },
    body: JSON.stringify({
      event_type: "submit-review",
      client_payload: { issue, review }
    })
  });

  alert("Review submitted!");
});
async function loadReviews() {
  const product = document.querySelector(".product-detail.show");
  if (!product) return;

  const issue = product.dataset.issue;
  const reviewsDiv = document.getElementById("reviews");

  const res = await fetch(
    `https://api.github.com/repos/Abzntfound/A-M-Hair-and-Beauty/issues/${issue}/comments`
  );

  const comments = await res.json();

  reviewsDiv.innerHTML = comments.map(c => `
    <div class="review">
      <strong>${c.user.login}</strong>
      <p>${c.body}</p>
      <hr>
    </div>
  `).join("");
}

loadReviews();
