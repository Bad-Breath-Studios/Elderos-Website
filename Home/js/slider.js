/**
 * Elderos — Content Slider
 * Crossfade slider with Ken Burns, auto-advance, and progress bar.
 */
(function () {
    'use strict';

    const AUTOPLAY_INTERVAL = 6000; // ms per slide
    const FADE_DURATION = 1200; // must match CSS transition duration
    let currentIndex = 0;
    let autoplayTimer = null;
    let isPaused = false;
    let isTransitioning = false;

    const slides = document.querySelectorAll('.content-slider .slide');
    const dots = document.querySelectorAll('.content-slider .slider-dot');
    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');
    const progressBar = document.querySelector('.slider-progress-bar');

    if (!slides.length) return;

    function goToSlide(index, resetAutoplay = true) {
        if (isTransitioning) return;

        // Clamp / wrap
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        if (index === currentIndex) return;

        isTransitioning = true;
        const outgoing = slides[currentIndex];
        const outDot = dots[currentIndex];

        // Mark outgoing as leaving (keeps it visible during crossfade)
        outgoing.classList.remove('active');
        outgoing.classList.add('leaving');
        outDot.classList.remove('active');

        currentIndex = index;

        // Activate new slide
        const incoming = slides[currentIndex];

        // Reset Ken Burns on incoming slide so it starts fresh
        const inBg = incoming.querySelector('.slide-bg');
        inBg.style.animation = 'none';
        inBg.offsetHeight; // force reflow
        inBg.style.animation = '';

        incoming.classList.add('active');
        dots[currentIndex].classList.add('active');

        // After fade completes, clean up the outgoing slide
        setTimeout(() => {
            outgoing.classList.remove('leaving');

            // Reset Ken Burns on outgoing slide (now fully hidden)
            const outBg = outgoing.querySelector('.slide-bg');
            outBg.style.animation = 'none';
            outBg.offsetHeight;
            outBg.style.animation = '';

            isTransitioning = false;
        }, FADE_DURATION);

        // Restart progress bar
        restartProgress();

        if (resetAutoplay) restartAutoplay();
    }

    function nextSlide() { goToSlide(currentIndex + 1); }
    function prevSlide() { goToSlide(currentIndex - 1); }

    // --- Progress bar ---

    function restartProgress() {
        progressBar.classList.remove('animate');
        progressBar.offsetHeight; // force reflow
        progressBar.classList.add('animate');
    }

    // --- Autoplay ---

    function startAutoplay() {
        stopAutoplay();
        autoplayTimer = setInterval(() => {
            if (!isPaused) nextSlide();
        }, AUTOPLAY_INTERVAL);
    }

    function stopAutoplay() {
        if (autoplayTimer) {
            clearInterval(autoplayTimer);
            autoplayTimer = null;
        }
    }

    function restartAutoplay() {
        stopAutoplay();
        startAutoplay();
    }

    // --- Event listeners ---

    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const idx = parseInt(dot.dataset.index, 10);
            if (idx !== currentIndex) goToSlide(idx);
        });
    });

    // Pause on hover
    const slider = document.querySelector('.content-slider');
    if (slider) {
        slider.addEventListener('mouseenter', () => { isPaused = true; });
        slider.addEventListener('mouseleave', () => { isPaused = false; });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Only respond if slider is somewhat visible in viewport
        const rect = slider.getBoundingClientRect();
        const visible = rect.top < window.innerHeight && rect.bottom > 0;
        if (!visible) return;

        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'ArrowRight') nextSlide();
    });

    // Touch/swipe support
    let touchStartX = 0;
    let touchEndX = 0;

    const viewport = document.querySelector('.slider-viewport');
    if (viewport) {
        viewport.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        viewport.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) nextSlide();
                else prevSlide();
            }
        }, { passive: true });
    }

    // --- Init ---

    restartProgress();
    startAutoplay();

})();
