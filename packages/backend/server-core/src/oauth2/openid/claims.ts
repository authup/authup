/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    OAuth2Client, OAuth2OpenIdTokenPayload, OAuth2SubKind, Robot, User, hasOwnProperty, transformOAuth2ScopeToArray,
} from '@authelion/common';
import { OAuth2ClientEntity, UserEntity } from '../../domains';
import { OAuth2SubEntity, loadOAuth2SubEntity } from '../token';

type AttributeMap<T extends Record<string, any>> = Record<
keyof OAuth2OpenIdTokenPayload,
keyof T | [keyof T, (value: unknown) => unknown]
>;

function extractAttributesByAttributeMap(
    attributeMap: AttributeMap<Record<string, any>>,
    attributes: Record<string, any>,
) : Record<string, any> {
    const result : Record<string, any> = {};

    const keys = Object.keys(attributeMap);
    for (let i = 0; i < keys.length; i++) {
        const attribute = attributeMap[keys[i]];
        if (typeof attribute === 'string') {
            if (hasOwnProperty(attributes, attribute)) {
                result[keys[i]] = attributes[attribute];
            }
        } else {
            const [key, transformer] = attribute;

            if (hasOwnProperty(attributes, key)) {
                result[keys[i]] = transformer(attributes[key]);
            }
        }
    }

    return result;
}

function resolveOpenIdClaimsFromSubEntity(
    subKind: OAuth2SubKind,
    attributes: Record<string, any>,
) : Record<string, any> {
    switch (subKind) {
        case OAuth2SubKind.USER: {
            const attributeMap : AttributeMap<User> = {
                name: 'name',
                family_name: 'last_name',
                given_name: 'first_name',
                nickname: 'display_name',
                preferred_username: 'display_name',
                updated_at: ['updated_at', (value: Date) => value.getDate()],

                email: 'email',
                email_verified: 'active',
            };

            return extractAttributesByAttributeMap(attributeMap as AttributeMap<Record<string, any>>, attributes);
        }
        case OAuth2SubKind.CLIENT: {
            const attributeMap : AttributeMap<OAuth2Client> = {
                name: 'name',
                nickname: 'name',
                preferred_username: 'name',
                updated_at: ['updated_at', (value: Date) => value.getDate()],

            };

            return extractAttributesByAttributeMap(attributeMap as AttributeMap<Record<string, any>>, attributes);
        }
        case OAuth2SubKind.ROBOT: {
            const attributeMap : AttributeMap<Robot> = {
                name: 'name',
                nickname: 'name',
                preferred_username: 'name',
                updated_at: ['updated_at', (value: Date) => value.getDate()],
            };

            return extractAttributesByAttributeMap(attributeMap as AttributeMap<Record<string, any>>, attributes);
        }
    }

    return {};
}

export async function resolveSubAttributesForScope<
    T extends `${OAuth2SubKind}` | OAuth2SubKind,
>(
    subKind: T,
    sub: string,
    scope: string | string[],
    payload?: OAuth2SubEntity<T>,
) {
    if (!payload) {
        payload = await loadOAuth2SubEntity(subKind, sub);
    }

    const scopes = transformOAuth2ScopeToArray(scope);

    switch (subKind) {
        case OAuth2SubKind.USER: {
            return getUserClaimsForScopes(scopes, payload as UserEntity);
        }
    }

    return {};
}

export function getUserClaimsForScopes(scopes: string[], user: User) : Partial<OAuth2OpenIdTokenPayload> {
    let response : Partial<OAuth2OpenIdTokenPayload> = {};

    for (let i = 0; i < scopes.length; i++) {
        response = {
            ...response,
            ...getUserClaimsForScope(scopes[i], user),
        };
    }

    return response;
}

export function getUserClaimsForScope(scope: string, user: User) : Partial<OAuth2OpenIdTokenPayload> {
    switch (scope) {
        case 'profile': {
            return {
                name: user.name,
                family_name: user.last_name,
                given_name: user.first_name,
                nickname: user.display_name,
                preferred_username: user.display_name,
                // profile
                // picture
                // website
                // gender
                // birthdate
                // zoneinfo
                // locale
                updated_at: user.updated_at.getDate(),
            };
        }
        case 'email': {
            return {
                email: user.email,
                // email_verified
            };
        }
        case 'address': {
            return {

            };
        }
        case 'phone': {
            return {
                // phone_number
                // phone_number_verified
            };
        }
    }

    return {

    };
}
