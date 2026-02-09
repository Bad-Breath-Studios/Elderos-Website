/* ============================================================
   ELDEROS STAFF PANEL - ANIMATIONS MODULE
   ============================================================ */

const Animations = {
    // Check for reduced motion preference
    prefersReducedMotion: false,

    /**
     * Initialize animations module
     */
    init() {
        this.checkReducedMotion();
        this.setupIntersectionObserver();
    },

    /**
     * Check reduced motion preference
     */
    checkReducedMotion() {
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Listen for changes
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.prefersReducedMotion = e.matches;
        });
    },

    /**
     * Setup intersection observer for scroll animations
     */
    setupIntersectionObserver() {
        if (this.prefersReducedMotion) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observe elements with data-animate attribute
        document.querySelectorAll('[data-animate]').forEach(el => {
            observer.observe(el);
        });
    },

    /**
     * Animate element with specified animation
     */
    animate(element, animation, duration = CONFIG.ANIMATION.base) {
        if (this.prefersReducedMotion || !element) return Promise.resolve();

        return new Promise(resolve => {
            element.style.animation = `${animation} ${duration}ms ease-out`;

            element.addEventListener('animationend', function handler() {
                element.removeEventListener('animationend', handler);
                element.style.animation = '';
                resolve();
            });
        });
    },

    /**
     * Fade in element
     */
    fadeIn(element, duration = CONFIG.ANIMATION.base) {
        if (!element) return Promise.resolve();

        element.style.opacity = '0';
        element.style.display = '';

        return this.animate(element, 'fadeIn', duration).then(() => {
            element.style.opacity = '';
        });
    },

    /**
     * Fade out element
     */
    fadeOut(element, duration = CONFIG.ANIMATION.base) {
        if (!element) return Promise.resolve();

        return new Promise(resolve => {
            if (this.prefersReducedMotion) {
                element.style.display = 'none';
                resolve();
                return;
            }

            element.style.animation = `fadeOut ${duration}ms ease-out`;

            element.addEventListener('animationend', function handler() {
                element.removeEventListener('animationend', handler);
                element.style.display = 'none';
                element.style.animation = '';
                element.style.opacity = '';
                resolve();
            });
        });
    },

    /**
     * Slide in from right
     */
    slideInRight(element, duration = CONFIG.ANIMATION.slow) {
        return this.animate(element, 'slideInRight', duration);
    },

    /**
     * Scale in
     */
    scaleIn(element, duration = CONFIG.ANIMATION.base) {
        return this.animate(element, 'scaleIn', duration);
    },

    /**
     * Shake element (for errors)
     */
    shake(element) {
        return this.animate(element, 'shake', 500);
    },

    /**
     * Pulse element
     */
    pulse(element, count = 1) {
        if (this.prefersReducedMotion || !element) return;

        element.style.animation = `pulse 1s ease-in-out ${count === -1 ? 'infinite' : count}`;

        if (count !== -1) {
            setTimeout(() => {
                element.style.animation = '';
            }, count * 1000);
        }
    },

    /**
     * Stop pulse animation
     */
    stopPulse(element) {
        if (element) {
            element.style.animation = '';
        }
    },

    /**
     * Stagger animation for list items
     */
    staggerIn(elements, animation = 'fadeInUp', baseDelay = 0, staggerDelay = 50) {
        if (this.prefersReducedMotion || !elements) return;

        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.animationDelay = `${baseDelay + (index * staggerDelay)}ms`;
            el.style.animation = `${animation} ${CONFIG.ANIMATION.slow}ms ease-out forwards`;
        });

        // Clean up after animations complete
        const totalTime = baseDelay + (elements.length * staggerDelay) + CONFIG.ANIMATION.slow;
        setTimeout(() => {
            elements.forEach(el => {
                el.style.opacity = '';
                el.style.animation = '';
                el.style.animationDelay = '';
            });
        }, totalTime);
    },

    /**
     * Counter animation (count up to value)
     */
    countUp(element, endValue, duration = 1000) {
        if (!element || this.prefersReducedMotion) {
            element.textContent = Utils.formatNumber(endValue);
            return;
        }

        const startValue = 0;
        const startTime = performance.now();

        const updateCount = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (endValue - startValue) * easeProgress);

            element.textContent = Utils.formatNumber(currentValue);

            if (progress < 1) {
                requestAnimationFrame(updateCount);
            }
        };

        requestAnimationFrame(updateCount);
    },

    /**
     * Typewriter effect
     */
    typewriter(element, text, speed = 50) {
        if (!element) return Promise.resolve();

        if (this.prefersReducedMotion) {
            element.textContent = text;
            return Promise.resolve();
        }

        return new Promise(resolve => {
            element.textContent = '';
            let i = 0;

            const type = () => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    setTimeout(type, speed);
                } else {
                    resolve();
                }
            };

            type();
        });
    },

    /**
     * Ripple effect on click
     */
    addRipple(element) {
        if (!element || this.prefersReducedMotion) return;

        element.style.position = 'relative';
        element.style.overflow = 'hidden';

        element.addEventListener('click', (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const ripple = document.createElement('span');
            ripple.style.cssText = `
                position: absolute;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
                width: 100px;
                height: 100px;
                left: ${x - 50}px;
                top: ${y - 50}px;
            `;

            element.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    },

    /**
     * Smooth scroll to element
     */
    scrollTo(element, offset = 0) {
        if (!element) return;

        const behavior = this.prefersReducedMotion ? 'auto' : 'smooth';
        const top = element.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({ top, behavior });
    },

    /**
     * Smooth scroll to top
     */
    scrollToTop() {
        const behavior = this.prefersReducedMotion ? 'auto' : 'smooth';
        window.scrollTo({ top: 0, behavior });
    }
};

// Add ripple keyframe
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Animations;
}
