const ISSUE_NUMBER = document
  .getElementById("product")
  .dataset.issue;
const REPO = "USERNAME/product-reviews";

document.getElementById("review-form").addEventListener("submit", e => {
  e.preventDefault();

  const body = `
**Name:** ${name.value}
**Rating:** ${rating.value}/5

${comment.value}
  `;

  fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json"
    },
    body: JSON.stringify({
      event_type: "submit-review",
      client_payload: {
        issue: ISSUE_NUMBER,
        review: body
      }
    })
  });

  alert("Review submitted for approval.");
});
