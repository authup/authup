/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '../../utils';

export function buildHTTPQuery(
    data?: string | Record<string, any>,
    withQuestionMark = true,
) : string {
    // If the data is falsy or is already a string, return it as-is
    if (!data || typeof data === 'string') return '';

    // Create a query array to hold the key/value pairs
    const query = [];

    // Loop through the data object
    const dataKeys = Object.keys(data);
    for (let i = 0; i < dataKeys.length; i++) {
        const key = dataKeys[i];

        /* istanbul ignore next */
        if (!hasOwnProperty(data, key)) {
            // eslint-disable-next-line no-continue
            continue;
        }

        let value = data[key];

        const type : string = Object.prototype.toString.call(value);
        switch (type) {
            case '[object Array]':
                value = value.join(',');
                query.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                break;
            case '[object Object]': {
                const valueKeys = Object.keys(value);
                for (let j = 0; j < valueKeys.length; j++) {
                    const k = valueKeys[j];

                    /* istanbul ignore next */
                    if (!hasOwnProperty(value, k)) {
                        // eslint-disable-next-line no-continue
                        continue;
                    }

                    let v: any = value[k];

                    const nestedType: string = Object.prototype.toString.call(v);

                    switch (nestedType) {
                        case '[object Array]':
                            v = v.join(',');
                            query.push(`${encodeURIComponent(`${key}[${k}]`)}=${encodeURIComponent(v)}`);
                            break;
                        case '[object Number]':
                        case '[object String]':
                        case '[object Boolean]':
                            query.push(`${encodeURIComponent(`${key}[${k}]`)}=${encodeURIComponent(v)}`);
                            break;
                    }
                }
                break;
            }
            case '[object Number]':
            case '[object String]':
            case '[object Boolean]':
                query.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
                break;
        }
    }

    if (query.length === 0) return '';

    // Join each item in the array with a `&` and return the resulting string
    return (withQuestionMark ? '?' : '') + query.join('&');
}
