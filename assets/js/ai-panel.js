/**
 * CafeCash Intelligence Panel
 */

(function () {
    'use strict';

    const { api, toast, state } = window.CafeCash;

    const suggestions = [
        'How much did I sell today?',
        'What are my best sellers?',
        'What stock is running low?',
        'What am I wasting the most?',
        'Which products make the most profit?',
        'What should I prep tomorrow?'
    ];

    let open = false;
    let sending = false;
    const messages = [];

    window.toggleAIPanel = function () {
        open ? closeAIPanel() : openAIPanel();
    };

    window.openAIPanel = function () {
        open = true;
        document.getElementById('aiPanel').classList.add('open');
        document.getElementById('aiFab').classList.add('hidden');
        document.getElementById('aiPanelSub').textContent = state.cafe?.name || 'Your business';

        if (messages.length === 0) {
            addMessage({
                role: 'ai',
                content: `Hi ${(state.user?.name || 'there').split(' ')[0]}! I'm CafeCash Intelligence. I can see your real business data. Ask me anything — or pick a suggestion below.`,
                actions: []
            });
        }

        setTimeout(() => document.getElementById('aiPanelInput').focus(), 300);
    };

    window.closeAIPanel = function () {
        open = false;
        document.getElementById('aiPanel').classList.remove('open');
        document.getElementById('aiFab').classList.remove('hidden');
    };

    window.aiAsk = function (text) {
        openAIPanel();
        const input = document.getElementById('aiPanelInput');
        input.value = text;
        sendMessage();
    };

    function addMessage(msg) {
        messages.push(msg);
        renderMessages();
    }

    function renderMessages() {
        const container = document.getElementById('aiPanelMessages');
        if (!container) return;

        container.innerHTML = messages.map(m => {
            const isUser = m.role === 'user';
            const avatar = isUser ? ((state.user?.name || 'U')[0].toUpperCase()) : '🤖';

            let body = '';
            if (m.title) body += `<div class="ai-msg-title">${escapeHtml(m.title)}</div>`;
            body += `<div>${escapeHtml(m.content || '')}</div>`;

            if (m.data && m.data.length) {
                body += `<div class="ai-msg-data">`;
                for (const row of m.data) {
                    body += `<div class="ai-msg-data-row">
                        <div class="ai-msg-data-label">${escapeHtml(row.label)}</div>
                        <div class="ai-msg-data-value">${escapeHtml(row.value)}</div>
                    </div>`;
                }
                body += `</div>`;
            }

            if (m.actions && m.actions.length) {
                body += `<div class="ai-msg-actions">`;
                for (const a of m.actions) {
                    body += `<button class="ai-msg-action" onclick="aiAsk('${escapeAttr(a.label)}')">${escapeHtml(a.label)}</button>`;
                }
                body += `</div>`;
            }

            if (m.confidence) {
                body += `<div class="ai-msg-confidence ${m.confidence}">${m.confidence} confidence</div>`;
            }

            return `
                <div class="ai-msg ${isUser ? 'user' : 'ai'}">
                    <div class="ai-msg-avatar">${avatar}</div>
                    <div class="ai-msg-body">
                        <div class="ai-msg-bubble">${body}</div>
                    </div>
                </div>
            `;
        }).join('');

        const container2 = document.getElementById('aiPanelMessages');
        container2.scrollTop = container2.scrollHeight;
    }

    function renderSuggestions() {
        const container = document.getElementById('aiPanelSuggestions');
        if (!container) return;
        container.innerHTML = suggestions.map(s =>
            `<button class="ai-chip" onclick="aiAsk('${escapeAttr(s)}')">${escapeHtml(s)}</button>`
        ).join('');
    }

    async function sendMessage() {
        const input = document.getElementById('aiPanelInput');
        const content = input.value.trim();
        if (!content || sending) return;

        sending = true;
        input.value = '';
        input.style.height = 'auto';
        document.getElementById('aiPanelSend').disabled = true;

        addMessage({ role: 'user', content });

        document.getElementById('aiPanelTyping').classList.remove('hidden');
        const messagesEl = document.getElementById('aiPanelMessages');
        messagesEl.scrollTop = messagesEl.scrollHeight;

        try {
            const res = await api('/ai/ask', {
                method: 'POST',
                body: JSON.stringify({
                    message: content,
                    history: messages.slice(-6).map(m => ({
                        role: m.role === 'user' ? 'user' : 'assistant',
                        content: m.content
                    }))
                })
            });

            document.getElementById('aiPanelTyping').classList.add('hidden');

            addMessage({
                role: 'ai',
                title: res.data.title,
                content: res.data.text,
                data: res.data.data,
                confidence: res.data.confidence
            });
        } catch (err) {
            document.getElementById('aiPanelTyping').classList.add('hidden');
            addMessage({
                role: 'ai',
                content: `⚠️ ${err.message}`
            });
        } finally {
            sending = false;
            document.getElementById('aiPanelSend').disabled = !input.value.trim();
        }
    }

    function escapeHtml(s) {
        if (s == null) return '';
        const d = document.createElement('div');
        d.textContent = String(s);
        return d.innerHTML;
    }
    function escapeAttr(s) {
        return String(s).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    document.addEventListener('DOMContentLoaded', () => {
        const input = document.getElementById('aiPanelInput');
        const send = document.getElementById('aiPanelSend');
        if (!input) return;

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
            send.disabled = !input.value.trim() || sending;
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        send.addEventListener('click', sendMessage);
        renderSuggestions();
    });

    console.log('✅ CafeCash AI panel ready');
})();
