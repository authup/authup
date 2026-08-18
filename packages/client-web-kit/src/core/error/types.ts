/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Issue } from '@ebec/core';

export type ErrorContext = {
    code?: string;
    data?: Record<string, any>;
    message?: string;
    issues?: Issue[];
    /**
     * The HTTP status of the transport error (a hapic `ClientError`'s
     * `response.status`), when the error arrived over HTTP. Absent for a
     * directly-thrown / non-HTTP error.
     */
    status?: number;
};
