/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import {
    EntityConflictError,
    EntityNotFoundError,
    ValidationError,
    isError as isRawError,
} from '@authup/errors';
import type { Key } from '@authup/core-kit';
import {
    EntityType,
    EventName,
    EventScope,
    KeyStatus,
    KeyValidator,
    PermissionName,
} from '@authup/core-kit';
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
import { buildEntityDiff } from '../event/index.ts';
import type { EventRequestContext, IEventService } from '../event/index.ts';
import { assertCertificateMatchesKey, isWrappedKeyMaterial, parseCertificateChain } from '../../key/index.ts';
import type { IKeyRepository, IKeyService, KeyDeleteOptions } from './types.ts';
import { decodeQuery } from '../../query/index.ts';
import { keySchema } from './schema.ts';

export type KeyServiceContext = {
    repository: IKeyRepository;
    eventService?: IEventService;
    requestContext?: () => EventRequestContext | undefined;
};

const PERMISSION_NAMES = [
    PermissionName.KEY_READ,
    PermissionName.KEY_UPDATE,
    PermissionName.KEY_DELETE,
];

export class KeyService extends AbstractEntityService implements IKeyService {
    protected repository: IKeyRepository;

    protected validator: KeyValidator;

    protected eventService?: IEventService;

    protected requestContext?: () => EventRequestContext | undefined;

