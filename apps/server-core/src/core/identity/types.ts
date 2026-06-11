/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Per-request ambience the HTTP adapter passes alongside the raw payload of
 * an identity workflow (registration, password recovery, ...). Carries no
 * business data — only context such as the requester's preferred locale,
 * which drives outbound mail localization.
 */
export type IdentityWorkflowContext = {
    locale?: string,
};
