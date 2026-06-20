/* ============================================================
   A&M Hair & Beauty — reviews.js (FIXED + ADMIN + STARS)
   ============================================================ */

// ===================== SUPABASE =====================
// IMPORTANT: don't capture window.supabaseClient into a constant at
// load time. nav.js now creates that client asynchronously (it may
// need to fetch the Supabase SDK from CDN first), so if reviews.js
// grabs window.supabaseClient the instant this script runs, it can
// easily capture `undefined` and never look again — which is
// exactly what caused "Cannot read properties of undefined (reading
// 'channel'/'from')". Instead, every function below asks for the
// client fresh, and waits for it if it isn't ready yet.
function waitForSupabaseClient(timeoutMs = 8000) {
    if (window.supabaseClient) return Promise.resolve(window.supabaseClient);

    return new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
            if (window.supabaseClient) {
                clearInterval(interval);
                resolve(window.supabaseClient);
            } else if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                reject(new Error('Timed out waiting for window.supabaseClient'));
            }
        }, 50);
    });
}

// ===================== ADMIN =====================
const ADMIN_EMAILS = ["adube6113@outlook.com", "vuy_ncanywa@yahoo.co.uk"];

// ===================== ANTI-SPAM =====================
let lastPostTime = 0;
const SPAM_DELAY = 5000; // 5 seconds

// ===================== USER =====================
// NOTE: auth.js stores the logged-in user under the "am_user" key
// (see saveLocalUser() in auth.js).
function getUser() {
    try {
        return JSON.parse(localStorage.getItem("am_user") || "null");
    } catch {
        return null;
    }
}

function isAdmin() {
    const user = getUser();
    return user && ADMIN_EMAILS.includes(user.email);
}

// ===================== PROFANITY FILTER =====================
const BAD_WORDS = [
    'damn','hell','crap','shit','fuck','ass','bitch','bastard',
    'dick','piss','cock','pussy','whore','slut','fag','nigger',
    'cunt','asshole','motherfucker'
];

function hasProfanity(text) {
    return BAD_WORDS.some(w =>
        new RegExp(`\\b${w}\\b`, "i").test(text)
    );
}

// ===================== HELPERS =====================
function safe(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
}

function stars(n) {
    n = Number(n) || 0;
    return "★★★★★☆☆☆☆☆".slice(5 - n, 10 - n);
}

function timeAgo(dateStr) {
    const d = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
    if (d <= 0) return "Today";
    if (d === 1) return "1 day ago";
    if (d < 7) return `${d} days ago`;
    if (d < 14) return "1 week ago";
    if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
    return `${Math.floor(d / 30)} months ago`;
}

// ===================== FETCH REVIEWS =====================
async function fetchReviews() {
    let client;
    try {
        client = await waitForSupabaseClient();
    } catch (err) {
        console.error("reviews.js: Supabase client never became available:", err);
        return [];
    }

    const { data, error } = await client
        .from("reviews")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        console.error("Fetch error:", error);
        return [];
    }

    return data || [];
}

// ===================== SAVE REVIEW =====================
async function saveReview(review) {
    const now = Date.now();

    if (now - lastPostTime < SPAM_DELAY) {
        alert("Please wait a few seconds before posting again.");
        return false;
    }

    lastPostTime = now;

    let client;
    try {
        client = await waitForSupabaseClient();
    } catch (err) {
        console.error("reviews.js: Supabase client never became available:", err);
        alert("Couldn't connect to post your review. Please refresh and try again.");
        return false;
    }

    const { error } = await client
        .from("reviews")
        .insert([review]);

    if (error) {
        console.error("Insert error:", error);
        return false;
    }

    return true;
}

// ===================== ADMIN REPLY =====================
async function addReply(id) {
    if (!isAdmin()) {
        alert("Not allowed");
        return;
    }

    const reply = prompt("Enter admin reply:");
    if (!reply) return;

    const user = getUser();

    let client;
    try {
        client = await waitForSupabaseClient();
    } catch (err) {
        console.error("reviews.js: Supabase client never became available:", err);
        alert("Couldn't connect. Please refresh and try again.");
        return;
    }

    const { error } = await client
        .from("reviews")
        .update({
            reply,
            // name lives under user.profile.name, not user.name
            reply_author: user?.profile?.name || "Admin"
        })
        .eq("id", id);

    if (error) {
        console.error("Reply error:", error);
        alert("Couldn't save reply: " + error.message);
        return;
    }

    displayReviews();
}

