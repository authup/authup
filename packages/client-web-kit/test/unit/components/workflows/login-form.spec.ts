/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { FakeClient } from '@authup/core-http-kit/testing';
import { AIdentityProviders, ARealmPicker } from '../../../../src/components/entities';
import AMfaChallengeForm from '../../../../src/components/workflows/mfa/AMfaChallengeForm.vue';
import { findTokenRequest, mountLoginForm } from '../../../utils';

type LoginFormWrapper = ReturnType<typeof mountLoginForm>['wrapper'];

async function submitWithCredentials(wrapper: LoginFormWrapper) {
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('admin');
    await wrapper.find('input[type="password"]').setValue('start123');

    await wrapper.find('form').trigger('submit');
    await flushPromises();
}

function tokenRequests(httpClient: FakeClient) {
    return httpClient.requests.filter(
        (request) => request.method === 'POST' &&
            new URL(request.url, 'http://localhost').pathname === '/token',
    );
}

// A password-grant handler that rejects a credential-only login (as the server
// does for an MFA-enrolled user) with `mfa_required`, and only succeeds once an
// `otp` rides along. With `mfaToken` set it mimics the interactive-kind path
// (issue #3242): the error additionally carries the MFA-pending ticket.
function mfaGatedTokenHandler(kinds: string[] = ['totp'], mfaToken?: string) {
    return (req: { body?: unknown }) => {
        const body = (req.body ?? {}) as Record<string, any>;
        if (!body.otp) {
            const error = new Error('Complete a second-factor challenge to continue.');
            (error as any).response = {
                status: 400,
                data: {
                    code: 'mfa_required',
                    error: 'mfa_required',
                    kinds,
                    message: 'Complete a second-factor challenge to continue.',
                    ...(mfaToken ? {
                        mfa_token: mfaToken,
                        mfa_token_expires_in: 600,
                    } : {}),
                },
            };
            throw error;
        }

        return {
            access_token: 'xyz',
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: 'abc',
        };
    };
}

