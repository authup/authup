/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { sanitizeAuditEventData } from '../../../../../src/core/entities/audit-event/sanitize.ts';

describe('sanitizeAuditEventData', () => {
    it.each([
        ['grant_type', 'password'],
        ['scope', 'global openid'],
        ['response_type', 'code'],
        ['prompt', 'login'],
        ['error', 'invalid_grant'],
        ['error_code', 'entity_credentials_invalid'],
        ['reason', 'replay'],
        ['client_name', 'web'],
        ['realm_name', 'master'],
        ['session_id', 'b0e8b3d2-0000-0000-0000-000000000000'],
        ['jti', 'b0e8b3d2-1111-1111-1111-111111111111'],
        ['revoked_session_id', 'b0e8b3d2-2222-2222-2222-222222222222'],
    ])('keeps the allowlisted scalar key %s', (key, value) => {
        expect(sanitizeAuditEventData({ [key]: value })).toEqual({ [key]: value });
    });

    it('keeps number and boolean values on allowlisted keys', () => {
        expect(sanitizeAuditEventData({ reason: 42 })).toEqual({ reason: 42 });
        expect(sanitizeAuditEventData({ reason: true })).toEqual({ reason: true });
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
        expect(sanitizeAuditEventData({ [key]: 'super-secret-value' })).toBeNull();

        // and never lets it ride alongside an allowlisted key
        const mixed = sanitizeAuditEventData({ grant_type: 'password', [key]: 'super-secret-value' });
        expect(mixed).toEqual({ grant_type: 'password' });
    });

    it('drops arbitrary non-allowlisted keys', () => {
        expect(sanitizeAuditEventData({ foo: 'bar', username: 'admin' })).toBeNull();
    });

    it.each([
        ['object', { nested: 'value' }],
        ['array', ['value']],
        ['null', null],
        ['undefined', undefined],
        ['function', () => 'value'],
    ])('drops a %s value even under an allowlisted key', (_label, value) => {
        expect(sanitizeAuditEventData({ reason: value })).toBeNull();
    });

    it('cannot smuggle a secret through a nested structure under an allowlisted key', () => {
        const output = sanitizeAuditEventData({
            grant_type: 'password',
            reason: { password: 'super-secret' },
            scope: ['refresh_token', { client_secret: 'oops' }],
        });

        expect(output).toEqual({ grant_type: 'password' });
        expect(JSON.stringify(output)).not.toContain('super-secret');
        expect(JSON.stringify(output)).not.toContain('oops');
    });

    it('truncates string values to 512 characters', () => {
        const value = 'a'.repeat(600);
        const output = sanitizeAuditEventData({ reason: value });

        expect(output).not.toBeNull();
        expect(output!.reason).toHaveLength(512);
        expect(output!.reason).toEqual('a'.repeat(512));
    });

    it('keeps a string of exactly 512 characters untouched', () => {
        const value = 'b'.repeat(512);
        expect(sanitizeAuditEventData({ reason: value })).toEqual({ reason: value });
    });

    it.each([
        ['null', null],
        ['undefined', undefined],
        ['empty object', {}],
    ])('returns null for %s input', (_label, input) => {
        expect(sanitizeAuditEventData(input)).toBeNull();
    });
});
