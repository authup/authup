export type ParsedResponseError = {
    code: string | undefined,
    statusCode: number | undefined,
    message: string
}

export function parseResponseError(e: any) : ParsedResponseError {
    let code : string | undefined;
    let statusCode : number | undefined;
    let message : string = 'A network error occurred.';

    if(typeof e?.response?.data?.code === 'string') {
        code = e.response.data.code;
    }

    if(typeof e?.response?.data?.error_description === 'string') {
        message = e.response.data.error_description;
    }

    if(typeof e?.response?.data?.message === 'string') {
        message = e.response.data.message;
    }

    if(typeof e?.response?.status === 'number') {
        statusCode = e.response.status;
    }

    return {
        code,
        message,
        statusCode
    }
}
