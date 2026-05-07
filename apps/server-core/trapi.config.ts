import { defineConfig } from '@trapi/cli';

export default defineConfig({
    metadata: {
        entryPoint: 'src/adapters/http/controllers/**/*.ts',
        preset: '@routup/decorators/preset',
        tsconfig: 'tsconfig.json',
    },
    swagger: {
        version: 'v3.2',
        data: {
            name: 'API Documentation',
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
        },
    },
    output: { path: 'dist/swagger.json' },
});
