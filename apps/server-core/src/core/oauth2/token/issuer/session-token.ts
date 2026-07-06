/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SessionTokenKind } from '@authup/core-kit';
import type { OAuth2TokenPayload } from '@authup/specs';
import type { ISessionTokenRepository } from '../../session-token/index.ts';

/**
 * Write the durable auth_session_tokens inventory row for a freshly issued
 * token. Skipped when no repository is wired (issuer used outside the DB
 * context) or the token carries no session (nothing to bind the row to).
 */
export async function persistSessionTokenRow(
    repository: ISessionTokenRepository | undefined,
    data: OAuth2TokenPayload,
    kind: SessionTokenKind,
    extra: { parent_id?: string | null, refresh_token_id?: string | null } = {},
): Promise<void> {
    if (!repository || !data.session_id || !data.jti || typeof data.exp !== 'number') {
        return;
    }

    await repository.create({
        id: data.jti,
        session_id: data.session_id,
        kind,
        parent_id: extra.parent_id ?? null,
        refresh_token_id: extra.refresh_token_id ?? null,
        ip_address: data.remote_address ?? '',
        user_agent: data.user_agent ?? '',
        expires_at: new Date(data.exp * 1000).toISOString(),
    });
}
