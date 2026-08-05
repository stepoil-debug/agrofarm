const SITE_CONFIG = {
  // Informe somente números, incluindo DDI e DDD. Exemplo: 5522999999999
  whatsappNumber: "",
};

const modal = document.querySelector("#order-modal");
const form = document.querySelector("#order-form");
const selectedPlanLabel = document.querySelector("#selected-plan");
const planButtons = document.querySelectorAll(".plan-button");
const closeButtons = document.querySelectorAll("[data-close-modal]");

let selectedPlan = "";
let selectedPrice = "";

function openModal(plan, price) {
  selectedPlan = plan;
  selectedPrice = price;
  selectedPlanLabel.textContent = `${plan} — ${price}`;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  window.setTimeout(() => {
    form.elements.customerName.focus();
  }, 50);
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

  // Sem número configurado, o WhatsApp permite que a pessoa escolha o contato.
  return `https://wa.me/?text=${encodedMessage}`;
}

function buildOrderMessage(data) {
  return [
    "Olá! Quero criar uma música personalizada. 🎵",
    "",
    `*Plano:* ${selectedPlan}`,
    `*Valor:* ${selectedPrice}`,
    `*Meu nome:* ${data.get("customerName")}`,
    `*Pessoa homenageada:* ${data.get("recipientName")}`,
    `*Ocasião:* ${data.get("occasion")}`,
    `*Estilo musical:* ${data.get("musicStyle")}`,
    `*Preferência de voz:* ${data.get("voice")}`,
    `*Pagamento preferido:* ${data.get("payment")}`,
    "",
    "*Nossa história:*",
    data.get("story"),
    "",
    "*Mensagem que desejo transmitir:*",
    data.get("message") || "Não informada",
    "",
    "Gostaria de confirmar o pedido e receber as orientações de pagamento.",
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

document.querySelector("#current-year").textContent = new Date().getFullYear();
