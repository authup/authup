# HTTP

## `MiddlewareOptions`

```typescript
type MiddlewareOptions = {
    bodyParser: boolean,
    cookieParser: boolean,
    response: boolean,
    swagger: MiddlewareSwaggerOptions
};
```
**Type References**
- [MiddlewareSwaggerOptions](#middlewareswaggeroptions)

## `MiddlewareSwaggerOptions`

```typescript
export type MiddlewareSwaggerOptions = {
    enabled: boolean,
    directory?: string
};
```
