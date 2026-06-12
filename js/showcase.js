/* ============================================================
   RHYTON — scroll-driven photographic showcase
   Real Dubai photography choreographed with scroll: the image
   settles as you enter, crossfades mid-section, and three
   caption stages step through. Transform/opacity only, so it
   composites on the GPU at full frame rate.
   ============================================================ */
(function () {
  "use strict";

  const section = document.getElementById("concept");
  if (!section) return;

  const imgA = section.querySelector(".showcase__img--a");
  const imgB = section.querySelector(".showcase__img--b");
  const caps = Array.from(section.querySelectorAll(".showcase__cap"));
  const progressBar = document.getElementById("showcaseProgress");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    section.classList.add("showcase--static");
    return;
  }

  let targetP = 0;
  let p = 0;
  let inView = true;

  const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

  function computeTarget() {
    const rect = section.getBoundingClientRect();
    const span = rect.height - window.innerHeight;
    targetP = clamp(-rect.top / span, 0, 1);
  }

  function capOpacity(x, a, b, last) {
    const fade = 0.08;
    if (x < a - fade) return 0;
    if (x < a) return (x - (a - fade)) / fade;
    if (x <= b) return 1;
    if (last) return 1;
    if (x < b + fade) return 1 - (x - b) / fade;
    return 0;
  }

  const capRanges = [
    [0.06, 0.32],
    [0.42, 0.64],
    [0.74, 1.01],
  ];

  function update() {
    // image A: slow settle, then hand off to image B
    const settle = 1.16 - clamp(p / 0.6, 0, 1) * 0.16;
    imgA.style.transform = `scale(${settle.toFixed(4)}) translateY(${(p * -3).toFixed(2)}%)`;
    imgA.style.opacity = (1 - clamp((p - 0.52) / 0.16, 0, 1)).toFixed(3);

    const bIn = clamp((p - 0.52) / 0.16, 0, 1);
    imgB.style.opacity = bIn.toFixed(3);
    imgB.style.transform = `scale(${(1.14 - clamp((p - 0.5) / 0.5, 0, 1) * 0.14).toFixed(4)})`;

    caps.forEach((cap, i) => {
      const [a, b] = capRanges[i];
      const o = capOpacity(p, a, b, i === caps.length - 1);
      cap.style.opacity = o.toFixed(3);
      cap.style.transform = `translateY(${((1 - o) * 26).toFixed(1)}px)`;
      cap.style.pointerEvents = o > 0.5 ? "auto" : "none";
    });

    if (progressBar) progressBar.style.transform = `scaleX(${p.toFixed(4)})`;
  }

  const visIO = new IntersectionObserver(
    (entries) => {
      inView = entries[0].isIntersecting;
    },
    { rootMargin: "15% 0px" }
  );
  visIO.observe(section);

  (function frame() {
    if (inView) {
      computeTarget();
      // light inertia — eases a beat behind the scroll
      p += (targetP - p) * 0.12;
      if (Math.abs(targetP - p) > 0.0004) update();
    }
    requestAnimationFrame(frame);
  })();

  update();
})();
