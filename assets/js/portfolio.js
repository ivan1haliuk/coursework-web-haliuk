(() => {
    'use strict';

    const sections = [...document.querySelectorAll('[data-portfolio-category]')];
    const categories = new Set(sections.map((section) => section.id));
    const feedback = document.getElementById('portfolio-feedback');
    const message = document.getElementById('portfolio-message');
    const retry = document.getElementById('retry-portfolio');
    const dateFormat = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    let loading = false;

    // Validate the complete response before replacing any of the rendered cards.
    function validateProjects(data) {
        if (!Array.isArray(data)) {
            throw new Error('Portfolio must be an array');
        }
        const ids = new Set();
        const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
        const isImage = (value) => typeof value === 'string' && /^assets\/images\/portfolio\/[\w-]+\.webp$/.test(value);
        data.forEach((project) => {
            if (!project || typeof project !== 'object' || Array.isArray(project)
                || !['id', 'category', 'title', 'date', 'image', 'alt', 'description'].every((field) => hasText(project[field]))
                || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.id) || ids.has(project.id)
                || !/^\d{4}-(0[1-9]|1[0-2])$/.test(project.date) || !isImage(project.image)
                || (project.thumbnail !== undefined && !isImage(project.thumbnail))
                || ['width', 'height', 'thumbnailWidth'].some((field) => project[field] !== undefined
                    && (!Number.isInteger(project[field]) || project[field] <= 0))) {
                throw new Error('Invalid portfolio project');
            }
            ids.add(project.id);
        });
        return data;
    }

    function createProjectCard(project) {
        const card = document.createElement('article');
        card.className = 'portfolio-card';
        card.dataset.projectId = project.id;
        card.dataset.description = project.description;

        const image = document.createElement('img');
        image.className = 'portfolio-card-img';
        image.src = project.thumbnail || project.image;
        image.dataset.fullImage = project.image;
        image.alt = project.alt;
        image.width = project.width || 1200;
        image.height = project.height || 1500;
        image.loading = 'lazy';
        image.decoding = 'async';
        if (project.thumbnail && project.thumbnailWidth && project.width) {
            image.srcset = `${project.thumbnail} ${project.thumbnailWidth}w, ${project.image} ${project.width}w`;
            image.sizes = '(min-width: 110rem) 500px, (min-width: 64rem) 30vw, (min-width: 40rem) 46vw, 100vw';
        }

        const info = document.createElement('div');
        info.className = 'portfolio-card-info';
        const copy = document.createElement('div');
        copy.className = 'portfolio-card-text';
        const title = document.createElement('h3');
        title.className = 'portfolio-card-title';
        title.textContent = project.title;
        const date = document.createElement('time');
        date.className = 'portfolio-card-date';
        date.dateTime = project.date;
        date.textContent = dateFormat.format(new Date(`${project.date}-01T00:00:00Z`));
        copy.append(title, date);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'portfolio-card-btn';
        button.dataset.dialog = 'projectDialog';
        button.dataset.project = project.id;
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-label', `Переглянути проєкт «${project.title}»`);
        button.textContent = 'До проєкту';
        const arrow = document.createElement('span');
        arrow.className = 'icon icon-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        button.append(arrow);
        info.append(copy, button);
        card.append(image, info);
        return card;
    }

    function renderProjects(projects) {
        sections.forEach((section) => {
            const track = section.querySelector('.portfolio-cards-container');
            const items = projects.filter((project) => project.category === section.id);
            const fragment = document.createDocumentFragment();
            items.forEach((project) => fragment.append(createProjectCard(project)));
            track.replaceChildren(fragment);
            track.scrollLeft = 0;
            track.tabIndex = items.length ? 0 : -1;
            section.querySelector('.portfolio-category-empty').hidden = items.length !== 0;
            track.dispatchEvent(new Event('carousel:refresh'));
        });
    }

    async function loadPortfolio() {
        if (loading) {
            return;
        }
        loading = true;
        feedback.hidden = false;
        message.textContent = 'Завантажуємо роботи…';
        retry.hidden = true;
        sections.forEach((section) => section.querySelector('.portfolio-cards-container').setAttribute('aria-busy', 'true'));
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch('assets/data/portfolio.json', { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const projects = validateProjects(await response.json());
            renderProjects(projects);
            const unknown = projects.filter((project) => !categories.has(project.category)).length;
            const count = projects.length - unknown;
            feedback.hidden = count > 0 && unknown === 0;
            if (unknown) {
                message.textContent = `Показано робіт: ${count}. Пропущено робіт із невідомою категорією: ${unknown}.`;
            } else if (!count) {
                message.textContent = 'Портфоліо поки порожнє. Нові роботи з’являться тут.';
            }
        } catch {
            message.textContent = 'Не вдалося завантажити роботи. Перевірте з’єднання та спробуйте ще раз.';
            retry.hidden = false;
        } finally {
            clearTimeout(timeout);
            loading = false;
            sections.forEach((section) => section.querySelector('.portfolio-cards-container').setAttribute('aria-busy', 'false'));
        }
    }

    retry.addEventListener('click', loadPortfolio);
    loadPortfolio();

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
    const brandCopy = brandList.cloneNode(true);
    brandCopy.classList.add('brand-copy');
    brandCopy.setAttribute('aria-hidden', 'true');
    brandCopy.inert = true;
    brandTrack.append(brandCopy);
    brandTrack.dataset.loopReady = 'true';

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
