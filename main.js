/* =========================================================
   RESUELVE INMUEBLE — main.js
   ========================================================= */

const CONFIG = {
  whatsappNumber: "5491112345678", // Reemplazar por el número real
  defaultMessage: "Hola, quiero consultar por la situación de mi propiedad.",
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function buildWhatsAppUrl(message) {
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function buildFormMessage(data) {
  const lines = [
    "Hola, quiero realizar una consulta sobre un inmueble.",
    `Nombre: ${data.get("nombre").trim()}`,
    `Teléfono: ${data.get("telefono").trim()}`,
    `Situación: ${data.get("situacion")}`,
    `Provincia: ${data.get("provincia").trim()}`,
  ];
  const detalle = data.get("mensaje").trim();
  if (detalle) lines.push(`Detalle: ${detalle}`);
  return lines.join("\n");
}

/* Menú móvil: pantalla completa, bloquea el scroll, cierra con enlace o Escape */
function initMobileMenu() {
  const toggle = $("#menu-toggle");
  const nav = $("#main-nav");
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  };

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  $$("a", nav).forEach((link) => link.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));
  window.addEventListener("resize", () => window.innerWidth > 860 && setOpen(false));
}

/* Scroll: header, progreso, botón flotante, parallax y línea de tiempo (un solo rAF) */
function initScrollEffects() {
  const header = $("#site-header");
  const bar = $("#scroll-progress");
  const wa = $(".wa-float");
  const cta = $("#contacto, .cta-band");
  const heroBg = $(".hero-bg");
  const parallax = $$("[data-parallax]");
  const timelines = $$(".tl");
  timelines.forEach((tl) => tl.classList.add("tl-js"));
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    header?.classList.toggle("is-scrolled", y > 8);
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    wa?.classList.toggle("is-shown", y > vh * 0.6);
    if (wa && cta) { const c = cta.getBoundingClientRect(); wa.classList.toggle("is-hidden", c.top < vh * 0.85 && c.bottom > 0); }

    if (!reduceMotion) {
      if (heroBg && y < vh) heroBg.style.setProperty("--py", `${(y * 0.15).toFixed(1)}px`);
      parallax.forEach((fig) => {
        const r = fig.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const off = (r.top + r.height / 2 - vh / 2) / vh;
        fig.style.setProperty("--p", `${Math.max(-1, Math.min(1, -off)) * 28}px`);
      });
    }

    timelines.forEach((tl) => {
      const r = tl.getBoundingClientRect();
      const p = reduceMotion ? 1 : Math.min(1, Math.max(0, (vh * 0.65 - r.top) / r.height));
      tl.style.setProperty("--tl", p.toFixed(3));
      $$("li", tl).forEach((li) => {
        li.classList.toggle("is-done", reduceMotion || li.getBoundingClientRect().top < vh * 0.65);
      });
    });
    ticking = false;
  };

  update();
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener("resize", update);
}

/* Enlace activo del menú según la sección visible */
function initScrollSpy() {
  const links = $$('.main-nav a[href^="#"]:not(.btn)');
  if (!links.length || !("IntersectionObserver" in window)) return;

  const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((l) => l.classList.remove("is-active"));
      byId.get(entry.target.id)?.classList.add("is-active");
    });
  }, { rootMargin: "-45% 0px -50% 0px" });

  byId.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}

function initWhatsAppButtons() {
  const msg = document.body.dataset.waMessage || CONFIG.defaultMessage;
  $$("[data-whatsapp]").forEach((el) => {
    el.href = buildWhatsAppUrl(msg);
    el.target = "_blank";
    el.rel = "noopener noreferrer";
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-whatsapp]")) window.dataLayer?.push({ event: "whatsapp_click" });
  });
}

