/**
 * CafeCash Smart Control — Command Palette
 */

(function () {
    'use strict';

    const { state } = window.CafeCash;

    let isOpen = false;
    let focusedIndex = 0;
    let currentResults = [];

    const commands = [
        // Navigation
        { group: 'Navigate', icon: '📊', title: 'Dashboard', desc: 'Overview and stats', action: () => navigateTo('dashboard'), shortcut: 'Ctrl+1' },
        { group: 'Navigate', icon: '💰', title: 'Sales', desc: 'Record and view sales', action: () => navigateTo('sales'), shortcut: 'Ctrl+2' },
        { group: 'Navigate', icon: '📦', title: 'Inventory', desc: 'Manage products', action: () => navigateTo('inventory'), shortcut: 'Ctrl+3' },
        { group: 'Navigate', icon: '🍳', title: 'Recipes', desc: 'Manage recipes', action: () => navigateTo('recipes'), shortcut: 'Ctrl+4' },
        { group: 'Navigate', icon: '🗑️', title: 'Waste', desc: 'Track waste', action: () => navigateTo('waste'), shortcut: 'Ctrl+5' },
        { group: 'Navigate', icon: '🚚', title: 'Suppliers', desc: 'Manage suppliers', action: () => navigateTo('suppliers'), shortcut: 'Ctrl+6' },
        { group: 'Navigate', icon: '📈', title: 'Reports', desc: 'Analytics and reports', action: () => navigateTo('reports'), shortcut: 'Ctrl+7' },
        { group: 'Navigate', icon: '🤖', title: 'Intelligence', desc: 'AI insights', action: () => navigateTo('intelligence'), shortcut: 'Ctrl+8' },
        { group: 'Navigate', icon: '⚡', title: 'Smart Control', desc: 'Quick actions', action: () => navigateTo('smart') },
        { group: 'Navigate', icon: '♿', title: 'Accessibility', desc: 'Text size, contrast, motion', action: () => navigateTo('accessibility') },
        { group: 'Navigate', icon: '⚙️', title: 'Settings', desc: 'Account and preferences', action: () => navigateTo('settings') },

        // Actions
        { group: 'Actions', icon: '💰', title: 'Record a sale', desc: 'Add new sale', action: () => { navigateTo('sales'); setTimeout(window.openSaleModal, 300); } },
        { group: 'Actions', icon: '📦', title: 'Add product', desc: 'Add to inventory', action: () => { navigateTo('inventory'); setTimeout(window.openAddItemModal, 300); } },
        { group: 'Actions', icon: '🗑️', title: 'Record waste', desc: 'Log waste item', action: () => { navigateTo('waste'); setTimeout(window.openWasteModal, 300); } },
        { group: 'Actions', icon: '🍳', title: 'Create recipe', desc: 'New recipe', action: () => { navigateTo('recipes'); setTimeout(window.openAddRecipeModal, 300); } },
        { group: 'Actions', icon: '🚚', title: 'Add supplier', desc: 'New supplier', action: () => { navigateTo('suppliers'); setTimeout(window.openAddSupplierModal, 300); } },
        { group: 'Actions', icon: '🤖', title: 'Ask CafeCash', desc: 'Open AI panel', action: () => openAIPanel() },
        { group: 'Actions', icon: '📥', title: 'Export sales CSV', desc: 'Download report', action: () => window.exportCSV && window.exportCSV() },

        // Appearance
        { group: 'Appearance', icon: '🌙', title: 'Toggle theme', desc: 'Switch between light/dark/café', action: () => window.toggleTheme() },
        { group: 'Appearance', icon: '👑', title: 'Upgrade to Premium', desc: 'Unlock all features', action: () => openUpgradeModal() },

        // Account
        { group: 'Account', icon: '🚪', title: 'Sign out', desc: 'Log out of CafeCash', action: () => signOut() }
    ];

    window.openSmartControl = function () {
        if (isOpen) return;
        isOpen = true;
        document.getElementById('scOverlay').classList.add('open');

        const input = document.getElementById('scPaletteInput');
        input.value = '';
        input.focus();

        renderResults('');
    };

    window.closeSmartControl = function () {
        isOpen = false;
        document.getElementById('scOverlay').classList.remove('open');
        focusedIndex = 0;
    };

    function renderResults(query) {
        const q = query.toLowerCase().trim();

        currentResults = commands.filter(c =>
            !q ||
            c.title.toLowerCase().includes(q) ||
            c.desc.toLowerCase().includes(q) ||
            c.group.toLowerCase().includes(q)
        );

        const body = document.getElementById('scPaletteBody');

        if (!currentResults.length) {
            body.innerHTML = `<div class="sc-palette-empty">No results for "${escapeHtml(query)}"</div>`;
            return;
        }

        // Group
        const groups = {};
        currentResults.forEach((c, idx) => {
            if (!groups[c.group]) groups[c.group] = [];
            groups[c.group].push({ ...c, idx });
        });

        let html = '';
        for (const [group, items] of Object.entries(groups)) {
            html += `<div class="sc-palette-group">${escapeHtml(group)}</div>`;
            for (const item of items) {
                html += `
                    <div class="sc-palette-item ${item.idx === focusedIndex ? 'focused' : ''}"
                         data-index="${item.idx}"
                         onclick="runCommand(${item.idx})">
                        <div class="sc-palette-icon-sm">${item.icon}</div>
                        <div class="sc-palette-text">
                            <div class="sc-palette-title">${escapeHtml(item.title)}</div>
                            <div class="sc-palette-desc">${escapeHtml(item.desc)}</div>
                        </div>
                        ${item.shortcut ? `<kbd class="sc-palette-shortcut">${item.shortcut}</kbd>` : ''}
                    </div>
                `;
            }
        }

        body.innerHTML = html;
    }

    window.runCommand = function (index) {
        const cmd = currentResults[index];
        if (!cmd) return;
        closeSmartControl();
        setTimeout(() => cmd.action(), 50);
    };

    function scrollFocusedIntoView() {
        const el = document.querySelector('.sc-palette-item.focused');
        if (el) el.scrollIntoView({ block: 'nearest' });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const input = document.getElementById('scPaletteInput');
        if (!input) return;

        input.addEventListener('input', () => {
            focusedIndex = 0;
            renderResults(input.value);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusedIndex = Math.min(focusedIndex + 1, currentResults.length - 1);
                renderResults(input.value);
                scrollFocusedIntoView();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                focusedIndex = Math.max(focusedIndex - 1, 0);
                renderResults(input.value);
                scrollFocusedIntoView();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                runCommand(focusedIndex);
            } else if (e.key === 'Escape') {
                closeSmartControl();
            }
        });
    });

    // Global shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K → command palette
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openSmartControl();
            return;
        }

        // Ctrl/Cmd + / → Smart Control
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            openSmartControl();
            return;
        }

        // Escape → close
        if (e.key === 'Escape') {
            if (isOpen) { closeSmartControl(); return; }
            closeAIPanel();
        }

        // Ctrl+1..8 → pages
        if (e.ctrlKey || e.metaKey) {
            const map = {
                '1': 'dashboard', '2': 'sales', '3': 'inventory',
                '4': 'recipes', '5': 'waste', '6': 'suppliers',
                '7': 'reports', '8': 'intelligence'
            };
            if (map[e.key] && !e.shiftKey) {
                e.preventDefault();
                navigateTo(map[e.key]);
            }
        }

        // Ctrl+Shift+A → Accessibility
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
            e.preventDefault();
            navigateTo('accessibility');
        }

        // Ctrl+Shift+T → theme
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'T' || e.key === 't')) {
            e.preventDefault();
            window.toggleTheme();
        }

        // Ctrl+/ → Smart Control
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            openSmartControl();
        }
    });

    function escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    console.log('✅ CafeCash Smart Control ready');
})();
