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
import { useHydratedValue, usePermissionCheck, useTranslation } from '../../../src';
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

    it('survives a resolve that rejects', async () => {
        const hydration = createFakeHydrationStore();

        const failing = defineComponent({
            setup() {
                useHydratedValue<string>({
                    key: 'authup:test:rejecting',
                    resolve: () => Promise.reject(new Error('boom')),
                    apply: () => undefined,
                });

                return () => h('span', 'rendered');
            },
        });

        // the handoff is an optimization: a failed lookup must degrade to the
        // non-hydrated path, never take the render down with it
        const { html } = await renderKitComponent(
            failing,
            {},
            {},
            { hydrationStore: hydration.store },
        );

        expect(html).toContain('rendered');
        expect(hydration.entries).toEqual({});
    });

    it('resolves the translation in the markup without a hydration store', async () => {
        // ilingo 6.1.0 seeds the render from a synchronous store read
        // (tada5hi/ilingo#988), so an in-memory catalog reaches the markup
        // even though nothing awaits the asynchronous lookup
        const { html } = await renderKitComponent(translated);

        expect(html).toContain('Name');
    });
});
