/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Robot, User } from '@authup/core-kit';
import { hasOwnProperty } from '@authup/kit';
import type { OpenIDTokenPayload } from '@authup/specs';
import { OAuth2SubKind } from '@authup/specs';
import type { ObjectLiteral } from 'validup';
import type { Oauth2Identity } from '../identity';

type AttributeMapTuple<T> = {
    [K in keyof T]: [K, (value: unknown) => any]
}[keyof T];

type AttributeMap<T extends Record<string, any>> = Record<
keyof OpenIDTokenPayload,
keyof T | AttributeMapTuple<T>
>;

function extractAttributesByAttributeMap<T extends ObjectLiteral = ObjectLiteral>(
    attributeMap: AttributeMap<T>,
    attributes: T,
) : OpenIDTokenPayload {
    const result = {} as OpenIDTokenPayload;

    const keys = Object.keys(attributeMap);
    for (let i = 0; i < keys.length; i++) {
        const attribute = attributeMap[keys[i]];
        if (typeof attribute === 'string') {
            if (hasOwnProperty(attributes, attribute)) {
                result[keys[i]] = attributes[attribute];
            }
        } else {
            const [key, transformer] = attribute as AttributeMapTuple<T>;

            if (hasOwnProperty(attributes, key)) {
                result[keys[i]] = transformer(attributes[key]);
            }
        }
    }

    return result;
}

export function resolveOpenIDClaimsForOAuth2Identity(
    identity: Oauth2Identity,
) : OpenIDTokenPayload {
    if (identity.type === OAuth2SubKind.CLIENT) {
        const attributeMap : AttributeMap<Client> = {
            name: 'name',
            nickname: 'name',
            preferred_username: 'name',
            updated_at: [
                'updated_at',
                (value: Date | string) => (typeof value === 'string' ?
                    new Date(value).getTime() :
                    value.getTime()),
            ],

        };

        return extractAttributesByAttributeMap(attributeMap, identity.data);
    }

    if (identity.type === OAuth2SubKind.ROBOT) {
        const attributeMap : AttributeMap<Robot> = {
            name: 'name',
            nickname: 'name',
            preferred_username: 'name',
            updated_at: [
                'updated_at',
                (value: Date | string) => (typeof value === 'string' ?
                    new Date(value).getTime() :
                    value.getTime()),
            ],
        };

        return extractAttributesByAttributeMap(attributeMap, identity.data);
    }

    const attributeMap : AttributeMap<User> = {
        name: 'name',
        family_name: 'last_name',
        given_name: 'first_name',
        nickname: 'display_name',
        preferred_username: 'display_name',
        updated_at: [
            'updated_at',
            (value: Date | string) => (typeof value === 'string' ?
                new Date(value).getTime() :
                value.getTime()),
        ],

        email: 'email',
        email_verified: 'active',
    };

    return extractAttributesByAttributeMap(attributeMap, identity.data);
}
