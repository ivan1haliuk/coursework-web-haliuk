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

        document.addEventListener('click', (event) => {
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
            if (!navigation.contains(event.relatedTarget) && event.relatedTarget !== burger) {
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

    const dialogTriggers = new WeakMap();
    let pageScroll = { x: 0, y: 0 };
    document.querySelectorAll('dialog').forEach((dialog) => {
        dialog.addEventListener('keydown', (event) => {
            if (event.key !== 'Tab') {
                return;
            }
            const controls = [...dialog.querySelectorAll('button, a[href], input, textarea, select, [tabindex]')]
                .filter((control) => !control.disabled && control.tabIndex >= 0 && control.getClientRects().length > 0);
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (!first) {
                event.preventDefault();
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        });

        function isBackdrop(event) {
            const bounds = dialog.getBoundingClientRect();
            const outside = event.clientX < bounds.left || event.clientX > bounds.right
                || event.clientY < bounds.top || event.clientY > bounds.bottom;
            return event.target === dialog && outside;
        }
        let pointerStartedOutside = false;
        dialog.addEventListener('pointerdown', (event) => {
            pointerStartedOutside = isBackdrop(event);
        });
        dialog.addEventListener('click', (event) => {
            if (pointerStartedOutside && isBackdrop(event)) {
                dialog.close();
            }
            pointerStartedOutside = false;
        });

        dialog.addEventListener('close', () => {
            if (document.querySelector('dialog[open]')) {
                return;
            }
            document.body.classList.remove('dialog-open');
            document.documentElement.classList.remove('dialog-open');
            const trigger = dialogTriggers.get(dialog);
            if (trigger?.matches('.mobile-contact-btn') && !desktop.matches) {
                navigation.classList.add('active');
                burger.setAttribute('aria-expanded', 'true');
                burger.setAttribute('aria-label', 'Закрити меню');
            }
            const fallbackTrigger = desktop.matches ? document.getElementById('open-modal-btn') : burger;
            const target = trigger?.getClientRects().length ? trigger : fallbackTrigger;
            target?.focus({ preventScroll: true });
            window.scrollTo({ left: pageScroll.x, top: pageScroll.y, behavior: 'instant' });
        });
    });

    document.addEventListener('click', (event) => {
        const closeButton = event.target.closest('[data-close-dialog]');
        if (closeButton) {
            closeButton.closest('dialog')?.close();
            return;
        }

        const trigger = event.target.closest('[data-dialog]');
        if (!trigger) {
            return;
        }

        const dialog = document.getElementById(trigger.dataset.dialog);
        if (!(dialog instanceof HTMLDialogElement) || dialog.open) {
            return;
        }

        if (trigger.hasAttribute('data-project')) {
            const card = trigger.closest('.portfolio-card');
            const image = card.querySelector('.portfolio-card-img');
            const projectImage = dialog.querySelector('.project-image');
            delete projectImage.dataset.fallbackApplied;
            dialog.querySelector('.dialog-title').textContent = card.querySelector('.portfolio-card-title').textContent;
            projectImage.src = image.dataset.fullImage || image.src;
            projectImage.alt = image.alt;
            const date = card.querySelector('.portfolio-card-date').textContent;
            const projectDate = dialog.querySelector('.project-date');
            if (projectDate) {
                projectDate.textContent = date;
            }
            dialog.querySelector('.project-description').textContent = card.dataset.description || date;
        }

        if (dialog.classList.contains('collection-dialog')) {
            renderCollection(dialog);
        }

        if (dialog.id === 'contactModal') {
            dialog.dispatchEvent(new CustomEvent('contact:open', { detail: trigger.dataset }));
        }

        dialogTriggers.set(dialog, trigger);
        pageScroll = { x: window.scrollX, y: window.scrollY };
        document.body.classList.add('dialog-open');
        document.documentElement.classList.add('dialog-open');
        dialog.showModal();
        dialog.querySelector('[autofocus]')?.focus({ preventScroll: true });
    });

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

    function setupCarousel(track, controls, label) {
        if (!track || !controls) {
            return { update() {} };
        }

        const buttons = [...controls.querySelectorAll('[data-direction]')];
        const status = document.createElement('p');
        status.className = 'carousel-status visually-hidden';
        status.setAttribute('role', 'status');
        track.after(status);
        let frame = 0;

        function update() {
            const maximum = track.scrollWidth - track.clientWidth;
            buttons.forEach((button) => {
                button.disabled = maximum <= 2 || (button.dataset.direction === '-1'
                    ? track.scrollLeft <= 2
                    : track.scrollLeft >= maximum - 2);
                button.setAttribute('aria-controls', track.id);
            });
            const first = track.firstElementChild;
            if (!first) {
                status.textContent = `${label}: немає елементів.`;
                return;
            }
            const step = first.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap);
            const current = Math.round(track.scrollLeft / step) + 1;
            status.textContent = `${label}: ${current} із ${track.children.length}.`;
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
        track.addEventListener('carousel:refresh', update);
        update();
        return { update };
    }

    setupCarousel(
        document.getElementById('portfolio-cards'),
        document.querySelector('.portfolio-slider-buttons'),
        'Роботи',
    );

    document.querySelectorAll('[data-portfolio-category]').forEach((section) => {
        setupCarousel(
            section.querySelector('.portfolio-cards-container'),
            section.querySelector('.portfolio-slider-buttons'),
            section.querySelector('h2').textContent,
        );
    });

    const reviewTrack = document.getElementById('testimonial-cards');
    const reviewTemplate = reviewTrack?.firstElementChild?.cloneNode(true);
    const reviewCarousel = setupCarousel(
        reviewTrack,
        document.querySelector('.testimonials-slider-buttons'),
        'Відгуки',
    );

    const serviceSection = document.getElementById('services');
    const serviceControls = serviceSection?.querySelector('.slider-buttons');
    let services = [];
    let serviceIndex = 0;

    function renderService() {
        const service = services[serviceIndex];
        if (!service || !serviceSection) {
            return;
        }
        serviceSection.querySelector('.service-title-row h3').textContent = service.title;
        serviceSection.querySelector('.service-paragraph').textContent = service.description;
        const image = serviceSection.querySelector('.services-image-block img');
        image.srcset = `${service.image.replace('.webp', '-small.webp')} ${service.thumbnailWidth}w, ${service.image} ${service.imageWidth}w`;
        delete image.dataset.fallbackApplied;
        image.src = service.image;
        image.alt = service.alt;
        const highlights = serviceSection.querySelector('.highlights-list');
        const fragment = document.createDocumentFragment();
        service.highlights.forEach((highlight) => {
            const item = document.createElement('li');
            item.className = 'highlight-item';
            const icon = document.createElement('span');
            icon.className = 'icon icon-highlight';
            icon.setAttribute('aria-hidden', 'true');
            const description = document.createElement('span');
            description.textContent = highlight;
            item.append(icon, description);
            fragment.append(item);
        });
        highlights.replaceChildren(fragment);
        document.getElementById('service-status').textContent = `Послуга ${serviceIndex + 1} із ${services.length}: ${service.title}.`;
    }

    if (serviceControls && serviceSection) {
        const serviceStatus = document.createElement('p');
        serviceStatus.id = 'service-status';
        serviceStatus.className = 'visually-hidden';
        serviceStatus.setAttribute('role', 'status');
        serviceSection.querySelector('.services-container').append(serviceStatus);
        serviceControls.querySelectorAll('button').forEach((button) => {
            button.disabled = true;
            button.addEventListener('click', () => {
                if (services.length) {
                    serviceIndex = (serviceIndex + Number(button.dataset.direction) + services.length) % services.length;
                    renderService();
                }
            });
        });
    }

    function validateData(data) {
        const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
        const validService = (service) => service && hasText(service.title)
            && hasText(service.description) && hasText(service.alt)
            && typeof service.image === 'string' && /^assets\/images\/[\w-]+\.webp$/.test(service.image)
            && Number.isInteger(service.imageWidth) && service.imageWidth > 0
            && Number.isInteger(service.thumbnailWidth) && service.thumbnailWidth > 0
            && Array.isArray(service.highlights) && service.highlights.length > 0
            && service.highlights.every(hasText);
        const validReview = (review) => review && hasText(review.name) && hasText(review.location)
            && hasText(review.text) && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5;
        if (!data || (serviceSection && (!Array.isArray(data.services) || !data.services.every(validService)))
            || !Array.isArray(data.testimonials) || !data.testimonials.every(validReview)) {
            throw new Error('Unexpected data format');
        }
        return data;
    }

    function renderReviews(reviews) {
        if (!reviewTrack || !reviewTemplate) {
            return;
        }
        const fragment = document.createDocumentFragment();
        reviews.forEach((review) => {
            const card = reviewTemplate.cloneNode(true);
            card.querySelector('.client-name').textContent = review.name;
            card.querySelector('.client-location').textContent = review.location;
            card.querySelector('.testimonial-text').textContent = review.text;
            const stars = card.querySelector('.testimonial-stars');
            stars.setAttribute('aria-label', `Оцінка: ${review.rating} із 5`);
            [...stars.children].forEach((star, index) => { star.hidden = index >= review.rating; });
            fragment.append(card);
        });
        reviewTrack.replaceChildren(fragment);
        reviewTrack.scrollLeft = 0;
        document.querySelector('.reviews-number').textContent = String(reviews.length);
        document.querySelector('.testimonials-view-all').disabled = reviews.length === 0;
        reviewCarousel.update();
    }

    const feedback = document.getElementById('data-feedback');
    const feedbackMessage = document.getElementById('data-message');
    const retryButton = document.getElementById('retry-data');
    let loading = false;

    function renderCollection(dialog) {
        const content = dialog.querySelector('.collection-content');
        const fragment = document.createDocumentFragment();

        if (dialog.id === 'servicesDialog') {
            const items = services.length ? services : [{
                title: serviceSection.querySelector('.service-title-row h3').textContent,
                description: serviceSection.querySelector('.service-paragraph').textContent,
            }];
            items.forEach((service) => {
                const article = document.createElement('article');
                article.className = 'collection-item';
                const title = document.createElement('h3');
                title.textContent = service.title;
                const description = document.createElement('p');
                description.textContent = service.description;
                article.append(title, description);
                fragment.append(article);
            });
        } else {
            const selector = dialog.id === 'portfolioDialog' ? '.portfolio-card' : '.testimonial-card';
            document.querySelectorAll(`${selector === '.portfolio-card' ? '#portfolio-cards' : '#testimonial-cards'} > ${selector}`)
                .forEach((card) => {
                    const copy = card.cloneNode(true);
                    copy.querySelector('.portfolio-card-btn')?.remove();
                    fragment.append(copy);
                });
        }

        if (!fragment.children.length) {
            const message = document.createElement('p');
            message.textContent = 'У цій добірці поки немає матеріалів.';
            fragment.append(message);
        }
        content.replaceChildren(fragment);
    }

    async function loadSharedData() {
        if (!feedback || loading) {
            return;
        }
        loading = true;
        feedback.hidden = false;
        feedbackMessage.textContent = serviceSection ? 'Завантажуємо послуги та відгуки…' : 'Завантажуємо відгуки…';
        retryButton.hidden = true;
        reviewTrack?.setAttribute('aria-busy', 'true');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch('assets/data/home.json', { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = validateData(await response.json());
            services = data.services ?? [];
            serviceIndex = 0;
            renderService();
            serviceControls?.querySelectorAll('button').forEach((button) => {
                button.disabled = services.length < 2;
            });
            renderReviews(data.testimonials);
            const empty = !data.testimonials.length || (serviceSection && !data.services.length);
            feedback.hidden = !empty;
            if (empty) {
                feedbackMessage.textContent = !data.testimonials.length
                    ? 'У цій добірці поки немає відгуків.'
                    : 'Список послуг поки порожній. Показано збережений приклад.';
            }
        } catch {
            feedbackMessage.textContent = 'Не вдалося оновити дані. Показано збережений вміст. Перевірте з’єднання та спробуйте ще раз.';
            retryButton.hidden = false;
        } finally {
            clearTimeout(timeout);
            loading = false;
            reviewTrack?.setAttribute('aria-busy', 'false');
        }
    }

    retryButton?.addEventListener('click', loadSharedData);
    loadSharedData();

    const form = document.getElementById('contactForm');
    if (form) {
        form.noValidate = true;
        const fields = [...form.querySelectorAll('input, textarea, select')];
        const formStatus = document.getElementById('form-status');
        const mailLink = document.getElementById('prepared-mail');
        const submit = form.querySelector('[type="submit"]');
        const service = form.elements.namedItem('service');
        const packageField = form.elements.namedItem('package');
        let preparing = false;
        let revision = 0;

        function clearPreparedMail() {
            revision += 1;
            mailLink.hidden = true;
            mailLink.removeAttribute('href');
            formStatus.textContent = '';
            form.dataset.state = 'idle';
        }

        function syncPackages() {
            const selected = packageField.selectedOptions[0];
            if (service.value && selected?.parentElement.dataset.service !== service.value) {
                packageField.value = '';
            }
            packageField.querySelectorAll('optgroup').forEach((group) => {
                group.disabled = Boolean(service.value && group.dataset.service !== service.value);
                group.hidden = group.disabled;
            });
        }

        function validateField(field) {
            const value = field.value.trim();
            let message = '';
            if (field.required && !value) {
                message = 'Заповніть це поле.';
            } else if (field.maxLength > 0 && field.value.length > field.maxLength) {
                message = 'Введіть не більше ' + field.maxLength + ' символів.';
            } else if (value && field.type === 'email'
                && (field.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
                message = 'Введіть коректну електронну адресу, наприклад name@example.com.';
            } else if (value && field.minLength > 0 && value.length < field.minLength) {
                message = 'Введіть щонайменше ' + field.minLength + ' символів.';
            } else if (field === packageField && value && field.selectedOptions[0]?.parentElement.dataset.service !== service.value) {
                message = 'Оберіть пакет для поточного напряму.';
            }
            field.setAttribute('aria-invalid', String(Boolean(message)));
            document.getElementById(field.id + '-error').textContent = message;
            return !message;
        }

        fields.forEach((field) => {
            field.addEventListener('input', () => {
                clearPreparedMail();
                if (field.hasAttribute('aria-invalid')) {
                    validateField(field);
                }
            });
        });
        service.addEventListener('change', () => {
            syncPackages();
            clearPreparedMail();
            validateField(packageField);
        });
        packageField.addEventListener('change', () => {
            const group = packageField.selectedOptions[0]?.parentElement;
            if (packageField.value && group?.dataset.service) {
                service.value = group.dataset.service;
            }
            syncPackages();
            clearPreparedMail();
            validateField(packageField);
        });
        document.getElementById('contactModal').addEventListener('contact:open', (event) => {
            // General contact preserves the draft; an explicit booking replaces only the selection.
            if (event.detail.service) {
                service.value = event.detail.service;
                syncPackages();
                packageField.value = event.detail.package || '';
                clearPreparedMail();
                [service, packageField].forEach((field) => {
                    field.removeAttribute('aria-invalid');
                    document.getElementById(field.id + '-error').textContent = '';
                });
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (preparing) {
                return;
            }
            clearPreparedMail();
            const results = fields.map(validateField);
            if (results.includes(false)) {
                form.dataset.state = 'error';
                formStatus.textContent = 'Перевірте виділені поля. Введені дані збережено.';
                fields[results.indexOf(false)].focus();
                return;
            }

            preparing = true;
            submit.disabled = true;
            submit.textContent = 'Готуємо лист…';
            form.setAttribute('aria-busy', 'true');
            form.dataset.state = 'pending';
            formStatus.textContent = 'Готуємо лист для поштової програми…';
            const currentRevision = revision;
            try {
                // Yield through a paint so the pending state can be announced and displayed.
                await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
                if (revision !== currentRevision) {
                    return;
                }
                const name = form.elements.namedItem('name').value.trim();
                const email = form.elements.namedItem('email').value.trim();
                const message = form.elements.namedItem('body').value.trim();
                const subject = encodeURIComponent('Запит на фотозйомку — ' + name);
                const body = encodeURIComponent([
                    'Ім’я: ' + name,
                    'Email: ' + email,
                    'Напрям: ' + (service.value || 'Потрібна порада'),
                    'Пакет: ' + (packageField.value || 'Без пакета'),
                    '', message,
                ].join('\r\n'));
                mailLink.href = 'mailto:damienbraun@gmail.com?subject=' + subject + '&body=' + body;
                mailLink.hidden = false;
                form.dataset.state = 'prepared';
                formStatus.textContent = 'Лист підготовлено, але ще не надіслано. Відкрийте поштову програму за посиланням нижче та надішліть його самостійно. Якщо вона не відкриється, скопіюйте текст і напишіть на damienbraun@gmail.com.';
            } catch {
                form.dataset.state = 'error';
                formStatus.textContent = 'Не вдалося підготувати лист. Введені дані збережено. Спробуйте ще раз або напишіть на damienbraun@gmail.com.';
            } finally {
                preparing = false;
                submit.disabled = false;
                submit.textContent = 'Підготувати лист';
                form.setAttribute('aria-busy', 'false');
            }
        });
    }
})();
