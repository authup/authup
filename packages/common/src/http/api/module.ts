/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AuthorizationHeader,
    stringifyAuthorizationHeader,
} from '@typescript-auth/core';
import axios, { AxiosDefaults, AxiosInstance } from 'axios';
import { ApiRequestConfig, ApiResponse } from './type';

/**
 * Inspired by
 * @see https://medium.com/@enetoOlveda/how-to-use-axios-typescript-like-a-pro-7c882f71e34a
 */
export class BaseAPI {
    protected api: AxiosInstance;

    /**
     * API Service
     *
     * @param config
     */
    constructor(config: ApiRequestConfig) {
        this.api = axios.create(config);
    }

    // ---------------------------------------------------------------------------------

    get config() : AxiosDefaults<any> {
        return this.api.defaults;
    }

    public getUri(config?: ApiRequestConfig): string {
        return this.api.getUri(config);
    }

    // ---------------------------------------------------------------------------------

    public setHeader(key: string, value: string) {
        this.api.defaults.headers.common[key] = value;
    }

    public unsetHeader(key: string) {
        if (key in this.api.defaults.headers.common) {
            delete this.api.defaults.headers.common[key];
        }
    }

    public resetHeader() {
        this.api.defaults.headers.common = {};
    }

    // ---------------------------------------------------------------------------------

    public setAuthorizationHeader(options: AuthorizationHeader) {
        this.setHeader('Authorization', stringifyAuthorizationHeader(options));
    }

    public unsetAuthorizationHeader() {
        this.unsetHeader('Authorization');
    }

    // ---------------------------------------------------------------------------------

    public request<T, R = ApiResponse<T>>(config: ApiRequestConfig): Promise<R> {
        return this.api.request(config);
    }

    // ---------------------------------------------------------------------------------

    public get<T, R = ApiResponse<T>>(url: string, config?: ApiRequestConfig): Promise<R> {
        return this.api.get(url, config);
    }

    // ---------------------------------------------------------------------------------

    public delete<T, R = ApiResponse<T>>(url: string, config?: ApiRequestConfig): Promise<R> {
        return this.api.delete(url, config);
    }

    // ---------------------------------------------------------------------------------

    public head<T, R = ApiResponse<T>>(url: string, config?: ApiRequestConfig): Promise<R> {
        return this.api.head(url, config);
    }

    // ---------------------------------------------------------------------------------

    public post<T, R = ApiResponse<T>>(url: string, data?: any, config?: ApiRequestConfig): Promise<R> {
        return this.api.post(url, data, config);
    }

    // ---------------------------------------------------------------------------------

    public put<T, R = ApiResponse<T>>(url: string, data?: any, config?: ApiRequestConfig): Promise<R> {
        return this.api.put(url, data, config);
    }

    // ---------------------------------------------------------------------------------

    public patch<T, R = ApiResponse<T>>(url: string, data?: any, config?: ApiRequestConfig): Promise<R> {
        return this.api.patch(url, data, config);
    }

    //---------------------------------------------------------------------------------

    public mountResponseInterceptor(
        onFulfilled: (value: ApiResponse<any>) => any | Promise<ApiResponse<any>>,
        onRejected: (error: any) => any,
    ) : number {
        return this.api.interceptors.response.use(onFulfilled, onRejected);
    }

    public unmountResponseInterceptor(id: number) {
        this.api.interceptors.response.eject(id);
    }

    //---------------------------------------------------------------------------------

    public mountRequestInterceptor(
        onFulfilled: (value: ApiRequestConfig) => any | Promise<ApiRequestConfig>,
        onRejected: (error: any) => any,
    ) : number {
        return this.api.interceptors.request.use(onFulfilled, onRejected);
    }

    public unmountRequestInterceptor(id: number) {
        this.api.interceptors.request.eject(id);
    }
}
