(() => {
    'use strict';

    // Джерело JSON і спільний стан завантаження
    const source = new URL('../data/services.json', document.currentScript.src);
    const reservedIds = new Set([...document.querySelectorAll('[id]')].map((element) => element.id));
    const listeners = new Set();
    let state = { status: 'idle', data: null };
    let request = null;

    // Сповіщення сторінки та форми про зміну стану
    function publish(status, data = null) {
        state = { status, data };
        listeners.forEach((listener) => listener(state));
    }

    // Перевірка структури JSON, текстів і унікальності ідентифікаторів
    function validate(data) {
        const categoryIds = ['portraits', 'events', 'commercial'];
        const categories = new Set();
        const services = new Set();
        const ids = new Set();
        const names = new Set();
        const text = (value) => typeof value === 'string' && value.trim().length > 0;
        if (!data || !Array.isArray(data.categories) || data.categories.length !== categoryIds.length) {
            throw new Error('Invalid service categories');
        }
        data.categories.forEach((category) => {
            if (!category || !categoryIds.includes(category.id) || categories.has(category.id)
                || !text(category.service) || services.has(category.service.trim())
                || !Array.isArray(category.packages)) {
                throw new Error('Invalid service category');
            }
            categories.add(category.id);
            services.add(category.service.trim());
            category.service = category.service.trim();
            category.packages.forEach((item) => {
                if (!item || typeof item.id !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(item.id)
                    || ids.has(item.id) || ids.has(item.id + '-heading')
                    || reservedIds.has(item.id) || reservedIds.has(item.id + '-heading')
                    || !text(item.name) || names.has(item.name.trim())
                    || !text(item.price) || typeof item.customPrice !== 'boolean'
                    || !Array.isArray(item.features) || !item.features.every(text)) {
                    throw new Error('Invalid service package');
                }
                ids.add(item.id);
                ids.add(item.id + '-heading');
                item.name = item.name.trim();
                item.price = item.price.trim();
                item.features = item.features.map((feature) => feature.trim());
                names.add(item.name);
            });
        });
        return data;
    }

    // Спільний fetch із тайм-аутом і обробкою помилок
    function load() {
        if (state.status === 'success') {
            return Promise.resolve(state.data);
        }
        if (request) {
            return request;
        }
        publish('loading');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        request = (async () => {
            try {
                const response = await fetch(source, { signal: controller.signal, cache: 'no-cache' });
                if (!response.ok) {
                    throw new Error('Service data HTTP ' + response.status);
                }
                const data = validate(await response.json());
                publish('success', data);
                return data;
            } catch (error) {
                publish('error');
                throw error;
            } finally {
                clearTimeout(timeout);
                request = null;
            }
        })();
        return request;
    }

    // Доступ до каталогу для карток послуг і форми
    window.serviceCatalog = {
        load,
        subscribe(listener) {
            listeners.add(listener);
            listener(state);
        },
    };
})();