// ===================== RENDER REVIEWS =====================
async function displayReviews() {
    const container = document.getElementById("reviews-container");
    if (!container) return;

    container.innerHTML = `
        <p style="text-align:center;color:#aaa">Loading reviews...</p>
    `;

    const reviews = await fetchReviews();

    if (!reviews.length) {
        container.innerHTML = `
            <p style="text-align:center;color:#aaa">No reviews yet. Be the first!</p>
        `;
        return;
    }

    container.innerHTML = reviews.map(r => `
        <div class="review-card">
            
            <div class="review-header">
                <div>
                    <h3>${safe(r.name)}</h3>
                    <div style="color:#fbbf24;font-size:1.1rem">
                        ${stars(r.rating)}
                    </div>
                </div>
            </div>

            <p class="review-text">"${safe(r.review)}"</p>

            ${r.reply ? `
                <div class="review-reply">
                    <strong>${safe(r.reply_author || "Admin")}:</strong>
                    <p>${safe(r.reply)}</p>
                </div>
            ` : ""}

            <p style="font-size:0.8rem;color:#999">
                ${timeAgo(r.date)}
            </p>

            ${isAdmin() ? `
                <button onclick="addReply(${r.id})"
                    style="margin-top:10px;padding:6px 10px;border:none;
                    background:#ec4899;color:white;border-radius:6px;cursor:pointer">
                    Reply (Admin)
                </button>
            ` : ""}

        </div>
    `).join("");
}

// ===================== STAR RATING (FIXED) =====================
function initStars() {
    const starsEl = document.querySelectorAll(".star");
    const input = document.getElementById("review-rating");

    if (!starsEl || !input) return;

    starsEl.forEach(star => {
        star.addEventListener("click", () => {
            const value = Number(star.dataset.rating);
            input.value = value;

            starsEl.forEach(s => {
                const r = Number(s.dataset.rating);
                s.style.color = r <= value ? "#fbbf24" : "#ddd";
            });
        });
    });
}

// ===================== SUBMIT REVIEW =====================
async function handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById("review-name").value.trim();
    const review = document.getElementById("review-text").value.trim();
    const rating = document.getElementById("review-rating").value;

    if (!name || !review || !rating) {
        alert("Fill all fields");
        return;
    }

    if (hasProfanity(name) || hasProfanity(review)) {
        alert("Inappropriate language detected");
        return;
    }

    const user = getUser();

    const success = await saveReview({
        name,
        review,
        rating: Number(rating),
        date: new Date().toISOString(),
        // pfp lives under user.profile.pfp, not user.pfp
        pfp: user?.profile?.pfp || ""
    });

    if (success) {
        await displayReviews();

        document.getElementById("review-form")?.reset();
        document.getElementById("review-rating").value = "";

        const modal = document.getElementById("review-modal-overlay");
        modal?.classList.remove("active");
        document.body.style.overflow = "";
    }
}

// ===================== REALTIME =====================
async function subscribe() {
    let client;
    try {
        client = await waitForSupabaseClient();
    } catch (err) {
        console.error("reviews.js: Supabase client never became available, skipping realtime subscription:", err);
        return;
    }

    client
        .channel("reviews")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "reviews"
        }, () => {
            displayReviews();
        })
        .subscribe();
}

// ===================== INIT =====================
document.addEventListener("DOMContentLoaded", () => {
    displayReviews();
    initStars();
    subscribe();

    document.getElementById("review-form")
        ?.addEventListener("submit", handleSubmit);

    const openBtn = document.getElementById("leave-review-btn");
    const modal = document.getElementById("review-modal-overlay");

    openBtn?.addEventListener("click", () => {
        modal?.classList.add("active");
        document.body.style.overflow = "hidden";
    });

    modal?.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("active");
            document.body.style.overflow = "";
        }
    });
});

console.log("✅ reviews.js loaded (fixed version)");
