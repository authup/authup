/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AuthupConfig, ConfigReadFsOptions } from '@authup/server-config';
import {
    SCHEMA,
    inspectConfigFile,
    readConfigFileTree,
} from '@authup/server-config';
import {
    buildSchemaJSONSchema,
    mergeSchemaData,
    mountSchema,
    readSchemaFromEnv,
    readSchemaFromFileTree,
} from '@authup/server-config-kit';
import { describeConfigError, readConfig } from '@authup/server-core';
import { defineCommand } from 'citty';
import process from 'node:process';
import { Container } from 'validup';

/**
 * Check every key of the document against the zod type its one declaration
 * carries, not just the ones a single service reads: an operator writes one
 * file for the whole deployment, so a value a console service will reject has
 * to be reported here.
 */
async function validateDocument(input: Partial<AuthupConfig>) : Promise<void> {
    const container = new Container<AuthupConfig>();
    mountSchema(container, SCHEMA);

    await container.run(input);
}

export function defineCLIConfigCommand(
    configFs: ConfigReadFsOptions = {},
) {
    return defineCommand({
        meta: {
            name: 'config',
            description: 'Inspect the configuration the deployment would read.',
        },
        subCommands: {
            validate: defineCommand({
                meta: {
                    name: 'validate',
                    description: 'Read the configuration file and the environment, and report what does not hold.',
                },
                async run() {
                    try {
                        // The file itself first: what it holds that nothing
                        // reads, and whether it was found at all. The read
                        // below reports neither, because it skips what it does
                        // not claim and an absent file is a valid deployment.
                        const { files, unknown } = await inspectConfigFile({ ...configFs });

                        if (files.length === 0 && (configFs.cwd || configFs.file)) {
                            // Named a place and nothing was there: reporting
                            // the environment as valid would answer a question
                            // the operator did not ask.
                            // eslint-disable-next-line no-console
                            console.error(`No configuration file was found in ${configFs.cwd || process.cwd()}.`);
                            process.exit(1);
                        }

                        if (unknown.length > 0) {
                            const paths = unknown.map((entry) => `  ${entry}`).join('\n');

                            // eslint-disable-next-line no-console
                            console.error(`The configuration file holds options that are not read.\n${paths}`);
                            process.exit(1);
                        }

                        // server-core's own read next, because normalizing it
                        // is where the cross-section invariants live (a
                        // console url on another origin, a throttle without an
                        // event log). The document pass below carries none of
                        // them: a zod type only ever sees its own key.
                        await readConfig({ env: true, fs: { ...configFs } });

                        // and then every key of the document, including the
                        // ones only a console service reads. The read above
                        // covers server-core's selection alone.
                        const { tree } = await readConfigFileTree({ ...configFs });
                        await validateDocument(mergeSchemaData<AuthupConfig>(
                            SCHEMA,
                            readSchemaFromFileTree<AuthupConfig>(tree, SCHEMA),
                            readSchemaFromEnv<AuthupConfig>(SCHEMA),
                        ));
                    } catch (e) {
                        // eslint-disable-next-line no-console
                        console.error(describeConfigError(e));
                        process.exit(1);
                    }
                },
            }),
            schema: defineCommand({
                meta: {
                    name: 'schema',
                    description: 'Print the JSON Schema of the configuration file.',
                },
                run() {
                    const schema = buildSchemaJSONSchema(
                        SCHEMA,
                        { title: 'Authup configuration' },
                    );

                    // The docs workflow redirects this stream into
                    // docs/src/public/schema/config.json, so the document has
                    // to be the only thing on stdout.
                    // eslint-disable-next-line no-console
                    console.log(JSON.stringify(schema, null, 4));
                },
            }),
        },
    });
}
