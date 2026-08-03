/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { CLIENT_ADMIN_CONSOLE_NAME } from '@authup/core-kit';
import type { Realm } from '@authup/core-kit';
import { ValidatorGroup } from '@authup/kit';
import type { ValidupError } from 'validup';
import { isValidupError } from 'validup';
import { describe, expect, it } from 'vitest';
import { REALM_WILDCARD_NAME } from '../../../../src/core/provisioning/constants.ts';
import type {
    RealmProvisioningEntity,
    RootProvisioningEntity,
} from '../../../../src/core/provisioning/entities/index.ts';
import { RealmProvisioningValidator } from '../../../../src/core/provisioning/entities/index.ts';
import {
    WildcardRealmProvisioner,
    expandWildcardRealmEntry,
    extractWildcardRealmEntry,
} from '../../../../src/core/provisioning/wildcard/index.ts';
import type { IProvisioningSynchronizer } from '../../../../src/core/provisioning/types.ts';

class RecordingRealmSynchronizer implements IProvisioningSynchronizer<RealmProvisioningEntity> {
    public inputs: RealmProvisioningEntity[] = [];

    async synchronize(input: RealmProvisioningEntity): Promise<RealmProvisioningEntity> {
        this.inputs.push(input);

        // Mirror the real synchronizer's mutation behavior: realmId
        // stamping onto child attributes, resolved-row id write-back.
        const realmId = randomUUID();
        for (const client of input.relations?.clients ?? []) {
            client.attributes.realmId = realmId;
            client.attributes.id = randomUUID();
        }

        return input;
    }

    async synchronizeMany(input: RealmProvisioningEntity[]): Promise<RealmProvisioningEntity[]> {
        const output = [];
        for (const item of input) {
            output.push(await this.synchronize(item));
        }
        return output;
    }
}

const buildRealm = (name: string): Realm => ({
    id: randomUUID(),
    name,
} as Realm);

