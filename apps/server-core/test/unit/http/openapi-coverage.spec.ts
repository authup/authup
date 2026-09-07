/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACKAGE_PATH } from '../../../src/path.ts';

const CONTROLLERS_PATH = path.join(PACKAGE_PATH, 'src', 'adapters', 'http', 'controllers');
const ENTITIES_PATH = path.join(PACKAGE_PATH, 'src', 'core', 'entities');
const DOCUMENT_PATH = path.join(PACKAGE_PATH, 'dist', 'swagger.json');

const SCHEMA_MAP_KEY = 'x-authup-schemas';
const MARKER_KEY = 'x-query-schema';

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/**
 * Marked reads that carry no `describeQuerySchema` call of their own, and so
 * cannot be cross-checked against one. The expanded policy read answers
 * through `getOne`, `/userinfo` answers a flat user whose vocabulary
 * `UserService.getOne` decodes, and the two bulk revokes answer a count
 * rather than rows, so they have no `meta` to describe into even though they
 * decode a filter. An entry that stops being needed fails, the way an unused
 * `SCHEMA_FIELD_EXCLUSIONS` entry does.
 */
const MARKERS_WITHOUT_DESCRIBE = [
    'src/adapters/http/controllers/entities/policy/module.ts::POLICY',
    'src/adapters/http/controllers/workflows/userinfo/module.ts::USER',
    'src/adapters/http/controllers/entities/session/module.ts::SESSION',
    'src/adapters/http/controllers/entities/session-token/module.ts::SESSION_TOKEN',
];

/**
 * Registered schemas that legitimately serve no collection read. Empty is the
 * strongest state it can be in: every registered schema is reachable from the
 * document.
 */
const COLLECTION_COVERAGE_EXCLUSIONS : string[] = [];

type OpenAPIDocument = {
    paths?: Record<string, Record<string, any>>,
    [key: string]: any,
};

function walk(directory: string) : string[] {
    const output : string[] = [];

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            output.push(...walk(target));
        } else if (entry.name.endsWith('.ts')) {
            output.push(target);
        }
    }

    return output;
}

/**
 * Every schema identifier a controller can pass to `describeQuerySchema`,
 * mapped onto the `EntityType` member its own declaration names. Both halves
 * live in one file per entity, so the mapping is read rather than derived
 * from a naming convention: nothing here assumes `roleSchema` describes
 * `EntityType.ROLE`.
 */
function readSchemaIdentifiers() : Map<string, string> {
    const output = new Map<string, string>();

    for (const file of walk(ENTITIES_PATH)) {
        if (path.basename(file) !== 'schema.ts') {
            continue;
        }

        const source = fs.readFileSync(file, 'utf8');
        const identifier = source.match(/export const (\w+)\s*=\s*defineSchema/);
        const member = source.match(/\bname:\s*EntityType\.(\w+)/);

        if (identifier && member) {
            output.set(identifier[1], member[1]);
        }
    }

    return output;
}

function readDocument() : OpenAPIDocument | undefined {
    try {
        return JSON.parse(fs.readFileSync(DOCUMENT_PATH, 'utf-8'));
    } catch {
        return undefined;
    }
}

