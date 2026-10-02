/**
 * CafeCash Landing Page — interactions
 */

(function () {
    'use strict';

    // Nav scroll state
    const nav = document.getElementById('lnNav');
    if (nav) {
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const y = window.scrollY;
            nav.classList.toggle('scrolled', y > 40);
            lastScroll = y;
        }, { passive: true });
    }

    // Mobile nav toggle
    const navToggle = document.getElementById('lnNavToggle');
    const navLinks = document.querySelector('.ln-nav-links');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            const isOpen = navLinks.style.display === 'flex';
            navLinks.style.display = isOpen ? '' : 'flex';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '100%';
            navLinks.style.left = '0';
            navLinks.style.right = '0';
            navLinks.style.flexDirection = 'column';
            navLinks.style.padding = '24px';
            navLinks.style.background = 'rgba(15,11,8,0.98)';
            navLinks.style.borderTop = '1px solid rgba(245,237,224,0.08)';
        });
    }

    // Smooth scroll for anchors
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Animated counters
    const counters = document.querySelectorAll('[data-count]');
    if (counters.length) {
        const animate = (el) => {
            const target = Number(el.dataset.count);
            const duration = 1200;
            const start = performance.now();
            const tick = (now) => {
                const progress = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.floor(target * eased);
                if (progress < 1) requestAnimationFrame(tick);
                else el.textContent = target;
            };
            requestAnimationFrame(tick);
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.dataset.animated) {
                    entry.target.dataset.animated = 'true';
                    animate(entry.target);
                }
            });
        }, { threshold: 0.4 });

        counters.forEach(c => observer.observe(c));
    }

    // Reveal on scroll
    const revealEls = document.querySelectorAll(
        '.ln-section-header, .ln-problem-card, .ln-feature-card, .ln-timeline-item, .ln-pricing-card'
    );
    if (revealEls.length) {
        revealEls.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(24px)';
            el.style.transition = 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)';
        });

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        revealEls.forEach(el => revealObserver.observe(el));
    }

    // Pause video when not visible (battery)
    const video = document.querySelector('.ln-hero-video');
    if (video) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) video.play().catch(() => {});
                else video.pause();
            });
        }, { threshold: 0.1 });
        videoObserver.observe(video);
    }

    console.log('☕ CafeCash landing loaded');
})();
