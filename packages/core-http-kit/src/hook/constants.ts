/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum ClientAuthenticationHookEventName {
    REFRESH_FINISHED = 'refreshFinished',
    REFRESH_FAILED = 'refreshFailed',

    HEADER_SET = 'headerSet',
    HEADER_UNSET = 'headerRemoved',
}
