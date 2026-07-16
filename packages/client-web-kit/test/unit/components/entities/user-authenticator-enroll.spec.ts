/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import AUserAuthenticatorEnroll from '../../../../src/components/entities/user-authenticator/AUserAuthenticatorEnroll.vue';
import { mountKitComponent } from '../../../utils';

type MountResult = ReturnType<typeof mountKitComponent>;

function findButton(wrapper: MountResult['wrapper'], label: string) {
    return wrapper.findAll('button').find(
        (button) => button.text().includes(label),
    );
}

function buildHandlers(recoveryTotal: number) {
    return {
        'POST /users/:id/authenticators': (req: { body?: unknown }) => {
            const body = (req.body ?? {}) as Record<string, any>;
            if (body.kind === 'recovery') {
                return {
                    data: {
                        id: 'recovery-1',
                        kind: 'recovery',
                        confirmed: true,
                    },
                    meta: { codes: ['aaaa-bbbb', 'cccc-dddd'] },
                };
            }

            return {
                data: {
                    id: 'email-1',
                    kind: 'email',
                    confirmed: true,
                },
                meta: {},
            };
        },
        'GET /users/:id/authenticators': () => ({
            data: [],
            meta: { total: recoveryTotal },
        }),
    };
}

describe('components/entities/user-authenticator/AUserAuthenticatorEnroll', () => {
    // Soft recovery-code nudge (issue #3242 follow-up): after enrolling a
    // factor that cannot ride the single-POST otp path (email / webauthn),
    // a user without backup recovery codes is offered — never forced — to
    // generate them before the enrollment completes.
    it('should nudge for recovery codes after an email enrollment and defer done until skip', async () => {
        const { wrapper } = mountKitComponent(AUserAuthenticatorEnroll, {}, buildHandlers(0));
        await flushPromises();

        await findButton(wrapper, 'Email code')!.trigger('click');
        await flushPromises();

        // enrollment succeeded, but done is DEFERRED behind the nudge
        expect(wrapper.emitted('done')).toBeUndefined();
        expect(wrapper.text()).toContain('recovery codes');
        expect(findButton(wrapper, 'Generate recovery codes')).toBeDefined();

        await findButton(wrapper, 'Skip for now')!.trigger('click');
        await flushPromises();

        const done = wrapper.emitted('done');
        expect(done).toBeTruthy();
        expect(done![0][0]).toMatchObject({ id: 'email-1', kind: 'email' });
    });

    it('should generate codes from the nudge and emit done once acknowledged', async () => {
        const { wrapper, httpClient } = mountKitComponent(AUserAuthenticatorEnroll, {}, buildHandlers(0));
        await flushPromises();

        await findButton(wrapper, 'Email code')!.trigger('click');
        await flushPromises();

        await findButton(wrapper, 'Generate recovery codes')!.trigger('click');
        await flushPromises();

        // the shown-once codes must stay mounted — done not emitted yet
        expect(wrapper.emitted('done')).toBeUndefined();
        expect(wrapper.text()).toContain('aaaa-bbbb');

        const recoveryEnroll = httpClient.requests.find(
            (request) => request.method === 'POST' &&
                request.url.includes('authenticators') &&
                (request.body as Record<string, any>)?.kind === 'recovery',
        );
        expect(recoveryEnroll).toBeDefined();

        await findButton(wrapper, 'Close')!.trigger('click');
        await flushPromises();

        const done = wrapper.emitted('done');
        expect(done).toBeTruthy();
        expect(done![0][0]).toMatchObject({ id: 'email-1', kind: 'email' });
    });

    it('should not nudge when recovery codes already exist', async () => {
        const { wrapper } = mountKitComponent(AUserAuthenticatorEnroll, {}, buildHandlers(1));
        await flushPromises();

        await findButton(wrapper, 'Email code')!.trigger('click');
        await flushPromises();

        expect(findButton(wrapper, 'Generate recovery codes')).toBeUndefined();
        expect(wrapper.emitted('done')).toBeTruthy();
    });

    it('should not nudge when managing another user', async () => {
        const { wrapper } = mountKitComponent(
            AUserAuthenticatorEnroll,
            { userId: 'user-2' },
            buildHandlers(0),
        );
        await flushPromises();

        await findButton(wrapper, 'Email code')!.trigger('click');
        await flushPromises();

        expect(findButton(wrapper, 'Generate recovery codes')).toBeUndefined();
        expect(wrapper.emitted('done')).toBeTruthy();
    });
});
