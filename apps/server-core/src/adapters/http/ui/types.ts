/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type UIRenderContext = {
    url: string,
    payload: {
        config: Record<string, any>,
        data: Record<string, any>,
    },
};
