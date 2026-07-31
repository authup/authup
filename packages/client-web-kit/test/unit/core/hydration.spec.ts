/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { PermissionName } from '@authup/core-kit';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { usePermissionCheck, useTranslation } from '../../../src';
import { mountKitComponent } from '../../utils';
import { createFakeHydrationStore } from '../../utils/hydration';
import { ASYNC_ONLY_TRANSLATION, withAsyncOnlyTranslator } from '../../utils/ilingo';

// must match what the server render writes (see hydration-ssr.spec.ts)
const TRANSLATION_KEY = 'authup:translation:en:authupField:name::';
const PERMISSION_KEY = 'authup:permission:::user_update::';

const translated = defineComponent({
    setup() {
        const label = useTranslation({
            namespace: TranslatorTranslationNamespace.FIELD,
            key: TranslatorTranslationFieldKey.NAME,
        });

        return () => h('span', label.value);
    },
});

const gated = defineComponent({
    setup() {
        const allowed = usePermissionCheck({ name: PermissionName.USER_UPDATE });

        return () => h('span', allowed.value ? 'allowed' : 'denied');
    },
});

describe('hydration handoff (client)', () => {
    // ilingo 6.1.0 seeds the first render from a synchronous store read
    // (tada5hi/ilingo#988), so an in-memory catalog reaches the render the
    // markup is hydrated against without anything being handed over.
    it('renders a translation on the very first render', () => {
        const { wrapper } = mountKitComponent(translated);

        // no flushPromises: this is the render the markup is hydrated against
        expect(wrapper.text()).toEqual('Name');
    });

    it('keeps the async lookup authoritative once it settles', async () => {
        const { wrapper } = mountKitComponent(translated);
        await flushPromises();

        expect(wrapper.text()).toEqual('Name');
    });

    // a store that needs I/O declines the synchronous read, so the seed stays
    // the placeholder and the handoff is what avoids the mismatch
    it('renders a recorded translation when the store cannot answer synchronously', () => {
        const hydration = createFakeHydrationStore({ [TRANSLATION_KEY]: ASYNC_ONLY_TRANSLATION });

        const { wrapper } = mountKitComponent(
            withAsyncOnlyTranslator(translated),
            {},
            {},
            { hydrationStore: hydration.store },
        );

        expect(wrapper.text()).toEqual(ASYNC_ONLY_TRANSLATION);
    });

    it('shows the placeholder for an async-only store nothing was recorded for', async () => {
        const { wrapper } = mountKitComponent(withAsyncOnlyTranslator(translated));

        expect(wrapper.text()).toEqual('authupField.name');

        await flushPromises();
        expect(wrapper.text()).toEqual(ASYNC_ONLY_TRANSLATION);
    });

    it('seeds a permission verdict on the first render', () => {
        const hydration = createFakeHydrationStore({ [PERMISSION_KEY]: true });

        const { wrapper } = mountKitComponent(gated, {}, {}, { hydrationStore: hydration.store });

        expect(wrapper.text()).toEqual('allowed');
    });

    it('keeps failing closed when no verdict was recorded', async () => {
        const hydration = createFakeHydrationStore();

        const { wrapper } = mountKitComponent(gated, {}, {}, { hydrationStore: hydration.store });

        expect(wrapper.text()).toEqual('denied');

        // and the live evaluation stays authoritative
        await flushPromises();
        expect(wrapper.text()).toEqual('denied');
    });
});
