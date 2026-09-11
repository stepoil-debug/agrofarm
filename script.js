const SITE_CONFIG = {
  // Informe somente números, incluindo DDI e DDD. Exemplo: 5522999999999
  whatsappNumber: "",
};

// Progressive visual layer: keeps the base page usable even if enhancements fail.
(function loadEnhancementStyles() {
  if (document.querySelector('link[data-premium-layer]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./enhancements.css";
  link.dataset.premiumLayer = "true";
  document.head.appendChild(link);
})();

const modal = document.querySelector("#order-modal");
const form = document.querySelector("#order-form");
const selectedPlanLabel = document.querySelector("#selected-plan");
const planButtons = document.querySelectorAll(".plan-button");
const closeButtons = document.querySelectorAll("[data-close-modal]");
const celebrationDateInput = form.elements.celebrationDate;

let selectedPlan = "";
let selectedPrice = "";

function getTodayForInput() {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return localDate.toISOString().split("T")[0];
}

function formatBrazilianDate(value) {
  if (!value) return "Não informada";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function openModal(plan, price) {
  selectedPlan = plan;
  selectedPrice = price;
  selectedPlanLabel.textContent = `${plan} — ${price}`;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  window.setTimeout(() => {
    form.elements.customerName.focus();
  }, 80);
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function makeWhatsAppUrl(message) {
  const encodedMessage = encodeURIComponent(message);
  const number = SITE_CONFIG.whatsappNumber.replace(/\D/g, "");

  if (number) {
    return `https://wa.me/${number}?text=${encodedMessage}`;
  }

  return `https://wa.me/?text=${encodedMessage}`;
}

function buildOrderMessage(data) {
  return [
    "Olá! Quero criar uma homenagem em forma de música para a pessoa que amo. 🎵❤️",
    "",
    `*Plano:* ${selectedPlan}`,
    `*Valor:* ${selectedPrice}`,
    `*Meu nome:* ${data.get("customerName")}`,
    `*Pessoa homenageada:* ${data.get("recipientName")}`,
    `*Como eu a chamo:* ${data.get("nickname") || "Não informado"}`,
    `*Ocasião:* ${data.get("occasion")}`,
    `*Data da comemoração:* ${formatBrazilianDate(data.get("celebrationDate"))}`,
    `*Estilo musical:* ${data.get("musicStyle")}`,
    `*Preferência de voz:* ${data.get("voice")}`,
    `*Pagamento preferido:* ${data.get("payment")}`,
    "",
    "*A história de nós dois:*",
    data.get("story"),
    "",
    "*O que desejo que essa pessoa sinta ao ouvir:*",
    data.get("message") || "Não informado",
    "",
    "Gostaria de confirmar o prazo para essa data e receber as orientações de pagamento.",
  ].join("\n");
}

planButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openModal(button.dataset.plan, button.dataset.price);
  });
});

closeButtons.forEach((button) => {
  button.addEventListener("click", closeModal);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) {
    closeModal();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.reportValidity()) {
    return;
  }

  const data = new FormData(form);
  const message = buildOrderMessage(data);
  window.open(makeWhatsAppUrl(message), "_blank", "noopener,noreferrer");
});

celebrationDateInput.min = getTodayForInput();
document.querySelector("#current-year").textContent = new Date().getFullYear();

function createScrollProgress() {
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.innerHTML = "<span></span>";
  document.body.prepend(progress);
  return progress.querySelector("span");
}

function createAudioPreview() {
  const heroVisual = document.querySelector(".hero-visual");
  if (!heroVisual || heroVisual.querySelector(".audio-preview")) return;

  const waves = [0.35, 0.7, 0.48, 0.92, 0.58, 0.82, 0.42, 1, 0.64, 0.88, 0.5, 0.76, 0.38, 0.68];
  const bars = waves
    .map((value, index) => `<i style="--wave:${value};--i:${index}"></i>`)
    .join("");

  const preview = document.createElement("div");
  preview.className = "audio-preview";
  preview.setAttribute("aria-hidden", "true");
  preview.innerHTML = `
    <div class="audio-preview-top">
      <div class="audio-preview-copy">
        <span>SUA HISTÓRIA EM MÚSICA</span>
        <strong>Uma lembrança que ganha voz</strong>
      </div>
      <span class="audio-dot"></span>
    </div>
    <div class="waveform">${bars}</div>
  `;

  heroVisual.appendChild(preview);
}

function setupRevealMotion() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const heroItems = [
    ...document.querySelectorAll(".hero-copy > *"),
    document.querySelector(".hero-visual"),
  ].filter(Boolean);

  heroItems.forEach((element, index) => {
    element.dataset.reveal = element.classList.contains("hero-visual") ? "scale" : "up";
    element.style.setProperty("--delay", `${Math.min(index * 75, 420)}ms`);
  });

  const selectors = [
    ".section-heading",
    ".emotion-card",
    ".comparison-copy",
    ".comparison-box",
    ".step-card",
    ".birthday-photo",
    ".birthday-copy",
    ".price-card",
    ".promise-card",
    ".faq-list details",
    ".final-cta > *",
    "footer > *",
  ];

  const observed = [...document.querySelectorAll(selectors.join(","))];
  observed.forEach((element, index) => {
    if (!element.dataset.reveal) element.dataset.reveal = "up";
    element.style.setProperty("--delay", `${(index % 3) * 80}ms`);
  });

  requestAnimationFrame(() => {
    heroItems.forEach((element) => element.classList.add("is-visible"));
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    observed.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, revealObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -9% 0px",
      threshold: 0.08,
    },
  );

  observed.forEach((element) => observer.observe(element));
}

function setupHeaderAndProgress() {
  const header = document.querySelector(".header");
  const progressBar = createScrollProgress();
  let ticking = false;

  const update = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollRange > 0 ? Math.min(scrollTop / scrollRange, 1) : 0;

    if (header) header.classList.toggle("is-scrolled", scrollTop > 24);
    progressBar.style.transform = `scaleX(${progress})`;
    ticking = false;
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
}

function setupFaqBehavior() {
  const items = [...document.querySelectorAll(".faq-list details")];
  items.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      items.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });
}

function setupFloatingCta() {
  const cta = document.querySelector(".floating-whatsapp");
  const plans = document.querySelector("#planos");
  const footer = document.querySelector("footer");
  if (!cta) return;

  const label = cta.querySelector("span");
  if (label) label.textContent = "Criar minha homenagem";

  if (!("IntersectionObserver" in window) || !plans) return;

  const visibleTargets = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleTargets.add(entry.target);
        else visibleTargets.delete(entry.target);
      });
      cta.classList.toggle("is-hidden", visibleTargets.size > 0 || modal.classList.contains("is-open"));
    },
    { threshold: 0.08 },
  );

  observer.observe(plans);
  if (footer) observer.observe(footer);

  const modalObserver = new MutationObserver(() => {
    cta.classList.toggle("is-hidden", visibleTargets.size > 0 || modal.classList.contains("is-open"));
  });
  modalObserver.observe(modal, { attributes: true, attributeFilter: ["class"] });
}

function setupVisualEnhancements() {
  document.documentElement.classList.add("has-premium-motion");
  createAudioPreview();
  setupRevealMotion();
  setupHeaderAndProgress();
  setupFaqBehavior();
  setupFloatingCta();
}

setupVisualEnhancements();
