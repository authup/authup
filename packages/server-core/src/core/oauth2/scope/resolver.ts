/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Robot, User } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { hasOwnProperty } from '@authup/kit';
import { OAuth2SubKind, unwrapOAuth2Scope } from '@authup/specs';
import { distinctArray } from 'smob';
import type { ObjectLiteral } from 'validup';

type ScopeFields<T extends ObjectLiteral = ObjectLiteral> = {
    [key: string]: (keyof T & string)[]
};

export class OAuth2ScopeAttributesResolver {
    protected clientAttributes : ScopeFields<Client> = {
        [ScopeName.IDENTITY]: ['name'],
        [ScopeName.OPEN_ID]: ['name', 'display_name', 'updated_at', 'active'],
    };

    protected robotAttributes : ScopeFields<Robot> = {
        [ScopeName.IDENTITY]: ['name'],
        [ScopeName.OPEN_ID]: ['name', 'display_name', 'updated_at', 'active'],
    };

    protected userAttributes : ScopeFields<User> = {
        [ScopeName.IDENTITY]: ['name', 'display_name', 'last_name', 'first_name'],
        [ScopeName.EMAIL]: ['email'],
        [ScopeName.OPEN_ID]: ['name', 'updated_at', 'first_name', 'last_name', 'display_name', 'active', 'email'],
    };

    /**
     * Resolve attributes for sub kind.
     *
     * @param type
     * @param scope
     */
    resolveFor(type: OAuth2SubKind, scope: string | string[]) {
        if (type === OAuth2SubKind.CLIENT) {
            return this.resolveForClient(scope);
        }

        if (type === OAuth2SubKind.ROBOT) {
            return this.resolveForRobot(scope);
        }

        return this.resolveForUser(scope);
    }

    resolveForClient(scope: string | string[]) : string[] {
        const attributes : string[] = [];
        const scopes = unwrapOAuth2Scope(scope);

        for (let i = 0; i < scopes.length; i++) {
            const scope = scopes[i];
            if (hasOwnProperty(this.clientAttributes, scope)) {
                attributes.push(...this.clientAttributes[scope]);
            }

            if (scope === ScopeName.GLOBAL) {
                attributes.push(...Object.values(this.clientAttributes).flat());
                break;
            }
        }

        return distinctArray(attributes);
    }

    resolveForRobot(scope: string | string[]) : string[] {
        const attributes : string[] = [];
        const scopes = unwrapOAuth2Scope(scope);

        for (let i = 0; i < scopes.length; i++) {
            const scope = scopes[i];
            if (hasOwnProperty(this.robotAttributes, scope)) {
                attributes.push(...this.robotAttributes[scope]);
            }

            if (scope === ScopeName.GLOBAL) {
                attributes.push(...Object.values(this.robotAttributes).flat());
                break;
            }
        }

        return distinctArray(attributes);
    }

    resolveForUser(scope: string | string[]) : string[] {
        const attributes : string[] = [];
        const scopes = unwrapOAuth2Scope(scope);

        for (let i = 0; i < scopes.length; i++) {
            const scope = scopes[i];
            if (hasOwnProperty(this.userAttributes, scope)) {
                attributes.push(...this.userAttributes[scope]);
            }

            if (scope === ScopeName.GLOBAL) {
                attributes.push(...Object.values(this.userAttributes).flat());
                break;
            }
        }

        return distinctArray(attributes);
    }
}
