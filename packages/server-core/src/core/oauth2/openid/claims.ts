/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, Identity, Robot, User,
} from '@authup/core-kit';
import { hasOwnProperty } from '@authup/kit';
import type { OpenIDTokenPayload } from '@authup/specs';
import { OAuth2SubKind } from '@authup/specs';
import type { ObjectLiteral } from 'validup';

type AttributeMapTuple<T> = {
    [K in keyof T]: [K, (value: unknown) => any]
}[keyof T];

type AttributeMap<T extends Record<string, any>> = Record<
keyof OpenIDTokenPayload,
keyof T | AttributeMapTuple<T>
>;

export class OAuth2OpenIDClaimsBuilder {
    protected clientMap : AttributeMap<Client> = {
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

    protected robotMap : AttributeMap<Robot> = {
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

    protected userMap : AttributeMap<User> = {
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

    /**
     * Build OpenID Claims form Oauth2 Identity.
     *
     * @param identity
     */
    fromIdentity(identity: Identity) : OpenIDTokenPayload {
        if (identity.type === OAuth2SubKind.CLIENT) {
            return this.fromClient(identity.data);
        }

        if (identity.type === OAuth2SubKind.ROBOT) {
            return this.fromRobot(identity.data);
        }

        return this.fromUser(identity.data);
    }

    fromClient(input: Client) : OpenIDTokenPayload {
        return this.extract(this.clientMap, input);
    }

    fromRobot(input: Robot): OpenIDTokenPayload {
        return this.extract(this.robotMap, input);
    }

    fromUser(input: User) : OpenIDTokenPayload {
        return this.extract(this.userMap, input);
    }

    protected extract<T extends ObjectLiteral = ObjectLiteral>(
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
}
