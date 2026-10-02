/**
 * CafeCash Accessibility Center
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'cafecash_a11y';

    const defaults = {
        theme: 'auto',
        textSize: 'normal',
        highContrast: false,
        reducedMotion: false,
        dyslexicFont: false,
        largeTargets: false,
        readAloud: false
    };

    let settings = { ...defaults };

    function load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) settings = { ...defaults, ...JSON.parse(saved) };
        } catch {}
        applyAll();
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch {}
    }

    function applyAll() {
        document.documentElement.removeAttribute('data-a11y');
        document.documentElement.removeAttribute('data-theme');

        // Theme
        if (settings.theme && settings.theme !== 'auto') {
            document.documentElement.setAttribute('data-theme', settings.theme);
        }

        // Text size
        if (settings.textSize === 'large') document.documentElement.setAttribute('data-a11y', 'large-text');
        else if (settings.textSize === 'xlarge') document.documentElement.setAttribute('data-a11y', 'xlarge-text');

        // Combined flags
        const flags = [];
        if (settings.highContrast) flags.push('high-contrast');
        if (settings.reducedMotion) flags.push('reduce-motion');
        if (settings.dyslexicFont) flags.push('dyslexic');
        if (settings.largeTargets) flags.push('large-targets');

        if (flags.length) {
            const existing = document.documentElement.getAttribute('data-a11y');
            document.documentElement.setAttribute(
                'data-a11y',
                [existing, ...flags].filter(Boolean).join(' ')
            );
        }
    }

    window.CafeCashA11y = {
        settings,
        set(key, value) {
            settings[key] = value;
            applyAll();
            save();
        },
        get(key) {
            return settings[key];
        },
        reset() {
            settings = { ...defaults };
            applyAll();
            save();
        },
        toggle(key) {
            settings[key] = !settings[key];
            applyAll();
            save();
            return settings[key];
        }
    };

    // Load immediately (before paint)
    load();

    console.log('♿ CafeCash Accessibility ready');
})();
