(() => {
    'use strict';

    const source = new URL('../data/services.json', document.currentScript.src);
    const listeners = new Set();
    let state = { status: 'idle', data: null };
    let request = null;

    function publish(status, data = null) {
        state = { status, data };
        listeners.forEach((listener) => listener(state));
    }

    function validate(data) {
        const categoryIds = ['portraits', 'events', 'commercial'];
        const ids = new Set();
        const names = new Set();
        const text = (value) => typeof value === 'string' && value.trim().length > 0;
        if (!data || !Array.isArray(data.categories) || data.categories.length !== categoryIds.length) {
            throw new Error('Invalid service categories');
        }
        data.categories.forEach((category, index) => {
            if (!category || category.id !== categoryIds[index] || !text(category.service)
                || !Array.isArray(category.packages) || !category.packages.length) {
                throw new Error('Invalid service category');
            }
            category.packages.forEach((item) => {
                if (!item || !/^[a-z]+(?:-[a-z]+)*$/.test(item.id) || ids.has(item.id)
                    || document.getElementById(item.id) || !text(item.name) || names.has(item.name)
                    || !text(item.price) || typeof item.customPrice !== 'boolean'
                    || !Array.isArray(item.features) || !item.features.length || !item.features.every(text)) {
                    throw new Error('Invalid service package');
                }
                ids.add(item.id);
                names.add(item.name);
            });
        });
        return data;
    }

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

    window.serviceCatalog = {
        load,
        subscribe(listener) {
            listeners.add(listener);
            listener(state);
        },
    };
})();
