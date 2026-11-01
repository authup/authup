/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flushPromises } from '@vue/test-utils';
import type * as Overlays from '@vuecs/overlays';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import AUserAuthenticatorEnroll from '../../../../src/components/entities/user-authenticator/AUserAuthenticatorEnroll.vue';
import AUserAuthenticators from '../../../../src/components/entities/user-authenticator/AUserAuthenticators.vue';
import AMfaChallengeForm from '../../../../src/components/workflows/mfa/AMfaChallengeForm.vue';
import { mountKitComponent } from '../../../utils';

const { startRegistration } = vi.hoisted(() => ({ startRegistration: vi.fn() }));

vi.mock('@simplewebauthn/browser', async (importOriginal) => {
    const original = await importOriginal<Record<string, unknown>>();

    return {
        ...original,
        startRegistration,
    };
});

vi.mock('@vuecs/overlays', async (importOriginal) => {
    const original = await importOriginal<typeof Overlays>();

    return {
        ...original,
        useAlertDialog: () => async () => true,
    };
});

type MountResult = ReturnType<typeof mountKitComponent>;

function findButton(wrapper: MountResult['wrapper'], label: string) {
    return wrapper.findAll('button').find(
        (button) => button.text().includes(label),
    );
}

function mfaRequired() {
    const e = new Error('mfa_required') as Error & { response?: unknown };

    e.response = {
        status: 400,
        data: {
            code: 'mfa_required',
            error: 'mfa_required',
            message: 'Complete a second-factor challenge to continue.',
        },
    };

    return e;
}

/**
 * A handler that answers mfa_required until the session passed a challenge.
 */
function stepUpGated<T>(answer: () => T) {
    const state = { proven: false, calls: 0 };

    return {
        state,
        handler: () => {
            state.calls += 1;

            if (!state.proven) {
                throw mfaRequired();
            }

            return answer();
        },
    };
}

const challengeStatus = () => ({
    required: true,
    enrollmentRequired: false,
    kinds: ['email'],
});

function buildEnrollHandlers() {
    const recovery = stepUpGated(() => ({
        data: {
            id: 'recovery-1',
            kind: 'recovery',
            confirmed: true,
        },
        meta: { codes: ['aaaa-bbbb', 'cccc-dddd'] },
    }));

    const handlers = {
        'POST /users/:id/authenticators': (req: { body?: unknown }) => {
            const body = (req.body ?? {}) as Record<string, any>;

            if (body.kind === 'recovery') {
                return recovery.handler();
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
            meta: { total: 0 },
        }),
        'GET /authenticators/challenge': () => challengeStatus(),
    };

    return { handlers, recovery: recovery.state };
}

