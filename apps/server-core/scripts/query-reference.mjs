/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 *
 * Prints the per-entity query reference page of the documentation site to
 * stdout, so the published tables cannot lag behind the schema registry.
 *
 * It reads the emitted OpenAPI document rather than the registry, because
 * only the document carries both halves the page needs: `x-authup-schemas`
 * is the byte-identical projection of `describeSchemaRegistry()` that the
 * `/schemas` endpoint and every `meta.schema` also serve, and the
 * per-operation `x-query-schema` markers are the only place that says WHICH
 * routes a given schema governs. Deriving the route list from a naming
 * convention instead would go stale the first time a controller is mounted
 * somewhere unexpected - `/userinfo` is already one.
 *
 * The prose half of the reference is committed at
 * `docs/src/guide/development/api-query-language.md`; only the tables are
 * generated, so what a reviewer reads is what a reader gets.
 *
 * Redirected into the site by `.github/workflows/docs.yml`, the way
 * `authup config schema` is:
 *
 *   npm run build -w apps/server-core
 *   node apps/server-core/scripts/query-reference.mjs \
 *       > docs/src/guide/development/api-query-reference.md
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const PACKAGE_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCUMENT_PATH = path.join(PACKAGE_PATH, 'dist', 'swagger.json');
const MANIFEST_PATH = path.join(PACKAGE_PATH, 'package.json');

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

const SCHEMA_MAP_KEY = 'x-authup-schemas';
const MARKER_KEY = 'x-query-schema';

function code(input) {
    return `\`${input}\``;
}

function codes(input) {
    return input.map(code).join(', ');
}

/**
 * A schema name is the section anchor, and vitepress derives an anchor by
 * lowercasing the heading. So `identityProviderAccount` is reachable at
 * `#identityprovideraccount` and a cased link silently resolves to nothing.
 */
function anchor(name) {
    return `[${code(name)}](#${name.toLowerCase()})`;
}

function readDocument() {
    if (!fs.existsSync(DOCUMENT_PATH)) {
        console.error(`[query-reference] ${path.relative(PACKAGE_PATH, DOCUMENT_PATH)} is missing; run \`npm run build -w apps/server-core\` first.`);
        process.exit(1);
    }

    const document = JSON.parse(fs.readFileSync(DOCUMENT_PATH, 'utf8'));

    if (!document[SCHEMA_MAP_KEY]) {
        console.error(`[query-reference] the document carries no \`${SCHEMA_MAP_KEY}\`; it was generated before the query projection existed.`);
        process.exit(1);
    }

    return document;
}

/**
 * Which routes each schema governs, split by read shape, in document order.
 * A schema with no marked route is not an error here: the coverage check
 * that would call it one runs in `openapi-query-schemas.mjs`, before this
 * page is ever generated.
 */
function readRoutes(document) {
    const output = new Map();

    for (const [template, item] of Object.entries(document.paths ?? {})) {
        for (const method of HTTP_METHODS) {
            const marker = item[method]?.[MARKER_KEY];
            if (!marker) {
                continue;
            }

            if (!output.has(marker.schema)) {
                output.set(marker.schema, { collection: [], record: [] });
            }

            const route = `${method.toUpperCase()} ${template}`;
            output.get(marker.schema)[marker.parameters ? 'record' : 'collection'].push(route);
        }
    }

    return output;
}

/**
 * `default` and `allowed` are disjoint halves of one allow-list, not a
 * subset and its superset: `default` is the projection a request naming no
 * field receives, `allowed` the columns it has to ask for by name
 * (`client.secret`, `key.certificate`, `user.email`). What a caller may
 * select is therefore the union.
 *
 * Same derivation as `buildFieldsParameter` in `openapi-query-schemas.mjs`,
 * which states the same rule in the OpenAPI parameter description. Both
 * read the same description, so the two cannot disagree about the SET; if
 * the wording of the two ever does, this page is the one a human reads.
 */
function readFields(description) {
    const fields = description.fields ?? {};
    const projection = fields.default ?? [];
    const optional = (fields.allowed ?? []).filter((name) => !projection.includes(name));

    return {
        selectable: [...projection, ...optional],
        projection,
        optional,
    };
}

