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
// Enquiries are delivered straight to this inbox by FormSubmit, which needs no
// backend and no account. If it cannot be reached we hand the visitor a
// pre-filled email instead, so an enquiry is never silently lost.
const FORM_ENDPOINT =
  "https://formsubmit.co/ajax/lolfromthesky@gmail.com";
// The inbox enquiries land in, also used to build the fallback email.
const FALLBACK_EMAIL = "lolfromthesky@gmail.com";
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
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
          budget: form.budget ? form.budget.value : "",
          page: location.pathname,
          // Honeypot — must stay empty for a genuine submission.
          company_website: form.company_website ? form.company_website.value : "",
          _subject: "New website quote request from " + name,
          _template: "table",
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!result.success || result.success === "false") {
        throw new Error(result.message || `Request failed (${res.status})`);
      }

      // Draw the tick first so it animates as the confirmation appears.
      status.className = "form-status form-sent ok";
      status.textContent = "";
      const tick = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      tick.setAttribute("class", "tick");
      tick.setAttribute("viewBox", "0 0 24 24");
      tick.setAttribute("aria-hidden", "true");
      tick.innerHTML =
        '<circle cx="12" cy="12" r="10"></circle><path d="M7 12.4l3.4 3.4L17.4 8.8"></path>';
      status.appendChild(tick);
      status.appendChild(
        document.createTextNode(
          `Thanks ${name.split(" ")[0]}! We've got your enquiry and will reply within one business day.`
        )
      );
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
  // Only worth animating if there is somewhere to count to. Small figures
  // ("5 packages") just flicker for a frame and look like a glitch.
  if (!isFinite(target) || target < 10) return;
  const decimals = (numStr.split(".")[1] || "").length;
  const grouped = numStr.includes(",");
  const start = performance.now();
  const dur = 1100;
  const tick = (now) => {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    let val = (target * eased).toFixed(decimals);
    if (grouped) val = Number(val).toLocaleString("en-IN");
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

// ============================================================
// Motion & graphics
// Everything below is decorative and additive. It is all guarded:
// nothing attaches unless the visitor has not asked for reduced
// motion, and every selector is optional so the file stays safe to
// load on any page.
// ============================================================
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motionOff = reduced.matches;
  const onMotionChange = () => { motionOff = reduced.matches; };
  if (reduced.addEventListener) reduced.addEventListener("change", onMotionChange);
  else if (reduced.addListener) reduced.addListener(onMotionChange);

  // Throttle to one call per frame, with a timeout backstop. Some environments
  // (backgrounded tabs, embedded webviews) never paint a frame, and a plain rAF
  // guard would then latch "busy" forever and freeze every scroll effect.
  let frameQueued = false;
  const frameOnce = (fn) => {
    if (frameQueued) return;
    frameQueued = true;
    const run = () => { frameQueued = false; fn(); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run);
    setTimeout(run, 60);
  };

  // ---------- Scroll-drawn timeline for .steps ----------
  const steps = document.querySelector(".steps");
  if (steps) {
    const paintProgress = () => {
      const rect = steps.getBoundingClientRect();
      const anchor = window.innerHeight * 0.68;
      // 0 when the top of the block reaches the anchor, 1 when the bottom does.
      const total = rect.height || 1;
      const seen = (anchor - rect.top) / total;
      const p = Math.min(1, Math.max(0, seen));
      steps.style.setProperty("--progress", motionOff ? "1" : p.toFixed(3));
    };
    const onScroll = () => frameOnce(paintProgress);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    paintProgress();
  }

  // ---------- Pointer tilt on cards ----------
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (canHover.matches) {
    document.querySelectorAll(".card, .price-card, .work-card").forEach((card) => {
      card.classList.add("tilt");
      if (motionOff) return;

      card.addEventListener("pointerenter", () => card.classList.add("is-tilting"));
      card.addEventListener("pointermove", (e) => {
        if (motionOff) return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--ry", (px * 9).toFixed(2) + "deg");
        card.style.setProperty("--rx", (-py * 7).toFixed(2) + "deg");
      });
      const reset = () => {
        card.classList.remove("is-tilting");
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--rx", "0deg");
      };
      card.addEventListener("pointerleave", reset);
      card.addEventListener("blur", reset, true);
    });
  }

  // ---------- Inline icon line-draw ----------
  const drawTargets = document.querySelectorAll(".reveal .icon svg, .step svg");
  if (drawTargets.length) {
    const drawables = document.querySelectorAll(
      ".reveal .icon svg, .step svg"
    );
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      drawTargets.forEach((svg) => svg.parentElement.classList.add("draw", "in"));
    };
    if (motionOff || !("IntersectionObserver" in window)) {
      show();
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((en) => en.isIntersecting)) {
            show();
            io.disconnect();
          }
        },
        { threshold: 0.3 }
      );
      const first = document.querySelector(".reveal .icon svg, .step svg");
      if (first) io.observe(first.parentElement);
      // Safety net: if the observer never fires, show anyway.
      setTimeout(show, 2500);
    }
  }

  // ---------- Parallax on split media ----------
  const media = document.querySelectorAll(".split-media img, .hero-art img");
  if (media.length) {
    const apply = () => {
      const vh = window.innerHeight;
      media.forEach((img) => {
        const host = img.parentElement;
        const r = host.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        // -0.5 .. 0.5 across the viewport, mapped to a gentle 22px range.
        const offset = ((r.top + r.height / 2 - vh / 2) / vh) * -22;
        img.style.setProperty("--py", (motionOff ? 0 : offset).toFixed(1) + "px");
      });
    };
    window.addEventListener("scroll", () => frameOnce(apply), {
      passive: true,
    });
    window.addEventListener("resize", apply);
    apply();
  }
})();