function operations(input: OpenAPIDocument) {
    const output : {
        template: string, 
        method: string, 
        operation: any 
    }[] = [];

    for (const [template, item] of Object.entries(input.paths ?? {})) {
        for (const method of HTTP_METHODS) {
            if (item[method]) {
                output.push({
                    template,
                    method,
                    operation: item[method],
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

const document = readDocument();

/**
 * The marker, the `meta.schema` a route answers with, and the emitted document
 * are three statements about one route. These are the checks that keep them
 * equal, and they live here rather than in the build because they assert an
 * invariant rather than produce anything.
 *
 * The source half needs no build and always runs. The document half is skipped
 * when `dist/swagger.json` was not generated, since `build:server:js` wipes
 * `dist/` and a checkout in that state is ordinary rather than broken.
 */
describe('openapi query surface coverage', () => {
    describe('marker and source', () => {
        it('should mark every method that describes a query schema, and describe every marked one', () => {
            const identifiers = readSchemaIdentifiers();
            const excused = new Set(MARKERS_WITHOUT_DESCRIBE);
            const failures : string[] = [];

            for (const file of walk(CONTROLLERS_PATH)) {
                const source = fs.readFileSync(file, 'utf8');
                const name = path.relative(PACKAGE_PATH, file);

                const blocks : {
                    member: string, 
                    start: number, 
                    end: number, 
                    described: boolean 
                }[] = [];
                const markers = /^ {4}@DQuerySchema\(EntityType\.(\w+),\s*'(collection|record|filters)'\)$/gm;

                let marker = markers.exec(source);
                while (marker !== null) {
                    // A method body ends at the first closing brace back at
                    // member indentation; anything nested is indented deeper.
                    const offset = source.slice(marker.index).search(/^ {4}\}$/m);

                    if (offset === -1) {
                        failures.push(`${name}: @DQuerySchema(EntityType.${marker[1]}) is not attached to a method.`);
                    } else {
                        blocks.push({
                            member: marker[1],
                            start: marker.index,
                            end: marker.index + offset,
                            described: false,
                        });
                    }

                    marker = markers.exec(source);
                }

                const calls = /describeQuerySchema\(\s*(\w+)\s*(?:,\s*(\w+)\s*)?\)/g;

                let call = calls.exec(source);
                while (call !== null) {
                    const block = blocks.find((entry) => call!.index >= entry.start && call!.index < entry.end);
                    const member = identifiers.get(call[1]);

                    if (block) {
                        block.described = true;
                    }

                    if (!block) {
                        failures.push(`${name}: describeQuerySchema(${call[1]}) sits in a method carrying no @DQuerySchema marker.`);
                    } else if (!member) {
                        failures.push(`${name}: describeQuerySchema(${call[1]}) names no declared entity schema.`);
                    } else if (member !== block.member) {
                        failures.push(`${name}: marked EntityType.${block.member} but describes ${call[1]} (EntityType.${member}).`);
                    }

                    call = calls.exec(source);
                }

                for (const block of blocks) {
                    if (block.described) {
                        continue;
                    }

                    const key = `${name}::${block.member}`;

                    if (excused.has(key)) {
                        excused.delete(key);
                        continue;
                    }

                    failures.push(`${name}: @DQuerySchema(EntityType.${block.member}) describes nothing. Either the method lost its describeQuerySchema call, or the call is written in a form this check does not match; record it in MARKERS_WITHOUT_DESCRIBE only if it legitimately delegates.`);
                }
            }

            for (const key of excused) {
                failures.push(`MARKERS_WITHOUT_DESCRIBE holds '${key}', which now describes a schema of its own or no longer carries a marker; drop the entry.`);
            }

            expect(failures).toEqual([]);
        });
    });

    describe.skipIf(!document)('marker and document', () => {
        it('should resolve every marker against the described registry', () => {
            const described = document![SCHEMA_MAP_KEY];
            const failures : string[] = [];

            expect(described).toBeDefined();

            for (const {
                template,
                method,
                operation,
            } of operations(document!)) {
                const marked = operation[MARKER_KEY];

                if (marked && !described[marked.schema]) {
                    failures.push(`${method.toUpperCase()} ${template}: marked as '${marked.schema}', which ${SCHEMA_MAP_KEY} does not describe.`);
                }
            }

            expect(failures).toEqual([]);
        });

        it('should reach every described schema from a marked collection read', () => {
            const described = document![SCHEMA_MAP_KEY];
            const excluded = new Set(COLLECTION_COVERAGE_EXCLUSIONS);
            const collections = new Set<string>();
            const failures : string[] = [];

            for (const { operation } of operations(document!)) {
                const marked = operation[MARKER_KEY];

                // A collection marker carries no parameter subset: it is the
                // read that decodes the schema's whole vocabulary.
                if (marked && !marked.parameters) {
                    collections.add(marked.schema);
                }
            }

            for (const name of Object.keys(described)) {
                if (!collections.has(name) && !excluded.has(name)) {
                    failures.push(`Schema '${name}' is registered but no collection read is marked with it; mark the route, or record why not in COLLECTION_COVERAGE_EXCLUSIONS.`);
                }
            }

            for (const name of excluded) {
                if (collections.has(name) || !described[name]) {
                    failures.push(`COLLECTION_COVERAGE_EXCLUSIONS holds '${name}', which needs no exclusion any more; drop the entry.`);
                }
            }

            expect(failures).toEqual([]);
        });

        it('should declare every path variable of every operation', () => {
            const failures : string[] = [];

            for (const {
                template,
                method,
                operation,
            } of operations(document!)) {
                const declared = new Set(
                    (operation.parameters ?? [])
                        .filter((entry: any) => entry.in === 'path')
                        .map((entry: any) => entry.name),
                );

                for (const name of pathVariables(template)) {
                    if (!declared.has(name)) {
                        failures.push(`${method.toUpperCase()} ${template}: path variable '${name}' is undeclared.`);
                    }
                }
            }

            expect(failures).toEqual([]);
        });
    });
});
