/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Robot, User } from '@authup/common';
import {
    OAuth2SubKind, ScopeName, hasOwnProperty, transformOAuth2ScopeToArray,
} from '@authup/common';

type ScopeSubFields<
    I extends Record<string, Record<string, any>>,
    > = {
        [T in keyof I]: (keyof I[T])[]
    };

const userFields : Partial<ScopeSubFields<Record<ScopeName | `${ScopeName}`, User>>> = {
    [ScopeName.IDENTITY]: ['name', 'display_name', 'last_name', 'first_name'],
    [ScopeName.EMAIL]: ['email'],
};

const robotFields : Partial<ScopeSubFields<Record<ScopeName | `${ScopeName}`, Robot>>> = {
    [ScopeName.IDENTITY]: ['name'],
};

const clientFields : Partial<ScopeSubFields<Record<ScopeName | `${ScopeName}`, Client>>> = {
    [ScopeName.IDENTITY]: ['name'],
};

export function resolveOAuth2SubAttributesForScope(
    subKind: OAuth2SubKind | `${OAuth2SubKind}`,
    scope?: string | string[],
) : string[] {
    const fields : string[] = [];

    const scopes = transformOAuth2ScopeToArray(scope);
    for (let i = 0; i < scopes.length; i++) {
        switch (subKind) {
            case OAuth2SubKind.USER: {
                if (hasOwnProperty(userFields, scopes[i])) {
                    fields.push(...userFields[scopes[i]] as string[]);
                }

                if (scopes[i] === ScopeName.GLOBAL) {
                    fields.push(...Object.values(userFields) as string[]);
                }
                break;
            }
            case OAuth2SubKind.ROBOT: {
                if (hasOwnProperty(robotFields, scopes[i])) {
                    fields.push(...robotFields[scopes[i]] as string[]);
                }

                if (scopes[i] === ScopeName.GLOBAL) {
                    fields.push(...Object.values(robotFields) as string[]);
                }
                break;
            }
            case OAuth2SubKind.CLIENT: {
                if (hasOwnProperty(clientFields, scopes[i])) {
                    fields.push(...clientFields[scopes[i]] as string[]);
                }

                if (scopes[i] === ScopeName.GLOBAL) {
                    fields.push(...Object.values(clientFields) as string[]);
                }
                break;
            }
        }
    }

    return fields;
}
