/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type {
    AuthenticationResponseJSON,
    AuthenticatorTransportFuture,
    RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { UserAuthenticatorWebauthnParameters } from './types.ts';

export type WebauthnContext = {
    rpId: string,
    rpName: string,
    origin: string,
};

export type WebauthnCredentialRef = {
    id: string,
    // persisted as a plain string[] on the credential row (JSON column); the
    // SimpleWebAuthn API narrows it to its transport string-literal union.
    transports?: string[],
};

// The SimpleWebAuthn option objects are serialized verbatim to the browser
// (navigator.credentials.*). They cross the wire as an opaque JSON blob, so the
// public DTO deliberately keeps them as `Record<string, unknown>` rather than
// leaking @simplewebauthn/server types into the shared HTTP contract — hence the
// single boundary conversion below.
function asOpaqueOptions(options: object): Record<string, unknown> {
    return options as unknown as Record<string, unknown>;
}

function asTransports(transports?: string[]): AuthenticatorTransportFuture[] | undefined {
    return transports as AuthenticatorTransportFuture[] | undefined;
}

export async function buildWebauthnRegistrationOptions(
    ctx: WebauthnContext,
    user: { id: string, name: string },
    existing: WebauthnCredentialRef[],
): Promise<{ options: Record<string, unknown>, challenge: string }> {
    const options = await generateRegistrationOptions({
        rpName: ctx.rpName,
        rpID: ctx.rpId,
        userID: new TextEncoder().encode(user.id),
        userName: user.name,
        attestationType: 'none',
        excludeCredentials: existing.map((credential) => ({
            id: credential.id,
            transports: asTransports(credential.transports),
        })),
        authenticatorSelection: {
            residentKey: 'discouraged',
            userVerification: 'preferred',
        },
    });

    return {
        options: asOpaqueOptions(options),
        challenge: options.challenge,
    };
}

export async function verifyWebauthnRegistration(
    ctx: WebauthnContext,
    response: RegistrationResponseJSON,
    challenge: string,
): Promise<UserAuthenticatorWebauthnParameters | null> {
    const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: ctx.origin,
        expectedRPID: ctx.rpId,
        requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
        return null;
    }

    const { credential } = verification.registrationInfo;

    return {
        rp_id: ctx.rpId,
        credential_id: credential.id,
        public_key: isoBase64URL.fromBuffer(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports,
    };
}

export async function buildWebauthnAuthenticationOptions(
    ctx: WebauthnContext,
    credentials: WebauthnCredentialRef[],
): Promise<{ options: Record<string, unknown>, challenge: string }> {
    const options = await generateAuthenticationOptions({
        rpID: ctx.rpId,
        userVerification: 'preferred',
        allowCredentials: credentials.map((credential) => ({
            id: credential.id,
            transports: asTransports(credential.transports),
        })),
    });

    return {
        options: asOpaqueOptions(options),
        challenge: options.challenge,
    };
}

export async function verifyWebauthnAuthentication(
    ctx: WebauthnContext,
    response: AuthenticationResponseJSON,
    challenge: string,
    credential: UserAuthenticatorWebauthnParameters,
): Promise<{ verified: boolean, newCounter: number }> {
    const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: ctx.origin,
        expectedRPID: ctx.rpId,
        requireUserVerification: false,
        credential: {
            id: credential.credential_id,
            publicKey: isoBase64URL.toBuffer(credential.public_key),
            counter: credential.counter,
            transports: asTransports(credential.transports),
        },
    });

    return {
        verified: verification.verified,
        newCounter: verification.authenticationInfo?.newCounter ?? credential.counter,
    };
}
