/* MERIDIAN — shared interactions */
(() => {
  "use strict";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  const THEME_KEY = "meridian-theme";

  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#131110" : "#f7f4ee");
  };

  const storedTheme = localStorage.getItem(THEME_KEY);
  applyTheme(storedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  $$(".theme-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
    });
  });

  /* ---------- Header scroll state ---------- */
  const header = $(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile nav ---------- */
  const burger = $(".nav-burger");
  const nav = $(".main-nav");
  if (burger && nav) {
    const close = () => {
      nav.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    };
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    window.matchMedia("(min-width: 921px)").addEventListener("change", close);
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = $$(".reveal");
  if (revealEls.length && "IntersectionObserver" in window && !prefersReducedMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-inview");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-inview"));
  }

  /* ---------- Animated counters ---------- */
  const counters = $$("[data-count]");
  if (counters.length) {
    const runCounter = (el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = (el.dataset.count.split(".")[1] || "").length;
      if (prefersReducedMotion) { el.textContent = target.toFixed(decimals); return; }
      const dur = 1600;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if ("IntersectionObserver" in window) {
      const cio = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            cio.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      counters.forEach((el) => cio.observe(el));
    } else {
      counters.forEach(runCounter);
    }
  }

  /* ---------- Testimonial slider ---------- */
  const slider = $("[data-slider]");
  if (slider) {
    const track = $(".testi-slides", slider);
    const slides = $$(".testi-slide", slider);
    const dotsWrap = $(".testi-dots", slider);
    let index = 0;
    let timer = null;

    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "testi-dot";
      dot.setAttribute("aria-label", `Go to testimonial ${i + 1}`);
      dot.addEventListener("click", () => { go(i); restart(); });
      dotsWrap.appendChild(dot);
    });
    const dots = $$(".testi-dot", slider);

    const go = (i) => {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d, di) => d.setAttribute("aria-current", String(di === index)));
    };
    const restart = () => {
      if (prefersReducedMotion) return;
      clearInterval(timer);
      timer = setInterval(() => go(index + 1), 6500);
    };

    $("[data-prev]", slider)?.addEventListener("click", () => { go(index - 1); restart(); });
    $("[data-next]", slider)?.addEventListener("click", () => { go(index + 1); restart(); });
    slider.addEventListener("pointerenter", () => clearInterval(timer));
    slider.addEventListener("pointerleave", restart);

    let startX = null;
    track.addEventListener("pointerdown", (e) => { startX = e.clientX; }, { passive: true });
    track.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 40) { go(index + (dx < 0 ? 1 : -1)); restart(); }
      startX = null;
    });

    go(0);
    restart();
  }

  /* ---------- Work filters ---------- */
  const filterBar = $("[data-filters]");
  if (filterBar) {
    const chips = $$(".filter-chip", filterBar);
    const cards = $$("[data-cat]");
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        const f = chip.dataset.filter;
        cards.forEach((card) => {
          card.classList.toggle("is-hidden", f !== "all" && card.dataset.cat !== f);
        });
      });
    });
  }

  /* ---------- Case study dialogs ---------- */
  $$("[data-dialog-target]").forEach((opener) => {
    const dialog = document.getElementById(opener.dataset.dialogTarget);
    if (!dialog) return;
    opener.addEventListener("click", () => dialog.showModal());
    dialog.addEventListener("click", (e) => {
      const rect = dialog.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                     e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) dialog.close();
    });
    $(".case-close", dialog)?.addEventListener("click", () => dialog.close());
  });

  /* ---------- Contact form ---------- */
  const form = $("#contact-form");
  if (form) {
    const success = $("#form-success");

    const validators = {
      name: (v) => v.trim().length >= 2 || "Please enter your name.",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Please enter a valid email address.",
      budget: (v) => v !== "" || "Please select a budget range.",
      message: (v) => v.trim().length >= 20 || "Tell us a little more — at least 20 characters.",
    };

    const validateField = (input) => {
      const rule = validators[input.name];
      if (!rule) return true;
      const result = rule(input.value);
      const field = input.closest(".field");
      const msg = $(".error-msg", field);
      if (result === true) {
        field.classList.remove("has-error");
        input.removeAttribute("aria-invalid");
        return true;
      }
      field.classList.add("has-error");
      input.setAttribute("aria-invalid", "true");
      if (msg) msg.textContent = result;
      return false;
    };

    $$("input, select, textarea", form).forEach((input) => {
      input.addEventListener("blur", () => validateField(input));
      input.addEventListener("input", () => {
        if (input.closest(".field")?.classList.contains("has-error")) validateField(input);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const inputs = $$("input, select, textarea", form);
      const results = inputs.map(validateField);
      const firstBad = inputs.find((_, i) => !results[i]);
      if (firstBad) { firstBad.focus(); return; }

      const btn = $('button[type="submit"]', form);
      btn.disabled = true;
      btn.textContent = "Sending…";
      setTimeout(() => {
        form.hidden = true;
        success.classList.add("is-visible");
        success.focus();
      }, 700);
    });
  }

  /* ---------- Newsletter (footer) ---------- */
  $$(".news-form").forEach((nf) => {
    nf.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = $('input[type="email"]', nf);
      if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value)) {
        email.focus();
        email.setAttribute("aria-invalid", "true");
        return;
      }
      nf.hidden = true;
      const done = $(".news-done", nf.parentElement);
      if (done) done.style.display = "block";
    });
  });

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
