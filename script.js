const SITE_CONFIG = {
  // Informe somente números, incluindo DDI e DDD. Ex.: 5522999999999
  whatsappNumber: "",
};

const PRODUCT = {
  name: "Canção de Nós — Música Personalizada",
  priceLabel: "R$ 49,90",
  priceCents: 4990,
};

const STORAGE_KEY = "cancao_checkout_v2";
const modal = document.querySelector("#order-modal");
const checkoutForm = document.querySelector("#checkout-form");
const detailsForm = document.querySelector("#details-form");
const paymentStep = document.querySelector("#checkout-payment-step");
const detailsStep = document.querySelector("#checkout-details-step");
const paymentError = document.querySelector("#payment-error");
const paymentLoading = document.querySelector("#payment-loading");
const closeButtons = document.querySelectorAll("[data-close-modal]");
const startButtons = document.querySelectorAll(".plan-button,[data-start-order]");

function getStoredCheckout() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

function setStoredCheckout(value) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function setStep(name) {
  const showPayment = name === "payment";
  paymentStep?.classList.toggle("is-active", showPayment);
  detailsStep?.classList.toggle("is-active", !showPayment);
}

function openModal(step = "payment") {
  if (!modal) return;
  setStep(step);
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.setTimeout(() => {
    const target = step === "payment" ? checkoutForm?.elements?.customerName : detailsForm?.elements?.recipientName;
    target?.focus();
  }, 80);
}

