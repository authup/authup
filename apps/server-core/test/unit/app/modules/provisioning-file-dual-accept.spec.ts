/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Logger } from '@authup/server-kit';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { FileProvisioningSource } from '../../../../src/index.ts';
import { normalizeProvisioningEntityKeys } from '../../../../src/app/modules/provisioning/sources/file/normalize.ts';

describe('normalizeProvisioningEntityKeys (plan 073 dual-accept)', () => {
    it('converts snake_case keys to camelCase at every depth', () => {
        const result = normalizeProvisioningEntityKeys({
            realm_id: 'top-level',
            roles: [
                {
                    attributes: {
                        name: 'foo',
                        realm_id: null,
                        display_name: 'Foo',
                    },
                },
            ],
        });

        const data = result.data as Record<string, any>;
        expect(data.realmId).toEqual('top-level');
        expect(data).not.toHaveProperty('realm_id');

        const { attributes } = data.roles[0];
        expect(attributes.name).toEqual('foo');
        expect(attributes.realmId).toBeNull();
        expect(attributes.displayName).toEqual('Foo');
        expect(attributes).not.toHaveProperty('realm_id');
        expect(attributes).not.toHaveProperty('display_name');
    });

    it('drops the snake key when its camelCase sibling is present (camel wins)', () => {
        const result = normalizeProvisioningEntityKeys({
            realm_id: 'stale',
            realmId: 'authoritative',
        });

        const data = result.data as Record<string, any>;
        expect(data.realmId).toEqual('authoritative');
        expect(data).not.toHaveProperty('realm_id');
        expect([...result.convertedKeys]).toContain('realm_id (dropped, realmId present)');
    });

    it('reports every converted key for the deprecation warning', () => {
        const result = normalizeProvisioningEntityKeys({
            display_name: 'Foo',
            nested: { built_in: true },
        });

        expect([...result.convertedKeys].sort()).toEqual([
            'built_in -> builtIn',
            'display_name -> displayName',
        ]);
    });

    it('does not rewrite `names` array values but surfaces snake-looking entries', () => {
        const result = normalizeProvisioningEntityKeys({ extraAttributes: { names: ['active', 'name_locked', 'statusMessage'] } });

        const data = result.data as Record<string, any>;
        expect(data.extraAttributes.names).toEqual(['active', 'name_locked', 'statusMessage']);
        expect([...result.staleNameValues]).toEqual(['name_locked']);
        expect(result.convertedKeys.size).toEqual(0);
    });

    it.each([
        ['string', 'realm_id'],
        ['number', 42],
        ['boolean', true],
        ['null', null],
    ])('passes a %s value through untouched', (_label, value) => {
        const result = normalizeProvisioningEntityKeys(value);

        expect(result.data).toEqual(value);
        expect(result.convertedKeys.size).toEqual(0);
        expect(result.staleNameValues.size).toEqual(0);
    });

    it('keeps snake-looking scalar values untouched (only keys convert)', () => {
        const result = normalizeProvisioningEntityKeys({
            permissions: ['user_update', 'realm_id'],
            name: 'realm_admin',
        });

        const data = result.data as Record<string, any>;
        expect(data.permissions).toEqual(['user_update', 'realm_id']);
        expect(data.name).toEqual('realm_admin');
        expect(result.convertedKeys.size).toEqual(0);
    });
});

describe('FileProvisioningSource dual-accept (plan 073)', () => {
    let cwd : string;

    beforeAll(async () => {
        cwd = await mkdtemp(path.join(os.tmpdir(), 'authup-provisioning-dual-accept-'));
        await writeFile(
            path.join(cwd, 'entities.json'),
            JSON.stringify({
                roles: [
                    {
                        attributes: {
                            name: 'dual-accept-role',
                            display_name: 'Dual Accept Role',
                            built_in: true,
                        },
                    },
                ],
                policies: [
                    {
                        attributes: {
                            name: 'dual-accept-denylist',
                            type: 'attributeNames',
                            invert: true,
                        },
                        extraAttributes: { names: ['active', 'name_locked'] },
                    },
                ],
            }),
        );
    });

    afterAll(async () => {
        await rm(cwd, { recursive: true, force: true });
    });

    function createRecordingLogger(): { logger: Logger, warnings: string[] } {
        const warnings : string[] = [];
        const noop = () => undefined;

        const logger : Logger = {
            error: noop,
            warn: (message: string) => {
                warnings.push(message);
            },
            info: noop,
            http: noop,
            verbose: noop,
            debug: noop,
        };

        return { logger, warnings };
    }

    it('loads a snake-keyed file with camelCase output and logs deprecation warnings', async () => {
        const { logger, warnings } = createRecordingLogger();
        const source = new FileProvisioningSource({ cwd, logger });

        const output = await source.load();

        expect(output.roles).toHaveLength(1);
        const [role] = output.roles!;
        expect(role.attributes.name).toEqual('dual-accept-role');
        expect(role.attributes.displayName).toEqual('Dual Accept Role');
        expect(role.attributes.builtIn).toBe(true);
        expect(role.attributes).not.toHaveProperty('display_name');
        expect(role.attributes).not.toHaveProperty('built_in');

        const deprecation = warnings.find((entry) => entry.includes('deprecated snake_case keys'));
        expect(deprecation).toBeDefined();
        expect(deprecation).toContain('display_name -> displayName');
        expect(deprecation).toContain('built_in -> builtIn');

        const stale = warnings.find((entry) => entry.includes('fails open'));
        expect(stale).toBeDefined();
        expect(stale).toContain('name_locked');
        expect(stale).not.toContain('active');
    });
});