describe('components/entities/user-authenticator (step-up)', () => {
    it('should challenge the session in place and retry the recovery nudge once', async () => {
        const { handlers, recovery } = buildEnrollHandlers();
        const { wrapper } = mountKitComponent(AUserAuthenticatorEnroll, {}, handlers);

        await flushPromises();

        await findButton(wrapper, 'Email code')!.trigger('click');
        await flushPromises();

        await findButton(wrapper, 'Generate recovery codes')!.trigger('click');
        await flushPromises();

        const challenge = wrapper.findComponent(AMfaChallengeForm);

        expect(challenge.exists()).toBe(true);
        expect(challenge.props('kinds')).toEqual(['email']);
        expect(recovery.calls).toBe(1);

        recovery.proven = true;
        challenge.vm.$emit('done', {});
        await flushPromises();

        expect(recovery.calls).toBe(2);
        expect(wrapper.findComponent(AMfaChallengeForm).exists()).toBe(false);
        expect(wrapper.text()).toContain('aaaa-bbbb');
        expect(wrapper.emitted('done')).toBeUndefined();
    });

    it('should keep the skip behaviour when the challenge is cancelled', async () => {
        const { handlers, recovery } = buildEnrollHandlers();
        const { wrapper } = mountKitComponent(AUserAuthenticatorEnroll, {}, handlers);

        await flushPromises();

        await findButton(wrapper, 'Email code')!.trigger('click');
        await flushPromises();

        await findButton(wrapper, 'Generate recovery codes')!.trigger('click');
        await flushPromises();

        await findButton(wrapper, 'Abort')!.trigger('click');
        await flushPromises();

        expect(recovery.calls).toBe(1);
        expect(wrapper.findComponent(AMfaChallengeForm).exists()).toBe(false);

        const done = wrapper.emitted('done');

        expect(done).toBeTruthy();
        expect(done![0][0]).toMatchObject({ id: 'email-1', kind: 'email' });
    });

    it('should challenge the session and retry removing an own factor', async () => {
        const drop = stepUpGated(() => ({ data: { id: 'totp-1' }, meta: {} }));

        const { wrapper } = mountKitComponent(AUserAuthenticators, {}, {
            'GET /users/:id/authenticators': () => ({
                data: [{
                    id: 'totp-1',
                    kind: 'totp',
                    confirmed: true,
                }],
                meta: { total: 1 },
            }),
            'DELETE /users/:id/authenticators/:authenticatorId': drop.handler,
            'GET /authenticators/challenge': () => challengeStatus(),
        });

        await flushPromises();

        await findButton(wrapper, 'Delete')!.trigger('click');
        await flushPromises();

        const challenge = wrapper.findComponent(AMfaChallengeForm);

        expect(challenge.exists()).toBe(true);

        drop.state.proven = true;
        challenge.vm.$emit('done', {});
        await flushPromises();

        expect(drop.state.calls).toBe(2);
        expect(wrapper.emitted('deleted')).toBeTruthy();
    });

    it('should leave an unrelated failure as an error', async () => {
        const { wrapper } = mountKitComponent(AUserAuthenticators, {}, {
            'GET /users/:id/authenticators': () => ({
                data: [{
                    id: 'totp-1',
                    kind: 'totp',
                    confirmed: true,
                }],
                meta: { total: 1 },
            }),
            'DELETE /users/:id/authenticators/:authenticatorId': () => {
                const e = new Error('forbidden') as Error & { response?: unknown };

                e.response = { status: 403, data: { code: 'permission_denied', message: 'Not allowed.' } };

                throw e;
            },
            'GET /authenticators/challenge': () => challengeStatus(),
        });

        await flushPromises();

        await findButton(wrapper, 'Delete')!.trigger('click');
        await flushPromises();

        expect(wrapper.findComponent(AMfaChallengeForm).exists()).toBe(false);
        expect(wrapper.text()).toContain('Not allowed.');
    });

    function listHandlers(extra: Record<string, unknown>) {
        return {
            'GET /users/:id/authenticators': () => ({
                data: [
                    {
                        id: 'totp-1', 
                        kind: 'totp', 
                        confirmed: true, 
                    },
                    {
                        id: 'totp-2', 
                        kind: 'totp', 
                        confirmed: true, 
                    },
                ],
                meta: { total: 2 },
            }),
            'GET /authenticators/challenge': () => challengeStatus(),
            ...extra,
        };
    }

    it('should surface a failed challenge lookup instead of the step-up demand', async () => {
        const { wrapper } = mountKitComponent(AUserAuthenticators, {}, listHandlers({
            'DELETE /users/:id/authenticators/:authenticatorId': () => {
                throw mfaRequired();
            },
            'GET /authenticators/challenge': () => {
                const e = new Error('unavailable') as Error & { response?: unknown };

                e.response = { status: 503, data: { code: 'internal', message: 'The challenge is unavailable.' } };

                throw e;
            },
        }));

        await flushPromises();

        await findButton(wrapper, 'Delete')!.trigger('click');
        await flushPromises();

        expect(wrapper.findComponent(AMfaChallengeForm).exists()).toBe(false);
        expect(wrapper.text()).toContain('The challenge is unavailable.');
    });

    it('should settle the pending step-up when a second call demands one', async () => {
        const calls: string[] = [];
        let proven = false;

        const { wrapper } = mountKitComponent(AUserAuthenticators, {}, listHandlers({
            'DELETE /users/:id/authenticators/:authenticatorId': (req: { url: string }) => {
                const id = req.url.split('/').pop()!;

                calls.push(id);

                if (!proven) {
                    throw mfaRequired();
                }

                return { data: { id }, meta: {} };
            },
        }));

        await flushPromises();

        const buttons = wrapper.findAll('button').filter((button) => button.text().includes('Delete'));

        expect(buttons).toHaveLength(2);

        await Promise.all([buttons[0]!.trigger('click'), buttons[1]!.trigger('click')]);
        await flushPromises();

        const challenge = wrapper.findComponent(AMfaChallengeForm);

        expect(challenge.exists()).toBe(true);
        expect(wrapper.text()).toContain('Complete a second-factor challenge to continue.');

        proven = true;
        challenge.vm.$emit('done', {});
        await flushPromises();

        expect(calls).toHaveLength(3);
        expect(wrapper.emitted('deleted')).toHaveLength(1);
    });

    it('should ask for a fresh code instead of resubmitting the one typed before the challenge', async () => {
        const confirm = stepUpGated(() => ({
            data: {
                id: 'totp-1', 
                kind: 'totp', 
                confirmed: true, 
            },
            meta: {}, 
        }));

        const { wrapper } = mountKitComponent(AUserAuthenticatorEnroll, {}, {
            'POST /users/:id/authenticators': () => ({
                data: {
                    id: 'totp-1', 
                    kind: 'totp', 
                    confirmed: false, 
                },
                meta: {
                    secret: 'JBSWY3DPEHPK3PXP', 
                    uri: 'otpauth://totp/x', 
                    qr: '', 
                },
            }),
            'POST /users/:id/authenticators/:authenticatorId/confirm': confirm.handler,
            'GET /authenticators/challenge': () => challengeStatus(),
        });

        await flushPromises();

        await findButton(wrapper, 'Authenticator app')!.trigger('click');
        await flushPromises();

        await wrapper.find('input').setValue('123456');
        await findButton(wrapper, 'Confirm')!.trigger('click');
        await flushPromises();

        const challenge = wrapper.findComponent(AMfaChallengeForm);

        expect(challenge.exists()).toBe(true);

        confirm.state.proven = true;
        challenge.vm.$emit('done', {});
        await flushPromises();

        expect(confirm.state.calls).toBe(1);
        expect(wrapper.emitted('done')).toBeUndefined();
        expect((wrapper.find('input').element as HTMLInputElement).value).toEqual('');

        await wrapper.find('input').setValue('654321');
        await findButton(wrapper, 'Confirm')!.trigger('click');
        await flushPromises();

        expect(confirm.state.calls).toBe(2);
        expect(wrapper.emitted('done')).toBeTruthy();
    });

    it('should restart the passkey registration after a challenge', async () => {
        startRegistration.mockReset();
        startRegistration.mockImplementation(async () => ({ id: `attestation-${startRegistration.mock.calls.length}` }));

        let begins = 0;
        const confirmed: string[] = [];
        const confirm = stepUpGated(() => ({
            data: {
                id: `webauthn-${begins}`, 
                kind: 'webauthn', 
                confirmed: true, 
            },
            meta: {}, 
        }));

        const { wrapper } = mountKitComponent(AUserAuthenticatorEnroll, {}, {
            'POST /users/:id/authenticators': () => {
                begins += 1;

                return {
                    data: {
                        id: `webauthn-${begins}`, 
                        kind: 'webauthn', 
                        confirmed: false, 
                    },
                    meta: { webauthn: { challenge: `challenge-${begins}` } },
                };
            },
            'POST /users/:id/authenticators/:authenticatorId/confirm': (req: { url: string, body?: unknown }) => {
                confirmed.push(`${req.url.split('/').at(-2)}:${JSON.parse((req.body as { code: string }).code).id}`);

                return confirm.handler();
            },
            'GET /users/:id/authenticators': () => ({ data: [], meta: { total: 1 } }),
            'GET /authenticators/challenge': () => challengeStatus(),
        });

        await flushPromises();

        await findButton(wrapper, 'Passkey')!.trigger('click');
        await flushPromises();

        const challenge = wrapper.findComponent(AMfaChallengeForm);

        expect(challenge.exists()).toBe(true);

        confirm.state.proven = true;
        challenge.vm.$emit('done', {});
        await flushPromises();

        expect(begins).toBe(2);
        expect(startRegistration).toHaveBeenCalledTimes(2);
        expect(startRegistration.mock.calls[1]![0]).toMatchObject({ optionsJSON: { challenge: 'challenge-2' } });
        expect(confirmed).toEqual(['webauthn-1:attestation-1', 'webauthn-2:attestation-2']);
        expect(wrapper.emitted('done')).toBeTruthy();
    });
});
