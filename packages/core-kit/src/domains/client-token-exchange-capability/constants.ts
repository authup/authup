/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Which subjects a client may exchange tokens for under a capability, measured
 * against the client's own realm.
 */
export enum ClientTokenExchangeRealmScope {
    OWN = 'own',
    ANY = 'any',
}

export const CLIENT_TOKEN_EXCHANGE_AUDIENCE_MAX_LENGTH = 256;

/**
 * The widest ceiling a capability may set for an issued token, in seconds.
 */
export const CLIENT_TOKEN_EXCHANGE_TOKEN_MAX_AGE = 86400;

export const CLIENT_TOKEN_EXCHANGE_CAPABILITY_TYPE_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;

export const CLIENT_TOKEN_EXCHANGE_CAPABILITY_ACTION_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;

/**
 * Bounds the `text` column, so an oversized list is a validation error on
 * every dialect instead of a mysql write failure.
 */
export const CLIENT_TOKEN_EXCHANGE_CAPABILITY_VALUE_MAX_LENGTH = 4096;
