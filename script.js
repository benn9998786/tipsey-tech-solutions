// ============ Tipsey Tech Solutions ============

// --- Mobile nav ---
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  navLinks.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    })
  );
}

// --- Active nav link based on current page ---
const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
document.querySelectorAll("[data-nav]").forEach((a) => {
  const target = (a.getAttribute("href") || "").split("#")[0].toLowerCase();
  if (target === here || (here === "" && target === "index.html")) {
    a.classList.add("active");
    a.setAttribute("aria-current", "page");
  }
});

// --- Scroll reveal ---
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("in"));
}

// --- Header shadow on scroll ---
const header = document.querySelector(".site-header");
if (header) {
  window.addEventListener(
    "scroll",
    () => {
      header.style.boxShadow = window.scrollY > 8 ? "0 6px 24px rgba(17,20,45,0.08)" : "none";
    },
    { passive: true }
  );
}

// --- Work filters (work page) ---
const filterBtns = document.querySelectorAll("[data-filter]");
const workCards = document.querySelectorAll("[data-category]");
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const want = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.toggle("active", b === btn));
    workCards.forEach((card) => {
      const show = want === "all" || card.dataset.category === want;
      card.style.display = show ? "" : "none";
      if (show) card.classList.add("in");
    });
  });
});

// --- Contact form ---
// Where enquiries are POSTed. Change this if the API is deployed on a
// different Render hostname.
const QUOTE_API = "https://tipsey-quotes.onrender.com";
// Shown to the visitor if the submission cannot reach the API.
const FALLBACK_EMAIL = "fromthesky@gmail.com";
const form = document.getElementById("contactForm");
const status = document.getElementById("formStatus");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "form-status";

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!name || !validEmail || !message) {
      status.textContent = "Please add your name, a valid email, and a short message.";
      status.classList.add("err");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }
    status.textContent = "Sending your enquiry…";

    try {
      const res = await fetch(QUOTE_API + "/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          budget: form.budget ? form.budget.value : "",
          // Honeypot — must stay empty for a genuine submission.
          company_website: form.company_website ? form.company_website.value : "",
          sourcePage: location.pathname,
        }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const body = await res.json();
          detail = body.error || "";
        } catch (_) {}
        throw new Error(detail || `Request failed (${res.status})`);
      }

      status.textContent = `Thanks ${name.split(" ")[0]}! We've got your enquiry and will reply within one business day.`;
      status.classList.add("ok");
      form.reset();
    } catch (err) {
      console.error("Quote submission failed:", err);

      // The API could not be reached. Rather than lose the enquiry, hand the
      // visitor a pre-filled email so everything they typed still gets through.
      const subject = "Website quote request from " + name;
      const body =
        "Name: " + name +
        "\nEmail: " + email +
        (form.budget && form.budget.value ? "\nBudget: " + form.budget.value : "") +
        "\n\nProject details:\n" + message +
        "\n\n(Sent from the website contact form)";

      status.textContent = "";
      const note = document.createElement("span");
      note.textContent = "We couldn't send that automatically. ";
      const link = document.createElement("a");
      link.href =
        "mailto:" + FALLBACK_EMAIL +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);
      link.textContent = "Click here to send it by email";
      link.style.color = "inherit";
      link.style.textDecoration = "underline";
      status.appendChild(note);
      status.appendChild(link);
      status.append(
        document.createTextNode(
          " — your message is already filled in, just hit send."
        )
      );
      status.classList.add("err");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    }
  });
}

// --- Scroll progress bar ---
const progress = document.createElement("div");
progress.className = "scroll-progress";
progress.setAttribute("aria-hidden", "true");
document.body.appendChild(progress);
const updateProgress = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
};
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

// --- Count-up stats when visible ---
const counters = document.querySelectorAll(".hero-stats strong, .stat-strip strong");
const runCount = (el) => {
  const raw = el.textContent;
  const match = raw.match(/^([^0-9]*)([0-9][0-9.,]*)(.*)$/);
  if (!match) return;
  const [, prefix, numStr, suffix] = match;
  const target = parseFloat(numStr.replace(/,/g, ""));
  if (!isFinite(target) || target === 0) return;
  const decimals = (numStr.split(".")[1] || "").length;
  const grouped = numStr.includes(",");
  const start = performance.now();
  const dur = 1100;
  const tick = (now) => {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    let val = (target * eased).toFixed(decimals);
    if (grouped) val = Number(val).toLocaleString("en-GB");
    el.textContent = prefix + val + suffix;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = raw;
  };
  requestAnimationFrame(tick);
};
if ("IntersectionObserver" in window && counters.length) {
  const countIo = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { runCount(e.target); countIo.unobserve(e.target); }
    }),
    { threshold: 0.6 }
  );
  counters.forEach((c) => countIo.observe(c));
}

// --- Footer year ---
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
