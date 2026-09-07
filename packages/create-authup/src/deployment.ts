/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Exposure } from './types.ts';

/** The port the process listens on inside a container, and the default everywhere else. */
export const LISTEN_PORT = 3000;

// A public url with an explicit port is dialed directly, so that port is the one to publish or to listen on. A
// default port, or https, means a reverse proxy in front owns the port a browser dials and reaches the listener
// on its own, so the default listen port stays. `http://localhost` with no port is read as a proxy too; the
// operator who really serves port 80 directly edits the mapping.
export function describeExposure(publicUrl: string): Exposure {
    const url = new URL(publicUrl);
    const behindProxy = url.protocol === 'https:' || url.port === '';

    return {
        behindProxy,
        hostPort: behindProxy ? LISTEN_PORT : Number(url.port),
    };
}

// The value core.trustProxy / TRUST_PROXY takes: the number of proxy hops the deployment itself knows about
// (the operator's proxy in front, plus the one the compose console split emits), or false when nothing is in front,
// since authup's default trusts every hop and lets any direct client spoof its address.
export function trustProxyValue(exposure: Exposure, ownProxy = false): string {
    const hops = (exposure.behindProxy ? 1 : 0) + (ownProxy ? 1 : 0);

    return hops > 0 ? String(hops) : 'false';
}