describe('core/provisioning/wildcard', () => {
    describe('extractWildcardRealmEntry', () => {
        it('should return undefined when no wildcard entry exists', () => {
            const data : RootProvisioningEntity = { realms: [{ attributes: { name: 'foo' } }] };

            expect(extractWildcardRealmEntry(data)).toBeUndefined();
            expect(data.realms).toHaveLength(1);
        });

        it('should split the wildcard entry out of the realm list', () => {
            const data : RootProvisioningEntity = {
                realms: [
                    { attributes: { name: 'foo' } },
                    {
                        attributes: { name: REALM_WILDCARD_NAME },
                        relations: { clients: [{ attributes: { name: 'portal' } }] },
                    },
                ],
            };

            const entry = extractWildcardRealmEntry(data);

            expect(entry).toBeDefined();
            expect(entry!.relations?.clients).toHaveLength(1);
            expect(data.realms!.map((realm) => realm.attributes.name)).toEqual(['foo']);
        });

        it('should fold multiple wildcard entries via the composite merge rules', () => {
            const data : RootProvisioningEntity = {
                realms: [
                    {
                        attributes: { name: REALM_WILDCARD_NAME },
                        relations: { clients: [{ attributes: { name: 'portal', displayName: 'Portal' } }] },
                    },
                    {
                        attributes: { name: REALM_WILDCARD_NAME },
                        relations: {
                            clients: [{ attributes: { name: 'portal', description: 'later source' } }],
                            roles: [{ attributes: { name: 'template-role' } }],
                        },
                    },
                ],
            };

            const entry = extractWildcardRealmEntry(data);

            expect(data.realms).toHaveLength(0);
            expect(entry!.relations?.roles).toHaveLength(1);
            expect(entry!.relations?.clients).toHaveLength(1);
            expect(entry!.relations?.clients![0].attributes).toMatchObject({
                name: 'portal',
                displayName: 'Portal',
                description: 'later source',
            });
        });

        it('should strip realm-level attributes and strategy from the folded entry', () => {
            const data : RootProvisioningEntity = {
                realms: [
                    {
                        attributes: { name: REALM_WILDCARD_NAME, displayName: 'nope' } as RealmProvisioningEntity['attributes'],
                        strategy: { type: 'merge' },
                        relations: { roles: [{ attributes: { name: 'template-role' } }] },
                    } as RealmProvisioningEntity,
                ],
            };

            const entry = extractWildcardRealmEntry(data);

            expect(entry!.attributes).toEqual({ name: REALM_WILDCARD_NAME });
            expect(entry!.strategy).toBeUndefined();
        });
    });

    describe('expandWildcardRealmEntry', () => {
        const wildcard : RealmProvisioningEntity = {
            attributes: { name: REALM_WILDCARD_NAME },
            relations: {
                clients: [{ attributes: { name: 'portal', displayName: 'Portal' } }],
                roles: [{ attributes: { name: 'template-role' } }],
            },
        };

        it('should merge the wildcard UNDER an explicit entry (explicit wins per attribute)', () => {
            const data : RootProvisioningEntity = {
                realms: [{
                    attributes: { name: 'foo', displayName: 'Foo' },
                    relations: {
                        clients: [{
                            attributes: { name: 'portal', displayName: 'Explicit Portal' },
                            strategy: { type: 'merge' },
                        }],
                    },
                }],
            };

            const variants = expandWildcardRealmEntry(wildcard, data);

            const [merged] = data.realms!;
            expect(merged.attributes).toMatchObject({ name: 'foo', displayName: 'Foo' });

            const clients = merged.relations?.clients ?? [];
            expect(clients).toHaveLength(1);
            expect(clients[0].attributes.displayName).toBe('Explicit Portal');
            expect(clients[0].strategy).toEqual({ type: 'merge' });

            // relation lists union: the wildcard-only role joins the block
            expect(merged.relations?.roles).toHaveLength(1);

            expect([...variants.keys()]).toEqual(['foo']);
            expect(variants.get('foo')!.clients![0].attributes.displayName).toBe('Explicit Portal');
        });

        it('should keep the recorded variants pristine when the expanded entries are mutated', () => {
            const data : RootProvisioningEntity = {
                realms: [{
                    attributes: { name: 'foo' },
                    relations: { clients: [{ attributes: { name: 'own-client' } }] },
                }],
            };

            const variants = expandWildcardRealmEntry(wildcard, data);

            // the graph sync mutates the expanded entries in place
            const [merged] = data.realms!;
            for (const client of merged.relations?.clients ?? []) {
                client.attributes.realmId = randomUUID();
                client.attributes.id = randomUUID();
            }

            const variant = variants.get('foo')!;
            for (const client of variant.clients ?? []) {
                expect(client.attributes.realmId).toBeUndefined();
                expect(client.attributes.id).toBeUndefined();
            }
        });

        it('should not share objects between the wildcard and the expanded entries', () => {
            const data : RootProvisioningEntity = { realms: [{ attributes: { name: 'foo' } }] };

            expandWildcardRealmEntry(wildcard, data);

            const [merged] = data.realms!;
            for (const client of merged.relations?.clients ?? []) {
                client.attributes.realmId = randomUUID();
            }

            expect(wildcard.relations?.clients![0].attributes.realmId).toBeUndefined();
        });
    });

    describe('WildcardRealmProvisioner', () => {
        const relations = { clients: [{ attributes: { name: 'portal' } }] };

        it('should synthesize a relations-only entry per realm', async () => {
            const synchronizer = new RecordingRealmSynchronizer();
            const provisioner = new WildcardRealmProvisioner({ relations, synchronizer });

            await provisioner.ensureForRealm(buildRealm('foo'));

            expect(synchronizer.inputs).toHaveLength(1);
            expect(synchronizer.inputs[0].attributes).toEqual({ name: 'foo' });
            expect(synchronizer.inputs[0].strategy).toBeUndefined();
            expect(synchronizer.inputs[0].relations?.clients).toHaveLength(1);
        });

        // The realm synchronizer mutates its input (realmId stamping, the
        // `replace` branch writes the resolved row id back), so a shared
        // object would leak one realm's ids into the next realm's sync.
        it('should deep-clone the entry per realm application', async () => {
            const synchronizer = new RecordingRealmSynchronizer();
            const provisioner = new WildcardRealmProvisioner({ relations, synchronizer });

            await provisioner.ensureForRealm(buildRealm('foo'));
            await provisioner.ensureForRealm(buildRealm('bar'));

            const [first, second] = synchronizer.inputs;
            expect(first.relations?.clients![0].attributes.realmId).toBeDefined();
            expect(second.relations?.clients![0].attributes.realmId).toBeDefined();
            expect(first.relations?.clients![0].attributes.id)
                .not.toBe(second.relations?.clients![0].attributes.id);

            // the source relations stay untouched
            expect(relations.clients[0].attributes).toEqual({ name: 'portal' });
        });

        it('should apply the merged variant for an explicitly declared realm', async () => {
            const synchronizer = new RecordingRealmSynchronizer();
            const provisioner = new WildcardRealmProvisioner({
                relations,
                relationsByRealmName: new Map([
                    ['foo', { clients: [{ attributes: { name: 'portal', displayName: 'Explicit Portal' } }] }],
                ]),
                synchronizer,
            });

            expect(provisioner.hasExplicitEntry(buildRealm('foo'))).toBe(true);
            expect(provisioner.hasExplicitEntry(buildRealm('bar'))).toBe(false);

            await provisioner.ensureForRealm(buildRealm('Foo'));
            await provisioner.ensureForRealm(buildRealm('bar'));

            expect(synchronizer.inputs[0].relations?.clients![0].attributes.displayName)
                .toBe('Explicit Portal');
            expect(synchronizer.inputs[1].relations?.clients![0].attributes.displayName)
                .toBeUndefined();
        });
    });

    describe('RealmProvisioningValidator (wildcard dispatch)', () => {
        const validator = new RealmProvisioningValidator();
        const run = (input: Record<string, any>) => validator.run(
            input as RealmProvisioningEntity,
            { group: ValidatorGroup.PROVISIONING },
        );

        // A ValidupError's top-level message is the generic
        // "Property <path> is invalid" — the reason lives in the issues.
        const expectIssue = async (promise: Promise<unknown>, pattern: RegExp) => {
            await expect(promise).rejects.toSatisfy((e: unknown) => {
                expect(isValidupError(e)).toBe(true);
                expect(JSON.stringify((e as ValidupError).issues)).toMatch(pattern);
                return true;
            });
        };

        it('should accept a relations-only wildcard entry and validate its children', async () => {
            const output = await run({
                attributes: { name: REALM_WILDCARD_NAME },
                relations: {
                    clients: [{
                        attributes: {
                            // canonicalization must reach the output
                            name: ' Portal ',
                        },
                    }],
                },
            });

            expect(output.attributes).toEqual({ name: REALM_WILDCARD_NAME });
            expect(output.relations?.clients![0].attributes.name).toBe('portal');
        });

        it('should reject a wildcard entry carrying realm attributes', async () => {
            await expectIssue(run({ attributes: { name: REALM_WILDCARD_NAME, displayName: 'All Realms' } }), /relations-only/);
        });

        it('should reject a wildcard entry carrying a realm-level strategy', async () => {
            await expectIssue(run({
                attributes: { name: REALM_WILDCARD_NAME },
                strategy: { type: 'absent' },
            }), /realm-level strategy/);
        });

        it('should reject a reserved client name inside a wildcard entry', async () => {
            await expectIssue(run({
                attributes: { name: REALM_WILDCARD_NAME },
                relations: { clients: [{ attributes: { name: CLIENT_ADMIN_CONSOLE_NAME } }] },
            }), /reserved/);
        });

        // `web` left the reserved list with plan 082 — the documented
        // legacy-row cleanup (a wildcard `absent` child named `web`) must
        // validate.
        it('should accept a client named "web" inside a wildcard entry', async () => {
            const output = await run({
                attributes: { name: REALM_WILDCARD_NAME },
                relations: {
                    clients: [{
                        attributes: { name: 'web' },
                        strategy: { type: 'absent' },
                    }],
                },
            });

            expect(output.relations?.clients![0].attributes.name).toBe('web');
        });

        it('should reject a partial wildcard pattern via the regular name validation', async () => {
            await expect(run({ attributes: { name: 'tenant-*' } })).rejects.toThrow();
        });
    });
});
