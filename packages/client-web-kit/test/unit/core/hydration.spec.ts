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
    it('renders a recorded translation on the very first render', () => {
        const hydration = createFakeHydrationStore({ [TRANSLATION_KEY]: 'Name' });

        const { wrapper } = mountKitComponent(translated, {}, {}, { hydrationStore: hydration.store });

        // no flushPromises: this is the render the markup is hydrated against
        expect(wrapper.text()).toEqual('Name');
    });

    it('shows the placeholder without a record, as before', () => {
        const { wrapper } = mountKitComponent(translated);

        expect(wrapper.text()).toEqual('authupField.name');
    });

    it('lets the async lookup take over once it settles', async () => {
        const hydration = createFakeHydrationStore({ [TRANSLATION_KEY]: 'stale' });

        const { wrapper } = mountKitComponent(translated, {}, {}, { hydrationStore: hydration.store });
        await flushPromises();

        expect(wrapper.text()).toEqual('Name');
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
