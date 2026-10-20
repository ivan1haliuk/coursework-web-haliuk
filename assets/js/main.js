(() => {
    'use strict';

    document.documentElement.classList.add('js');
    const assetBase = new URL('../', document.currentScript.src);

    function showImageFallback(image) {
        if (image.dataset.fallbackApplied) {
            return;
        }
        image.dataset.fallbackApplied = 'true';
        image.removeAttribute('srcset');
        image.closest('picture')?.querySelectorAll('source').forEach((source) => source.removeAttribute('srcset'));
        image.src = new URL('images/photo-placeholder.svg', assetBase).href;
        if (image.alt) {
            image.alt = `${image.alt} — зображення тимчасово недоступне`;
        }
    }

    document.addEventListener('error', (event) => {
        if (event.target instanceof HTMLImageElement) {
            showImageFallback(event.target);
        }
    }, true);

    document.querySelectorAll('img').forEach((image) => {
        if (image.complete && !image.naturalWidth) {
            showImageFallback(image);
        }
    });

    const header = document.getElementById('main-header');
    const burger = document.getElementById('burger-menu');
    const navigation = document.getElementById('nav-links');
    const desktop = window.matchMedia('(min-width: 64rem)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function closeMenu(returnFocus = false) {
        navigation?.classList.remove('active');
        burger?.setAttribute('aria-expanded', 'false');
        burger?.setAttribute('aria-label', 'Відкрити меню');
        if (returnFocus) {
            burger?.focus();
        }
    }

    if (burger && navigation) {
        burger.addEventListener('click', () => {
            const open = burger.getAttribute('aria-expanded') !== 'true';
            navigation.classList.toggle('active', open);
            burger.setAttribute('aria-expanded', String(open));
            burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
            if (open) {
                navigation.querySelector('a')?.focus();
            }
        });

        navigation.addEventListener('click', (event) => {
            if (event.target.closest('a, button')) {
                closeMenu();
            }
        });

        document.addEventListener('pointerdown', (event) => {
            if (!event.target.closest('.navbar')) {
                closeMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
                closeMenu(true);
            }
        });

        navigation.addEventListener('focusout', (event) => {
            // Safari can blur a tapped link before click without a new focus target.
            const next = event.relatedTarget;
            if (next && !navigation.contains(next) && next !== burger) {
                closeMenu();
            }
        });

        desktop.addEventListener('change', () => closeMenu());
    }

    if (header) {
        const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 50);
        window.addEventListener('scroll', updateHeader, { passive: true });
        updateHeader();
    }

    const questions = [...document.querySelectorAll('.faq-item')];
    questions.forEach((question) => {
        question.addEventListener('toggle', () => {
            if (question.open) {
                questions.forEach((other) => {
                    if (other !== question) {
                        other.open = false;
                    }
                });
            }
        });
    });

    function setupCarousel(track, controls) {
        if (!track || !controls) {
            return { update() {} };
        }

        const buttons = [...controls.querySelectorAll('[data-direction]')];
        let frame = 0;

        function update() {
            const maximum = track.scrollWidth - track.clientWidth;
            buttons.forEach((button) => {
                button.disabled = maximum <= 2 || (button.dataset.direction === '-1'
                    ? track.scrollLeft <= 2
                    : track.scrollLeft >= maximum - 2);
                button.setAttribute('aria-controls', track.id);
            });
        }

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const card = track.firstElementChild;
                if (!card) {
                    return;
                }
                const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
                track.scrollBy({
                    left: Number(button.dataset.direction) * step,
                    behavior: reducedMotion.matches ? 'instant' : 'smooth',
                });
            });
        });

        track.addEventListener('keydown', (event) => {
            if (event.target !== track || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                return;
            }
            const card = track.firstElementChild;
            if (!card) {
                return;
            }
            event.preventDefault();
            const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
            const left = event.key === 'Home' ? 0 : event.key === 'End'
                ? track.scrollWidth - track.clientWidth
                : track.scrollLeft + (event.key === 'ArrowLeft' ? -step : step);
            track.scrollTo({ left, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
        });

        track.addEventListener('scroll', () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(update);
        }, { passive: true });

        new ResizeObserver(update).observe(track);
        update();
        return { update };
    }

    setupCarousel(
        document.getElementById('portfolio-cards'),
        document.querySelector('.portfolio-slider-buttons'),
    );

    document.querySelectorAll('[data-portfolio-category]').forEach((section) => {
        setupCarousel(
            section.querySelector('.portfolio-cards-container'),
            section.querySelector('.portfolio-slider-buttons'),
        );
    });

    setupCarousel(
        document.getElementById('testimonial-cards'),
        document.querySelector('.testimonials-slider-buttons'),
    );

    const serviceSection = document.getElementById('services');
    if (serviceSection) {
        const slides = [...serviceSection.querySelectorAll('[data-home-service]')];
        const status = document.getElementById('service-status');
        let index = 0;
        serviceSection.querySelectorAll('.slider-buttons [data-direction]').forEach((button) => {
            button.setAttribute('aria-controls', slides.map((slide) => slide.id).join(' '));
            button.addEventListener('click', () => {
                index = (index + Number(button.dataset.direction) + slides.length) % slides.length;
                slides.forEach((slide, position) => { slide.hidden = position !== index; });
                status.textContent = `Послуга ${index + 1} із ${slides.length}: ${slides[index].querySelector('h3').textContent}.`;
            });
        });
    }
})();
