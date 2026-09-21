/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidationError } from '@authup/errors';
import { UserAttributeName } from '@authup/core-kit';
import { OAuth2UIColorMode } from '@authup/specs';

/**
 * The value shape of the two reserved attributes, and only those two: every
 * other name keeps taking any string. They are reserved because the claims
 * builder serves them as `locale` / `color_mode` and the kit seeds a browser
 * from them, so a value nothing can render would be served to every RP and
 * pushed onto every device.
 *
 * `locale` is checked for the BCP47 SHAPE and not narrowed to a catalog
 * authup has: the attribute is the user's preference for every application
 * that reads the claim, and an RP may render a language the hosted pages do
 * not. It is bounded all the same, because the value rides every signed
 * token of the subject: subtags of at most eight characters (RFC 5646 2.1)
 * and the 35-character tag RFC 5646 4.4.1 sizes a buffer for.
 */
export const LOCALE_MAX_LENGTH = 35;

export function assertPreferenceValue(name: unknown, value: unknown) : void {
    if (name === UserAttributeName.LOCALE) {
        if (
            typeof value !== 'string' ||
            value.length > LOCALE_MAX_LENGTH ||
            !/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*$/.test(value)
        ) {
            throw new ValidationError(`The user-attribute '${name}' must be a BCP47 language tag.`);
        }

        return;
    }

    if (name === UserAttributeName.COLOR_MODE) {
        if (!(Object.values(OAuth2UIColorMode) as unknown[]).includes(value)) {
            throw new ValidationError(
                `The user-attribute '${name}' must be one of ${Object.values(OAuth2UIColorMode).join(', ')}.`,
            );
        }
    }
}
