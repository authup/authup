/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import supertest, { SuperTest, Test } from 'supertest';
import { createExpressApp, useConfig } from '../../src';

export function useSuperTest() : SuperTest<Test> {
    const config = useConfig();

    const expressApp = createExpressApp({
        writableDirectoryPath: path.join(config.rootPath, config.writableDirectory),
        swaggerDocumentation: false,
        selfUrl: config.selfUrl,
        webUrl: config.webUrl,
        tokenMaxAge: 3600,
    });
    return supertest(expressApp);
}
