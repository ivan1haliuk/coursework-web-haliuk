(() => {
    'use strict';

    const desktop = window.matchMedia('(min-width: 64rem)');
    const burger = document.getElementById('burger-menu');
    const navigation = document.getElementById('nav-links');

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
            const fallbackTrigger = desktop.matches ? document.getElementById('header-contact') : burger;
            const target = trigger?.matches('.mobile-contact-btn') && !desktop.matches
                ? burger : trigger?.getClientRects().length ? trigger : fallbackTrigger;
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

        event.preventDefault();
        navigation?.classList.remove('active');
        burger?.setAttribute('aria-expanded', 'false');
        burger?.setAttribute('aria-label', 'Відкрити меню');

        if (dialog.id === 'contactModal') {
            dialog.dispatchEvent(new CustomEvent('contact:open', { detail: trigger.dataset }));
        }

        dialogTriggers.set(dialog, trigger);
        pageScroll = { x: window.scrollX, y: window.scrollY };
        document.body.classList.add('dialog-open');
        document.documentElement.classList.add('dialog-open');
        dialog.showModal();
        dialog.scrollTop = 0;
        dialog.querySelector('[autofocus]')?.focus({ preventScroll: true });
    });

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

        let packages = [];
        let requestedPackage = '';
        const packageStatus = document.getElementById('package-status');
        const packageRetry = document.getElementById('package-retry');

        function syncPackages() {
            const selected = packageField.value || requestedPackage;
            const placeholder = new Option('Обговорити без пакета', '');
            const fragment = document.createDocumentFragment();
            fragment.append(placeholder);
            const groups = new Map();
            packages.filter((item) => !service.value || item.service === service.value).forEach((item) => {
                if (!groups.has(item.service)) {
                    const group = document.createElement('optgroup');
                    group.label = item.service;
                    group.dataset.service = item.service;
                    groups.set(item.service, group);
                    fragment.append(group);
                }
                groups.get(item.service).append(new Option(item.name, item.name));
            });
            packageField.replaceChildren(fragment);
            packageField.value = packages.some((item) => item.name === selected
                && (!service.value || item.service === service.value)) ? selected : '';
        }
        window.serviceCatalog.subscribe(({ status, data }) => {
            packageField.disabled = status !== 'success';
            packageRetry.hidden = status !== 'error';
            packageRetry.disabled = status === 'loading';
            if (status === 'success') {
                packages = data.categories.flatMap((category) => category.packages.map((item) => ({
                    service: category.service, name: item.name,
                })));
                syncPackages();
                requestedPackage = '';
                packageStatus.textContent = '';
                packageStatus.hidden = true;
            } else {
                packageStatus.hidden = false;
                packageStatus.textContent = status === 'error'
                    ? 'Не вдалося завантажити пакети. Спробуйте ще раз або обговоріть зйомку без пакета.'
                    : 'Завантажуємо пакети зйомки…';
                packageField.replaceChildren(new Option(status === 'error'
                    ? 'Пакети тимчасово недоступні' : 'Завантажуємо пакети…', ''));
            }
        });
        packageRetry.addEventListener('click', () => {
            window.serviceCatalog.load().catch(() => {});
        });
        window.serviceCatalog.load().catch(() => {});

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
            requestedPackage = '';
            if (!packageField.disabled) {
                syncPackages();
            }
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
                requestedPackage = event.detail.package || '';
                if (!packageField.disabled) {
                    syncPackages();
                    packageField.value = requestedPackage;
                    requestedPackage = '';
                }
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
