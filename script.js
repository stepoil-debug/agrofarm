const SITE_CONFIG = {
  whatsappNumber: "",
};

const PRODUCT = {
  name: "Canção de Nós — Música Personalizada",
  priceLabel: "R$ 49,90",
  priceCents: 4990,
};

const STORAGE_KEY = "cancao_order_v3";
const modal = document.querySelector("#order-modal");
const startButtons = document.querySelectorAll(".plan-button,[data-start-order]");

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatBrazilianDate(value) {
  if (!value) return "Não informada";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function makeWhatsAppUrl(message) {
  const encoded = encodeURIComponent(message);
  const number = normalizePhone(SITE_CONFIG.whatsappNumber);
  return number ? `https://wa.me/${number}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

function saveOrder(order) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

function getOrder() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

function buildOrderMessage(order) {
  return [
    "Olá! Realizei o PIX de R$ 49,90 e quero enviar meu pedido de música personalizada. 🎵❤️",
    "",
    `*Meu nome:* ${order.customerName}`,
    `*Meu WhatsApp:* ${order.customerPhone}`,
    `*Pessoa homenageada:* ${order.recipientName}`,
    `*Como eu a chamo:* ${order.nickname || "Não informado"}`,
    `*Ocasião:* ${order.occasion}`,
    `*Data da comemoração:* ${formatBrazilianDate(order.celebrationDate)}`,
    `*Estilo musical:* ${order.musicStyle}`,
    `*Preferência de voz:* ${order.voice}`,
    "",
    "*A história de nós dois:*",
    order.story,
    "",
    "*O que desejo que essa pessoa sinta ao ouvir:*",
    order.message || "Não informado",
    "",
    "*Pagamento:* PIX de R$ 49,90 realizado — vou anexar o comprovante.",
    "",
    "Estou ciente de que primeiro receberei a letra para aprovação e poderei solicitar até 3 edições da letra. A música só será gerada após minha aprovação final.",
  ].join("\n");
}

function setModalStep(step) {
  document.querySelector("#details-step")?.classList.toggle("is-active", step === "details");
  document.querySelector("#pix-step")?.classList.toggle("is-active", step === "pix");
}

function openModal() {
  if (!modal) return;
  setModalStep("details");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setTimeout(() => document.querySelector('#details-form [name="customerName"]')?.focus(), 80);
}

function closeModal() {
  modal?.classList.remove("is-open");
  modal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function installOrderModal() {
  if (!modal) return;
  const card = modal.querySelector(".modal-card");
  if (!card) return;

  card.classList.add("payment-modal");
  card.innerHTML = `
    <button class="modal-close" type="button" data-close-modal aria-label="Fechar">×</button>
    <span class="eyebrow">MÚSICA PERSONALIZADA • R$ 49,90</span>
    <h2 id="modal-title">Conte a história de vocês</h2>

    <section class="checkout-step is-active" id="details-step">
      <div class="checkout-intro">
        <div class="checkout-price"><strong>R$ 49,90</strong><span>pagamento único via PIX</span></div>
        <div class="checkout-badges">
          <span class="checkout-badge">✓ Preencha tudo primeiro</span>
          <span class="checkout-badge">✓ Até 3 edições da letra</span>
          <span class="checkout-badge">✓ Música só após aprovação</span>
        </div>
        <p>Preencha os dados completos da homenagem. Depois mostramos o QR Code PIX e o código copia e cola.</p>
      </div>

      <form id="details-form">
        <div class="form-grid">
          <label>Seu nome<input type="text" name="customerName" required maxlength="100" autocomplete="name" placeholder="Seu nome" /></label>
          <label>Seu WhatsApp<input type="tel" name="customerPhone" required maxlength="20" autocomplete="tel" placeholder="(22) 99999-9999" /></label>
          <label>Nome da pessoa homenageada<input type="text" name="recipientName" required maxlength="80" placeholder="Nome de quem receberá a música" /></label>
          <label>Como você chama essa pessoa? <span class="optional">(opcional)</span><input type="text" name="nickname" maxlength="80" placeholder="Amor, vida, apelido..." /></label>
          <label>Ocasião<select name="occasion" required><option value="">Selecione</option><option>Aniversário da pessoa amada</option><option>Aniversário de namoro</option><option>Aniversário de casamento</option><option>Pedido de casamento</option><option>Casamento</option><option>Reconciliação</option><option>Declaração surpresa</option><option>Outra ocasião</option></select></label>
          <label>Data da comemoração<input type="date" name="celebrationDate" required /></label>
          <label>Estilo musical<select name="musicStyle" required><option value="">Selecione</option><option>Sertanejo romântico</option><option>Pagode romântico</option><option>Pop</option><option>MPB</option><option>Gospel</option><option>Forró</option><option>Rock romântico</option><option>Outro estilo</option></select></label>
          <label>Preferência de voz<select name="voice" required><option value="">Selecione</option><option>Voz masculina</option><option>Voz feminina</option><option>Sem preferência</option></select></label>
        </div>
        <label>A história de vocês<textarea name="story" required minlength="40" maxlength="3000" placeholder="Como vocês se conheceram? Quais momentos, lugares, dificuldades, conquistas, viagens, apelidos ou frases não podem faltar?"></textarea></label>
        <label>O que você deseja que essa pessoa sinta ao ouvir? <span class="optional">(opcional)</span><textarea name="message" maxlength="1000" placeholder="Ex.: Quero que ela se sinta amada, valorizada e saiba o quanto é importante para mim."></textarea></label>
        <label class="consent"><input type="checkbox" required /><span>Entendi que tenho direito a até 3 edições da letra e que a música só será gerada depois da minha aprovação final.</span></label>
        <button class="button button-primary form-submit" type="submit">Ver PIX — R$ 49,90</button>
      </form>
    </section>

    <section class="checkout-step" id="pix-step">
      <div class="pix-payment-card">
        <span class="checkout-badge success">PIX • R$ 49,90</span>
        <h3>Escaneie o QR Code ou copie o código PIX</h3>
        <p>Abra o app do seu banco, escolha PIX e utilize uma das opções abaixo.</p>

        <div class="pix-layout">
          <div class="pix-qr-wrap"><canvas id="pix-qr" width="280" height="280"></canvas></div>
          <div class="pix-copy-area">
            <span class="small-label">PIX COPIA E COLA</span>
            <textarea id="pix-payload" readonly rows="5"></textarea>
            <button class="button button-outline" type="button" id="copy-pix">Copiar código PIX</button>
            <div class="pix-key-line"><span>Chave PIX</span><strong id="pix-key">—</strong></div>
            <div class="pix-receiver-line"><span>Recebedor</span><strong id="pix-receiver">—</strong></div>
          </div>
        </div>

        <div class="checkout-error" id="pix-error" role="alert"></div>
        <div class="checkout-loading" id="pix-loading"><span class="checkout-spinner"></span><span>Gerando seu PIX...</span></div>
        <p class="checkout-note">Depois de pagar, clique em <strong>Já fiz o PIX</strong>. O atendimento receberá todos os dados da homenagem e você poderá anexar o comprovante.</p>
        <div class="payment-return-actions">
          <button class="button button-ghost" type="button" id="back-to-details">Editar dados</button>
          <button class="button button-primary" type="button" id="paid-confirm">Já fiz o PIX — enviar pedido</button>
        </div>
      </div>
    </section>
  `;

  const dateInput = card.querySelector('[name="celebrationDate"]');
  if (dateInput) {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    dateInput.min = local.toISOString().split("T")[0];
  }

  card.querySelector("[data-close-modal]")?.addEventListener("click", closeModal);
  card.querySelector("#details-form")?.addEventListener("submit", handleDetailsSubmit);
  card.querySelector("#copy-pix")?.addEventListener("click", copyPixCode);
  card.querySelector("#back-to-details")?.addEventListener("click", () => setModalStep("details"));
  card.querySelector("#paid-confirm")?.addEventListener("click", sendPaidOrder);
}

async function handleDetailsSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const order = Object.fromEntries(data.entries());
  order.customerPhone = normalizePhone(order.customerPhone);
  saveOrder(order);
  setModalStep("pix");
  await loadPixPayment();
}

async function loadQrLibrary() {
  if (window.QRCode?.toCanvas) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Não foi possível carregar o gerador do QR Code."));
    document.head.appendChild(script);
  });
}

async function loadPixPayment() {
  const error = document.querySelector("#pix-error");
  const loading = document.querySelector("#pix-loading");
  error?.classList.remove("is-visible");
  loading?.classList.add("is-visible");

  try {
    const response = await fetch("/api/pix-config", { cache: "no-store" });
    const pix = await response.json().catch(() => ({}));
    if (!response.ok || !pix.success || !pix.payload) {
      throw new Error(pix.message || "Não foi possível gerar o PIX.");
    }

    const payloadField = document.querySelector("#pix-payload");
    if (payloadField) payloadField.value = pix.payload;
    const keyField = document.querySelector("#pix-key");
    if (keyField) keyField.textContent = pix.pixKey;
    const receiverField = document.querySelector("#pix-receiver");
    if (receiverField) receiverField.textContent = `${pix.receiverName}${pix.receiverCity ? ` • ${pix.receiverCity}` : ""}`;

    await loadQrLibrary();
    const canvas = document.querySelector("#pix-qr");
    if (canvas) await window.QRCode.toCanvas(canvas, pix.payload, { width: 280, margin: 1, errorCorrectionLevel: "M" });
    loading?.classList.remove("is-visible");
  } catch (err) {
    loading?.classList.remove("is-visible");
    if (error) {
      error.textContent = err.message;
      error.classList.add("is-visible");
    }
  }
}

async function copyPixCode() {
  const payload = document.querySelector("#pix-payload")?.value || "";
  if (!payload) return;

  try {
    await navigator.clipboard.writeText(payload);
  } catch {
    const field = document.querySelector("#pix-payload");
    field?.select();
    document.execCommand("copy");
  }

  const button = document.querySelector("#copy-pix");
  if (button) {
    const original = button.textContent;
    button.textContent = "Código PIX copiado ✓";
    setTimeout(() => { button.textContent = original; }, 1800);
  }
}

function sendPaidOrder() {
  const order = getOrder();
  if (!order) return;
  window.open(makeWhatsAppUrl(buildOrderMessage(order)), "_blank", "noopener,noreferrer");
}

startButtons.forEach((button) => button.addEventListener("click", (event) => {
  event.preventDefault();
  openModal();
}));

modal?.querySelector(".modal-backdrop")?.addEventListener("click", closeModal);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal?.classList.contains("is-open")) closeModal();
});

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
  heroItems.forEach((element,index) => {
    element.dataset.reveal = element.classList.contains("hero-visual") ? "scale" : "up";
    element.style.setProperty("--delay", `${Math.min(index*75,420)}ms`);
  });

  const selectors = [".section-heading",".emotion-card",".comparison-copy",".comparison-box",".step-card",".birthday-photo",".birthday-copy",".price-card",".promise-card",".faq-list details",".final-cta > *","footer > *",".seo-topic-card"];
  const observed = [...document.querySelectorAll(selectors.join(","))];
  observed.forEach((element,index) => {
    if (!element.dataset.reveal) element.dataset.reveal = "up";
    element.style.setProperty("--delay", `${(index%3)*80}ms`);
  });

  requestAnimationFrame(() => heroItems.forEach((element) => element.classList.add("is-visible")));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    observed.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries,o) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      o.unobserve(entry.target);
    }
  }), { rootMargin:"0px 0px -9% 0px", threshold:.08 });
  observed.forEach((element) => observer.observe(element));
}

function setupHeaderAndProgress() {
  const header = document.querySelector(".header");
  const progressBar = createScrollProgress();
  let ticking = false;
  const update = () => {
    const top = window.scrollY || document.documentElement.scrollTop;
    const range = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${range>0?Math.min(top/range,1):0})`;
    header?.classList.toggle("is-scrolled", top>24);
    ticking = false;
  };
  const requestUpdate = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  update();
  window.addEventListener("scroll", requestUpdate, { passive:true });
  window.addEventListener("resize", requestUpdate, { passive:true });
}

