/* =========================================================
   Magesh AI — floating chatbot UI.
   Talks only to our own backend (/api/chat). The OpenRouter
   API key never touches this file or the browser.
   ========================================================= */
(function () {
  "use strict";

  const magesh = document.getElementById("magesh");
  const fab = document.getElementById("mageshFab");
  const closeBtn = document.getElementById("mageshClose");
  const body = document.getElementById("mageshBody");
  const form = document.getElementById("mageshForm");
  const input = document.getElementById("mageshInput");
  const dot = document.getElementById("mageshDot");

  let history = []; // [{role, content}]
  let hasOpened = false;

  function toggle() {
    magesh.classList.toggle("is-open");
    if (magesh.classList.contains("is-open")) {
      hasOpened = true;
      dot.style.display = "none";
      input.focus();
      scrollToBottom();
    }
  }

  fab.addEventListener("click", toggle);
  closeBtn.addEventListener("click", toggle);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      body.scrollTop = body.scrollHeight;
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Minimal markdown-ish rendering: bold, line breaks, bullet lists
  function renderMessage(text) {
    let safe = escapeHtml(text);
    safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/\n- /g, "\n• ");
    safe = safe.replace(/\n/g, "<br/>");
    return safe;
  }

  function addMessage(role, text) {
    const el = document.createElement("div");
    el.className = `magesh__msg magesh__msg--${role === "user" ? "user" : "bot"}`;
    el.innerHTML = renderMessage(text);
    body.appendChild(el);
    scrollToBottom();
    return el;
  }

  function addTypingIndicator() {
    const el = document.createElement("div");
    el.className = "magesh__msg magesh__msg--bot magesh__msg--typing";
    el.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(el);
    scrollToBottom();
    return el;
  }

  async function sendMessage(text) {
    if (!text.trim()) return;

    // Remove suggestion chips after first real interaction
    const suggestions = body.querySelector(".magesh__suggestions");
    if (suggestions) suggestions.remove();

    addMessage("user", text);
    history.push({ role: "user", content: text });

    const typingEl = addTypingIndicator();
    input.disabled = true;

    try {
      const res = await Api.chat({ message: text, history: history.slice(-10) });
      typingEl.remove();
      addMessage("bot", res.reply);
      history.push({ role: "assistant", content: res.reply });
    } catch (err) {
      typingEl.remove();
      addMessage(
        "bot",
        "I'm having trouble reaching the AI service right now. In the meantime: use the search bar to look for items, or the Report buttons in the navbar to file a lost/found report."
      );
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = "";
    sendMessage(text);
  });

  body.addEventListener("click", (e) => {
    const btn = e.target.closest(".magesh__suggestion");
    if (btn) sendMessage(btn.dataset.msg);
  });

  // Gentle nudge: open the dot indicator after a delay if user hasn't interacted
  setTimeout(() => {
    if (!hasOpened) dot.style.display = "block";
  }, 4000);
})();
