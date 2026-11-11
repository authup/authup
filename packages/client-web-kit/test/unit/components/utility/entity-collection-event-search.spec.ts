/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Event as EventEntity } from '@authup/core-kit';
import { EventName } from '@authup/core-kit';
import type { FakeRequest } from '@authup/core-http-kit/testing';
import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import {
    defineEntityCollectionManager,
    defineEntityCollectionVEmitOptions,
    defineEntityCollectionVProps,
} from '../../../../src/components/utility';
import { injectTranslatorLocale } from '../../../../src';
import { mountKitComponent } from '../../../utils';

function mountEventCollection(locale: string) {
    const component = defineComponent({
        props: defineEntityCollectionVProps<EventEntity>(),
        emits: defineEntityCollectionVEmitOptions<EventEntity>(),
        setup(props, setup) {
            injectTranslatorLocale().value = locale;

            const manager = defineEntityCollectionManager<'event'>({
                type: 'event',
                props,
                setup,
                socket: false,
            });

            return () => manager.render();
        },
    });

    return mountKitComponent(component, {}, {
        'GET /events': () => ({
            data: [],
            meta: {
                total: 0,
                limit: 10,
                offset: 0,
            },
        }),
    });
}

function filters(requests: FakeRequest[]) : (string | null)[] {
    return requests
        .filter((request) => request.method === 'GET')
        .map((request) => new URL(request.url, 'http://fake.test'))
        .filter((url) => url.pathname === '/events')
        .map((url) => url.searchParams.get('filter'));
}

async function search(locale: string, text: string) : Promise<string | null> {
    const { wrapper, httpClient } = mountEventCollection(locale);

    await flushPromises();

    await (wrapper.vm as unknown as { load: (input: Record<string, unknown>) => Promise<void> })
        .load({ filters: { name: text } });

    return filters(httpClient.requests)[1];
}

describe('defineEntityCollectionManager (event names)', () => {
    it('matches the localized event label in en without a builtIn or displayName predicate', async () => {
        expect(await search('en', 'failed sign-in'))
            .toEqual(`or(contains(name,'failed sign-in'),in(name,'${EventName.LOGIN_FAILED}'))`);
    });

    it('matches the localized event label in de', async () => {
        expect(await search('de', 'Fehlgeschlagene Anmeldung'))
            .toEqual(`or(contains(name,'Fehlgeschlagene Anmeldung'),in(name,'${EventName.LOGIN_FAILED}'))`);
    });

    it('matches every event whose label contains the text', async () => {
        expect(await search('en', 'second factor'))
            .toEqual(`or(contains(name,'second factor'),in(name,'${EventName.MFA_ENROLLED}','${EventName.MFA_REMOVED}','${EventName.MFA_VERIFIED}','${EventName.MFA_CHALLENGE_FAILED}'))`);
    });

    it('keeps the raw-name search when no label matches', async () => {
        expect(await search('en', 'zzz')).toEqual("contains(name,'zzz')");
    });
});
