// Gera e revisa letras de música personalizada via Vercel AI Gateway.
// Autenticação: OIDC automático do deploy na Vercel (VERCEL_OIDC_TOKEN) ou
// AI_GATEWAY_API_KEY, se configurada. Nenhum segredo vai para o navegador.
const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const MODEL = process.env.AI_GATEWAY_MODEL || 'anthropic/claude-sonnet-5.5';

const DIRECTIONS = [
  { name: 'História em capítulos', angle: 'Narrativa romântica', brief: 'conta a relação em ordem, do primeiro encontro até hoje, ganhando força a cada verso' },
  { name: 'Cena de cinema', angle: 'Declaração cinematográfica', brief: 'declaração grande, visual e emocionante, com imagens fortes, feita para o momento exato da surpresa' },
  { name: 'Refrão que fica', angle: 'Pop leve e memorável', brief: 'refrão curto, simples e muito cantável, que gruda depois do primeiro play' },
  { name: 'Perto do coração', angle: 'Intimista, voz e violão', brief: 'confessional e delicada, como uma conversa baixinho entre os dois' },
  { name: 'Surpresa com sorriso', angle: 'Autoral e afetuosa', brief: 'leve e carinhosa, com espaço para manias, piadas internas e detalhes engraçados do casal' },
];

// Limite simples por IP para conter abuso (best effort por instância).
const hits = new Map();
function allow(ip, key, max) {
  const now = Date.now();
  const id = `${key}:${ip}`;
  const list = (hits.get(id) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (list.length >= max) return false;
  list.push(now);
  hits.set(id, list);
  return true;
}

const clean = (value, limit) => String(value ?? '').replace(/\s+\n/g, '\n').trim().slice(0, limit);

function readBriefing(order = {}) {
  return {
    recipientName: clean(order.recipientName, 80),
    nickname: clean(order.nickname, 80),
    customerName: clean(order.customerName, 80),
    occasion: clean(order.occasion, 80),
    relationship: clean(order.relationship, 80),
    musicStyle: clean(order.musicStyle, 60),
    voice: clean(order.voice, 40),
    story: clean(order.story, 2500),
    keyMoments: clean(order.keyMoments, 1500),
    message: clean(order.message, 1000),
  };
}

function briefingText(b) {
  return [
    `Pessoa homenageada: ${b.recipientName}`,
    b.nickname && `Como é chamada carinhosamente: ${b.nickname}`,
    b.customerName && `Quem está presenteando: ${b.customerName}`,
    `Ocasião: ${b.occasion || 'declaração de amor'}`,
    b.relationship && `Tempo de relacionamento: ${b.relationship}`,
    `Estilo musical: ${b.musicStyle || 'romântico'}`,
    b.voice && `Voz: ${b.voice}`,
    `História do casal: ${b.story}`,
    b.keyMoments && `Detalhes que não podem faltar: ${b.keyMoments}`,
    b.message && `O que a pessoa deve sentir: ${b.message}`,
  ].filter(Boolean).join('\n');
}

const SYSTEM = [
  'Você é um compositor brasileiro de músicas personalizadas para presentes românticos.',
  'Escreva em português do Brasil, com linguagem natural, rimas que soem espontâneas e métrica cantável no estilo pedido.',
  'Use os nomes, apelidos, lugares e detalhes reais do briefing de forma orgânica — nunca cole frases do briefing literalmente.',
  'Evite clichês vazios e exageros; prefira imagens concretas da história do casal.',
  'Estruture com marcações entre colchetes: [Verso 1], [Pré-refrão], [Refrão], [Verso 2], [Refrão], [Ponte], [Refrão final].',
  'Entre 180 e 260 palavras. O nome ou apelido da pessoa homenageada deve aparecer no refrão.',
  'Não invente fatos importantes que contradigam o briefing. Não inclua conteúdo ofensivo.',
  'Responda SOMENTE com JSON válido no formato {"title": "...", "lyrics": "..."} usando \\n para quebras de linha.',
].join(' ');

async function callModel(token, messages) {
  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: 1200, temperature: 0.9 }),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(`gateway ${response.status}`);
    error.status = response.status;
    error.detail = detail.slice(0, 300);
    throw error;
  }
  const data = await response.json();
  const choice = data?.choices?.[0] || {};
  const content = choice.message?.content;
  const text = Array.isArray(content)
    ? content.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('')
    : String(content || '');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    const error = new Error('resposta sem JSON');
    error.detail = `finish=${choice.finish_reason} keys=${Object.keys(choice.message || {}).join(',')} text=${text.slice(0, 160)}`;
    throw error;
  }
  const parsed = JSON.parse(match[0]);
  const title = clean(parsed.title, 120);
  const lyrics = clean(parsed.lyrics, 4000);
  if (!title || lyrics.length < 80) throw new Error('letra incompleta');
  return { title, lyrics };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || req.headers['x-vercel-oidc-token'];
  if (!token) return res.status(503).json({ success: false, message: 'Geração de letras indisponível no momento.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const action = body.action === 'revise' ? 'revise' : 'generate';
  const briefing = readBriefing(body.order);
  if (!briefing.recipientName || briefing.story.length < 20) {
    return res.status(400).json({ success: false, message: 'Conte um pouco mais da história para criarmos a letra.' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';
  if (!allow(ip, action, action === 'generate' ? 8 : 40)) {
    return res.status(429).json({ success: false, message: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.' });
  }

  try {
    if (action === 'generate') {
      const results = await Promise.allSettled(DIRECTIONS.map((direction) => callModel(token, [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `${briefingText(briefing)}\n\nDireção criativa desta versão: "${direction.name}" (${direction.angle}) — ${direction.brief}.\nEscreva a letra completa.` },
      ])));
      const versions = results.map((result, index) => (result.status === 'fulfilled'
        ? { ...DIRECTIONS[index], ...result.value }
        : null));
      if (!versions.some(Boolean)) {
        const reason = results.find((r) => r.status === 'rejected')?.reason;
        console.error('lyrics generate failed', reason?.status, reason?.message, reason?.detail);
        return res.status(502).json({ success: false, message: 'Não conseguimos compor agora. Tente novamente.' });
      }
      return res.status(200).json({ success: true, versions });
    }

    const current = { title: clean(body.version?.title, 120), lyrics: clean(body.version?.lyrics, 4000), angle: clean(body.version?.angle, 80) };
    const instruction = clean(body.instruction, 600);
    if (!current.lyrics || !instruction) {
      return res.status(400).json({ success: false, message: 'Diga o que você quer mudar na letra.' });
    }
    const revised = await callModel(token, [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `${briefingText(briefing)}\n\nLetra atual (${current.angle}):\nTítulo: ${current.title}\n${current.lyrics}\n\nPedido de ajuste do cliente: ${instruction}\n\nReescreva a letra aplicando o ajuste e mantendo o que já estava bom.` },
    ]);
    return res.status(200).json({ success: true, version: revised });
  } catch (error) {
    console.error('lyrics error', error?.status, error?.message, error?.detail);
    return res.status(502).json({ success: false, message: 'Não conseguimos ajustar a letra agora. Tente novamente.' });
  }
};
