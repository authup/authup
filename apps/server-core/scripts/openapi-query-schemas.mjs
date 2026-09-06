/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 *
 * Documents the rapiq query vocabulary on the operations that decode one,
 * and refuses to let a build through when the surface the document advertises
 * and the one the code serves have drifted apart.
 *
 * It reads the emitted document rather than the schema registry: every fact
 * it needs is already in there, as the per-operation `x-query-schema` marker
 * the trapi handler stamps and the `x-authup-schemas` map the config emits at
 * the root. So the enrichment has no runtime dependency of its own and cannot
 * describe a registry other than the one the document was generated from.
 * The only thing it reads from `src/` is the pair of declarations the
 * cross-check compares, which exist nowhere else.
 *
 * Chained after the generate:
 *
 *   trapi generate && node scripts/openapi-query-schemas.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const PACKAGE_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCUMENT_PATH = path.join(PACKAGE_PATH, 'dist', 'swagger.json');
const CONTROLLERS_PATH = path.join(PACKAGE_PATH, 'src', 'adapters', 'http', 'controllers');
const ENTITIES_PATH = path.join(PACKAGE_PATH, 'src', 'core', 'entities');

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

const SCHEMA_MAP_KEY = 'x-authup-schemas';
const MARKER_KEY = 'x-query-schema';
const ERROR_SCHEMA_NAME = 'ErrorResponse';

/**
 * Registered schemas that legitimately serve no collection read, and so may
 * stay unreachable from any operation. Every entry has to earn its place: an
 * entry whose schema DOES have a marked collection read fails the build, the
 * way an unused `SCHEMA_FIELD_EXCLUSIONS` entry does.
 *
 * Empty today, which is the strongest state it can be in: every registered
 * schema is reachable from the document.
 */
const COLLECTION_COVERAGE_EXCLUSIONS = [];

/**
 * What a path variable holds, where the answer is not the variable's own
 * name. These parameters are SYNTHESIZED (see `synthesizePathParameters`), so
 * there is no decorator to hang a description on and nothing else in the
 * document says that a realm is addressable by name as well as by id.
 */
const PATH_PARAMETER_DESCRIPTIONS = { realmId: 'The realm, addressed by id or by name.' };

const UPPER_BOUND_NOTE = 'This is the static upper bound: per-actor relation and column gates may narrow it silently on any given request.';

const RECORD_SHAPE_NOTE = 'Single-record reads are still converging on this vocabulary; one that does not decode it yet answers with its default projection.';