function setupFaqBehavior() {
  const items = [...document.querySelectorAll(".faq-list details")];
  items.forEach((item) => item.addEventListener("toggle", () => {
    if (item.open) items.forEach((other) => { if (other !== item) other.open = false; });
  }));
}

function updateCtas() {
  const headerCta = document.querySelector(".header-cta");
  if (headerCta) headerCta.textContent = "Homenageie";

  document.querySelectorAll(".hero-actions .button-primary").forEach((button) => {
    button.textContent = "Presenteie com uma música";
  });

  document.querySelectorAll(".plan-button").forEach((button) => {
    button.textContent = "Homenagear por R$ 49,90";
  });

  document.querySelectorAll(".final-cta .button-light").forEach((button) => {
    button.textContent = "Homenageie quem você ama";
  });

  const floating = document.querySelector(".floating-whatsapp");
  const label = floating?.querySelector("span");
  if (label) label.textContent = "Homenageie • R$ 49,90";
  floating?.addEventListener("click", (event) => {
    event.preventDefault();
    openModal();
  });
}

function setupVisualEnhancements() {
  document.documentElement.classList.add("has-premium-motion");
  createAudioPreview();
  setupRevealMotion();
  setupHeaderAndProgress();
  setupFaqBehavior();
  updateCtas();
}

installOrderModal();
setupVisualEnhancements();
