(() => {
    'use strict';

    const questions = [...document.querySelectorAll('[data-faq-question]')];
    function expandQuestion(question, expanded) {
        question.setAttribute('aria-expanded', String(expanded));
        document.getElementById(question.getAttribute('aria-controls')).hidden = !expanded;
    }
    questions.forEach((question, index) => {
        expandQuestion(question, index === 0);
        question.addEventListener('click', () => {
            const open = question.getAttribute('aria-expanded') !== 'true';
            questions.forEach((other) => expandQuestion(other, other === question && open));
        });
        question.addEventListener('keydown', (event) => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                return;
            }
            event.preventDefault();
            const visible = questions.filter((other) => other.getClientRects().length);
            const position = visible.indexOf(question);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1
                : (position + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length;
            visible[next].focus();
        });
    });
    const brandSection = document.querySelector('.portfolio-brands');
    const brandViewport = brandSection.querySelector('.portfolio-brand-viewport');
    const brandTrack = document.getElementById('portfolio-brand-track');
    const brandList = brandTrack.querySelector('ul');
    const brandToggle = brandSection.querySelector('.brand-motion-toggle');

    const wideBrands = window.matchMedia('(min-width: 64rem)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function alignBrands() {
        const manual = reducedMotion.matches || !brandTrack.hasAttribute('data-loop-ready');
        brandViewport.scrollLeft = wideBrands.matches || !manual ? 0
            : Math.max(0, (brandList.offsetWidth - 20 - brandViewport.clientWidth) / 2);
        brandViewport.tabIndex = wideBrands.matches ? -1 : 0;
    }
    wideBrands.addEventListener('change', alignBrands);
    reducedMotion.addEventListener('change', alignBrands);
    new ResizeObserver(alignBrands).observe(brandViewport);

    function pauseBrands(paused) {
        brandToggle.setAttribute('aria-pressed', String(paused));
        brandToggle.setAttribute('aria-label', paused ? 'Продовжити рух логотипів' : 'Призупинити рух логотипів');
        brandSection.classList.toggle('brands-paused', paused);
        if (!paused) {
            brandSection.classList.remove('brands-manual');
            brandViewport.scrollLeft = 0;
        }
    }
    function useManualBrands() {
        const transform = getComputedStyle(brandTrack).transform;
        const position = transform === 'none' ? brandViewport.scrollLeft
            : -new DOMMatrixReadOnly(transform).m41 % brandList.offsetWidth;
        brandSection.classList.add('brands-manual');
        pauseBrands(true);
        brandViewport.scrollLeft = position;
    }
    brandToggle.addEventListener('click', () => {
        pauseBrands(brandToggle.getAttribute('aria-pressed') !== 'true');
    });
    brandViewport.addEventListener('pointerdown', () => {
        if (!wideBrands.matches) {
            useManualBrands();
        }
    });
    brandViewport.addEventListener('keydown', (event) => {
        if (event.target !== brandViewport || wideBrands.matches
            || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            return;
        }
        event.preventDefault();
        useManualBrands();
        const maximum = brandViewport.scrollWidth - brandViewport.clientWidth;
        const left = event.key === 'Home' ? 0 : event.key === 'End' ? maximum
            : brandViewport.scrollLeft + (event.key === 'ArrowLeft' ? -1 : 1) * brandViewport.clientWidth * 0.65;
        brandViewport.scrollTo({ left, behavior: 'instant' });
    });
    new IntersectionObserver(([entry]) => {
        brandSection.classList.toggle('brands-offscreen', !entry.isIntersecting);
    }).observe(brandSection);
    document.addEventListener('visibilitychange', () => {
        brandSection.classList.toggle('brands-background', document.hidden);
    });
})();
