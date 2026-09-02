/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Client, 
    Identity, 
    User,
} from '@authup/core-kit';
import { hasOwnProperty } from '@authup/kit';
import type { OpenIDClaims, OpenIDTokenPayload } from '@authup/specs';
import { OAuth2SubKind } from '@authup/specs';
import type { ObjectLiteral } from 'validup';

type AttributeMapTuple<T> = {
    [K in keyof T]: [K, (value: unknown) => any]
}[keyof T];

/**
 * Keyed on `OpenIDClaims`, never on `OpenIDTokenPayload`: the latter inherits
 * `JWTClaims`' `[key: string]: any`, so `keyof` collapses to `string | number`
 * and the map accepts any claim name at all — a typo compiles and the claim is
 * simply never emitted, which is the failure mode #3518 is about. `OpenIDClaims`
 * carries no index signature, so a name that is not a claim fails the build.
 * `Partial`, because a map declares only the claims its entity can supply.
 */
type AttributeMap<T extends Record<string, any>> = Partial<Record<
    keyof OpenIDClaims,
keyof T | AttributeMapTuple<T>
>>;

export class OAuth2OpenIDClaimsBuilder {
    protected clientMap : AttributeMap<Client> = {
        name: 'name',
        nickname: 'name',
        preferred_username: 'name',
        updated_at: [
            'updatedAt',
            (value: unknown) => {
                if (typeof value === 'string') {
                    return Math.floor(new Date(value).getTime() / 1000);
                }

                return value;
            },
        ],
    };

    protected userMap : AttributeMap<User> = {
        name: 'name',
        family_name: 'lastName',
        given_name: 'firstName',
        nickname: 'displayName',
        preferred_username: 'displayName',
        updated_at: [
            'updatedAt',
            (value: unknown) => {
                if (typeof value === 'string') {
                    return Math.floor(new Date(value).getTime() / 1000);
                }

                return value;
            },
        ],

        email: 'email',
        email_verified: 'emailVerified',
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

        return this.fromUser(identity.data);
    }

    fromClient(input: Client) : OpenIDTokenPayload {
        return this.extract(this.clientMap, input);
    }

    fromUser(input: User) : OpenIDTokenPayload {
        return this.extract(this.userMap, input);
    }

    /**
     * A claim is emitted only for a value that exists AND is not nullish.
     *
     * The map reads entity columns, several of which are nullable, and OIDC
     * models an unavailable claim as one that is not returned rather than one
     * returned as `null` — so a user without a display name must omit
     * `nickname`, not answer `nickname: null` (#3518). Emitting the null also
     * put a JSON `null` claim value into every id_token, which no relying
     * party expects.
     */
    protected extract<T extends ObjectLiteral = ObjectLiteral>(
        attributeMap: AttributeMap<T>,
        attributes: T,
    ) : OpenIDTokenPayload {
        const result = {} as OpenIDTokenPayload;

        const keys = Object.keys(attributeMap) as (keyof OpenIDClaims)[];
        for (const key_ of keys) {
            const attribute = attributeMap[key_];

            let value : unknown;
            if (typeof attribute === 'string') {
                if (!hasOwnProperty(attributes, attribute)) {
                    continue;
                }

                value = attributes[attribute];
            } else {
                const [key, transformer] = attribute as AttributeMapTuple<T>;

                if (!hasOwnProperty(attributes, key)) {
                    continue;
                }

                value = transformer(attributes[key]);
            }

            if (
                typeof value === 'undefined' ||
                value === null
            ) {
                continue;
            }

            // Cast on the VALUE side only: which claim is written is checked by
            // `AttributeMap`'s key type, while the value comes out of an entity
            // column through an untyped transformer and never had a type here.
            (result as Record<string, unknown>)[key_] = value;
        }

        return result;
    }
}
