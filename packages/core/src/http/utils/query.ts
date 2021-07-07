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

        if(value && typeof value === 'object') {
            if(value.constructor === Array) {
                value = value.join(',');
            }

            if(value.constructor === Object) {
                for(const k in value) {
                    /* istanbul ignore next */
                    if (!value.hasOwnProperty(k)) {
                        continue;
                    }

                    let v : any = value[k];

                    if(v && typeof v === 'object' && v.constructor === Array) {
                        v = v.join(',');
                    }

                    query.push(encodeURIComponent(key+'['+k+']') + '=' + encodeURIComponent(v));
                }

                continue;
            }
        }


        // Encode each key and value, concatenate them into a string, and push them to the array
        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }

    // Join each item in the array with a `&` and return the resulting string
    return (withQuestionMark ? '?' : '') + query.join('&');
}
