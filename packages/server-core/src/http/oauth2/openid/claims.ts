/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2OpenIdTokenPayload } from '@authup/schema';
import { OAuth2SubKind } from '@authup/schema';
import { hasOwnProperty } from '@authup/kit';
import type {
    Client, Robot, User,
} from '@authup/core-kit';

type AttributeMap<T extends Record<string, any>> = Record<
keyof OAuth2OpenIdTokenPayload,
keyof T | [keyof T, (value: unknown) => unknown]
>;

function extractAttributesByAttributeMap(
    attributeMap: AttributeMap<Record<string, any>>,
    attributes: Record<string, any>,
) : Partial<OAuth2OpenIdTokenPayload> {
    const result : Partial<OAuth2OpenIdTokenPayload> = {};

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

export function resolveOpenIdClaimsFromSubEntity(
    subKind: OAuth2SubKind | `${OAuth2SubKind}`,
    attributes: Record<string, any>,
) : Partial<OAuth2OpenIdTokenPayload> {
    switch (subKind) {
        case OAuth2SubKind.USER: {
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

            return extractAttributesByAttributeMap(attributeMap as AttributeMap<Record<string, any>>, attributes);
        }
        case OAuth2SubKind.CLIENT: {
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

            return extractAttributesByAttributeMap(attributeMap as AttributeMap<Record<string, any>>, attributes);
        }
        case OAuth2SubKind.ROBOT: {
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

            return extractAttributesByAttributeMap(attributeMap as AttributeMap<Record<string, any>>, attributes);
        }
    }

    return {};
}
