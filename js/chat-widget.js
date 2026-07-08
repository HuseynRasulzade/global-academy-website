(function () {
  // After deploying the backend on Render (see server/README.md), set this to
  // its live URL, e.g. "https://global-academy-chat.onrender.com".
  // Leave empty ("") only for local dev where server/app.py serves both the
  // site and the API from the same origin.
  const CHAT_API_BASE = "";
  const CHAT_ENDPOINT = CHAT_API_BASE ? CHAT_API_BASE.replace(/\/$/, "") + "/api/chat" : "/api/chat";

  const toggle = document.getElementById('chatToggle');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const messagesEl = document.getElementById('chatMessages');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  if (!toggle || !panel || !form) return;

  const history = [];
  let sending = false;

  function addBubble(text, role) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ' + (role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot');
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function setOpen(open) {
    panel.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    if (open) input.focus();
  }

  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  closeBtn.addEventListener('click', () => setOpen(false));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || sending) return;

    addBubble(text, 'user');
    history.push({ role: 'user', content: text });
    input.value = '';
    sending = true;

    const typing = addBubble('Yazır...', 'bot');
    typing.classList.add('chat-typing');

    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      typing.remove();

      if (!res.ok || data.error) {
        addBubble('Üzr istəyirik, hazırda AI köməkçisi əlçatan deyil. Zəhmət olmasa Əlaqə formundan yazın.', 'bot');
      } else {
        addBubble(data.reply, 'bot');
        history.push({ role: 'assistant', content: data.reply });
      }
    } catch (err) {
      typing.remove();
      addBubble('Əlaqə qurula bilmədi (backend server aktiv deyil). Zəhmət olmasa Əlaqə formundan yazın.', 'bot');
    } finally {
      sending = false;
    }
  });
})();