describe('components/workflows/login', () => {
    it('should transmit picker-selected realm', async () => {
        const { wrapper, httpClient } = mountLoginForm();
        await flushPromises();

        const picker = wrapper.findComponent(ARealmPicker);
        expect(picker.exists()).toBe(true);

        picker.vm.$emit('change', ['realm-a']);
        await flushPromises();

        await submitWithCredentials(wrapper);

        const request = findTokenRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({
            grant_type: 'password',
            username: 'admin',
            password: 'start123',
            realm_id: 'realm-a',
        });
    });

    it('should pin realm from codeRequest and hide picker', async () => {
        const { wrapper, httpClient } = mountLoginForm({
            codeRequest: {
                response_type: 'code',
                realm_id: 'realm-b',
            },
        });
        await flushPromises();

        expect(wrapper.findComponent(ARealmPicker).exists()).toBe(false);

        await submitWithCredentials(wrapper);

        const request = findTokenRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({
            grant_type: 'password',
            realm_id: 'realm-b',
        });
    });

    it('should adopt realm of late-arriving codeRequest', async () => {
        const { wrapper, httpClient } = mountLoginForm();
        await flushPromises();

        await wrapper.setProps({
            codeRequest: {
                response_type: 'code',
                realm_id: 'realm-c',
            },
        });
        await flushPromises();

        await submitWithCredentials(wrapper);

        const request = findTokenRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({
            grant_type: 'password',
            realm_id: 'realm-c',
        });
    });

    it('should omit realm_id without selection or codeRequest', async () => {
        const { wrapper, httpClient } = mountLoginForm();
        await flushPromises();

        await submitWithCredentials(wrapper);

        const request = findTokenRequest(httpClient);
        expect(request).toBeDefined();

        const body = request!.body as Record<string, string>;
        expect(body.grant_type).toEqual('password');
        expect(body.username).toEqual('admin');
        expect(body.password).toEqual('start123');
        expect('realm_id' in body).toBe(false);
    });

    // Regression (plan 049 gap): an MFA-enrolled user logging in fresh gets
    // `mfa_required` from the password grant. The form must NOT dead-end as a
    // generic failure — it presents a second-factor step and resubmits the same
    // credentials WITH the otp. Before the fix the credentials-only login threw
    // and the challenge was never collected.
    it('should present a second-factor step on mfa_required and complete with otp', async () => {
        const { wrapper, httpClient } = mountLoginForm({}, { 'POST /token': mfaGatedTokenHandler(['totp']) });
        await flushPromises();

        // credential-only submit → transitions to the challenge step, no failure
        await submitWithCredentials(wrapper);

        expect((wrapper.vm as any).mfaRequired).toBe(true);
        expect(wrapper.emitted('failed')).toBeUndefined();

        // the realm picker / credential view is hidden in the challenge step
        expect(wrapper.findComponent(ARealmPicker).exists()).toBe(false);

        // the first token request carried NO otp
        const first = findTokenRequest(httpClient);
        expect(first!.body).toMatchObject({ grant_type: 'password', username: 'admin' });
        expect('otp' in (first!.body as Record<string, unknown>)).toBe(false);

        // enter the code and resubmit → the grant is retried WITH the otp
        const otpInput = wrapper.find('input');
        expect(otpInput.exists()).toBe(true);
        await otpInput.setValue('123456');
        await wrapper.find('form').trigger('submit');
        await flushPromises();

        const withOtp = tokenRequests(httpClient).find(
            (request) => (request.body as Record<string, unknown>).otp,
        );
        expect(withOtp).toBeDefined();
        expect(withOtp!.body).toMatchObject({
            grant_type: 'password',
            username: 'admin',
            password: 'start123',
            otp: '123456',
        });

        // the completed login never surfaced as a failure
        expect(wrapper.emitted('failed')).toBeUndefined();
    });

    // Email / WebAuthn cannot ride a single password POST — the challenge step
    // must not offer a useless code field to a user holding only those factors.
    it('should not render an otp field when only interactive factors are enrolled', async () => {
        const { wrapper } = mountLoginForm({}, { 'POST /token': mfaGatedTokenHandler(['webauthn']) });
        await flushPromises();

        await submitWithCredentials(wrapper);

        expect((wrapper.vm as any).mfaRequired).toBe(true);
        expect((wrapper.vm as any).mfaHasCodeFactor).toBe(false);
        // no code input in the challenge step
        expect(wrapper.find('input').exists()).toBe(false);
        expect(wrapper.emitted('failed')).toBeUndefined();
    });

    // Issue #3242: an email-only user cannot complete the single-POST otp
    // step — the server returns an MFA-pending ticket, and the form drives
    // the interactive challenge against it (send code → verify → the verify
    // response carries the full grant, which establishes the session).
    it('should complete an email-only fresh login via the mfa ticket', async () => {
        const grant = {
            access_token: 'ticket-at',
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: 'ticket-rt',
        };

        const { wrapper, httpClient } = mountLoginForm({}, {
            'POST /token': mfaGatedTokenHandler(['email'], 'ticket-123'),
            'POST /authenticators/challenge/send': () => ({ success: true }),
            'POST /authenticators/challenge': () => ({ verified: true, token: grant }),
        });
        await flushPromises();

        await submitWithCredentials(wrapper);

        expect((wrapper.vm as any).mfaRequired).toBe(true);
        expect((wrapper.vm as any).mfaTicket).toEqual('ticket-123');
        expect(wrapper.emitted('failed')).toBeUndefined();

        // the interactive challenge form replaces the inline otp step
        const challengeForm = wrapper.findComponent(AMfaChallengeForm);
        expect(challengeForm.exists()).toBe(true);

        // email-only: no challenge-status fetch needed (webauthn-only material)
        const statusRequests = httpClient.requests.filter(
            (request) => request.method === 'GET' &&
                request.url.includes('authenticators/challenge'),
        );
        expect(statusRequests).toHaveLength(0);

        // request the code — the call carries the ticket, not a session bearer
        await challengeForm.find('button').trigger('click');
        await flushPromises();

        const sendRequest = httpClient.requests.find(
            (request) => request.method === 'POST' &&
                request.url.includes('authenticators/challenge/send'),
        );
        expect(sendRequest).toBeDefined();
        expect(sendRequest!.headers.authorization).toEqual('Bearer ticket-123');

        // enter the mailed code and verify
        await challengeForm.find('input').setValue('123456');
        await challengeForm.find('form').trigger('submit');
        await flushPromises();

        const verifyRequest = httpClient.requests.find(
            (request) => request.method === 'POST' &&
                new URL(request.url, 'http://localhost').pathname === '/authenticators/challenge',
        );
        expect(verifyRequest).toBeDefined();
        expect(verifyRequest!.headers.authorization).toEqual('Bearer ticket-123');
        expect(verifyRequest!.body).toMatchObject({ kind: 'email', response: '123456' });

        // the grant from the verify response established the session
        expect(wrapper.emitted('done')).toBeTruthy();
        expect(wrapper.emitted('failed')).toBeUndefined();
    });

    // A non-mfa failure (bad credentials) must still surface as `failed`.
    it('should emit failed for a non-mfa login error', async () => {
        const { wrapper } = mountLoginForm({}, {
            'POST /token': () => {
                const error = new Error('invalid credentials');
                (error as any).response = {
                    status: 400,
                    data: { code: 'entity_credentials_invalid', message: 'invalid credentials' },
                };
                throw error;
            },
        });
        await flushPromises();

        await submitWithCredentials(wrapper);

        expect((wrapper.vm as any).mfaRequired).toBe(false);
        expect(wrapper.emitted('failed')).toBeTruthy();
    });

    // Regression: the collection manager's setup-time load is
    // fire-and-forget — an uncaught rejection is fatal to an SSR process.
    // A failing request must be routed into the `failed` emit and leave
    // the form usable (rendered without the provider list).
    it('should render when identity provider load fails', async () => {
        const { wrapper } = mountLoginForm({}, {
            'GET /identity-providers': () => {
                throw new Error('unable to get local issuer certificate');
            },
        });
        await flushPromises();

        expect(wrapper.find('form').exists()).toBe(true);

        const providers = wrapper.findComponent(AIdentityProviders);
        expect(providers.exists()).toBe(true);
        expect(providers.emitted('failed')).toBeTruthy();
    });
});
