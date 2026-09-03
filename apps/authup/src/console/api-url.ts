/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import net from 'node:net';
import type { ConsoleConfigs } from './types.ts';

/**
 * What this needs of server-core's resolved configuration, and no more: the
 * two addresses to compare and the listener to fall back to.
 */
export type InternalApiUrlContext = {
    publicUrl: string,
    internalUrl: string,
    host: string,
    port: number,
};

/**
 * The address this process reaches its OWN listener at, for the composed
 * `authup start` and `dev`, where the consoles are mounted onto server-core's
 * listener and the auth console's server-side render calls back into the same
 * process.
 *
 * Only the CLI can compute this, which is the same reason it owns the mount
 * composition: `publicUrl` is where a BROWSER reaches the deployment, and
 * under a port mapping or a reverse proxy that address need not resolve from
 * inside the container at all (#3550). The listen keys are what does.
 *
 * No path is carried, because server-core mounts every route root-relative:
 * the proxy strips `publicUrl`'s prefix before a request arrives, so a
 * self-call must not re-add it. Same rule as
 * `createPublicToInternalURLRewriter` in server-core, which subtracts it.
 */
export function buildInternalUrl(host: string, port: number) : string {
    // A wildcard listen address is not dialable; loop back explicitly, as
    // server-core's internal client does. A host naming one interface is
    // dialable as itself, and 127.0.0.1 would not be bound.
    const dialable = !host || host === '0.0.0.0' || host === '::' || host === '[::]' ?
        '127.0.0.1' :
        host;

    // An IPv6 literal has to be bracketed before a port can follow it, or the
    // url does not parse at all and the render fails where it used to reach
    // `publicUrl`. `net.isIPv6` is the exact test: it rejects an
    // already-bracketed value (left as it is, correctly) and the `host:port`
    // form the host key tolerates.
    const authority = net.isIPv6(dialable) ? `[${dialable}]` : dialable;

    return `http://${authority}:${port}`;
}

/**
 * Point the auth console's server-side render at this process's own listener,
 * for the two roles that compose it onto server-core's (`start` and `dev`).
 *
 * A `internalUrl` that DIFFERS from `publicUrl` wins: on a cluster network
 * the operator's own service address is the answer, and a composed process is
 * still allowed to have one (an egress rule, a mesh sidecar).
 *
 * An EQUAL one does not, and that is deliberate rather than an approximation
 * of provenance. The key resolves to `publicUrl` when unset, so equality is
 * what "no distinct inside address" looks like however it arose -- and a
 * value spelled out to equal the public one names no inside address either.
 * Honouring it would send this process through its own ingress and TLS to
 * reach itself, which is exactly the configuration that produced #3550 and
 * exactly what `createInternalHttpClient` avoids for server-core's own
 * self-calls. Treating the two as one case keeps the foot-gun unreachable;
 * a deployment that genuinely wants the long way round can run the console
 * as its own service, where nothing is overridden.
 */
export function applyInternalApiUrl(consoles: ConsoleConfigs, config: InternalApiUrlContext) : void {
    if (config.internalUrl !== config.publicUrl) {
        return;
    }

    consoles.auth.apiInternalUrl = buildInternalUrl(config.host, config.port);
}
