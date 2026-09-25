/**
 * CafeCash Customer Support Widget
 */

(function () {
    'use strict';

    const { api, toast } = window.CafeCash;

    const CONFIG = {
        email: 'support@cafecash.com',
        hours: 'Mon–Fri, 8AM–6PM SAST'
    };

    const state = {
        open: false,
        session: null,
        messages: []
    };

    function injectStyles() {
        if (document.getElementById('supportStyles')) return;
        const style = document.createElement('style');
        style.id = 'supportStyles';
        style.textContent = `
            .support-fab {
                position: fixed;
                bottom: 24px;
                right: 100px;
                width: 56px; height: 56px;
                border-radius: 50%;
                background: var(--surface);
                border: 1px solid var(--border-strong);
                color: var(--text-primary);
                font-size: 22px;
                cursor: pointer;
                box-shadow: var(--shadow-lg);
                z-index: 899;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all var(--dur-base) var(--ease-out);
            }
            .support-fab:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-xl);
                border-color: var(--brand-amber);
            }
            .support-panel {
                position: fixed;
                bottom: 100px; right: 100px;
                width: 380px;
                max-width: calc(100vw - 32px);
                height: 560px;
                max-height: calc(100vh - 140px);
                background: var(--bg-elevated);
                border: 1px solid var(--border-strong);
                border-radius: var(--r-xl);
                box-shadow: var(--shadow-xl);
                z-index: 902;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                opacity: 0;
                transform: translateY(20px) scale(0.96);
                pointer-events: none;
                transition: all var(--dur-base) var(--ease-out);
            }
            .support-panel.open {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: all;
            }
            @media (max-width: 600px) {
                .support-fab { bottom: 84px; right: 16px; }
                .support-panel { bottom: 145px; right: 16px; left: 16px; width: auto; height: 500px; }
            }
        `;
        document.head.appendChild(style);
    }

    function render() {
        if (document.getElementById('supportRoot')) return;

        const root = document.createElement('div');
        root.id = 'supportRoot';
        root.innerHTML = `
            <button class="support-fab" id="supportFab" aria-label="Customer support">💬</button>
            <div class="support-panel" id="supportPanel">
                <div style="padding:16px 20px;background:linear-gradient(135deg,#2A1E17,#4A3428);color:#F5EDE0;display:flex;align-items:center;gap:12px;">
                    <div style="width:40px;height:40px;background:rgba(245,237,224,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;">💬</div>
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:14px;">CafeCash Support</div>
                        <div style="font-size:11px;opacity:0.75;">● Online — We reply in minutes</div>
                    </div>
                    <button id="supportClose" style="background:rgba(245,237,224,0.1);border:none;color:#F5EDE0;width:32px;height:32px;border-radius:8px;cursor:pointer;">✕</button>
                </div>
                <div id="supportMessages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;font-size:13px;"></div>
                <div style="padding:12px 16px;border-top:1px solid var(--border);background:var(--bg-sunken);display:flex;gap:8px;">
                    <input type="text" id="supportInput" placeholder="Type your message…" style="flex:1;padding:10px 14px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:20px;font-size:13px;outline:none;" />
                    <button id="supportSend" style="width:40px;height:40px;border-radius:50%;background:var(--accent);color:var(--accent-fg);border:none;cursor:pointer;">➤</button>
                </div>
                <div style="padding:8px 16px;border-top:1px solid var(--border);font-size:11px;color:var(--text-tertiary);text-align:center;">
                    ${CONFIG.email} · ${CONFIG.hours}
                </div>
            </div>
        `;
        document.body.appendChild(root);

        document.getElementById('supportFab').onclick = () => togglePanel();
        document.getElementById('supportClose').onclick = () => closePanel();
        document.getElementById('supportSend').onclick = () => sendMessage();
        document.getElementById('supportInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    function togglePanel() {
        state.open ? closePanel() : openPanel();
    }

    async function openPanel() {
        state.open = true;
        document.getElementById('supportPanel').classList.add('open');

        if (state.messages.length === 0) {
            addMessage('bot', `👋 Hi! Welcome to CafeCash Support. How can we help you today?`);
            addMessage('bot', `You can browse our FAQs or send us a message and we'll respond shortly.`);
        }
    }

    function closePanel() {
        state.open = false;
        document.getElementById('supportPanel').classList.remove('open');
    }

    function addMessage(role, text) {
        state.messages.push({ role, text, timestamp: new Date() });
        renderMessages();
    }

    function renderMessages() {
        const container = document.getElementById('supportMessages');
        container.innerHTML = state.messages.map(m => `
            <div style="display:flex;${m.role === 'user' ? 'justify-content:flex-end;' : ''}">
                <div style="max-width:85%;padding:10px 14px;border-radius:14px;${m.role === 'user'
                    ? 'background:var(--accent);color:var(--accent-fg);border-bottom-right-radius:4px;'
                    : 'background:var(--bg-sunken);color:var(--text-primary);border-bottom-left-radius:4px;'}">
                    ${escapeHtml(m.text)}
                </div>
            </div>
        `).join('');
        container.scrollTop = container.scrollHeight;
    }

    async function sendMessage() {
        const input = document.getElementById('supportInput');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        addMessage('user', text);

        // Auto-response (replace with real backend)
        setTimeout(() => {
            addMessage('bot', `Thanks for your message! A support agent will respond shortly. For urgent issues, email ${CONFIG.email}.`);
        }, 800);
    }

    function escapeHtml(s) {
        if (s == null) return '';
        const d = document.createElement('div');
        d.textContent = String(s);
        return d.innerHTML;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { injectStyles(); render(); });
    } else {
        injectStyles(); render();
    }

    console.log('✅ CafeCash Support ready');
})();
