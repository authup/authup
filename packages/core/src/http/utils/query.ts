/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function buildHTTPQuery(
    data?: string | Record<string, any>,
    withQuestionMark: boolean = true
) : string {
    // If the data is falsy or is already a string, return it as-is
    if(!data || typeof data === 'string') return '';

    // Create a query array to hold the key/value pairs
    const query = [];

    // Loop through the data object
    for (const key in data) {
        /* istanbul ignore next */
        if (!data.hasOwnProperty(key)) {
            continue;
        }

        let value = data[key];

        const type : string = Object.prototype.toString.call(value);
        switch (type) {
            case "[object Array]":
                value = value.join(',');
                query.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
                break;
            case "[object Object]":
                for(const k in value) {
                    /* istanbul ignore next */
                    if (!value.hasOwnProperty(k)) {
                        continue;
                    }

                    let v : any = value[k];

                    const nestedType : string = Object.prototype.toString.call(v);

                    switch (nestedType) {
                        case "[object Array]":
                            v = v.join(',');
                            query.push(encodeURIComponent(key+'['+k+']') + '=' + encodeURIComponent(v));
                            break;
                        case "[object Number]":
                        case "[object String]":
                        case "[object Boolean]":
                            query.push(encodeURIComponent(key+'['+k+']') + '=' + encodeURIComponent(v));
                            break;
                    }
                }
                break;
            case "[object Number]":
            case "[object String]":
            case "[object Boolean]":
                query.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
                break;
        }
    }

    if(query.length === 0) return '';

    // Join each item in the array with a `&` and return the resulting string
    return (withQuestionMark ? '?' : '') + query.join('&');
}
