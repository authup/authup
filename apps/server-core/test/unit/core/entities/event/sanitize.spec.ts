/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { sanitizeEventData } from '../../../../../src/core/entities/event/sanitize.ts';

describe('sanitizeEventData', () => {
    it.each([
        ['grantType', 'password'],
        ['scope', 'global openid'],
        ['responseType', 'code'],
        ['prompt', 'login'],
        ['error', 'invalid_grant'],
        ['errorCode', 'entity_credentials_invalid'],
        ['reason', 'replay'],
        ['clientName', 'web'],
        ['realmName', 'master'],
        ['jti', 'b0e8b3d2-1111-1111-1111-111111111111'],
        ['name', 'sig-primary'],
        ['use', 'enc'],
        ['status', 'disabled'],
        ['enabled', 'true'],
        ['force', 'true'],
        ['kind', 'totp'],
        ['providerId', 'b0e8b3d2-2222-2222-2222-222222222222'],
        ['providerName', 'keycloak'],
    ])('keeps the allowlisted scalar key %s', (key, value) => {
        expect(sanitizeEventData({ [key]: value })).toEqual({ [key]: value });
    });

    it('keeps number and boolean values on allowlisted keys', () => {
        expect(sanitizeEventData({ reason: 42 })).toEqual({ reason: 42 });
        expect(sanitizeEventData({ reason: true })).toEqual({ reason: true });
    });

    it.each([
        ['password'],
        ['client_secret'],
        ['code'],
        ['code_verifier'],
        ['access_token'],
        ['refresh_token'],
        ['id_token_hint'],
        ['authorization'],
    ])('drops the credential/secret key %s', (key) => {
        expect(sanitizeEventData({ [key]: 'super-secret-value' })).toBeNull();

        // and never lets it ride alongside an allowlisted key
        const mixed = sanitizeEventData({ grantType: 'password', [key]: 'super-secret-value' });
        expect(mixed).toEqual({ grantType: 'password' });
    });

    it('drops arbitrary non-allowlisted keys', () => {
        expect(sanitizeEventData({ foo: 'bar', username: 'admin' })).toBeNull();
    });

    it.each([
        ['sessionId'],
        ['revokedSessionId'],
    ])('drops the session id key %s (it rides the dedicated column)', (key) => {
        const value = 'b0e8b3d2-0000-0000-0000-000000000000';

        expect(sanitizeEventData({ [key]: value })).toBeNull();
        expect(sanitizeEventData({ grantType: 'password', [key]: value }))
            .toEqual({ grantType: 'password' });
    });

    it.each([
        ['object', { nested: 'value' }],
        ['array', ['value']],
        ['null', null],
        ['undefined', undefined],
        ['function', () => 'value'],
    ])('drops a %s value even under an allowlisted key', (_label, value) => {
        expect(sanitizeEventData({ reason: value })).toBeNull();
    });

    it('cannot smuggle a secret through a nested structure under an allowlisted key', () => {
        const output = sanitizeEventData({
            grantType: 'password',
            reason: { password: 'super-secret' },
            scope: ['refresh_token', { client_secret: 'oops' }],
        });

        expect(output).toEqual({ grantType: 'password' });
        expect(JSON.stringify(output)).not.toContain('super-secret');
        expect(JSON.stringify(output)).not.toContain('oops');
    });

    it('truncates string values to 512 characters', () => {
        const value = 'a'.repeat(600);
        const output = sanitizeEventData({ reason: value });

        expect(output).not.toBeNull();
        expect(output!.reason).toHaveLength(512);
        expect(output!.reason).toEqual('a'.repeat(512));
    });

    it('keeps a string of exactly 512 characters untouched', () => {
        const value = 'b'.repeat(512);
        expect(sanitizeEventData({ reason: value })).toEqual({ reason: value });
    });

    it.each([
        ['null', null],
        ['undefined', undefined],
        ['empty object', {}],
    ])('returns null for %s input', (_label, input) => {
        expect(sanitizeEventData(input)).toBeNull();
    });

    describe('diff branch (entity-CRUD bridge)', () => {
        it('lets a valid scalar diff through', () => {
            const output = sanitizeEventData({
                diff: {
                    description: { next: 'after', previous: 'before' },
                    active: { next: false, previous: true },
                    displayName: { next: 'set', previous: null },
                },
            });

            expect(output).toEqual({
                diff: {
                    description: { next: 'after', previous: 'before' },
                    active: { next: false, previous: true },
                    displayName: { next: 'set', previous: null },
                },
            });
        });

        it.each([
            ['password'],
            ['secret'],
            ['secretHashed'],
            ['token'],
            ['credential'],
        ])('drops the secret-denylisted diff key %s', (key) => {
            const output = sanitizeEventData({
                diff: {
                    description: { next: 'after', previous: 'before' },
                    [key]: { next: 'leaked', previous: 'previous' },
                },
            });

            expect(output).toEqual({ diff: { description: { next: 'after', previous: 'before' } } });
            expect(JSON.stringify(output)).not.toContain('leaked');
        });

        it.each([
            ['a scalar entry', 'not-an-object'],
            ['an array entry', ['next', 'previous']],
            ['a null entry', null],
            ['a non-scalar next value', { next: { nested: 'x' }, previous: 'a' }],
            ['a non-scalar previous value', { next: 'a', previous: ['x'] }],
            ['a missing next value', { previous: 'a' }],
        ])('drops a diff entry that is %s', (_label, entry) => {
            const output = sanitizeEventData({ diff: { key: entry } });

            expect(output).toBeNull();
        });

        it('drops extra keys inside a diff entry (rebuilds { next, previous } only)', () => {
            const output = sanitizeEventData({
                diff: {
                    description: {
                        next: 'after', 
                        previous: 'before', 
                        smuggled: 'oops', 
                    }, 
                },
            });

            expect(output).toEqual({ diff: { description: { next: 'after', previous: 'before' } } });
        });

        it('truncates diff string values to 512 characters', () => {
            const output = sanitizeEventData({ diff: { description: { next: 'a'.repeat(600), previous: 'b'.repeat(600) } } });

            expect(output!.diff.description.next).toHaveLength(512);
            expect(output!.diff.description.previous).toHaveLength(512);
        });

        it.each([
            ['a scalar', 'value'],
            ['an array', [{ next: 'a', previous: 'b' }]],
            ['null', null],
        ])('drops a diff that is %s (not a one-level object)', (_label, diff) => {
            expect(sanitizeEventData({ diff })).toBeNull();
        });

        it('rides alongside allowlisted scalar keys', () => {
            const output = sanitizeEventData({
                reason: 'entity_update',
                diff: { description: { next: 'a', previous: 'b' } },
            });

            expect(output).toEqual({
                reason: 'entity_update',
                diff: { description: { next: 'a', previous: 'b' } },
            });
        });
    });
});
