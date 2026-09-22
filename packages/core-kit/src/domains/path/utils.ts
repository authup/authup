/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import type { NameValidOptions } from '../../helpers';
import { isNameValid } from '../../helpers';
import { PATH_SEPARATOR } from './constants';

export function isPathSegmentValid(name: string, options: NameValidOptions = {}) : boolean {
    return isNameValid(name, options);
}

export function splitPath(path: string) : string[] {
    return path.split(PATH_SEPARATOR);
}

export function joinPath(...segments: string[]) : string {
    return segments.filter((segment) => segment.length > 0).join(PATH_SEPARATOR);
}

/**
 * A caller-supplied slash path: one or more segments in the name charset
 * joined by single separators. The derived `path` column is built from
 * validated segments and never passes through here.
 */
export function isPathValid(path: string, options: NameValidOptions = {}) : boolean {
    if (path.length === 0) {
        if (options.throwOnFailure) {
            throw new AuthupError('The path must not be empty.');
        }

        return false;
    }

    for (const segment of splitPath(path)) {
        if (segment.length === 0) {
            if (options.throwOnFailure) {
                throw new AuthupError('The path must not contain empty segments.');
            }

            return false;
        }

        if (!isPathSegmentValid(segment, options)) {
            return false;
        }
    }

    return true;
}
