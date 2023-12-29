/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ConfigRaw } from '@authup/config';
import { read } from '@authup/config';
import type { Config } from '@authup/client-web-config';
import { buildConfig, parseConfig } from '@authup/client-web-config';
import { makeURLPublicAccessible } from '@authup/core';

export async function buildClientWebConfig(input?: ConfigRaw): Promise<Config> {
    let raw : ConfigRaw;
    if (input) {
        raw = input;
    } else {
        raw = await read();
    }

    const data = parseConfig(raw.client.web || {});

    // todo: check raw.server.core existence ...
    if (
        !data.apiUrl &&
        raw.server.core?.publicUrl
    ) {
        data.apiUrl = makeURLPublicAccessible(raw.server.core.publicUrl);
    }

    // todo: check raw.server.core existence ...
    if (
        !data.publicUrl &&
        raw.server.core?.authorizeRedirectUrl
    ) {
        data.apiUrl = makeURLPublicAccessible(raw.server.core.authorizeRedirectUrl);
    }

    return buildConfig({
        data,
        env: true,
    });
}