function operations(document) {
    const output = [];

    for (const [template, item] of Object.entries(document.paths ?? {})) {
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

function pathVariables(template) {
    return template.matchAll(/\{([^}]+)\}/g)
        .map((match) => match[1])
        .toArray();
}

function list(input) {
    return input.join(', ');
}

// --------------------------------------------------------------------------
// Coverage
// --------------------------------------------------------------------------

function walk(directory) {
    const output = [];

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
function readSchemaIdentifiers() {
    const output = new Map();

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

/**
 * The marker and the `meta.schema` the route actually answers with are two
 * independent statements about one route, written a dozen lines apart. This
 * is what keeps them equal.
 *
 * A marked method with NO describe call is fine and not reported: two of them
 * exist deliberately (`PolicyController.getOneExpanded` delegates to `getOne`,
 * and `GET /userinfo` answers a flat claims document). The reverse is not:
 * a describe call outside a marked method is a route that decodes a query and
 * documents none, which is the gap the marker exists to close.
 */
function assertMarkersMatchDescribeCalls(failures) {
    const identifiers = readSchemaIdentifiers();

    for (const file of walk(CONTROLLERS_PATH)) {
        const source = fs.readFileSync(file, 'utf8');
        const name = path.relative(PACKAGE_PATH, file);

        const blocks = [];
        const markers = /^ {4}@DQuerySchema\(EntityType\.(\w+),\s*'(collection|record)'\)$/gm;

        let marker = markers.exec(source);
        while (marker !== null) {
            // A method body ends at the first closing brace back at member
            // indentation; anything nested inside it is indented deeper.
            const offset = source.slice(marker.index).search(/^ {4}\}$/m);

            if (offset === -1) {
                failures.push(`${name}: @DQuerySchema(EntityType.${marker[1]}) is not attached to a method.`);
            } else {
                blocks.push({
                    member: marker[1],
                    shape: marker[2],
                    start: marker.index,
                    end: marker.index + offset,
                });
            }

            marker = markers.exec(source);
        }

        const calls = /describeQuerySchema\(\s*(\w+)\s*(?:,\s*(\w+)\s*)?\)/g;

        let call = calls.exec(source);
        while (call !== null) {
            const block = blocks.find((entry) => call.index >= entry.start && call.index < entry.end);
            const member = identifiers.get(call[1]);

            if (!block) {
                failures.push(`${name}: describeQuerySchema(${call[1]}) sits in a method carrying no @DQuerySchema marker.`);
            } else if (!member) {
                failures.push(`${name}: describeQuerySchema(${call[1]}) names no declared entity schema.`);
            } else if (member !== block.member) {
                failures.push(`${name}: marked EntityType.${block.member} but describes ${call[1]} (EntityType.${member}).`);
            }

            if (block && member === block.member) {
                const expected = block.shape === 'record' ? 'RECORD_QUERY_PARAMETERS' : undefined;

                if (call[2] !== expected) {
                    failures.push(`${name}: marked shape '${block.shape}' but describes with ${call[2] ? `\`${call[2]}\`` : 'the full vocabulary'}.`);
                }
            }

            call = calls.exec(source);
        }
    }
}

/**
 * The document's own halves: a marker points at a schema name, the root map
 * resolves it. Checked in both directions, because each miss is silent in a
 * different way. A dangling pointer documents a vocabulary nothing serves,
 * and an unreferenced schema is an endpoint whose query surface never made it
 * into the document at all.
 */
function assertDocumentCoverage(document, failures) {
    const described = document[SCHEMA_MAP_KEY];

    if (!described) {
        failures.push(`The document carries no \`${SCHEMA_MAP_KEY}\`; the generate emits it from \`swagger.data.extra\`.`);
        return;
    }

    const collections = new Set();

    for (const {
        template, 
        method, 
        operation, 
    } of operations(document)) {
        const marked = operation[MARKER_KEY];
        if (!marked) {
            continue;
        }

        if (!described[marked.schema]) {
            failures.push(`${method.toUpperCase()} ${template}: marked as '${marked.schema}', which \`${SCHEMA_MAP_KEY}\` does not describe.`);
            continue;
        }

        if (!marked.parameters) {
            collections.add(marked.schema);
        }
    }

    const excluded = new Set(COLLECTION_COVERAGE_EXCLUSIONS);

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
}

// --------------------------------------------------------------------------
// Enrichment
// --------------------------------------------------------------------------

function appendParameters(operation, parameters) {
    if (!Array.isArray(operation.parameters)) {
        operation.parameters = [];
    }

    let appended = 0;

    for (const parameter of parameters) {
        const present = operation.parameters.some((entry) => entry.name === parameter.name && entry.in === parameter.in);

        if (!present) {
            operation.parameters.push(parameter);
            appended++;
        }
    }

    return appended;
}

/**
 * OpenAPI requires every variable of a path template to be declared, and 61
 * operations declare none: the `/realms/{realmId}/…` mounts read the segment
 * through `getRequestRealmID(event)` rather than through a `@DPath`
 * parameter, so trapi's parameter walk never sees it. Undeclared, swagger-ui
 * renders no input for it and a generated client has no way to fill it.
 *
 * Synthesized from the path template rather than from a list of known names,
 * so a route that grows a variable the handler reads off the event is covered
 * the day it is added.
 */
function synthesizePathParameters(document) {
    let appended = 0;

    for (const { template, operation } of operations(document)) {
        const declared = new Set(
            (operation.parameters ?? [])
                .filter((entry) => entry.in === 'path')
                .map((entry) => entry.name),
        );

        const missing = pathVariables(template)
            .filter((name) => !declared.has(name))
            .map((name) => ({
                name,
                in: 'path',
                required: true,
                description: PATH_PARAMETER_DESCRIPTIONS[name] ?? '',
                schema: { type: 'string' },
            }));

        appended += appendParameters(operation, missing);

        // Path parameters read in template order; a synthesized one appended
        // to the tail would otherwise render below the segment it precedes.
        const order = pathVariables(template);
        const ordered = operation.parameters
            .filter((entry) => entry.in === 'path')
            .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

        operation.parameters = [
            ...ordered,
            ...operation.parameters.filter((entry) => entry.in !== 'path'),
        ];
    }

    return appended;
}

function buildFilterParameter(description) {
    return {
        name: 'filter',
        in: 'query',
        required: false,
        description: [
            'Select which rows are returned.',
            'Bracket form `filter[name]=value`, where `a,b` matches any of a set, a leading `!` negates, and `~` marks a wildcard end (`x~` starts-with, `~x` ends-with, `~x~` contains).',
            'Expression form `filter=and(eq(name,\'a\'),not(eq(realmId,null)))`, recognised on its own or stamped with `codec=url-expression`.',
            `Allowed keys: ${list(description.filters.allowed ?? [])}.`,
            'A dotted key traverses a relation (`realm.name`) and is gated like the include it implies.',
            'An unknown key is dropped in the bracket form and rejected in the expression form.',
            UPPER_BOUND_NOTE,
        ].join(' '),
        schema: { type: 'string' },
    };
}

/**
 * `default` and `allowed` are disjoint halves of one allow-list in a rapiq
 * description, not a subset and its superset: `default` is the projection a
 * request naming no field receives, `allowed` the columns it has to ask for
 * (`client.secret`, `key.certificate`, `user.email`). What a caller may
 * select is the union, so the union is what the description states. Naming
 * `allowed` alone would read as if the opt-in half were the whole surface.
 */
function buildFieldsParameter(description, record) {
    const fields = description.fields ?? {};
    const projection = fields.default ?? [];
    const optional = (fields.allowed ?? []).filter((name) => !projection.includes(name));
    const selectable = [...projection, ...optional];

    return {
        name: 'fields',
        in: 'query',
        required: false,
        description: [
            'Project a subset of columns: `fields=id,name`.',
            'Per relation: `fields[$root]=id&fields[realm]=name`.',
            `Selectable: ${list(selectable)}.`,
            optional.length > 0 && projection.length > 0 ?
                `Absent, every one of them is returned except ${list(optional)}, which must be asked for.` :
                'Absent, every one of them is returned.',
            'A key outside that set is ignored, never rejected.',
            UPPER_BOUND_NOTE,
            ...(record ? [RECORD_SHAPE_NOTE] : []),
        ].join(' '),
        schema: { type: 'string' },
    };
}

function buildSortParameter(description) {
    const sorts = description.sorts ?? {};
    const fallback = sorts.default ?
        `Default: ${list(sorts.default)}.` :
        'Default: unordered.';

    return {
        name: 'sort',
        in: 'query',
        required: false,
        description: [
            'Order the result set: `sort=name` ascending, `sort=-name` descending, comma separated for several keys.',
            `Allowed: ${list(sorts.allowed ?? [])}.`,
            'A multi-key sort is honoured only when the key sequence is a leftmost prefix of one of the schema\'s declared indexes; otherwise the whole parameter is dropped and the rows come back unordered.',
            fallback,
        ].join(' '),
        schema: { type: 'string' },
    };
}

function buildIncludeParameter(description, record) {
    const relations = description.relations ?? {};
    const targets = relations.schemas ?? {};
    const names = relations.allowed ?? [];

    // Three schemas allow no include at all. Advertising the parameter for
    // them would document an input with no legal value.
    if (names.length === 0) {
        return undefined;
    }

    const renamed = names.some((name) => targets[name] && targets[name] !== name);
    const allowed = names.map((name) => (targets[name] && targets[name] !== name ? `${name} (${targets[name]})` : name));

    return {
        name: 'include',
        in: 'query',
        required: false,
        description: [
            'Include related resources: `include=realm`, comma separated, dotted for a nested hop.',
            `Allowed: ${list(allowed)}.`,
            `Each relation is described under \`#/${SCHEMA_MAP_KEY}\` by the schema of the same name${renamed ? ', or by the one in brackets where the two differ' : ''}.`,
            UPPER_BOUND_NOTE,
            ...(record ? [RECORD_SHAPE_NOTE] : []),
        ].join(' '),
        schema: { type: 'string' },
    };
}

function buildPaginationParameters(description) {
    const maxLimit = description.pagination?.maxLimit;

    return [
        {
            name: 'page[limit]',
            in: 'query',
            required: false,
            description: maxLimit ?
                `Maximum number of rows to return. A larger value is clamped to ${maxLimit} rather than rejected.` :
                'Maximum number of rows to return.',
            schema: {
                type: 'integer',
                minimum: 1,
                ...(maxLimit ? { maximum: maxLimit } : {}),
            },
        },
        {
            name: 'page[offset]',
            in: 'query',
            required: false,
            description: 'Number of rows to skip before the page starts.',
            schema: { type: 'integer', minimum: 0 },
        },
    ];
}

/**
 * The generic rapiq query parameters, per marked operation, derived from that
 * schema's own description. Which ones an operation carries follows the
 * marker: a record read declares its subset (`fields` / `relations`) and gets
 * nothing else, since it processes neither a filter nor a page.
 *
 * A parameter is emitted only when the description carries the block it
 * documents, so a schema that stops declaring a vocabulary stops advertising
 * it here with no edit.
 */
function enrichQueryOperations(document) {
    const described = document[SCHEMA_MAP_KEY];

    let enriched = 0;
    let appended = 0;

    for (const { operation } of operations(document)) {
        const marked = operation[MARKER_KEY];
        if (!marked) {
            continue;
        }

        const description = described[marked.schema];
        const record = Boolean(marked.parameters);
        const selected = new Set(marked.parameters ?? Object.keys(description));

        const parameters = [];

        if (selected.has('filters') && description.filters) {
            parameters.push(buildFilterParameter(description));
        }

        if (selected.has('fields') && description.fields) {
            parameters.push(buildFieldsParameter(description, record));
        }

        if (selected.has('sorts') && description.sorts) {
            parameters.push(buildSortParameter(description));
        }

        if (selected.has('relations') && description.relations) {
            parameters.push(buildIncludeParameter(description, record));
        }

        if (selected.has('pagination') && description.pagination) {
            parameters.push(...buildPaginationParameters(description));
        }

        appended += appendParameters(operation, parameters.filter(Boolean));

        // The pointer is written here rather than by the decorator handler
        // because it is a statement about the assembled document: it is only
        // resolvable once the root map exists.
        marked.discovery = `#/${SCHEMA_MAP_KEY}/${marked.schema}`;

        enriched++;
    }

    return { enriched, appended };
}

/**
 * Every operation declared a 200 and nothing else, so a generated client had
 * no error model at all. Authup answers every failure with one body, whatever
 * the status - `serializeError(sanitizeError(e))` in the error middleware -
 * which is exactly what `default` is for.
 *
 * Per-status responses are deliberately sparse. Which statuses an operation
 * can answer with is not derivable from the document: whether a route is
 * authenticated lives in its middleware list, so a blanket 401/403/404 would
 * be a guess stamped on 227 operations. The one status that IS derivable is
 * the 400 a collection read answers when its query fails to decode, and that
 * is worth stating next to the parameters this pass just added.
 */
function declareErrorResponses(document) {
    document.components = document.components ?? {};
    document.components.schemas = document.components.schemas ?? {};

    document.components.schemas[ERROR_SCHEMA_NAME] = {
        type: 'object',
        description: [
            'The uniform error body. Every failing request answers with this shape, whatever the status;',
            'the status carries the severity and `code` the semantics.',
            'Subclasses add their own members - `issues` on a validation failure, `error` and `error_description` on the OAuth2 surface - so the object is open.',
        ].join(' '),
        properties: {
            name: {
                type: 'string',
                description: 'Class name of the error that was raised.',
            },
            message: {
                type: 'string',
                description: 'Human-readable summary. Replaced with a generic line on a 5xx, so no internal detail reaches the caller.',
            },
            code: {
                type: 'string',
                description: 'Semantic error code, one of `@authup/errors` `ErrorCode`. Stable across releases and the value to branch on.',
            },
            '@instanceof': {
                type: 'array',
                items: { type: 'string' },
                description: 'The error\'s marker chain, most general first. `@authup/errors` guards match on it, so a rehydrated error keeps its inheritance.',
            },
        },
        required: ['name', 'message', 'code'],
        additionalProperties: true,
    };

    const reference = { $ref: `#/components/schemas/${ERROR_SCHEMA_NAME}` };
    const content = { 'application/json': { schema: reference } };

    let declared = 0;

    for (const { operation } of operations(document)) {
        operation.responses = operation.responses ?? {};

        if (!operation.responses.default) {
            operation.responses.default = {
                description: 'The request failed. The status carries the semantics, the body is the uniform error object.',
                content,
            };
            declared++;
        }

        const decodes = (operation.parameters ?? [])
            .some((entry) => entry.in === 'query' && entry.name === 'filter');

        if (decodes && !operation.responses['400']) {
            operation.responses['400'] = {
                description: 'The `filter` expression could not be parsed, or it named a key the schema does not allow. Every other query parameter fails soft: an unknown key is dropped rather than rejected, and so is an unknown key in the bracket filter form.',
                content,
            };
            declared++;
        }
    }

    return declared;
}

function pascalCase(input) {
    return input
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

/**
 * `Ucfirst(<method name>)` plus a positional `_2` / `_3` suffix is what trapi
 * emits, so 186 of the 227 ids carry a number that says nothing and moves the
 * day a controller is inserted ahead of another - every method of a generated
 * client renames on an unrelated change.
 *
 * Method plus path is the only identity in the document that is stable under
 * insertion, and it is unique by construction: one operation per method per
 * path. `draft.operationId` is discarded by `MethodGenerator`, which rebuilds
 * the field itself, so this has to happen on the emitted document rather than
 * in the decorator handler.
 */
function buildOperationId(method, template) {
    const segments = template.split('/').filter(Boolean);

    if (segments.length === 0) {
        return `${method}Root`;
    }

    return segments.reduce((carry, segment) => {
        const variable = segment.match(/^\{(.+)\}$/);

        return carry + (variable ? `By${pascalCase(variable[1])}` : pascalCase(segment));
    }, method);
}

function assignOperationIds(document, failures) {
    const used = new Map();

    for (const {
        template,
        method,
        operation,
    } of operations(document)) {
        const id = buildOperationId(method, template);
        const previous = used.get(id);

        if (previous) {
            failures.push(`operationId '${id}' is claimed by both ${previous} and ${method.toUpperCase()} ${template}.`);
            continue;
        }

        used.set(id, `${method.toUpperCase()} ${template}`);
        operation.operationId = id;
    }

    return used.size;
}

// --------------------------------------------------------------------------

function report(failures) {
    console.error('[openapi] the documented query surface and the served one disagree.\n');
    failures.forEach((failure) => console.error(`  - ${failure}`));
    console.error('');
    process.exit(1);
}

if (!fs.existsSync(DOCUMENT_PATH)) {
    console.error(`[openapi] ${path.relative(PACKAGE_PATH, DOCUMENT_PATH)} is missing; run \`trapi generate\` first.`);
    process.exit(1);
}

const document = JSON.parse(fs.readFileSync(DOCUMENT_PATH, 'utf8'));
const failures = [];

assertMarkersMatchDescribeCalls(failures);
assertDocumentCoverage(document, failures);

if (failures.length > 0) {
    report(failures);
}

const pathParameters = synthesizePathParameters(document);
const { enriched, appended } = enrichQueryOperations(document);
const operationIds = assignOperationIds(document, failures);
const responses = declareErrorResponses(document);

// Every path variable has to be declared by every operation on that path, and
// the enrichment appends rather than assigns for exactly that reason: an
// earlier draft assigned `operation.parameters` and would have dropped the
// 136 path parameters trapi emits.
for (const {
    template,
    method,
    operation,
} of operations(document)) {
    const declared = new Set(
        (operation.parameters ?? [])
            .filter((entry) => entry.in === 'path')
            .map((entry) => entry.name),
    );

    for (const name of pathVariables(template)) {
        if (!declared.has(name)) {
            failures.push(`${method.toUpperCase()} ${template}: path variable '${name}' is undeclared after enrichment.`);
        }
    }
}

if (failures.length > 0) {
    report(failures);
}

// Same shape trapi writes, so the only difference between the generated and
// the enriched document is what this pass changed.
fs.writeFileSync(DOCUMENT_PATH, JSON.stringify(document, null, 4));

console.log(`[openapi] ${operationIds} operations: ${enriched} query-enriched (${appended} query parameters), ${pathParameters} path parameters synthesized, ${responses} error responses declared`);
