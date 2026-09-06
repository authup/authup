/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path from 'node:path';
import { EntityType } from '@authup/core-kit';
import type { Parameter, SchemaDescription } from '@rapiq/core';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import {
    RECORD_QUERY_PARAMETERS,
    computeSchemaRegistryHash,
    describeSchemaRegistry,
    schemaRegistry,
} from '../../../src/core/index.ts';
import { DIST_PATH } from '../../../src/path.ts';
import { createTestApplication } from '../../app';

const DOCUMENT_PATH = path.join(DIST_PATH, 'swagger.json');

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/**
 * The keys a description carries whatever parameters it was narrowed to.
 * Every other key is one block per parameter, named after it, which is what
 * lets a record description be read off the full one.
 */
const DESCRIPTION_CONSTANT_KEYS = ['name', 'strict', 'indexes'];

/**
 * A rapiq parameter and the query key(s) that carry it. Three of the five are
 * named differently on the wire than in the description, so the expectation
 * below cannot be derived from the parameter names alone.
 */
const PARAMETER_QUERY_KEYS : Record<string, string[]> = {
    filters: ['filter'],
    fields: ['fields'],
    sorts: ['sort'],
    relations: ['include'],
    pagination: ['page[limit]', 'page[offset]'],
};

type QuerySchemaMarker = {
    schema: string,
    parameters?: `${Parameter}`[],
};

type OpenAPIParameter = {
    name: string,
    in: string,
};

type OpenAPIOperation = {
    parameters?: OpenAPIParameter[],
    'x-query-schema'?: QuerySchemaMarker,
};

type OpenAPIDocument = {
    paths?: Record<string, Record<string, OpenAPIOperation>>,
    'x-authup-schemas'?: Record<string, SchemaDescription>,
    'x-authup-schema-hash'?: string,
};

function readDocument() : OpenAPIDocument | undefined {
    try {
        return JSON.parse(fs.readFileSync(DOCUMENT_PATH, 'utf-8'));
    } catch {
        return undefined;
    }
}

const document = readDocument();

if (!document) {
    // Written to the stream rather than through `console`, which this runner
    // swallows whole: a skip nobody can see is the same as no message at all.
    process.stderr.write(`[openapi] ${DOCUMENT_PATH} is absent, so the half of this spec that reads it is skipped. Build it with "npm run build --workspace=apps/server-core".\n`);
}

function requireDocument() : OpenAPIDocument {
    if (!document) {
        throw new Error(`${DOCUMENT_PATH} is absent.`);
    }

    return document;
}

/**
 * Both the document and a response are JSON, so the runtime value is compared
 * as what it serializes to rather than as the frozen object it is.
 */
function serialize<T>(input: T) : T {
    return JSON.parse(JSON.stringify(input));
}

function operations(input: OpenAPIDocument) {
    const output : {
        template: string, 
        method: string, 
        operation: OpenAPIOperation 
    }[] = [];

    for (const [template, item] of Object.entries(input.paths ?? {})) {
        for (const method of HTTP_METHODS) {
            const operation = item[method];

            if (operation) {
                output.push({
                    template, 
                    method, 
                    operation, 
                });
            }
        }
    }

    return output;
}

function pathVariables(template: string) : string[] {
    return template.matchAll(/\{([^}]+)\}/g)
        .map((match) => match[1])
        .toArray();
}

function parameterNames(operation: OpenAPIOperation | undefined, location: string) : string[] {
    return (operation?.parameters ?? [])
        .filter((entry) => entry.in === location)
        .map((entry) => entry.name);
}

function projectDescription(
    description: SchemaDescription,
    parameters: `${Parameter}`[],
) : Record<string, unknown> {
    const keys = new Set<string>([...DESCRIPTION_CONSTANT_KEYS, ...parameters]);

    return Object.fromEntries(
        Object.entries(description).filter(([key]) => keys.has(key)),
    );
}

/**
 * The query keys an operation has to advertise, derived from the vocabulary
 * its own schema declares: a record read declares its subset and gets nothing
 * else, and a parameter the schema never declared is documented for nobody.
 * `include` is withheld from a schema allowing no relation at all, since that
 * would be an input with no legal value.
 */
function expectedQueryKeys(description: SchemaDescription, marker: QuerySchemaMarker) : string[] {
    const selected = new Set<string>(marker.parameters ?? Object.keys(PARAMETER_QUERY_KEYS));
    const output : string[] = [];

    for (const [parameter, keys] of Object.entries(PARAMETER_QUERY_KEYS)) {
        if (!selected.has(parameter)) {
            continue;
        }

        const block = (description as Record<string, any>)[parameter];

        if (!block || (parameter === 'relations' && (block.allowed ?? []).length === 0)) {
            continue;
        }

        output.push(...keys);
    }

    return output;
}

/**
 * The OpenAPI document, the decode allow-lists and the `meta.schema` wire key
 * are three projections of ONE registry, and that is the claim this file makes
 * falsifiable: it reads the built document, asks a running server the same
 * questions, and requires the answers to be byte-identical.
 *
 * The two halves fail for different reasons and are separated for that. The
 * registry-and-wire half needs no build and always runs. The document half is
 * skipped when `dist/swagger.json` was not generated, because a checkout that
 * has not run the swagger build step is an ordinary state (`build:server:js`
 * wipes `dist/`) and not a regression.
 */