    constructor(ctx: KeyServiceContext) {
        super();
        this.repository = ctx.repository;
        this.validator = new KeyValidator();
        this.eventService = ctx.eventService;
        this.requestContext = ctx.requestContext;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<Key>> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: PERMISSION_NAMES });

        const { data: entities, meta } = await this.repository.findMany(decodeQuery(query, { schema: keySchema }));

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
                // Belt-and-braces: the read projection never selects private
                // material, but null it explicitly so no future adapter change
                // can leak it onto a read surface (cf. authentik CVE-2024-42490).
                entity.decryptionKey = null;
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

        // Belt-and-braces null of private material (see getMany).
        entity.decryptionKey = null;

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Key> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.KEY_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });
        const { use } = validated;
        if (!use) {
            throw new ValidationError('A key use must be specified.');
        }

        await this.repository.validateJoinColumns(validated);

        if (!validated.realmId && actor.identity) {
            const actorRealmId = this.getActorRealmId(actor);
            if (actorRealmId) {
                validated.realmId = actorRealmId;
            }
        }

        // keys are realm-bound infrastructure — no global (null realm) keys
        // via the API.
        if (!validated.realmId) {
            throw new ValidationError('A realm must be specified.');
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.KEY_CREATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: validated,
                ...this.resourceRealmMatch(validated),
            }),
        });

        if (!validated.name) {
            validated.name = `${use}-${createNanoID(10)}`;
        }

        await this.repository.checkUniqueness(validated);

        if (typeof validated.priority !== 'number') {
            const highest = await this.repository.findHighestPriority(validated.realmId, use);
            // generate doubles as rotate: a new key outranks the current one.
            validated.priority = typeof highest === 'number' ? highest + 1 : 0;
        }

        if (!validated.status) {
            validated.status = KeyStatus.ACTIVE;
        }

        const certificate = typeof validated.certificate === 'string' ? validated.certificate : null;
        if (certificate && (!validated.decryptionKey || use !== JWKUse.SIGNATURE)) {
            throw new ValidationError('A certificate requires imported signature key material.');
        }

        const material = validated.decryptionKey ?
            await this.importMaterial(validated, use) :
            await this.generateMaterial(validated, use);

        if (certificate) {
            if (!material.encryptionKey) {
                throw new ValidationError('A certificate requires imported signature key material.');
            }

            try {
                const chain = parseCertificateChain(certificate);
                assertCertificateMatchesKey(chain, material.encryptionKey);
            } catch (e) {
                throw new ValidationError(
                    isRawError(e) ?
                        e.message :
                        'The certificate could not be matched against the imported key material.',
                );
            }
        }

        let entity = this.repository.create({
            ...validated,
            type: material.type,
            signatureAlgorithm: material.signatureAlgorithm,
            decryptionKey: material.decryptionKey,
            encryptionKey: material.encryptionKey,
        });

        entity = await this.repository.save(entity);

        // private material never leaves the server — the response carries
        // metadata + public part only (authentik CVE-2024-42490).
        entity.decryptionKey = null;

        await this.recordEvent(EventName.CREATED, entity, actor);

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
                realmId: entity.realmId,
            }, entity);
        }

        const previous = this.pickAuditFields(entity);

        entity = this.repository.merge(entity, validated);
        await this.repository.save(entity);

        entity.decryptionKey = null;

        const diff = buildEntityDiff(this.pickAuditFields(entity), previous);
        await this.recordEvent(EventName.UPDATED, entity, actor, { ...(Object.keys(diff).length > 0 ? { diff } : {}) });

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
        entity.decryptionKey = null;

        // force only carries crypto-shred semantics for encryption keys — a
        // sig-key delete with a stray force flag must not read as a shred.
        const forcedCryptoShred = entity.use === JWKUse.ENCRYPTION && !!options.force;
        await this.recordEvent(EventName.DELETED, entity, actor, { ...(forcedCryptoShred ? { force: true } : {}) });

        return entity;
    }

    // ------------------------------------------------------------------

    /**
     * Metadata-only audit trail for key lifecycle operations (issue #3269) —
     * keys deliberately have no entity subscriber (private material must stay
     * off the realtime/audit bus), so the security-relevant mutations are
     * recorded explicitly. The payload never carries key material.
     */
    protected async recordEvent(
        name: `${EventName}`,
        entity: Key,
        actor: ActorContext,
        data: Record<string, any> = {},
    ): Promise<void> {
        const requestContext = this.requestContext ?
            this.requestContext() :
            undefined;

        await this.eventService?.record({
            scope: EventScope.ENTITY,
            name,
            refType: EntityType.KEY,
            refId: entity.id,
            realmId: entity.realmId ?? null,
            actorType: actor.identity?.type ?? null,
            actorId: actor.identity?.data.id ?? null,
            actorName: actor.identity?.data.name ?? null,
            requestPath: requestContext?.requestPath ?? null,
            requestMethod: requestContext?.requestMethod ?? null,
            requestIpAddress: requestContext?.requestIpAddress ?? null,
            requestUserAgent: requestContext?.requestUserAgent ?? null,
            data: {
                name: entity.name,
                use: entity.use,
                status: entity.status,
                ...data,
            },
        });
    }

    protected pickAuditFields(entity: Key): Record<string, any> {
        return {
            name: entity.name,
            priority: entity.priority,
            status: entity.status,
        };
    }

    protected async generateMaterial(
        validated: Partial<Key>,
        use: `${JWKUse}`,
    ) : Promise<{
        type: `${JWKType}`,
        signatureAlgorithm: `${JWTAlgorithm}` | null,
        decryptionKey: string,
        encryptionKey: string | null,
    }> {
        if (use === JWKUse.ENCRYPTION) {
            if (validated.signatureAlgorithm) {
                throw new ValidationError('An encryption key can not carry a signature algorithm.');
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

        const algorithm = validated.signatureAlgorithm ?? JWTAlgorithm.RS256;
        const options = this.buildAsymmetricOptions(algorithm);

        const keyPair = await createAsymmetricKeyPair(options);

        return {
            type: algorithm.startsWith('ES') ? JWKType.EC : JWKType.RSA,
            signatureAlgorithm: algorithm,
            decryptionKey: await new AsymmetricKey(keyPair.privateKey).toBase64(),
            encryptionKey: await new AsymmetricKey(keyPair.publicKey).toBase64(),
        };
    }

    protected async importMaterial(
        validated: Partial<Key>,
        use: `${JWKUse}`,
    ) : Promise<{
        type: `${JWKType}`,
        signatureAlgorithm: `${JWTAlgorithm}` | null,
        decryptionKey: string,
        encryptionKey: string | null,
    }> {
        if (!validated.decryptionKey) {
            throw new ValidationError('Importing key material requires its private part (decryptionKey).');
        }

        // Reject material masquerading as an at-rest KEK-wrapped blob — it
        // would be treated as wrapped on the next read (and, with a KEK,
        // fail GCM authentication).
        if (isWrappedKeyMaterial(validated.decryptionKey.trim())) {
            throw new ValidationError('The imported key material is not valid.');
        }

        const decryptionKey = this.normalizeMaterial(validated.decryptionKey);

        if (use === JWKUse.ENCRYPTION) {
            if (validated.signatureAlgorithm) {
                throw new ValidationError('An encryption key can not carry a signature algorithm.');
            }

            if (validated.encryptionKey) {
                throw new ValidationError('An encryption key holds no public part.');
            }

            let byteLength : number;
            try {
                byteLength = base64ToArrayBuffer(decryptionKey).byteLength;
            } catch {
                throw new ValidationError('The key material is not valid base64.');
            }

            if (byteLength !== 32) {
                throw new ValidationError('The key material must be 32 base64-encoded bytes.');
            }

            return {
                type: JWKType.OCT,
                signatureAlgorithm: null,
                decryptionKey,
                encryptionKey: null,
            };
        }

        if (!validated.encryptionKey) {
            throw new ValidationError('Importing a signature key requires its public part (encryptionKey, SPKI).');
        }

        const encryptionKey = this.normalizeMaterial(validated.encryptionKey);
        const algorithm = validated.signatureAlgorithm ?? JWTAlgorithm.RS256;
        const options = this.buildAsymmetricOptions(algorithm);

        let privateJwk : JsonWebKey;
        let publicJwk : JsonWebKey;

        try {
            const privateKey = await AsymmetricKey.fromBase64({
                format: 'pkcs8',
                key: decryptionKey,
                options,
            });
            const publicKey = await AsymmetricKey.fromBase64({
                format: 'spki',
                key: encryptionKey,
                options,
            });

            privateJwk = await privateKey.toJWK();
            publicJwk = await publicKey.toJWK();
        } catch {
            throw new ValidationError(`The key material could not be imported for ${algorithm}.`);
        }

        // the public components (RSA: n/e, EC: crv/x/y) must agree — a
        // private key paired with a foreign public part would publish a
        // wrong JWKS entry and break verification of every token it signs.
        const components : (keyof JsonWebKey)[] = ['kty', 'n', 'e', 'crv', 'x', 'y'];
        const mismatch = components.some(
            (component) => publicJwk[component] !== undefined &&
                publicJwk[component] !== privateJwk[component],
        );
        if (mismatch) {
            throw new ValidationError('The private and public key material do not form a pair.');
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
            throw new ValidationError(`The signature algorithm ${algorithm} is not supported for stored keys.`);
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
