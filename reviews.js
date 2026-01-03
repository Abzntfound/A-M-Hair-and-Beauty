<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyDNMt0bgAbjFxjunAz_fP4LIi_g5N2QSuk",
    authDomain: "am-hair-and-beauty.firebaseapp.com",
    projectId: "am-hair-and-beauty",
    storageBucket: "am-hair-and-beauty.firebasestorage.app",
    messagingSenderId: "683802152688",
    appId: "1:683802152688:web:94598e2a32e1b98a8fbc35"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Submit review
  document.getElementById("reviewForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const rating = document.querySelector('input[name="rating"]:checked').value;
    const review = document.getElementById("review").value;

    await addDoc(collection(db, "reviews"), {
      name,
      rating: Number(rating),
      review,
      created: new Date()
    });

    alert("Thank you for your review!");
    e.target.reset();
    loadReviews();
  });

  // Load reviews
  async function loadReviews() {
    const q = query(collection(db, "reviews"), orderBy("created", "desc"));
    const snapshot = await getDocs(q);
    const list = document.getElementById("reviewList");
    list.innerHTML = "";

    snapshot.forEach(doc => {
      const r = doc.data();
      list.innerHTML += `
        <div class="review">
          <strong>${r.name}</strong>
          <div>⭐ ${r.rating}/5</div>
          <p>${r.review}</p>
        </div>
      `;
    });
  }

  loadReviews();
