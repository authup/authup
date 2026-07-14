/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { BadRequestError, EntityConflictError, EntityNotFoundError } from '@authup/errors';
import type { Key } from '@authup/core-kit';
import { KeyStatus, KeyValidator, PermissionName } from '@authup/core-kit';
import {
    ValidatorGroup, 
    arrayBufferToBase64, 
    base64ToArrayBuffer, 
    createNanoID,
} from '@authup/kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';
import { AbstractEntityService, AsymmetricKey, createAsymmetricKeyPair } from '@authup/server-kit';
import { JWKType, JWKUse, JWTAlgorithm } from '@authup/specs';
import { getRandomValues } from 'uncrypto';
import type { IKeyRepository, IKeyService, KeyDeleteOptions } from './types.ts';

export type KeyServiceContext = {
    repository: IKeyRepository;
};

const PERMISSION_NAMES = [
    PermissionName.KEY_READ,
    PermissionName.KEY_UPDATE,
    PermissionName.KEY_DELETE,
];

export class KeyService extends AbstractEntityService implements IKeyService {
    protected repository: IKeyRepository;

    protected validator: KeyValidator;

    constructor(ctx: KeyServiceContext) {
        super();
        this.repository = ctx.repository;
        this.validator = new KeyValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<Key>> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: PERMISSION_NAMES });

        const { data: entities, meta } = await this.repository.findMany(query);

        const data: Key[] = [];
        let { total } = meta;

        for (const entity of entities) {
            try {
                await actor.permissionEvaluator.evaluateOneOf({
                    name: PERMISSION_NAMES,
                    data: definePolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entity,
                        ...this.resourceRealmMatch(entity),
                    }),
                });
                data.push(entity);
            } catch {
                total -= 1;
            }
        }

        return {
            data,
            meta: {
                ...meta,
                total,
            },
        };
    }

    async getOne(
        idOrName: string,
        actor: ActorContext,
        realmId?: string,
    ): Promise<Key> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: PERMISSION_NAMES });

        const entity = await this.repository.findOneByIdOrName(idOrName, realmId);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluateOneOf({
            name: PERMISSION_NAMES,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
                ...this.resourceRealmMatch(entity),
            }),
        });

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Key> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.KEY_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        if (!validated.realm_id && actor.identity) {
            const actorRealmId = this.getActorRealmId(actor);
            if (actorRealmId) {
                validated.realm_id = actorRealmId;
            }
        }

        // keys are realm-bound infrastructure — no global (null realm) keys
        // via the API.
        if (!validated.realm_id) {
            throw new BadRequestError('A realm must be specified.');
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.KEY_CREATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: validated,
                ...this.resourceRealmMatch(validated),
            }),
        });

        if (!validated.name) {
            validated.name = `${validated.use}-${createNanoID(10)}`;
        }

        await this.repository.checkUniqueness(validated);

        if (typeof validated.priority !== 'number') {
            const highest = await this.repository.findHighestPriority(validated.realm_id, validated.use as string);
            // generate doubles as rotate: a new key outranks the current one.
            validated.priority = typeof highest === 'number' ? highest + 1 : 0;
        }

        if (!validated.status) {
            validated.status = KeyStatus.ACTIVE;
        }

        const material = validated.decryption_key ?
            await this.importMaterial(validated) :
            await this.generateMaterial(validated);

        let entity = this.repository.create({
            ...validated,
            type: material.type,
            signature_algorithm: material.signatureAlgorithm,
            decryption_key: material.decryptionKey,
            encryption_key: material.encryptionKey,
        });

        entity = await this.repository.save(entity);

        // private material never leaves the server — the response carries
        // metadata + public part only (authentik CVE-2024-42490).
        entity.decryption_key = null;

        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
        realmId?: string,
    ): Promise<Key> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.KEY_UPDATE });

        let entity = await this.repository.findOneByIdOrName(idOrName, realmId);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        // only name / priority / status are mounted for UPDATE — material,
        // use, type and realm are immutable.
        const validated = await this.validator.run(data, { group: ValidatorGroup.UPDATE });

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.KEY_UPDATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: {
                    ...entity,
                    ...validated,
                },
                ...this.resourceRealmMatch(entity),
            }),
        });

        if (validated.name && validated.name !== entity.name) {
            await this.repository.checkUniqueness({
                name: validated.name,
                realm_id: entity.realm_id,
            }, entity);
        }

        entity = this.repository.merge(entity, validated);
        await this.repository.save(entity);

        entity.decryption_key = null;

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
        options: KeyDeleteOptions = {},
    ): Promise<Key> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.KEY_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.KEY_DELETE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
                ...this.resourceRealmMatch(entity),
            }),
        });

        if (entity.use === JWKUse.ENCRYPTION && !options.force) {
            const references = await this.repository.countBlobReferences(entity.id);
            if (references > 0) {
                throw new EntityConflictError({
                    message: `The encryption key is still referenced by ${references} encrypted secret(s) — ` +
                        'deleting it makes them unrecoverable. Repeat with force to crypto-shred them.',
                    data: { references },
                });
            }
        }

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;
        entity.decryption_key = null;

        return entity;
    }

    // ------------------------------------------------------------------

    protected async generateMaterial(validated: Partial<Key>) : Promise<{
        type: `${JWKType}`,
        signatureAlgorithm: `${JWTAlgorithm}` | null,
        decryptionKey: string,
        encryptionKey: string | null,
    }> {
        if (validated.use === JWKUse.ENCRYPTION) {
            if (validated.signature_algorithm) {
                throw new BadRequestError('An encryption key can not carry a signature algorithm.');
            }

            const raw = new Uint8Array(32);
            getRandomValues(raw);

            return {
                type: JWKType.OCT,
                signatureAlgorithm: null,
                decryptionKey: arrayBufferToBase64(raw.buffer),
                encryptionKey: null,
            };
        }

        const algorithm = (validated.signature_algorithm ?? JWTAlgorithm.RS256) as `${JWTAlgorithm}`;
        const options = this.buildAsymmetricOptions(algorithm);

        const keyPair = await createAsymmetricKeyPair(options);

        return {
            type: algorithm.startsWith('ES') ? JWKType.EC : JWKType.RSA,
            signatureAlgorithm: algorithm,
            decryptionKey: await new AsymmetricKey(keyPair.privateKey).toBase64(),
            encryptionKey: await new AsymmetricKey(keyPair.publicKey).toBase64(),
        };
    }

    protected async importMaterial(validated: Partial<Key>) : Promise<{
        type: `${JWKType}`,
        signatureAlgorithm: `${JWTAlgorithm}` | null,
        decryptionKey: string,
        encryptionKey: string | null,
    }> {
        const decryptionKey = this.normalizeMaterial(validated.decryption_key as string);

        if (validated.use === JWKUse.ENCRYPTION) {
            if (validated.signature_algorithm) {
                throw new BadRequestError('An encryption key can not carry a signature algorithm.');
            }

            if (validated.encryption_key) {
                throw new BadRequestError('An encryption key holds no public part.');
            }

            let byteLength : number;
            try {
                byteLength = base64ToArrayBuffer(decryptionKey).byteLength;
            } catch {
                throw new BadRequestError('The key material is not valid base64.');
            }

            if (byteLength !== 32) {
                throw new BadRequestError('The key material must be 32 base64-encoded bytes.');
            }

            return {
                type: JWKType.OCT,
                signatureAlgorithm: null,
                decryptionKey,
                encryptionKey: null,
            };
        }

        if (!validated.encryption_key) {
            throw new BadRequestError('Importing a signature key requires its public part (encryption_key, SPKI).');
        }

        const encryptionKey = this.normalizeMaterial(validated.encryption_key);
        const algorithm = (validated.signature_algorithm ?? JWTAlgorithm.RS256) as `${JWTAlgorithm}`;
        const options = this.buildAsymmetricOptions(algorithm);

        try {
            await AsymmetricKey.fromBase64({
                format: 'pkcs8', 
                key: decryptionKey, 
                options, 
            });
            await AsymmetricKey.fromBase64({
                format: 'spki', 
                key: encryptionKey, 
                options, 
            });
        } catch {
            throw new BadRequestError(`The key material could not be imported for ${algorithm}.`);
        }

        return {
            type: algorithm.startsWith('ES') ? JWKType.EC : JWKType.RSA,
            signatureAlgorithm: algorithm,
            decryptionKey,
            encryptionKey,
        };
    }

    protected buildAsymmetricOptions(algorithm: `${JWTAlgorithm}`) {
        if (!/^(RS|ES)(256|384|512)$/.test(algorithm)) {
            throw new BadRequestError(`The signature algorithm ${algorithm} is not supported for stored keys.`);
        }

        return AsymmetricKey.buildImportOptionsForJWTAlgorithm(algorithm);
    }

    protected normalizeMaterial(value: string) : string {
        if (value.includes('-----BEGIN')) {
            // PEM body IS base64 DER — strip armor + whitespace.
            return value
                .replace(/-----(BEGIN|END)[^-]+-----/g, '')
                .replace(/\s+/g, '');
        }

        return value.trim();
    }
}
