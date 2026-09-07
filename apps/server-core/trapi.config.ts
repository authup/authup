/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 *
 * The OpenAPI document is a projection of the runtime rapiq schema registry:
 * the same objects the decoder enforces and `meta.schema` answers with are
 * what describe the query surface here, so the three cannot drift.
 *
 * Nothing rewrites the document afterwards. The `@DQuerySchema` handler
 * contributes each marked operation's query parameters during generation
 * (trapi 2.1.1, tada5hi/trapi#907), the shared error response is declared
 * document-wide (#908), and the registry map rides `data.extra`. The
 * invariants that keep marker, describe call and document equal live in
 * `test/unit/http/openapi-coverage.spec.ts`.
 */

import { Parameter as RapiqParameter } from '@rapiq/core';
import type { Parameter, Response, SchemaDescription } from '@trapi/core';
import { defineConfig } from '@trapi/cli';
import { method, readString } from '@trapi/core';
import {
    RECORD_QUERY_PARAMETERS,
    computeSchemaRegistryHash,
    describeQuerySchema,
    describeSchemaRegistry,
    schemaRegistry,
} from './src/core/query/index.ts';

const SCHEMA_MAP_KEY = 'x-authup-schemas';

const ERROR_SCHEMA_NAME = 'ErrorResponse';

/**
 * Which rapiq parameters a marked read decodes. A collection read decodes the
 * schema's whole vocabulary; a record read only `RECORD_QUERY_PARAMETERS`;
 * the two bulk revokes only the filter, which is what discriminates a
 * self-service call from an administrative one.
 */
const SHAPE_PARAMETERS : Record<string, `${RapiqParameter}`[] | undefined> = {
    collection: undefined,
    record: RECORD_QUERY_PARAMETERS,
    filters: [RapiqParameter.FILTERS],
};

const UPPER_BOUND_NOTE = 'This is the static upper bound: per-actor relation and column gates may narrow it silently on any given request.';

const RECORD_SHAPE_NOTE = 'Single-record reads are still converging on this vocabulary; one that does not decode it yet answers with its default projection.';

function list(input) {
    return input.join(', ');
}

function buildFilterParameter(description) {
    return {
        parameterName: 'filter',
        name: 'filter',
        in: 'queryProp',
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
        type: { typeName: 'string' },
        extensions: [],
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
        parameterName: 'fields',
        name: 'fields',
        in: 'queryProp',
        required: false,
        description: [
            'Project a subset of columns: `fields=id,name`, which REPLACES the default projection.',
            'A leading `+` adds to it and a leading `-` removes from it (`fields=+email`, `fields=-name`).',
            'Per relation: `fields[$root]=id&fields[realm]=name`.',
            `Selectable: ${list(selectable)}.`,
            optional.length > 0 && projection.length > 0 ?
                `Absent, every one of them is returned except ${list(optional)}, which must be asked for.` :
                'Absent, every one of them is returned.',
            'A key outside that set is ignored, never rejected.',
            UPPER_BOUND_NOTE,
            ...(record ? [RECORD_SHAPE_NOTE] : []),
        ].join(' '),
        type: { typeName: 'string' },
        extensions: [],
    };
}

function buildSortParameter(description) {
    const sorts = description.sorts ?? {};
    const fallback = sorts.default ?
        `Default: ${list(sorts.default)}.` :
        'Default: unordered.';

    return {
        parameterName: 'sort',
        name: 'sort',
        in: 'queryProp',
        required: false,
        description: [
            'Order the result set: `sort=name` ascending, `sort=-name` descending, comma separated for several keys.',
            `Allowed: ${list(sorts.allowed ?? [])}.`,
            'A multi-key sort is honoured only when the key sequence is a leftmost prefix of one of the schema\'s declared indexes; otherwise the whole parameter is dropped and the rows come back unordered.',
            fallback,
        ].join(' '),
        type: { typeName: 'string' },
        extensions: [],
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
        parameterName: 'include',
        name: 'include',
        in: 'queryProp',
        required: false,
        description: [
            'Include related resources: `include=realm`, comma separated, dotted for a nested hop.',
            `Allowed: ${list(allowed)}.`,
            `Each relation is described under \`#/${SCHEMA_MAP_KEY}\` by the schema of the same name${renamed ? ', or by the one in brackets where the two differ' : ''}.`,
            UPPER_BOUND_NOTE,
            ...(record ? [RECORD_SHAPE_NOTE] : []),
        ].join(' '),
        type: { typeName: 'string' },
        extensions: [],
    };
}

function buildPaginationParameters(description) {
    const maxLimit = description.pagination?.maxLimit;

    return [
        {
            parameterName: 'page[limit]',
            name: 'page[limit]',
            in: 'queryProp',
            required: false,
            description: maxLimit ?
                `Maximum number of rows to return. A larger value is clamped to ${maxLimit} rather than rejected.` :
                'Maximum number of rows to return.',
            // Deliberately no `maximum`: the server CLAMPS a larger value
            // rather than rejecting it, and `maximum` is an input assertion,
            // so a strict client would refuse a request the API answers. The
            // ceiling is in the description, and machine-readably under
            // `x-authup-schemas.<name>.pagination.maxLimit`.
            type: { typeName: 'integer' },
            validators: { minimum: { value: 1 } },
            extensions: [],
        },
        {
            parameterName: 'page[offset]',
            name: 'page[offset]',
            in: 'queryProp',
            required: false,
            description: 'Number of rows to skip before the page starts.',
            type: { typeName: 'integer' },
            validators: { minimum: { value: 0 } },
            extensions: [],
        },
    ];
}

/**
 * The generic rapiq query parameters for one marked read, derived from that
 * schema's own description. Which ones it carries follows the marker: a record
 * read declares its subset and gets nothing else, since it processes neither a
 * filter nor a page.
 *
 * A parameter is emitted only when the description carries the block it
 * documents, so a schema that stops declaring a vocabulary stops advertising
 * it here with no edit.
 */
function buildQueryParameters(
    description: SchemaDescription,
    subset: `${RapiqParameter}`[] | undefined,
) : Parameter[] {
    const selected = new Set<string>(subset ?? Object.keys(description));
    const record = Boolean(subset);
    const output : (Parameter | undefined)[] = [];

    if (selected.has('filters') && description.filters) {
        output.push(buildFilterParameter(description));
    }

    if (selected.has('fields') && description.fields) {
        output.push(buildFieldsParameter(description, record));
    }

    if (selected.has('sorts') && description.sorts) {
        output.push(buildSortParameter(description));
    }

    if (selected.has('relations') && description.relations) {
        output.push(buildIncludeParameter(description, record));
    }

    if (selected.has('pagination') && description.pagination) {
        output.push(...buildPaginationParameters(description));
    }

    return output.filter(Boolean) as Parameter[];
}

const ERROR_SCHEMA = {
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

/**
 * Authup answers every failure with one body whatever the status
 * (`serializeError(sanitizeError(e))`), which is exactly what `default`
 * describes. `code` stays a plain string rather than an enum of the closed
 * `ErrorCode` set: an OpenAPI enum is closed on the wire too, so a generated
 * client would fail to deserialize an error carrying a code added after it
 * was generated.
 */
const DEFAULT_RESPONSE : Response = {
    name: 'default',
    status: 'default',
    description: 'The request failed. The status carries the semantics, the body is the uniform error object.',
    schema: {
        typeName: 'refObject',
        refName: ERROR_SCHEMA_NAME,
        properties: [],
    } as any,
};

/**
 * Only a read that decodes a filter can answer 400 for the query itself, so
 * this rides the marker rather than the document: every other parameter fails
 * soft, dropping an unknown key rather than rejecting it.
 */
const FILTER_REJECTED_RESPONSE : Response = {
    name: '400',
    status: 400,
    description: 'The `filter` expression could not be parsed, or it named a key the schema does not allow. Every other query parameter fails soft: an unknown key is dropped rather than rejected, and so is an unknown key in the bracket filter form.',
    schema: {
        typeName: 'refObject',
        refName: ERROR_SCHEMA_NAME,
        properties: [],
    } as any,
};

/**
 * Carries the `@DQuerySchema` marker (`src/adapters/http/decorators/`) onto
 * the emitted operation: the `x-query-schema` extension a reader follows into
 * the registry map, and the query parameters that vocabulary allows.
 *
 * Addressed by decorator site rather than by path, so every mount of a
 * dual-mounted controller inherits it and no map of path strings exists to rot.
 *
 * Both arguments must be an enum member or a string literal. The record subset
 * is resolved from a SHAPE here rather than passed as the constant itself, so
 * `RECORD_QUERY_PARAMETERS` stays declared exactly once while the decorator
 * argument stays something the type resolver folds.
 *
 * An argument the resolver cannot fold, and a schema name the registry does
 * not hold, both fail the generate: `EntityType` is wider than the registry,
 * four of its members carrying no schema, so the marker's own type cannot rule
 * them out.
 */
const querySchemaHandler = method({
    match: { name: 'DQuerySchema', on: 'method' },
    apply: (ctx, draft) => {
        const schema = readString(ctx.argument(0));
        const shape = readString(ctx.argument(1));

        if (!schema || !(shape && shape in SHAPE_PARAMETERS)) {
            throw new Error(`@DQuerySchema on '${draft.name}' has unresolvable arguments.`);
        }

        const registered = schemaRegistry.getOrFail(schema);
        const subset = SHAPE_PARAMETERS[shape];
        const description = describeQuerySchema(registered);

        draft.extensions.push({
            key: 'x-query-schema',
            value: {
                schema,
                ...(subset ? { parameters: subset } : {}),
                discovery: `#/${SCHEMA_MAP_KEY}/${schema}`,
            },
        });

        draft.parameters.push(...buildQueryParameters(description, subset));

        // Keyed on decoding a FILTER, not on being a collection read: the two
        // bulk revokes decode filters alone, and the filter is the only query
        // parameter whose rejection is a 400.
        if (!subset || subset.includes(RapiqParameter.FILTERS)) {
            draft.responses.push(FILTER_REJECTED_RESPONSE);
        }
    },
});

export default defineConfig({
    metadata: {
        entryPoint: 'src/adapters/http/controllers/**/*.ts',
        preset: {
            name: 'authup',
            extends: ['@routup/decorators/preset'],
            methods: [querySchemaHandler],
        },
        tsconfig: 'tsconfig.json',
    },
    swagger: {
        version: 'v3.2',
        data: {
            name: 'API Documentation',
            operationIdStrategy: 'path',
            responses: [DEFAULT_RESPONSE],
            extra: {
                [SCHEMA_MAP_KEY]: describeSchemaRegistry(),
                'x-authup-schema-hash': computeSchemaRegistryHash(),
                components: { schemas: { [ERROR_SCHEMA_NAME]: ERROR_SCHEMA } },
            },
            securityDefinitions: {
                bearer: {
                    type: 'apiKey',
                    name: 'Authorization',
                    in: 'header',
                },
                basicAuth: {
                    type: 'http',
                    scheme: 'basic',
                },
                oauth2: {
                    type: 'oauth2',
                    flows: {
                        password: {
                            tokenUrl: 'token',
                            scopes: {},
                        },
                    },
                },
            },
            /**
             * The queryable surface as one document, projected at the
             * spec root: a route's `x-query-schema` names a schema, and
             * this is where that name resolves. It is the SAME
             * description `meta.schema` carries on the matching
             * response — the projection is byte-identical, `indexes`
             * and all — so a client can validate one against the other.
             *
             * Merged in through `swagger.data.extra`: an extension
             * attaches per controller, per operation or per property,
             * never at the root, and `specificationExtra` is the only
             * channel that reaches it.
             */
        },
    },
    output: { path: 'dist/swagger.json' },
});
