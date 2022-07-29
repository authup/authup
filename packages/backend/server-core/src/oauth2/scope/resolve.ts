/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2Scope, OAuth2SubKind, Robot, User, hasOwnProperty, transformOAuth2ScopeToArray,
} from '@authelion/common';

type ScopeSubFields<
    I extends Record<string, any>,
    O extends Record<string, any>,
    > = Record<
    keyof I,
    (keyof O)[]
    >;

const userFields : Partial<ScopeSubFields<Record<OAuth2Scope, any>, User>> = {
    [OAuth2Scope.IDENTITY]: ['name', 'display_name', 'last_name', 'first_name'],
    [OAuth2Scope.EMAIL]: ['email'],
};

const robotFields : Partial<ScopeSubFields<Record<OAuth2Scope, any>, Robot>> = {
    [OAuth2Scope.IDENTITY]: ['name'],
};

const clientFields : Partial<ScopeSubFields<Record<OAuth2Scope, any>, Robot>> = {
    [OAuth2Scope.IDENTITY]: ['name'],
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
                    fields.push(...userFields[scopes[i] as OAuth2Scope]);
                }

                if (scopes[i] === OAuth2Scope.GLOBAL) {
                    fields.push(...Object.values(userFields) as string[]);
                }
                break;
            }
            case OAuth2SubKind.ROBOT: {
                if (hasOwnProperty(robotFields, scopes[i])) {
                    fields.push(...robotFields[scopes[i] as OAuth2Scope]);
                }

                if (scopes[i] === OAuth2Scope.GLOBAL) {
                    fields.push(...Object.values(robotFields) as string[]);
                }
                break;
            }
            case OAuth2SubKind.CLIENT: {
                if (hasOwnProperty(clientFields, scopes[i])) {
                    fields.push(...clientFields[scopes[i] as OAuth2Scope]);
                }

                if (scopes[i] === OAuth2Scope.GLOBAL) {
                    fields.push(...Object.values(clientFields) as string[]);
                }
                break;
            }
        }
    }

    return fields;
}
