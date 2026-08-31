/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

const PRODUCTION = 'production';

/**
 * A wildcard listen address is not an address a browser can reach, so it is
 * reported as the loopback name the operator would type.
 */
export function toPublicHost(input: string) : string {
    if (input === '0.0.0.0' || input === '::') {
        return 'localhost';
    }

    return input;
}

/**
 * The URL the deployment is reachable at, derived from the document when it
 * does not spell one. The body of `publicUrl`'s own `resolve`.
 *
 * `publicUrl` is the issuer: it signs into every token, every discovery
 * document, every mail deep link and every cookie scope. It has to mean ONE
 * thing to every service reading the same `authup.yml`, which is why the
 * derivation reads `server.core.host` and `server.core.port` -- document
 * keys, not facts about whichever process happens to be asking. A console
 * therefore computes the identical value with no server-core anywhere, which
 * is what makes a console able to stand alone: the alternative was to refuse
 * to start without an explicit PUBLIC_URL, and then the same file would mean
 * different things depending on who read it.
 *
 * The `host:port` form is accepted because `host` has always tolerated it,
 * and the port it carries wins over the separate key.
 */
export function derivePublicUrl(
    value: string | undefined,
    host: string | undefined,
    port: number | undefined,
    env: string | undefined,
) : string {
    if (value) {
        return value;
    }

    const listenHost = host || '0.0.0.0';
    // agrees with `server.core.port`'s declared default; a caller that built
    // defaults always supplies one, so this covers a caller that did not
    const listenPort = port ?? 3000;

    const match = listenHost.match(/^([^:]+)(?::(\d+))?$/);
    const url = match ?
        `http://${toPublicHost(match[1])}:${match[2] || listenPort}` :
        `http://${toPublicHost(listenHost)}:${listenPort}`;

    // Derived it reads http://<host>:<port>, which is right on a laptop and
    // wrong behind any proxy, and nothing downstream can tell the two apart
    // afterwards. Warn rather than throw: a value every service agrees on is
    // worth more than a refusal only one of them could have raised.
    if (env === PRODUCTION) {
        // eslint-disable-next-line no-console
        console.warn(
            `[authup] publicUrl is not configured and was derived as ${url}. ` +
            'Set it to the URL the identity provider is reachable at.',
        );
    }

    return url;
}
