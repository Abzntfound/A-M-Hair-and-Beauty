/* ============================================================
   A&M Hair & Beauty — reviews.js (FIXED + ADMIN + STARS)
   ============================================================ */

// ===================== SUPABASE =====================
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
const ADMIN_EMAILS = ["adube6113@outlook.com", "vuyo_ncanywa@yahoo.co.uk"];

// ===================== ANTI-SPAM =====================
let lastPostTime = 0;
const SPAM_DELAY = 5000;

// ===================== REVIEW AUTOSCROLL =====================
let reviewAutoScrollFrame = null;
const REVIEW_SCROLL_SPEED = 0.35; // lower = slower

function stopReviewAutoScroll() {
    if (reviewAutoScrollFrame) {
        cancelAnimationFrame(reviewAutoScrollFrame);
        reviewAutoScrollFrame = null;
    }
}

function startReviewAutoScroll() {
    const container = document.getElementById("reviews-container");
    if (!container) return;

    stopReviewAutoScroll();

    // Remove old cloned cards before rebuilding the seamless loop.
    container.querySelectorAll('[data-review-clone="true"]').forEach(card => card.remove());

    const originalCards = [...container.querySelectorAll(".review-card")];
    if (originalCards.length < 2) return;

    // Continuous scrolling works best without CSS snap forcing cards into place.
    container.style.scrollSnapType = "none";
    container.style.scrollBehavior = "auto";

    // Duplicate the reviews so the end flows directly into the beginning.
    originalCards.forEach(card => {
        const clone = card.cloneNode(true);
        clone.dataset.reviewClone = "true";
        clone.setAttribute("aria-hidden", "true");
        container.appendChild(clone);
    });

    let lastTime = performance.now();

    function tick(now) {
        if (!document.hidden) {
            const delta = Math.min(now - lastTime, 40);
            container.scrollLeft += REVIEW_SCROLL_SPEED * (delta / 16.67);

            // The duplicated set makes this reset visually seamless.
            const loopPoint = container.scrollWidth / 2;
            if (container.scrollLeft >= loopPoint) {
                container.scrollLeft -= loopPoint;
            }
        }

        lastTime = now;
        reviewAutoScrollFrame = requestAnimationFrame(tick);
    }

    reviewAutoScrollFrame = requestAnimationFrame(tick);
}

// ===================== USER =====================
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

    stopReviewAutoScroll();

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

    requestAnimationFrame(startReviewAutoScroll);
}

// ===================== STAR RATING =====================
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
