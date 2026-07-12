/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flushPromises } from '@vue/test-utils';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { AMfaChallengeForm } from '../../../../src/components/workflows/mfa';
import { mountKitComponent } from '../../../utils';

vi.mock('@simplewebauthn/browser', () => ({
    startAuthentication: vi.fn(async () => ({
        id: 'cred-1', 
        response: {}, 
        type: 'public-key', 
    })),
    startRegistration: vi.fn(async () => ({
        id: 'cred-1', 
        response: {}, 
        type: 'public-key', 
    })),
}));

describe('AMfaChallengeForm', () => {
    it('verifies a code and emits done', async () => {
        const { wrapper, httpClient } = mountKitComponent(AMfaChallengeForm, {}, { 'POST /authenticators/challenge': () => ({ verified: true }) });

        await wrapper.find('input').setValue('123456');
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        const request = httpClient.requests.find(
            (r) => r.method === 'POST' &&
                new URL(r.url, 'http://localhost').pathname === '/authenticators/challenge',
        );
        expect(request).toBeDefined();
        expect(request!.body).toEqual({ kind: 'totp', response: '123456' });
        expect(wrapper.emitted('done')).toBeTruthy();
        expect(wrapper.emitted('failed')).toBeFalsy();
    });

    it('emits failed on an invalid code', async () => {
        const { wrapper } = mountKitComponent(AMfaChallengeForm, {}, {
            'POST /authenticators/challenge': () => {
                const error = new Error('invalid') as Error & { response?: unknown };
                error.response = { status: 400, data: { message: 'The verification code is not valid.' } };
                throw error;
            },
        });

        await wrapper.find('input').setValue('000000');
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        expect(wrapper.emitted('done')).toBeFalsy();
        expect(wrapper.emitted('failed')).toBeTruthy();
    });

    it('runs the passkey ceremony and verifies the assertion for the webauthn kind', async () => {
        const { wrapper, httpClient } = mountKitComponent(AMfaChallengeForm, {
            kinds: ['webauthn'],
            challenge: { webauthn: { challenge: 'abc', rpId: 'localhost' } },
        }, { 'POST /authenticators/challenge': () => ({ verified: true }) });

        await wrapper.find('button').trigger('click');
        await flushPromises();

        const verifyRequest = httpClient.requests.find(
            (r) => r.method === 'POST' &&
                new URL(r.url, 'http://localhost').pathname === '/authenticators/challenge',
        );
        expect(verifyRequest).toBeDefined();
        expect(verifyRequest!.body.kind).toEqual('webauthn');
        // the assertion is forwarded as a JSON string
        expect(JSON.parse(verifyRequest!.body.response).id).toEqual('cred-1');
        expect(wrapper.emitted('done')).toBeTruthy();
    });

    it('requests an email code before verifying for the email kind', async () => {
        const { wrapper, httpClient } = mountKitComponent(AMfaChallengeForm, { kinds: ['email'] }, {
            'POST /authenticators/challenge/send': () => ({ success: true }),
            'POST /authenticators/challenge': () => ({ verified: true }),
        });

        // first click sends the code (no input yet)
        await wrapper.find('button').trigger('click');
        await flushPromises();

        const sendRequest = httpClient.requests.find(
            (r) => r.method === 'POST' &&
                new URL(r.url, 'http://localhost').pathname === '/authenticators/challenge/send',
        );
        expect(sendRequest).toBeDefined();
        expect(sendRequest!.body).toEqual({ kind: 'email' });

        // then a code input appears → verify
        await wrapper.find('input').setValue('123456');
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        const verifyRequest = httpClient.requests.find(
            (r) => r.method === 'POST' &&
                new URL(r.url, 'http://localhost').pathname === '/authenticators/challenge',
        );
        expect(verifyRequest!.body).toEqual({ kind: 'email', response: '123456' });
        expect(wrapper.emitted('done')).toBeTruthy();
    });

    it('switches to a recovery code when the recovery kind is offered', async () => {
        const { wrapper, httpClient } = mountKitComponent(AMfaChallengeForm, { kinds: ['totp', 'recovery'] }, { 'POST /authenticators/challenge': () => ({ verified: true }) });

        // toggle to recovery
        await wrapper.find('.a-auth-link').trigger('click');

        await wrapper.find('input').setValue('abcde-fghij');
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        const request = httpClient.requests.find(
            (r) => r.method === 'POST' &&
                new URL(r.url, 'http://localhost').pathname === '/authenticators/challenge',
        );
        expect(request!.body).toEqual({ kind: 'recovery', response: 'abcde-fghij' });
    });
});
