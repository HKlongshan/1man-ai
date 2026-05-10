/* === 共用 JS - AI 工具箱 === */
const STORAGE_KEY = 'ai_tools_keys';
const htmlEl = document.documentElement;
const themeToggle = document.getElementById('themeToggle');

function getPreferredTheme() {
  const saved = localStorage.getItem('theme');
  return saved ? saved : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
function applyTheme(t) {
  htmlEl.classList.toggle('dark', t === 'dark');
  if (themeToggle) themeToggle.textContent = t === 'dark' ? '☀️' : '🌙';
}
applyTheme(getPreferredTheme());
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = htmlEl.classList.contains('dark') ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });
}

function getAllKeys() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch(e) { return {}; }
}
function saveKey(provider, key) {
  const keys = getAllKeys(); keys[provider] = key;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}
function getKey(provider) { return getAllKeys()[provider] || ''; }
function clearKey(provider) { const k = getAllKeys(); delete k[provider]; localStorage.setItem(STORAGE_KEY, JSON.stringify(k)); }

async function callAI({ provider, apiKey, model, messages, maxTokens = 1024 }) {
  if (!apiKey) throw new Error('請先輸入 API Key');
  let url, headers, body;

  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey };
    body = JSON.stringify({ model: model || 'gpt-4o-mini', messages, max_tokens: maxTokens, temperature: 0.7 });
  } else if (provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
    body = JSON.stringify({
      model: model || 'claude-3-5-haiku-latest',
      messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
      max_tokens: maxTokens,
    });
  } else if (provider === 'gemini') {
    url = 'https://generativelanguage.googleapis.com/v1beta/models/' + (model || 'gemini-2.0-flash') + ':generateContent?key=' + apiKey;
    headers = { 'Content-Type': 'application/json' };
    const gm = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    body = JSON.stringify({ contents: gm, generationConfig: { maxOutputTokens: maxTokens } });
  } else {
    throw new Error('不支援的 AI 供應商：' + provider);
  }

  const resp = await fetch(url, { method: 'POST', headers: headers, body: body });
  if (!resp.ok) { const err = await resp.text(); throw new Error('API 錯誤 (' + resp.status + ')：' + err.slice(0, 200)); }
  const data = await resp.json();
  if (provider === 'gemini') return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (provider === 'claude') return data.content?.[0]?.text || '';
  return data.choices?.[0]?.message?.content || '';
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}
