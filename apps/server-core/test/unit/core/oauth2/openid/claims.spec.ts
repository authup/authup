/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Robot, User } from '@authup/core-kit';
import { OAuth2SubKind } from '@authup/specs';
import { describe, expect, it } from 'vitest';
import { OAuth2OpenIDClaimsBuilder } from '../../../../../src/core/oauth2/openid/claims.ts';

describe('OAuth2OpenIDClaimsBuilder', () => {
    const builder = new OAuth2OpenIDClaimsBuilder();

    describe('fromIdentity', () => {
        it('should dispatch to fromClient for CLIENT type', () => {
            const client = { name: 'test-client' } as Client;
            const result = builder.fromIdentity({
                type: OAuth2SubKind.CLIENT,
                data: client,
            });
            expect(result.name).toBe('test-client');
        });

        it('should dispatch to fromRobot for ROBOT type', () => {
            const robot = { name: 'test-robot' } as Robot;
            const result = builder.fromIdentity({
                type: OAuth2SubKind.ROBOT,
                data: robot,
            });
            expect(result.name).toBe('test-robot');
        });

        it('should dispatch to fromUser for USER type', () => {
            const user = { name: 'test-user', email: 'test@example.com' } as User;
            const result = builder.fromIdentity({
                type: OAuth2SubKind.USER,
                data: user,
            });
            expect(result.name).toBe('test-user');
            expect(result.email).toBe('test@example.com');
        });
    });

    describe('fromClient', () => {
        it('should map name to name, nickname, and preferred_username', () => {
            const client = { name: 'my-client' } as Client;
            const result = builder.fromClient(client);
            expect(result.name).toBe('my-client');
            expect(result.nickname).toBe('my-client');
            expect(result.preferred_username).toBe('my-client');
        });

        it('should transform Date updated_at to unix timestamp in seconds per OIDC §5.1', () => {
            const date = new Date('2025-01-15T12:00:00Z');
            const client = { name: 'c', updated_at: date } as Client;
            const result = builder.fromClient(client);
            expect(result.updated_at).toBe(Math.floor(date.getTime() / 1000));
        });

        it('should transform string updated_at to unix timestamp in seconds per OIDC §5.1', () => {
            const dateStr = '2025-01-15T12:00:00Z';
            const client = { name: 'c', updated_at: dateStr } as unknown as Client;
            const result = builder.fromClient(client);
            expect(result.updated_at).toBe(Math.floor(new Date(dateStr).getTime() / 1000));
        });

        it('should skip missing attributes', () => {
            const client = {} as Client;
            const result = builder.fromClient(client);
            expect(result).not.toHaveProperty('name');
            expect(result).not.toHaveProperty('updated_at');
        });
    });

    describe('fromRobot', () => {
        it('should map name to name, nickname, and preferred_username', () => {
            const robot = { name: 'my-robot' } as Robot;
            const result = builder.fromRobot(robot);
            expect(result.name).toBe('my-robot');
            expect(result.nickname).toBe('my-robot');
            expect(result.preferred_username).toBe('my-robot');
        });

        it('should transform Date updated_at to unix timestamp in seconds per OIDC §5.1', () => {
            const date = new Date('2025-06-01T00:00:00Z');
            const robot = { name: 'r', updated_at: date } as Robot;
            const result = builder.fromRobot(robot);
            expect(result.updated_at).toBe(Math.floor(date.getTime() / 1000));
        });

        it('should not have email or family_name', () => {
            const robot = { name: 'r' } as Robot;
            const result = builder.fromRobot(robot);
            expect(result).not.toHaveProperty('email');
            expect(result).not.toHaveProperty('family_name');
            expect(result).not.toHaveProperty('given_name');
        });
    });

    describe('fromUser', () => {
        it('should map all user fields', () => {
            const user = {
                name: 'jdoe',
                first_name: 'John',
                last_name: 'Doe',
                display_name: 'John Doe',
                email: 'john@example.com',
                active: true,
            } as User;

            const result = builder.fromUser(user);
            expect(result.name).toBe('jdoe');
            expect(result.given_name).toBe('John');
            expect(result.family_name).toBe('Doe');
            expect(result.nickname).toBe('John Doe');
            expect(result.preferred_username).toBe('John Doe');
            expect(result.email).toBe('john@example.com');
            expect(result.email_verified).toBe(true);
        });

        it('should transform Date updated_at to unix timestamp in seconds per OIDC §5.1', () => {
            const date = new Date('2025-03-01T10:30:00Z');
            const user = { name: 'u', updated_at: date } as User;
            const result = builder.fromUser(user);
            expect(result.updated_at).toBe(Math.floor(date.getTime() / 1000));
        });

        it('should pass through non-Date non-string updated_at', () => {
            const user = { name: 'u', updated_at: 1234567890 } as unknown as User;
            const result = builder.fromUser(user);
            expect(result.updated_at).toBe(1234567890);
        });

        it('should skip missing attributes', () => {
            const user = { name: 'u' } as User;
            const result = builder.fromUser(user);
            expect(result.name).toBe('u');
            expect(result).not.toHaveProperty('email');
            expect(result).not.toHaveProperty('family_name');
            expect(result).not.toHaveProperty('given_name');
        });
    });
});
