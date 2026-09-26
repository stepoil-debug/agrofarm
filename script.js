(() => {
  // O checkout possui uma única implementação: infinitepay-flow.js.
  // Os fluxos antigos não são carregados para evitar formulários duplicados,
  // perda de campos e mensagens divergentes.
  const flow = document.createElement('script');
  flow.src = './infinitepay-flow.js?v=20260926-7';
  flow.defer = false;
  document.body.appendChild(flow);
})();
