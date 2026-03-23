/* global bootstrap */
(function () {
    'use strict';

    const BASE_URL = (document.querySelector('meta[name="base-url"]') || {}).content || '';
    const STORAGE_KEY = 'cemil_chatbot_history';
    const MAX_HISTORY = 10; // últimas 10 mensagens (~5 turnos)

    let isOpen = false;
    let isLoading = false;

    const toggle   = document.getElementById('chatbotToggle');
    const panel    = document.getElementById('chatbotPanel');
    const messagesEl = document.getElementById('chatbotMessages');
    const input    = document.getElementById('chatbotInput');
    const sendBtn  = document.getElementById('chatbotSend');
    const clearBtn = document.getElementById('chatbotClear');

    if (!toggle || !panel) return;

    // -------------------------------------------------------
    // Histórico (sessionStorage — limpa ao fechar aba)
    // -------------------------------------------------------
    function loadHistory() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function saveHistory(history) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
    }

    function clearHistory() {
        sessionStorage.removeItem(STORAGE_KEY);
    }

    // -------------------------------------------------------
    // Renderização de mensagens
    // -------------------------------------------------------
    function escHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderMarkdown(text) {
        let html = escHtml(text);

        // Cabeçalhos
        html = html.replace(/^#{1,3} (.+)$/gm, '<h6>$1</h6>');

        // Negrito e itálico
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Código inline
        html = html.replace(/`(.+?)`/g, '<code>$1</code>');

        // Listas
        html = html.replace(/((?:^[-*] .+\n?)+)/gm, function (block) {
            const items = block
                .split('\n')
                .filter(l => l.match(/^[-*] /))
                .map(l => '<li>' + l.replace(/^[-*] /, '') + '</li>')
                .join('');
            return '<ul>' + items + '</ul>';
        });

        // Quebras de linha
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    function appendMessage(role, text) {
        const div = document.createElement('div');
        div.className = 'chatbot-msg chatbot-msg-' + role;
        if (role === 'assistant') {
            div.innerHTML = renderMarkdown(text);
        } else {
            div.textContent = text;
        }
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return div;
    }

    function renderHistory() {
        messagesEl.innerHTML = '';
        loadHistory().forEach(function (entry) {
            if ((entry.role === 'user' || entry.role === 'assistant') && typeof entry.content === 'string' && entry.content) {
                appendMessage(entry.role, entry.content);
            }
        });
    }

    function showThinking() {
        const div = document.createElement('div');
        div.className = 'chatbot-msg chatbot-msg-assistant chatbot-thinking';
        div.id = 'chatbotThinking';
        div.innerHTML = '<span></span><span></span><span></span>';
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function removeThinking() {
        const el = document.getElementById('chatbotThinking');
        if (el) el.remove();
    }

    // -------------------------------------------------------
    // Abrir / fechar painel
    // -------------------------------------------------------
    toggle.addEventListener('click', function () {
        isOpen = !isOpen;
        panel.classList.toggle('chatbot-panel-open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
        if (isOpen) {
            renderHistory();
            input.focus();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen) {
            isOpen = false;
            panel.classList.remove('chatbot-panel-open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });

    // -------------------------------------------------------
    // Enviar mensagem
    // -------------------------------------------------------
    async function sendMessage() {
        if (isLoading) return;

        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        isLoading = true;
        sendBtn.disabled = true;
        input.disabled = true;

        const history = loadHistory();
        appendMessage('user', text);
        showThinking();

        try {
            const resp = await fetch(BASE_URL + '/api/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: history.slice(-MAX_HISTORY),
                }),
            });

            const data = await resp.json();
            removeThinking();

            if (data.ok && data.reply) {
                appendMessage('assistant', data.reply);
                history.push({ role: 'user',      content: text });
                history.push({ role: 'assistant', content: data.reply });
                saveHistory(history);
            } else {
                appendMessage('assistant', data.error || 'Desculpe, ocorreu um erro. Tente novamente.');
            }
        } catch {
            removeThinking();
            appendMessage('assistant', 'Erro de conexão. Verifique sua rede e tente novamente.');
        } finally {
            isLoading = false;
            sendBtn.disabled = false;
            input.disabled = false;
            input.focus();
        }
    }

    sendBtn.addEventListener('click', sendMessage);

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    clearBtn.addEventListener('click', function () {
        clearHistory();
        messagesEl.innerHTML = '';
    });
})();