function closeModal() {
  modal?.classList.remove("is-open");
  modal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function showPaymentError(message) {
  if (!paymentError) return;
  paymentError.textContent = message;
  paymentError.classList.add("is-visible");
}

function clearPaymentError() {
  paymentError?.classList.remove("is-visible");
}

function setLoading(active, text = "Preparando seu PIX...") {
  if (!paymentLoading) return;
  paymentLoading.classList.toggle("is-visible", active);
  const label = paymentLoading.querySelector("span:last-child");
  if (label) label.textContent = text;
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function makeWhatsAppUrl(message) {
  const encoded = encodeURIComponent(message);
  const number = normalizePhone(SITE_CONFIG.whatsappNumber);
  return number ? `https://wa.me/${number}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

function formatBrazilianDate(value) {
  if (!value) return "Não informada";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

async function createPayment(customerName, customerPhone) {
  const response = await fetch("/api/create-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerName, customerPhone }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success || !data.checkoutUrl) {
    throw new Error(data.message || "Não foi possível iniciar o pagamento.");
  }
  return data;
}

async function verifyPayment(payment) {
  const response = await fetch("/api/check-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderNsu: payment.orderNsu,
      transactionNsu: payment.transactionNsu,
      slug: payment.slug,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Não foi possível confirmar o PIX.");
  }
  return data;
}

checkoutForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!checkoutForm.reportValidity()) return;
  clearPaymentError();
  setLoading(true);
  const data = new FormData(checkoutForm);
  const customerName = String(data.get("customerName") || "").trim();
  const customerPhone = normalizePhone(data.get("customerPhone"));
  try {
    const payment = await createPayment(customerName, customerPhone);
    setStoredCheckout({ customerName, customerPhone, orderNsu: payment.orderNsu, amount: PRODUCT.priceCents, verified: false });
    window.location.assign(payment.checkoutUrl);
  } catch (error) {
    setLoading(false);
    showPaymentError(error.message);
  }
});

function buildOrderMessage(data, payment) {
  return [
    "Olá! Meu PIX de R$ 49,90 foi confirmado e quero enviar os dados da minha música personalizada. 🎵❤️",
    "",
    `*Pedido:* ${payment.orderNsu}`,
    `*Transação:* ${payment.transactionNsu}`,
    `*Pagamento:* PIX confirmado ✅`,
    payment.receiptUrl ? `*Comprovante:* ${payment.receiptUrl}` : "",
    "",
    `*Meu nome:* ${payment.customerName || "Não informado"}`,
    `*Meu WhatsApp:* ${payment.customerPhone || "Não informado"}`,
    `*Pessoa homenageada:* ${data.get("recipientName")}`,
    `*Como eu a chamo:* ${data.get("nickname") || "Não informado"}`,
    `*Ocasião:* ${data.get("occasion")}`,
    `*Data da comemoração:* ${formatBrazilianDate(data.get("celebrationDate"))}`,
    `*Estilo musical:* ${data.get("musicStyle")}`,
    `*Preferência de voz:* ${data.get("voice")}`,
    "",
    "*A história de nós dois:*",
    data.get("story"),
    "",
    "*O que desejo que essa pessoa sinta ao ouvir:*",
    data.get("message") || "Não informado",
    "",
    "Estou ciente de que primeiro receberei a letra para aprovação e poderei solicitar até 3 edições da letra. A música só será gerada depois da minha aprovação final da letra.",
  ].filter(Boolean).join("\n");
}

detailsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!detailsForm.reportValidity()) return;
  const payment = getStoredCheckout();
  if (!payment?.verified || !payment.transactionNsu || !payment.slug) {
    showPaymentError("Não encontramos um PIX confirmado para este pedido. Faça a confirmação novamente.");
    setStep("payment");
    return;
  }

  const submit = detailsForm.querySelector("button[type=submit]");
  if (submit) { submit.disabled = true; submit.textContent = "Confirmando pagamento..."; }
  try {
    const verification = await verifyPayment(payment);
    if (!verification.verified) throw new Error(verification.message || "PIX ainda não confirmado.");
    const data = new FormData(detailsForm);
    const message = buildOrderMessage(data, payment);
    window.open(makeWhatsAppUrl(message), "_blank", "noopener,noreferrer");
    if (submit) submit.textContent = "Dados prontos — envie no WhatsApp";
  } catch (error) {
    if (submit) { submit.disabled = false; submit.textContent = "Enviar dados da música"; }
    showPaymentError(error.message);
  }
});

async function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("pagamento") !== "retorno") return;

  const stored = getStoredCheckout() || {};
  const payment = {
    ...stored,
    orderNsu: params.get("order_nsu") || stored.orderNsu,
    transactionNsu: params.get("transaction_nsu") || "",
    slug: params.get("slug") || "",
    receiptUrl: params.get("receipt_url") || "",
    captureMethod: params.get("capture_method") || "",
  };

  openModal("payment");
  setLoading(true, "Confirmando seu PIX com a InfinitePay...");
  clearPaymentError();

  try {
    if (!payment.orderNsu || !payment.transactionNsu || !payment.slug) {
      throw new Error("Não recebemos todos os dados necessários para confirmar o pagamento.");
    }
    const verification = await verifyPayment(payment);
    if (!verification.verified) throw new Error(verification.message || "PIX ainda não confirmado.");
    const verifiedPayment = { ...payment, verified: true, amount: verification.amount };
    setStoredCheckout(verifiedPayment);
    setLoading(false);
    setStep("details");
    const orderId = document.querySelector("#confirmed-order-id");
    if (orderId) orderId.textContent = verifiedPayment.orderNsu;
    history.replaceState({}, document.title, window.location.pathname + window.location.hash);
  } catch (error) {
    setLoading(false);
    showPaymentError(error.message);
  }
}

startButtons.forEach((button) => button.addEventListener("click", (event) => {
  if (button.tagName === "A") event.preventDefault();
  const stored = getStoredCheckout();
  openModal(stored?.verified ? "details" : "payment");
}));

closeButtons.forEach((button) => button.addEventListener("click", closeModal));
window.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal?.classList.contains("is-open")) closeModal(); });

const celebrationDateInput = detailsForm?.elements?.celebrationDate;
if (celebrationDateInput) {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  celebrationDateInput.min = localDate.toISOString().split("T")[0];
}

const year = document.querySelector("#current-year");
if (year) year.textContent = new Date().getFullYear();

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
  const waves = [0.35,0.7,0.48,0.92,0.58,0.82,0.42,1,0.64,0.88,0.5,0.76,0.38,0.68];
  const bars = waves.map((value,index) => `<i style="--wave:${value};--i:${index}"></i>`).join("");
  const preview = document.createElement("div");
  preview.className = "audio-preview";
  preview.setAttribute("aria-hidden", "true");
  preview.innerHTML = `<div class="audio-preview-top"><div class="audio-preview-copy"><span>SUA HISTÓRIA EM MÚSICA</span><strong>Primeiro a letra. Depois, a emoção ganha voz.</strong></div><span class="audio-dot"></span></div><div class="waveform">${bars}</div>`;
  heroVisual.appendChild(preview);
}

function setupRevealMotion() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const heroItems = [...document.querySelectorAll(".hero-copy > *"), document.querySelector(".hero-visual")].filter(Boolean);
  heroItems.forEach((element,index) => { element.dataset.reveal = element.classList.contains("hero-visual") ? "scale" : "up"; element.style.setProperty("--delay", `${Math.min(index*75,420)}ms`); });
  const selectors = [".section-heading",".emotion-card",".comparison-copy",".comparison-box",".step-card",".birthday-photo",".birthday-copy",".price-card",".promise-card",".faq-list details",".final-cta > *","footer > *",".seo-topic-card"];
  const observed = [...document.querySelectorAll(selectors.join(","))];
  observed.forEach((element,index) => { if (!element.dataset.reveal) element.dataset.reveal = "up"; element.style.setProperty("--delay", `${(index%3)*80}ms`); });
  requestAnimationFrame(() => heroItems.forEach((element) => element.classList.add("is-visible")));
  if (reduceMotion || !("IntersectionObserver" in window)) { observed.forEach((element) => element.classList.add("is-visible")); return; }
  const observer = new IntersectionObserver((entries,o) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); o.unobserve(entry.target); } }), { rootMargin:"0px 0px -9% 0px", threshold:.08 });
  observed.forEach((element) => observer.observe(element));
}

function setupHeaderAndProgress() {
  const header = document.querySelector(".header");
  const progressBar = createScrollProgress();
  let ticking = false;
  const update = () => { const top = window.scrollY || document.documentElement.scrollTop; const range = document.documentElement.scrollHeight - window.innerHeight; progressBar.style.transform = `scaleX(${range>0?Math.min(top/range,1):0})`; header?.classList.toggle("is-scrolled", top>24); ticking=false; };
  const requestUpdate = () => { if (!ticking) { ticking=true; requestAnimationFrame(update); } };
  update(); window.addEventListener("scroll", requestUpdate, { passive:true }); window.addEventListener("resize", requestUpdate, { passive:true });
}

function setupFaqBehavior() {
  const items = [...document.querySelectorAll(".faq-list details")];
  items.forEach((item) => item.addEventListener("toggle", () => { if (item.open) items.forEach((other) => { if (other!==item) other.open=false; }); }));
}

function setupFloatingCta() {
  const cta = document.querySelector(".floating-whatsapp");
  if (!cta) return;
  const label = cta.querySelector("span"); if (label) label.textContent = "Começar por R$ 49,90";
  cta.addEventListener("click", (event) => { event.preventDefault(); const stored=getStoredCheckout(); openModal(stored?.verified?"details":"payment"); });
}

function setupVisualEnhancements() {
  document.documentElement.classList.add("has-premium-motion");
  createAudioPreview(); setupRevealMotion(); setupHeaderAndProgress(); setupFaqBehavior(); setupFloatingCta();
}

setupVisualEnhancements();
handlePaymentReturn();
