/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 *
 * Documents the rapiq query vocabulary on the operations that decode one.
 *
 * A pure function over the emitted document: every fact it needs is already
 * in there, as the per-operation `x-query-schema` marker the trapi handler
 * stamps and the `x-authup-schemas` map the config emits at the root. It
 * reads no file and knows no registry, so it cannot describe one other than
 * the one the document was generated from.
 *
 * Called from `trapi.config.ts` through the `swagger.transform` hook, so the
 * whole pipeline is one `trapi generate`. It exists only because two things
 * are not expressible in trapi yet: a decorator handler cannot attach the
 * parameters it derives (tada5hi/trapi#907), and there is no way to declare a
 * response that applies to every operation (tada5hi/trapi#908). With both, the
 * generation is entirely config plus the handler and this file goes away.
 *
 * What this deliberately does NOT do is assert anything. The invariants that
 * keep the marker, the `describeQuerySchema` call and the document equal live
 * in `test/unit/http/openapi-coverage.spec.ts`, which is where this repository
 * keeps invariants, and they run whether or not anyone builds the document.
 */

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

const SCHEMA_MAP_KEY = 'x-authup-schemas';
const MARKER_KEY = 'x-query-schema';
const ERROR_SCHEMA_NAME = 'ErrorResponse';

/**
 * What a path variable holds, where the answer is not the variable's own name.
 * trapi declares every path-template variable itself since 2.1.0
 * (tada5hi/trapi#896) but has no description to give it, and nothing else in
 * the document says that a realm is addressable by name as well as by id.
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

function list(input) {
    return input.join(', ');
}

// --------------------------------------------------------------------------
// Coverage
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// Enrichment
// --------------------------------------------------------------------------

function appendParameters(operation, parameters, failures, label) {
    if (!Array.isArray(operation.parameters)) {
        operation.parameters = [];
    }

    let appended = 0;

    for (const parameter of parameters) {
        const present = operation.parameters.some((entry) => entry.name === parameter.name && entry.in === parameter.in);

        // Appending rather than assigning is what keeps trapi's own path
        // parameters, but it also means a name it already emitted would keep
        // its own description and silently drop the documented one. That is a
        // documentation change hiding inside an unrelated edit, so it fails.
        if (present) {
            failures.push(`${label}: a '${parameter.name}' ${parameter.in} parameter is already declared, so the documented query vocabulary cannot be attached to it.`);

            continue;
        }

        operation.parameters.push(parameter);
        appended++;
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
                // Deliberately no `maximum`: the server CLAMPS a larger
                // value rather than rejecting it, and `maximum` is an
                // input assertion, so declaring it would have a strict
                // client reject a request the API answers. The ceiling
                // is in the description, and machine-readably under
                // `x-authup-schemas.<name>.pagination.maxLimit`.
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
function enrichQueryOperations(document, failures) {
    const described = document[SCHEMA_MAP_KEY];

    let enriched = 0;
    let appended = 0;

    for (const {
        template,
        method,
        operation,
    } of operations(document)) {
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

        appended += appendParameters(operation, parameters.filter(Boolean), failures, `${method.toUpperCase()} ${template}`);

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
function declareErrorResponses(document, failures) {
    document.components = document.components ?? {};
    document.components.schemas = document.components.schemas ?? {};

    const schema = {
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

    // trapi keys components by bare declaration name, so a future authup type
    // called `ErrorResponse` would land here and be overwritten in silence.
    // An identical component is this script's own previous run, since it
    // rewrites the document in place and has to stay idempotent.
    const existing = document.components.schemas[ERROR_SCHEMA_NAME];

    if (existing && JSON.stringify(existing) !== JSON.stringify(schema)) {
        failures.push(`The document already declares a different '${ERROR_SCHEMA_NAME}' component, so the shared error schema cannot claim that name; rename one of the two.`);

        return 0;
    }

    document.components.schemas[ERROR_SCHEMA_NAME] = schema;

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

// --------------------------------------------------------------------------

/**
 * Enrich a generated OpenAPI document in place: document the rapiq query
 * vocabulary of every marked read, declare the shared error response, and
 * assert that what the document advertises is what the server decodes.
 *
 * Called from `trapi.config.ts` through the `swagger.transform` hook, so the
 * whole pipeline stays one `trapi generate`. Throws on any disagreement, which
 * aborts the generate rather than leaving a written-then-rejected document on
 * disk.
 */
function describePathParameters(document) {
    let described = 0;

    for (const { operation } of operations(document)) {
        for (const parameter of operation.parameters ?? []) {
            const description = PATH_PARAMETER_DESCRIPTIONS[parameter.name];

            if (description && parameter.in === 'path' && !parameter.description) {
                parameter.description = description;
                described++;
            }
        }
    }

    return described;
}

export function enrichOpenAPIDocument(document) {
    const failures = [];

    const { enriched, appended } = enrichQueryOperations(document, failures);
    const responses = declareErrorResponses(document, failures);
    const described = describePathParameters(document);

    if (failures.length > 0) {
        throw new Error([
            'the query vocabulary could not be attached to the document.',
            ...failures.map((failure) => `  - ${failure}`),
        ].join('\n'));
    }

    return {
        enriched,
        appended,
        responses,
        described,
    };
}