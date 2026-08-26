/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { findUnknownSchemaPaths, readSchemaFromFileTree } from '@authup/server-config-kit';
import type { INamingScheme } from 'confinity';
import { FSStore } from 'confinity';
import fs from 'node:fs';
import path from 'node:path';
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

function toExtension(name: string) : string {
    return name.slice(name.lastIndexOf('.') + 1);
}

/**
 * A file DISCOVERY would have picked up before and does not now: an
 * `authup.conf`, or the per-component `authup.<name>.<ext>` family in any
 * format. Scoped to the `authup.` prefix, because the directory it scans is
 * the working directory and holds files belonging to other programs.
 */
function isRetiredConfigFileName(name: string) : boolean {
    if (!name.startsWith(`${CONFIG_FILE_NAME}.`)) {
        return false;
    }

    const extension = toExtension(name);
    if (extension === 'conf') {
        return true;
    }

    if (!CONFIG_FILE_EXTENSIONS.includes(extension)) {
        return false;
    }

    return name.slice(0, -(extension.length + 1)) !== CONFIG_FILE_NAME;
}

/**
 * A file the operator NAMED, where the prefix says nothing: `.conf` is the
 * retired FORMAT whatever the file is called.
 */
function isRetiredConfigFilePath(filePath: string) : boolean {
    const name = path.basename(filePath);

    return toExtension(name) === 'conf' || isRetiredConfigFileName(name);
}

const RETIRED_FILE_HINT = `The authup.conf family is no longer read. Rewrite the configuration as ${CONFIG_FILE_NAME}.yml; the deployment-wide keys (publicUrl, db, redis, smtp, trustedOrigins, theme) moved out of the server.core section.`;

const warnedAboutDirectories = new Set<string>();

/**
 * A file left in the discovery directory is not read, which is invisible from
 * the outside (the server simply boots on its defaults), so say it once. Once
 * per directory, since a command may read the document more than once.
 */
function warnAboutRetiredConfigFiles(cwd?: string) {
    const directory = cwd || process.cwd();
    if (warnedAboutDirectories.has(directory)) {
        return;
    }

    let entries : string[];
    try {
        entries = fs.readdirSync(directory);
    } catch {
        return;
    }

    const retired = entries.filter(isRetiredConfigFileName);
    if (retired.length === 0) {
        return;
    }

    warnedAboutDirectories.add(directory);

    // eslint-disable-next-line no-console
    console.warn(`[authup] ${retired.join(', ')} is not read. ${RETIRED_FILE_HINT}`);
}

/**
 * A file the operator NAMED is a different case from one left lying around:
 * it would load, and the keys that moved out of the server.core section would
 * be dropped in silence. A configuration that is half applied is worse than
 * none, since what it silently drops is the issuer, the database connection
 * and the redirect allowlist, so refuse it instead of warning.
 */
function assertNoRetiredConfigFile(file: string | string[]) {
    const files = Array.isArray(file) ? file : [file];

    const retired = files.filter(isRetiredConfigFilePath);
    if (retired.length === 0) {
        return;
    }

    throw new Error(`${retired.join(', ')} can not be loaded. ${RETIRED_FILE_HINT}`);
}

/**
 * The configuration document as it was written, before any key is resolved
 * onto a Config key. `config validate` needs it to report what the read
 * deliberately ignores.
 */
export async function readConfigFileTree(
    options: ConfigReadFsOptions = {},
) : Promise<{ tree: unknown, files: string[] }> {
    const store = new FSStore({
        cwd: options.cwd,
        naming: NAMING,
    });

    let files : string[];
    if (options.file) {
        assertNoRetiredConfigFile(options.file);
        files = await store.loadFile(options.file);
    } else {
        files = await store.load();
        warnAboutRetiredConfigFiles(options.cwd);
    }

    // Read synchronously after the explicit load. `get` is asynchronous in
    // confinity v2, and a missing `await` would hand a Promise to code that
    // only checks whether it received an object.
    return { tree: store.getSync(''), files };
}

export async function readConfigRawFromFS(options: ConfigReadFsOptions = {}) : Promise<ConfigInput> {
    const { tree } = await readConfigFileTree(options);

    return readSchemaFromFileTree(tree, CONFIG_SCHEMA, { prefix: CONFIG_SECTION });
}

export type ConfigFileInspection = {
    /**
     * The files the read actually loaded. Empty means the configuration came
     * from the environment alone, which is a valid deployment and a mistyped
     * directory alike.
     */
    files: string[],
    /**
     * The paths the document holds that no Config key claims: a key left at a
     * retired location, or a typo. The read itself is permissive (an
     * unclaimed path is skipped, so a document written for a newer version
     * still boots), which is exactly what makes the two indistinguishable at
     * runtime.
     */
    unknown: string[]
};

/**
 * What `config validate` reports about the file itself, as opposed to the
 * configuration the file resolves to.
 */
export async function inspectConfigFile(options: ConfigReadFsOptions = {}) : Promise<ConfigFileInspection> {
    const { tree, files } = await readConfigFileTree(options);

    return {
        files,
        unknown: findUnknownSchemaPaths(tree, CONFIG_SCHEMA, { prefix: CONFIG_SECTION }),
    };
}
