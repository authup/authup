/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    SchemaCollectionResponse,
    SchemaRecordResponse,
    SchemaResponseMeta,
} from '@authup/core-http-kit';
import { NotFoundError } from '@ebec/http';
import {
    DContext,
    DController,
    DGet,
    DPath,
    DTags,
} from '@routup/decorators';
import { read } from 'locter';
import path from 'node:path';
import type { IAppEvent } from 'routup';
import { HeaderName } from 'routup';
import {
    RECORD_QUERY_PARAMETERS,
    computeSchemaRegistryHash,
    describeQuerySchemaByName,
    describeQuerySchemas,
} from '../../../../../core/index.ts';
import { PACKAGE_PATH } from '../../../../../path.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import type { SchemaControllerContext, SchemaControllerOptions } from './types.ts';

/**
 * Query-schema discovery: the queryable vocabulary of every registered
 * entity, served whole rather than probed one endpoint at a time.
 *
 * Mounted flat and never under `/realms/:realmId` — a schema is
 * realm-independent policy, so a realm-scoped copy would advertise the same
 * document under a path that implies it varies. Never under `.well-known`
 * either (RFC 8615; authup's `.well-known` is the realm-scoped OIDC
 * surface), and never as a per-entity `/roles/schema`, which is a valid
 * `GET /roles/:id` lookup today and would shadow a role actually named
 * `schema`.
 *
 * Authenticated but ungated: the descriptions are the static upper bound of
 * what may be ASKED, and every answer stays subject to the caller's own
 * permissions. A caller who may read nothing learns only which questions
 * exist. That is still a compact recon artifact, which is what
 * `querySchemaDiscoveryEnabled` closes.
 *
 * Note the disabled deployment answers 404 to an AUTHENTICATED caller and
 * 401 to an anonymous one, because the login gate is route-scoped
 * middleware and runs first. The difference discloses nothing: whether this
 * path is routed is a property of the software, published in its OpenAPI
 * document, not of the deployment.
 */
@DTags('schema')
@DController('/schemas')
export class SchemaController {
    protected options: SchemaControllerOptions;

    // Constant for the process lifetime, like StatusController's — read
    // package.json once instead of on every discovery request.
    protected versionPromise: Promise<string> | undefined;

    constructor(ctx: SchemaControllerContext) {
        this.options = ctx.options;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<SchemaCollectionResponse> {
        this.assertEnabled();

        const data = describeQuerySchemas();
        const meta = await this.buildMeta();

        this.applyHeaders(event);

        return { data, meta: { ...meta, total: data.length } };
    }

    @DGet('/:name', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('name') name: string,
        @DContext() event: IAppEvent,
    ): Promise<SchemaRecordResponse> {
        this.assertEnabled();

        const data = describeQuerySchemaByName(name);
        if (!data) {
            throw new NotFoundError();
        }

        const meta = await this.buildMeta();

        this.applyHeaders(event);

        return { data, meta };
    }

    /**
     * Disabled means the routes are not served at all, in the GraphQL
     * disable-introspection posture.
     */
    protected assertEnabled(): void {
        if (!this.options.enabled) {
            throw new NotFoundError();
        }
    }

    /**
     * `no-cache` rather than `no-store`: the body is a pure function of the
     * registry, so revalidating is cheap and worth doing, but it is served
     * to an authenticated caller and must not settle in a shared cache.
     *
     * No ETag is set here. routup derives a content ETag for every JSON
     * response and answers `If-None-Match` itself, and it overwrites
     * whatever the handler set — so a hand-rolled one would never reach a
     * client. The registry fingerprint a caller actually wants to compare
     * rides in `meta.hash`, where nothing can overwrite it.
     */
    protected applyHeaders(event: IAppEvent): void {
        event.response.headers.set(HeaderName.CACHE_CONTROL, 'private, no-cache');
    }

    protected async buildMeta(): Promise<SchemaResponseMeta> {
        return {
            version: await this.resolveVersion(),
            hash: computeSchemaRegistryHash(),
            recordParameters: RECORD_QUERY_PARAMETERS,
        };
    }

    protected resolveVersion(): Promise<string> {
        if (!this.versionPromise) {
            this.versionPromise = read(path.join(PACKAGE_PATH, 'package.json'))
                .then((pkgJson: { version: string }) => pkgJson.version);
        }

        return this.versionPromise;
    }
}
