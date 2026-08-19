/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

type Cookie = {
    value: string,
    path: string,
    expired: boolean,
};

/**
 * The cookie jar `fetch` does not have.
 *
 * A spec that reads `set-cookie` and echoes it back by hand proves the server
 * SENT a cookie, never that a browser would send it BACK: the `Path` is not
 * consulted, so a wrongly scoped cookie passes. That is not hypothetical —
 * a malformed callback URL shipped for exactly as long, because every spec
 * built the URL itself.
 *
 * This keeps the parts of RFC 6265 a same-origin test can observe: last write
 * wins per name, `Path` decides whether a request carries the cookie, and a
 * `Max-Age=0` / past `Expires` removes it.
 */
export class TestCookieJar {
    private cookies = new Map<string, Cookie>();

    /**
     * @param response the response whose `set-cookie` headers to store
     */
    store(response: Response) : void {
        const headers = typeof (response.headers as any).getSetCookie === 'function' ?
            (response.headers as any).getSetCookie() as string[] :
            [response.headers.get('set-cookie')].filter((value): value is string => !!value);

        for (const header of headers) {
            const [pair, ...attributes] = header.split(';').map((part) => part.trim());
            const index = pair.indexOf('=');
            if (index < 0) {
                continue;
            }

            const name = pair.slice(0, index);
            const value = pair.slice(index + 1);

            let path = '/';
            let expired = value.length === 0;

            for (const attribute of attributes) {
                const [key, attributeValue = ''] = attribute.split('=');
                switch (key.toLowerCase()) {
                    case 'path': {
                        path = attributeValue || '/';
                        break;
                    }
                    case 'max-age': {
                        if (Number(attributeValue) <= 0) {
                            expired = true;
                        }
                        break;
                    }
                    case 'expires': {
                        if (new Date(attributeValue).getTime() <= Date.now()) {
                            expired = true;
                        }
                        break;
                    }
                    default:
                        break;
                }
            }

            if (expired) {
                this.cookies.delete(name);
                continue;
            }

            this.cookies.set(name, {
                value, 
                path, 
                expired, 
            });
        }
    }

    /**
     * @param path the request path the cookies would be sent to
     * @returns the `cookie` header value, or undefined when nothing matches
     */
    header(path: string) : string | undefined {
        const pairs : string[] = [];

        for (const [name, cookie] of this.cookies) {
            if (matchesPath(path, cookie.path)) {
                pairs.push(`${name}=${cookie.value}`);
            }
        }

        return pairs.length > 0 ? pairs.join('; ') : undefined;
    }

    get(name: string) : string | undefined {
        return this.cookies.get(name)?.value;
    }

    clear() : void {
        this.cookies.clear();
    }
}

// RFC 6265 §5.1.4
function matchesPath(requestPath: string, cookiePath: string) : boolean {
    const path = requestPath.split('?')[0] || '/';

    if (path === cookiePath) {
        return true;
    }

    if (!path.startsWith(cookiePath)) {
        return false;
    }

    return cookiePath.endsWith('/') || path.charAt(cookiePath.length) === '/';
}
