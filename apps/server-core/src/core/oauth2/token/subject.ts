/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identity, Session } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';

/**
 * Whether the identity a token names belongs to the realm the token names.
 * A token verifies against a signing key of its own realm only, so its
 * subject has to be of that realm too: every issuer stamps the subject's own
 * realm, and a subject of another realm is one that realm's key cannot vouch
 * for.
 */
export function isTokenSubject(
    identity: Identity | null | undefined,
    token: Pick<OAuth2TokenPayload, 'realm_id'>,
): identity is Identity {
    return !!identity &&
        !!token.realm_id &&
        identity.data.realmId === token.realm_id;
}

/**
 * Whether a token's subject may act through it: it is the token's own
 * subject (see isTokenSubject) and still active.
 */
export function isTokenSubjectActive(
    identity: Identity | null | undefined,
    token: Pick<OAuth2TokenPayload, 'realm_id'>,
): identity is Identity {
    return isTokenSubject(identity, token) && !!identity.data.active;
}

/**
 * Whether a session is the one a token rides: the same subject, in the same
 * realm.
 */
export function isTokenSession(
    session: Pick<Session, 'sub' | 'subKind' | 'realmId'>,
    token: Pick<OAuth2TokenPayload, 'sub' | 'sub_kind' | 'realm_id'>,
): boolean {
    return !!token.sub &&
        !!token.realm_id &&
        session.sub === token.sub &&
        session.subKind === token.sub_kind &&
        session.realmId === token.realm_id;
}
