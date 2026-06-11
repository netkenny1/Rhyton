/* ============================================================
   RHYTON PROPERTIES — interactions & animations
   ============================================================ */
(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- Preloader ---------- */
  const preloader = document.getElementById("preloader");
  document.body.classList.add("is-locked");

  function finishLoading() {
    preloader.classList.add("is-done");
    document.body.classList.remove("is-locked");
    document.body.classList.add("is-loaded");
  }

  if (prefersReducedMotion) {
    finishLoading();
  } else {
    // Hold the brand reveal a beat, but never block longer than 2.4s
    const minDelay = new Promise((res) => setTimeout(res, 1800));
    const loaded = new Promise((res) => {
      if (document.readyState === "complete") res();
      else window.addEventListener("load", res, { once: true });
    });
    Promise.race([
      Promise.all([minDelay, loaded]),
      new Promise((res) => setTimeout(res, 2400)),
    ]).then(finishLoading);
  }

  /* ---------- Custom cursor ---------- */
  const cursor = document.getElementById("cursor");
  const cursorDot = document.getElementById("cursorDot");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
    .matches;

  if (finePointer && !prefersReducedMotion) {
    let mx = -100, my = -100, cx = -100, cy = -100;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      cursorDot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });

    (function lerpCursor() {
      cx += (mx - cx) * 0.16;
      cy += (my - cy) * 0.16;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(lerpCursor);
    })();

    document.querySelectorAll("[data-cursor]").forEach((el) => {
      const mode = el.dataset.cursor === "view" ? "is-view" : "is-link";
      el.addEventListener("mouseenter", () => cursor.classList.add(mode));
      el.addEventListener("mouseleave", () => cursor.classList.remove(mode));
    });
  }

  /* ---------- Header on scroll ---------- */
  const header = document.getElementById("header");
  let lastY = window.scrollY;

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      header.classList.toggle("is-scrolled", y > 40);
      // Hide on scroll down, show on scroll up (after the hero)
      if (y > 600 && y > lastY + 4) header.classList.add("is-hidden");
      else if (y < lastY - 4) header.classList.remove("is-hidden");
      lastY = y;
    },
    { passive: true }
  );

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobileMenu");

  function toggleMenu(force) {
    const open =
      typeof force === "boolean"
        ? force
        : !mobileMenu.classList.contains("is-open");
    mobileMenu.classList.toggle("is-open", open);
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    mobileMenu.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("is-locked", open);
  }

  burger.addEventListener("click", () => toggleMenu());
  mobileMenu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => toggleMenu(false))
  );

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll("[data-reveal]");

  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    // Stagger siblings that enter together
    const io = new IntersectionObserver(
      (entries) => {
        let delay = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.style.setProperty("--d", `${delay}s`);
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
          delay += 0.08;
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Animated counters ---------- */
  const counters = document.querySelectorAll(".counter");

  function animateCounter(el) {
    const target = parseFloat(el.dataset.target);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const duration = 1800;
    const start = performance.now();

    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const counterIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          counterIO.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((c) => counterIO.observe(c));
  } else {
    counters.forEach((c) => {
      c.textContent = parseFloat(c.dataset.target).toFixed(
        parseInt(c.dataset.decimals || "0", 10)
      );
    });
  }

  /* ---------- Property filter ---------- */
  const filterBtns = document.querySelectorAll(".filter__btn");
  const cards = document.querySelectorAll(".card");

  function applyFilter(value) {
    cards.forEach((card) => {
      const show = value === "all" || card.dataset.category === value;
      card.classList.toggle("is-filtered", !show);
    });
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      applyFilter(btn.dataset.filter);
    });
  });

  /* ---------- Hero search ---------- */
  const searchTabs = document.querySelectorAll(".search__tab");
  let activeDeal = "buy";

  searchTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      searchTabs.forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      activeDeal = tab.dataset.deal;
    });
  });

  document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    // Mirror the chosen deal type onto the portfolio filter and scroll there
    const targetBtn = document.querySelector(
      `.filter__btn[data-filter="${activeDeal}"]`
    );
    if (targetBtn) targetBtn.click();
    document
      .getElementById("properties")
      .scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  /* ---------- Parallax (about image) ---------- */
  const parallaxImg = document.querySelector(".parallax-img");

  if (parallaxImg && !prefersReducedMotion) {
    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const rect = parallaxImg.parentElement.getBoundingClientRect();
          const vh = window.innerHeight;
          if (rect.bottom > 0 && rect.top < vh) {
            const progress = (vh - rect.top) / (vh + rect.height);
            parallaxImg.style.transform = `translateY(${(progress - 0.5) * -40}px)`;
          }
          ticking = false;
        });
      },
      { passive: true }
    );
  }

  /* ---------- Testimonial slider ---------- */
  const track = document.getElementById("sliderTrack");
  const slides = track.children;
  const dotsWrap = document.getElementById("sliderDots");
  let current = 0;
  let autoTimer;

  Array.from(slides).forEach((_, i) => {
    const dot = document.createElement("button");
    dot.setAttribute("aria-label", `Go to testimonial ${i + 1}`);
    dot.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(dot);
  });

  const dots = dotsWrap.children;

  function goTo(i) {
    current = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    Array.from(dots).forEach((d, j) =>
      d.classList.toggle("is-active", j === current)
    );
    restartAuto();
  }

  function restartAuto() {
    clearInterval(autoTimer);
    if (!prefersReducedMotion) {
      autoTimer = setInterval(() => goTo(current + 1), 6000);
    }
  }

  document
    .getElementById("prevSlide")
    .addEventListener("click", () => goTo(current - 1));
  document
    .getElementById("nextSlide")
    .addEventListener("click", () => goTo(current + 1));

  goTo(0);

  /* ---------- Image fallback ---------- */
  // If a hot-linked placeholder photo ever fails, swap in an on-brand
  // gradient tile instead of showing a broken image icon.
  const fallback =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#16161d"/><stop offset="1" stop-color="#0b0b0f"/>' +
        "</linearGradient></defs>" +
        '<rect width="800" height="600" fill="url(#g)"/>' +
        '<path d="M340 380V220h90c42 0 70 25 70 62s-28 62-70 62h-50" stroke="#c9a96a" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.5"/>' +
        '<path d="M405 344l95 76" stroke="#c9a96a" stroke-width="10" stroke-linecap="round" opacity="0.5"/>' +
        "</svg>"
    );

  document.querySelectorAll("img[src^='https://']").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        img.src = fallback;
      },
      { once: true }
    );
  });

  /* ---------- Contact form ---------- */
  const contactForm = document.getElementById("contactForm");
  const formSuccess = document.getElementById("formSuccess");

  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    // No backend yet — acknowledge locally. Wire this to a CRM,
    // email service or serverless endpoint when ready.
    formSuccess.hidden = false;
    contactForm.reset();
    setTimeout(() => (formSuccess.hidden = true), 8000);
  });
})();
