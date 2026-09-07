import { defineConfig } from '@trapi/cli';
import { enrichOpenAPIDocument } from './scripts/openapi-query-schemas.mjs';
import { Parameter } from '@rapiq/core';
import { method, readString } from '@trapi/core';
import {
    RECORD_QUERY_PARAMETERS,
    computeSchemaRegistryHash,
    describeSchemaRegistry,
    schemaRegistry,
} from './src/core/query/index.ts';

/**
 * Carries the `@DQuerySchema` marker (`src/adapters/http/decorators/`)
 * onto the emitted operation as an `x-query-schema` extension. The
 * extension is what the enrichment step keys off, so the marker never
 * has to be paired with a hand-maintained map of path strings: it is
 * addressed by decorator site, which means every mount of a
 * dual-mounted controller inherits it.
 *
 * The record shape is resolved to `RECORD_QUERY_PARAMETERS` here rather
 * than spelled at the route, so the subset stays declared exactly once.
 * The marker cannot pass the constant itself: `@trapi/metadata` folds a
 * decorator argument from the identifier's own value declaration, which
 * for an import is the `ImportSpecifier` and carries no initializer, so
 * an imported constant resolves to `unresolvable`. Enum members and
 * string literals resolve, which is why both arguments are those.
 *
 * An argument the type resolver cannot fold, and a schema name the
 * registry does not hold, both fail the generate. Skipping either would
 * emit an operation that looks unmarked or points at nothing, which is
 * precisely the silent gap the marker exists to close.
 */
const SHAPE_PARAMETERS: Record<string, `${Parameter}`[] | undefined> = {
    collection: undefined,
    record: RECORD_QUERY_PARAMETERS,
    filters: [Parameter.FILTERS],
};

const querySchemaHandler = method({
    match: { name: 'DQuerySchema', on: 'method' },
    apply: (ctx, draft) => {
        const schema = readString(ctx.argument(0));
        const shape = readString(ctx.argument(1));

        if (!schema || (shape !== 'collection' && shape !== 'record' && shape !== 'filters')) {
            throw new Error(`@DQuerySchema on '${draft.name}' has unresolvable arguments.`);
        }

        // `EntityType` is wider than the registry: four of its members carry no
        // schema, so the marker's own type cannot rule them out. Resolving here
        // makes the pointer a promise the document keeps.
        schemaRegistry.getOrFail(schema);

        draft.extensions.push({
            key: 'x-query-schema',
            value: SHAPE_PARAMETERS[shape] ?
                { schema, parameters: SHAPE_PARAMETERS[shape] } :
                { schema },
        });
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
        transform: (spec) => {
            enrichOpenAPIDocument(spec);
        },
        data: {
            name: 'API Documentation',
            operationIdStrategy: 'path',
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
            extra: {
                'x-authup-schemas': describeSchemaRegistry(),
                'x-authup-schema-hash': computeSchemaRegistryHash(),
            },
        },
    },
    output: { path: 'dist/swagger.json' },
});
