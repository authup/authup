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
    transports?: string[],
};

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
            transports: credential.transports as never,
        })),
        authenticatorSelection: {
            residentKey: 'discouraged',
            userVerification: 'preferred',
        },
    });

    return {
        options: options as unknown as Record<string, unknown>,
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
            transports: credential.transports as never,
        })),
    });

    return {
        options: options as unknown as Record<string, unknown>,
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
            transports: credential.transports as never,
        },
    });

    return {
        verified: verification.verified,
        newCounter: verification.authenticationInfo?.newCounter ?? credential.counter,
    };
}
