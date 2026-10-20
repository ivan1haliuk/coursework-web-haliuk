(() => {
    'use strict';

    document.querySelectorAll('[data-service-gallery]').forEach((gallery) => {
        const track = gallery.querySelector('.service-slides');
        const controls = [...gallery.querySelectorAll('[data-slide-step]')];
        const status = gallery.querySelector('[data-slide-status]');
        let index = 0;
        let swipe = null;

        function showSlide(next) {
            const slides = [...track.querySelectorAll('.service-slide')];
            index = Math.max(0, Math.min(next, slides.length - 1));
            slides.forEach((slide, position) => {
                slide.hidden = position !== index;
                slide.setAttribute('aria-label', `${position + 1} із ${slides.length}`);
            });
            controls.forEach((button) => {
                button.disabled = slides.length < 2 || (button.dataset.slideStep === '-1'
                    ? index === 0 : index === slides.length - 1);
            });
            const caption = slides[index]?.querySelector('figcaption')?.textContent.trim();
            status.textContent = slides.length ? `Фото ${index + 1} із ${slides.length}. ${caption || ''}`
                : 'Фотографії тимчасово недоступні.';
        }

        controls.forEach((button) => {
            button.addEventListener('click', () => showSlide(index + Number(button.dataset.slideStep)));
        });
        track.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' || !event.isPrimary) {
                return;
            }
            swipe = { x: event.clientX, y: event.clientY, id: event.pointerId };
            track.setPointerCapture(event.pointerId);
        });
        track.addEventListener('pointerup', (event) => {
            if (!swipe || event.pointerId !== swipe.id) {
                return;
            }
            const dx = event.clientX - swipe.x;
            const dy = event.clientY - swipe.y;
            swipe = null;
            if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                showSlide(index + (dx < 0 ? 1 : -1));
            }
        });
        track.addEventListener('pointercancel', () => { swipe = null; });
        track.addEventListener('lostpointercapture', () => { swipe = null; });
        gallery.addEventListener('keydown', (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                return;
            }
            event.preventDefault();
            showSlide(event.key === 'Home' ? 0 : event.key === 'End' ? track.children.length - 1
                : index + (event.key === 'ArrowRight' ? 1 : -1));
        });
        showSlide(0);
    });

    const summaries = [...document.querySelectorAll('.services-page .faq-summary')];
    summaries.forEach((summary) => {
        summary.addEventListener('keydown', (event) => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                return;
            }
            event.preventDefault();
            const visible = summaries.filter((item) => item.getClientRects().length);
            const position = visible.indexOf(summary);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1
                : (position + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length;
            visible[next].focus();
        });
    });
})();
