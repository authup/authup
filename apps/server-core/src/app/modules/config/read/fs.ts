/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { readSchemaFromFileTree } from '@authup/server-config-kit';
import type { INamingScheme } from 'confinity';
import { FSStore } from 'confinity';
import fs from 'node:fs';
import process from 'node:process';
import {
    CONFIG_FILE_EXTENSIONS,
    CONFIG_FILE_NAME,
    CONFIG_SECTION,
} from '../constants.ts';
import { CONFIG_SCHEMA } from '../registry.ts';
import type { ConfigInput } from '../types.ts';
import type { ConfigReadFsOptions } from './types.ts';

/**
 * One file, `authup.yml`, never a family. confinity's default convention also
 * discovers `authup.<name>.<ext>` and nests each such file under the name its
 * filename carries; with the whole document read as one tree that would let a
 * second file place keys at the document root, so discovery is narrowed to the
 * root file and every loaded file is read as the root.
 */
const NAMING : INamingScheme = {
    toPatterns: () => [`${CONFIG_FILE_NAME}.{${CONFIG_FILE_EXTENSIONS.join(',')}}`],
    toName: () => '',
};

const RETIRED_FILE_PATTERN = /^authup\.(.+\.)?conf$/;

/**
 * The `authup.conf` family stopped being read in favour of `authup.yml`. It is
 * the one upgrade step an operator cannot notice from the outside: the server
 * simply boots on its defaults, so say it once instead.
 */
function warnAboutRetiredConfigFiles(cwd?: string) {
    let entries : string[];
    try {
        entries = fs.readdirSync(cwd || process.cwd());
    } catch {
        return;
    }

    const retired = entries.filter((entry) => RETIRED_FILE_PATTERN.test(entry));
    if (retired.length === 0) {
        return;
    }

    // eslint-disable-next-line no-console
    console.warn(
        `[authup] ${retired.join(', ')} is no longer read. Move the configuration to ${CONFIG_FILE_NAME}.yml.`,
    );
}

export async function readConfigRawFromFS(options: ConfigReadFsOptions = {}) : Promise<ConfigInput> {
    const store = new FSStore({
        cwd: options.cwd,
        naming: NAMING,
    });

    if (options.file) {
        await store.loadFile(options.file);
    } else {
        await store.load();
        warnAboutRetiredConfigFiles(options.cwd);
    }

    // Read synchronously after the explicit load. `get` is asynchronous in
    // confinity v2, and a missing `await` would hand a Promise to code that
    // only checks whether it received an object.
    return readSchemaFromFileTree(store.getSync(''), CONFIG_SCHEMA, { prefix: CONFIG_SECTION });
}
