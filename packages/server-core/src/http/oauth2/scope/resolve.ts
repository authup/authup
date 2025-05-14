/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Robot, User } from '@authup/core-kit';
import { hasOwnProperty } from '@authup/kit';
import { ScopeName } from '@authup/core-kit';
import { OAuth2SubKind, unwrapOAuth2Scope } from '@authup/specs';

const userFields = {
    [ScopeName.IDENTITY]: ['name', 'display_name', 'last_name', 'first_name'] satisfies (keyof User)[],
    [ScopeName.EMAIL]: ['email'] satisfies (keyof User)[],
};

const robotFields = {
    [ScopeName.IDENTITY]: ['name'] satisfies (keyof Robot)[],
};

const clientFields = {
    [ScopeName.IDENTITY]: ['name'] satisfies (keyof Client)[],
};

export function resolveOAuth2SubAttributesForScopes(
    subKind: OAuth2SubKind | `${OAuth2SubKind}`,
    scope: string | string[] = [],
) : string[] {
    const scopes = unwrapOAuth2Scope(scope);
    if (!scopes || scopes.length === 0) {
        return [];
    }

    const fields : string[] = [];

    for (let i = 0; i < scopes.length; i++) {
        switch (subKind) {
            case OAuth2SubKind.USER: {
                if (hasOwnProperty(userFields, scopes[i])) {
                    fields.push(...userFields[scopes[i]] as string[]);
                }

                if (scopes[i] === ScopeName.GLOBAL) {
                    fields.push(...Object.values(userFields).flat());
                }
                break;
            }
            case OAuth2SubKind.ROBOT: {
                if (hasOwnProperty(robotFields, scopes[i])) {
                    fields.push(...robotFields[scopes[i]] as string[]);
                }

                if (scopes[i] === ScopeName.GLOBAL) {
                    fields.push(...Object.values(robotFields).flat());
                }
                break;
            }
            case OAuth2SubKind.CLIENT: {
                if (hasOwnProperty(clientFields, scopes[i])) {
                    fields.push(...clientFields[scopes[i]] as string[]);
                }

                if (scopes[i] === ScopeName.GLOBAL) {
                    fields.push(...Object.values(clientFields).flat());
                }
                break;
            }
        }
    }

    return fields;
}
