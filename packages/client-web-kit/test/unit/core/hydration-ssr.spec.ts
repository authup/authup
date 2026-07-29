/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// @vitest-environment node

import { TranslatorTranslationFieldKey, TranslatorTranslationNamespace } from '@authup/i18n';
import { PermissionName } from '@authup/core-kit';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { usePermissionCheck, useTranslation } from '../../../src';
import { createFakeHydrationStore } from '../../utils/hydration';
import { renderKitComponent } from '../../utils/ssr';

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

describe('hydration handoff (server render)', () => {
    it('records what a translation resolved to', async () => {
        const hydration = createFakeHydrationStore();

        const { html } = await renderKitComponent(
            translated,
            {},
            {},
            { hydrationStore: hydration.store },
        );

        // the placeholder never reaches the markup
        expect(html).toContain('Name');
        expect(html).not.toContain('authupField.name');

        expect(hydration.entries).toEqual({ 'authup:translation:en:authupField:name::': 'Name' });
    });

    it('records a permission verdict', async () => {
        const hydration = createFakeHydrationStore();

        await renderKitComponent(gated, {}, {}, { hydrationStore: hydration.store });

        expect(hydration.entries).toEqual({ 'authup:permission:::user_update::': false });
    });

    it('leaves the placeholder in the markup without a hydration store', async () => {
        // nothing awaits ilingo's async lookup, so the render flushes first.
        // The handoff is what makes a server-rendered translation resolve
        const { html } = await renderKitComponent(translated);

        expect(html).toContain('authupField.name');
    });
});