/* Formulario por pasos */
function initContactForm() {
  const form = $("#contact-form");
  if (!form) return;
  const steps = $$(".step", form);
  const dots = $$(".mform-dots li", form);
  const error = $("#form-error");
  const ok = $("#form-ok");
  const prev = $("[data-prev]", form);
  const next = $("[data-next]", form);
  const send = $("[data-send]", form);
  const phone = form.elements.telefono;
  const messages = ["Elegí la opción que más se parece a tu caso.", "Contanos en qué provincia está el inmueble.", "Completá tu nombre y un teléfono válido."];
  let cur = 0;

  form.classList.add("is-js");

  const show = (i) => {
    cur = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, k) => s.classList.toggle("is-current", k === cur));
    dots.forEach((d, k) => d.classList.toggle("on", k <= cur));
    form.classList.toggle("is-first", cur === 0);
    form.classList.toggle("is-last", cur === steps.length - 1);
    error.hidden = true;
  };

  const checkPhone = () => phone.setCustomValidity(
    /^[\d\s+()\-]{8,}$/.test(phone.value.trim()) ? "" : "Ingresá un teléfono válido"
  );
  phone.addEventListener("input", checkPhone);

  const validStep = (i) => {
    checkPhone();
    const fields = $$("input, textarea", steps[i]);
    fields.forEach((f) => f.classList.add("touched"));
    const bad = fields.find((f) => !f.checkValidity());
    if (bad) {
      error.textContent = messages[i];
      error.hidden = false;
      if (bad.type !== "radio") bad.focus();
      return false;
    }
    error.hidden = true;
    return true;
  };

  const choose = (value) => {
    const radio = $$('input[name="situacion"]', form).find((r) => r.value === value);
    if (!radio) return;
    radio.checked = true;
    show(1);
  };

  next.addEventListener("click", () => validStep(cur) && show(cur + 1));
  prev.addEventListener("click", () => show(cur - 1));
  $$('input[name="situacion"]', form).forEach((r) =>
    r.addEventListener("change", () => setTimeout(() => cur === 0 && show(1), 220))
  );
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "radio" && cur < steps.length - 1) {
      e.preventDefault();
      validStep(cur) && show(cur + 1);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    ok.hidden = true;
    for (let i = 0; i < steps.length; i++) {
      if (!validStep(i)) { show(i); validStep(i); return; }
    }
    const url = buildWhatsAppUrl(buildFormMessage(new FormData(form)));
    if (!window.open(url, "_blank", "noopener")) window.location.href = url;
    ok.hidden = false;
    form.reset();
    $$("input, textarea", form).forEach((f) => f.classList.remove("touched"));
    show(0);
  });

  // Preselección desde enlaces internos o desde ?situacion=
  $$("[data-service]").forEach((el) =>
    el.addEventListener("click", () => setTimeout(() => choose(el.dataset.service), 400))
  );
  show(0);
  const q = new URLSearchParams(window.location.search).get("situacion");
  if (q) choose(q);
}

/* Revelado al scroll, escalonado, con limpieza posterior */
function initScrollReveal() {
  if (reduceMotion || !("IntersectionObserver" in window)) return;

  const targets = $$(".svc, .tl li, .about-copy, .about-media, .why-card, .why-media, .faq-grid details, .sec-head, .method-head, .faq-head, .contact-copy, .mform, .sig li, .alt-list li, .checklist li, .rel a, .duo-side, .cta-inner");
  targets.forEach((el) => {
    const idx = [...el.parentElement.children].indexOf(el);
    el.style.setProperty("--rd", `${(idx % 3) * 0.09}s`);
    el.classList.add("reveal");
  });

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add("is-visible");
      obs.unobserve(el);
      setTimeout(() => el.classList.remove("reveal"), 1300);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  targets.forEach((el) => observer.observe(el));
}

/* Foco de luz que sigue al cursor */
function initCardSpotlight() {
  $$(".svc, .why-card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

function initFooterYear() {
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initScrollEffects();
  initScrollSpy();
  initWhatsAppButtons();
  initContactForm();
  initScrollReveal();
  initCardSpotlight();
  initFooterYear();
});
