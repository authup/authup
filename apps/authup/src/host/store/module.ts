/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from '@authup/kit';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { isValidupError, stringifyPath } from 'validup';
import { HOSTS_FILE_NAME } from '../constants.ts';
import type { HostTokens, HostsDocument, IHostStore } from './types.ts';
import { HostsDocumentValidator, hostTokensSchema } from './validator.ts';

const validator = new HostsDocumentValidator();

export function resolveHostsDirectory(env: NodeJS.ProcessEnv = process.env) : string {
    return path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'authup');
}

/**
 * The raw value is never part of a message: it holds tokens.
 */
export function parseHostTokens(raw: string, origin: string) : HostTokens {
    let input : unknown;
    try {
        input = JSON.parse(raw);
    } catch {
        throw new Error(`The tokens kept in the ${origin} are not readable. Run \`authup login\` again.`);
    }

    const result = hostTokensSchema.safeParse(input);
    if (!result.success) {
        throw new Error(`The tokens kept in the ${origin} are not readable. Run \`authup login\` again.`);
    }

    return result.data;
}

async function parseHostsDocument(raw: string, file: string) : Promise<HostsDocument> {
    let input : unknown;
    try {
        input = JSON.parse(raw);
    } catch {
        throw new Error(`The hosts file ${file} is not valid JSON.`);
    }

    if (!isObject(input)) {
        throw new Error(`The hosts file ${file} must hold an object.`);
    }

    try {
        return await validator.run(input) as HostsDocument;
    } catch (e) {
        if (!isValidupError(e)) {
            throw e;
        }

        const issues = e.issues
            .map((issue) => `  ${stringifyPath(issue.path)}: ${issue.message}`)
            .join('\n');

        // No cause: citty prints a thrown error with console.error(error),
        // which renders the cause chain, and a validation issue can carry a
        // stored token value.
        // eslint-disable-next-line preserve-caught-error
        throw new Error(`The hosts file ${file} is invalid.\n${issues}`);
    }
}

export function createHostStore(directory: string) : IHostStore {
    const file = path.join(directory, HOSTS_FILE_NAME);

    return {
        directory,
        async read() {
            let raw : string;
            try {
                raw = await fs.readFile(file, 'utf8');
            } catch (e) {
                if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
                    return { hosts: {} };
                }

                throw e;
            }

            return parseHostsDocument(raw, file);
        },
        async write(document) {
            await fs.mkdir(directory, { recursive: true, mode: 0o700 });

            const temporary = `${file}.${process.pid}.tmp`;
            await fs.writeFile(temporary, `${JSON.stringify(document, null, 4)}\n`, { mode: 0o600 });
            await fs.rename(temporary, file);
        },
    };
}
