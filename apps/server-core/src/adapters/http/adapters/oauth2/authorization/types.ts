/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import type {
    IConsentService,
    IOAuth2AuthorizationCodeRequestVerifier,
    OAuth2AuthorizationManagerContext,
} from '../../../../../core/index.ts';

export type HTTPOAuth2AuthorizationManagerContext = OAuth2AuthorizationManagerContext & {
    codeRequestVerifier: IOAuth2AuthorizationCodeRequestVerifier,
    /**
     * Persisted per-scope consent (plan 055): records the approved scope
     * tokens after a successful (non-built_in) authorization. Absent =
     * feature inert.
     */
    consentService?: IConsentService,
    logger?: Logger,
};
