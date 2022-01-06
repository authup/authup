/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'path';
import fs from 'fs';
import { Config } from './type';
import { extendAuthServerConfig } from './utils';

export function useAuthServerConfig(directoryPath?: string) : Config {
    directoryPath ??= process.cwd();

    const filePath : string = path.join(directoryPath, 'server.config.js');

    if (!fs.existsSync(filePath)) {
        return extendAuthServerConfig({}, directoryPath);
    }

    // todo: validation required
    // eslint-disable-next-line global-require,import/no-dynamic-require,@typescript-eslint/no-var-requires
    const config : Config = require(filePath);

    return extendAuthServerConfig(config, directoryPath);
}