function buildParameterTable(description) {
    const rows = [];

    const {
        selectable, 
        projection, 
        optional, 
    } = readFields(description);
    if (selectable.length > 0) {
        rows.push(['`fields`', codes(selectable)]);
    }

    const filters = description.filters?.allowed;
    if (filters) {
        rows.push(['`filter`', filters.length > 0 ? codes(filters) : 'none']);
    }

    const sorts = description.sorts?.allowed;
    if (sorts) {
        rows.push(['`sort`', sorts.length > 0 ? codes(sorts) : 'none']);
    }

    const { relations } = description;
    if (relations) {
        const targets = relations.schemas ?? {};
        const rendered = (relations.allowed ?? []).map((name) => {
            const target = targets[name];

            return target && target !== name ? `${code(name)} (${anchor(target)})` : code(name);
        });

        rows.push(['`include`', rendered.length > 0 ? rendered.join(', ') : 'none']);
    }

    const maxLimit = description.pagination?.maxLimit;
    if (maxLimit) {
        rows.push(['`page[limit]`', `at most ${code(maxLimit)}`]);
    }

    const table = [
        '| Parameter | Accepted keys |',
        '| --- | --- |',
        ...rows.map(([parameter, value]) => `| ${parameter} | ${value} |`),
    ];

    const notes = [];

    if (optional.length > 0 && projection.length > 0) {
        notes.push(`Without \`fields\`, every column above is returned except ${codes(optional)}, which has to be asked for by name.`);
    } else if (selectable.length > 0) {
        notes.push('Without `fields`, every column above is returned.');
    }

    return [...table, ...(notes.length > 0 ? ['', ...notes] : [])];
}

/**
 * The index column sequences a filter or a sort has to anchor on. Kept
 * verbatim from the description, which is what the wire and the OpenAPI
 * document carry too: it is the only thing in the reference that explains
 * why a legal multi-key sort came back unordered.
 */
function buildIndexes(description) {
    const indexes = description.indexes ?? [];

    if (indexes.length === 0) {
        return [];
    }

    // Each sequence is ONE code span rather than one per column, so a
    // composite index reads as the unit it is: `name, realmId` is a single
    // prefix, not two.
    return ['', `Index prefixes: ${indexes.map((columns) => code(columns.join(', '))).join(' &middot; ')}`];
}

function buildSection(name, description, routes) {
    const lines = [`## ${name}`, ''];

    if (routes) {
        if (routes.collection.length > 0) {
            lines.push(`Collection: ${codes(routes.collection)}`, '');
        }

        if (routes.record.length > 0) {
            lines.push(`Record: ${codes(routes.record)}`, '');
        }
    }

    lines.push(
        ...buildParameterTable(description),
        ...buildIndexes(description),
        '',
    );

    return lines;
}

const document = readDocument();
const described = document[SCHEMA_MAP_KEY];
const routes = readRoutes(document);

// The document's own `info.version` is trapi's `1.0.0` default and says
// nothing about the release. `GET /schemas` reports `meta.version` from this
// same manifest, so a reader comparing the page against a deployment is
// comparing two readings of one value.
const { version } = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const hash = document['x-authup-schema-hash'];

const output = [
    '---',
    'outline: [2, 2]',
    '---',
    '',
    '<!--',
    '    GENERATED FILE - do not edit and do not commit it.',
    '',
    '    Written by `apps/server-core/scripts/query-reference.mjs` from the OpenAPI',
    '    document, which projects the schema registry verbatim. Edit an entity',
    '    schema under `apps/server-core/src/core/entities/*/schema.ts` to change what',
    '    it says, or `api-query-language.md` to change the prose that explains it.',
    '-->',
    '',
    '# Query Reference',
    '',
    'The queryable vocabulary of every entity, one section per schema. Read',
    '[Query Language](./api-query-language) first: it defines the parameters, the',
    'operators and the rules under which a key here is honoured or silently dropped.',
    '',
    `Generated from release \`${version}\`, registry fingerprint \`${hash}\`.`,
    '`GET /schemas` reports both values back under `meta`, so a deployment that has',
    'drifted from this page can be recognised without diffing anything.',
    '',
    'Every list below is the **static upper bound**. A caller is additionally subject',
    'to its own permissions: a relation it may not read is stripped from the include,',
    'and a gated column is redacted, both without an error.',
    '',
];

for (const [name, description] of Object.entries(described)) {
    output.push(...buildSection(name, description, routes.get(name)));
}

process.stdout.write(`${output.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`);
