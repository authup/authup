/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * B1 — authup domain errors are represented as validup-style issues so
 * the client can reuse the issue → message machinery (structured `code`
 * + `data`, `{{param}}` interpolation) instead of a bespoke pipeline.
 *
 * The messages live under their own ilingo namespace
 * (`TranslatorTranslationNamespace.ERROR`, value `authupError`) — a
 * *sibling* of validup's own `validup` namespace rather than merged into
 * it, so `@ilingo/validup-vue`'s install can't overwrite authup codes
 * (and vice versa). `useErrorTranslator()` (in `@authup/client-web-kit`)
 * resolves a server error's `code` + `data` against this namespace.
 *
 * The catalog is keyed by `@authup/errors`' `ErrorCode` values. The
 * `AuthupErrorData` map below is the typed *producer* contract — the
 * structured data each code may carry on the wire — and the
 * `declare module 'validup'` block augments validup's `IssueDataByCode`
 * wherever this package is imported. Today that is the client only
 * (`@authup/client-web-kit` re-exports this module, so `useErrorTranslator()`
 * and any client-side issue construction get the typed `data`). It does
 * **not** reach server-side producers: `apps/server-core` does not depend
 * on `@authup/i18n`. If typed `defineIssueItem` / `createValidupError`
 * on the server is wanted, the augmentation must move to `@authup/errors`
 * (which the server already depends on). Codes absent from the map carry
 * no data and are used as bare string codes (`IssueItem.code` is widened
 * to `string & {}`).
 *
 * The shipped catalog messages are intentionally *generic* (no
 * `{{param}}`), not because the data is unavailable but because ilingo's
 * `template()` leaves an unknown data key in place verbatim — a message
 * like `'The {{entity}} ...'` would render the literal `{{entity}}`
 * whenever a producer omits it. `useErrorTranslator()` passes the whole
 * serialized error body to `get()` as `data`, so a parameterized message
 * would interpolate from it — but since every shipped message is currently
 * param-free, interpolation is a no-op and the data just rides along
 * (ready for logging / richer UI). If a `{{param}}` message is added later,
 * merge per-code defaults before `get()` so a missing param can't leak.
 */

/**
 * Interpolation params per parameterized `ErrorCode`. Keys are the
 * literal `ErrorCode` values (kept in sync with `@authup/errors`).
 */
export type AuthupErrorData = {
    entity_not_found: { entity?: string },
    entity_conflict: { entity?: string },
    invalid_scope: { scope?: string },
    insufficient_scope: { scope?: string },
};

declare module 'validup' {
    interface IssueDataByCode {
        entity_not_found: AuthupErrorData['entity_not_found'];
        entity_conflict: AuthupErrorData['entity_conflict'];
        invalid_scope: AuthupErrorData['invalid_scope'];
        insufficient_scope: AuthupErrorData['insufficient_scope'];
    }
}