describe('openapi document parity', () => {
    const suite = createTestApplication();

    let collectionSchema : SchemaDescription | undefined;
    let recordSchema : SchemaDescription | undefined;

    beforeAll(async () => {
        await suite.setup();

        const collection = await suite.client.role.getMany();
        collectionSchema = collection.meta.schema;

        const record = await suite.client.role.getOne(collection.data[0].id);
        recordSchema = record.meta.schema;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    describe('registry and wire', () => {
        // The description is resolved out of the REGISTRY by name here, never
        // taken from the schema object the controller happens to import: that
        // the two are one schema is the claim. Its build-time half (the marker
        // against the describe call) is asserted by the enrichment script.
        it('should answer a collection read with the registry description', () => {
            expect(collectionSchema).toStrictEqual(serialize(describeSchemaRegistry()[EntityType.ROLE]));
        });

        it('should answer a record read with the registry description narrowed to the record parameters', () => {
            expect(recordSchema).toStrictEqual(serialize(projectDescription(
                describeSchemaRegistry()[EntityType.ROLE],
                RECORD_QUERY_PARAMETERS,
            )));
        });
    });

    describe.skipIf(!document)('document and registry', () => {
        it('should carry the fingerprint of the query vocabulary it was generated for', () => {
            expect(requireDocument()['x-authup-schema-hash']).toEqual(computeSchemaRegistryHash());
        });

        // The registry rather than `describeSchemaRegistry()`, which is what
        // the generate itself projects: routing the completeness claim through
        // the projection under test would let a schema the projection drops
        // stay missing from the document unreported.
        it('should describe every registered schema', () => {
            const registered = schemaRegistry.getAll()
                .map((schema) => schema.name)
                .filter((name) : name is string => typeof name === 'string');

            const documented = requireDocument()['x-authup-schemas'] ?? {};

            expect(Object.keys(documented).sort()).toEqual([...registered].sort());
        });

        it('should describe each of them exactly as the registry does', () => {
            expect(requireDocument()['x-authup-schemas']).toStrictEqual(serialize(describeSchemaRegistry()));
        });
    });

    describe.skipIf(!document)('document and wire', () => {
        // The headline: what a client reads out of the document and what the
        // server answers with are the same bytes, `indexes` included.
        it('should describe the collection read exactly as that read answers', () => {
            const documented = requireDocument()['x-authup-schemas'] ?? {};

            expect(documented[EntityType.ROLE]).toStrictEqual(collectionSchema);
        });

        it('should describe the record read exactly as that read answers', () => {
            const target = requireDocument();
            const operation = target.paths?.['/roles/{id}']?.get;
            const marker = operation?.['x-query-schema'];

            if (!marker || !marker.parameters) {
                throw new Error('GET /roles/{id} carries no record query-schema marker.');
            }

            expect(marker.schema).toEqual(EntityType.ROLE);
            expect(marker.parameters).toEqual(RECORD_QUERY_PARAMETERS);

            // A record read is documented by pointing at the full description
            // and naming the parameters it decodes, so the document carries no
            // second, narrowed copy of it. The projection is the contract.
            const documented = (target['x-authup-schemas'] ?? {})[marker.schema];

            expect(projectDescription(documented, marker.parameters)).toStrictEqual(recordSchema);
        });
    });

    describe.skipIf(!document)('document parameters', () => {
        // Every generic query parameter is APPENDED to what trapi emitted. An
        // earlier draft assigned `operation.parameters` instead, which would
        // have deleted the path variables of every templated route in one go.
        it('should declare every path variable of every operation', () => {
            const failures : string[] = [];

            for (const {
                template, 
                method, 
                operation, 
            } of operations(requireDocument())) {
                const declared = new Set(parameterNames(operation, 'path'));

                for (const variable of pathVariables(template)) {
                    if (!declared.has(variable)) {
                        failures.push(`${method.toUpperCase()} ${template}: {${variable}} is undeclared.`);
                    }
                }
            }

            expect(failures).toEqual([]);
        });

        it('should document the query vocabulary of every marked operation', () => {
            const target = requireDocument();
            const described = target['x-authup-schemas'] ?? {};
            const failures : string[] = [];

            let marked = 0;

            for (const {
                template, 
                method, 
                operation, 
            } of operations(target)) {
                const marker = operation['x-query-schema'];

                if (!marker) {
                    continue;
                }

                marked++;

                const description = described[marker.schema];

                if (!description) {
                    failures.push(`${method.toUpperCase()} ${template}: marked '${marker.schema}', which the document does not describe.`);
                    continue;
                }

                const declared = new Set(parameterNames(operation, 'query'));

                for (const key of expectedQueryKeys(description, marker)) {
                    if (!declared.has(key)) {
                        failures.push(`${method.toUpperCase()} ${template}: no '${key}' parameter.`);
                    }
                }
            }

            expect(failures).toEqual([]);
            expect(marked).toBeGreaterThan(0);
        });

        it('should keep the path parameter of a dual-mounted collection read', () => {
            const operation = requireDocument().paths?.['/realms/{realmId}/users']?.get;

            expect(operation).toBeDefined();
            expect(parameterNames(operation, 'path')).toEqual(['realmId']);
            expect(parameterNames(operation, 'query')).toEqual([
                'filter',
                'fields',
                'sort',
                'include',
                'page[limit]',
                'page[offset]',
            ]);
        });

        it('should keep both path parameters of a dual-mounted record read', () => {
            const operation = requireDocument().paths?.['/realms/{realmId}/users/{id}']?.get;

            expect(operation).toBeDefined();
            expect(parameterNames(operation, 'path')).toEqual(['realmId', 'id']);

            // A record read decodes neither a filter, a sort nor a page, so it
            // advertises none of the three.
            expect(parameterNames(operation, 'query')).toEqual(['fields', 'include']);
        });
    });
});
