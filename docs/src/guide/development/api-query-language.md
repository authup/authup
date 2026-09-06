# Query Language

Every collection `GET` accepts the same five query parameters: which rows come
back, which columns of them, in which order, with which relations attached, and
how many at a time. The vocabulary is per entity and is published rather than
guessed. This page defines the grammar; [Query Reference](./api-query-reference)
lists the keys each entity accepts.

Nothing here needs an SDK. The whole surface is URL query parameters and JSON.

## The five parameters

| URL parameter | Purpose | Description key |
| --- | --- | --- |
| `filter` | which rows | `filters` |
| `fields` | which columns | `fields` |
| `sort` | in which order | `sorts` |
| `include` | which relations | `relations` |
| `page[limit]`, `page[offset]` | how many | `pagination` |

The third column matters because the published description names the parameters
in the plural, and three of them do not match the URL spelling: `filters`
describes `?filter[...]`, `relations` describes `?include`, and `sorts`
describes `?sort`. That is a rapiq convention authup inherits, so a client
reading a description has to map the two.

## filter

### Bracket form

One bracket per key. The operator is a prefix, a suffix or both on the VALUE,
never a separate parameter:

| Value | Matches | Example |
| --- | --- | --- |
| `v` | equal to | `filter[name]=admin` |
| `a,b` | any of | `filter[name]=admin,user` |
| `!v` | not equal to | `filter[name]=!admin` |
| `!a,b` | none of | `filter[name]=!admin,user` |
| `v~` | starts with | `filter[name]=adm~` |
| `~v` | ends with | `filter[name]=~min` |
| `~v~` | contains | `filter[name]=~dmi~` |
| `<v` `<=v` | less than, at most | `filter[expiresAt]=<2026-01-01` |
| `>v` `>=v` | greater than, at least | `filter[expiresAt]=>2026-01-01` |

Values are coerced: `true` and `false` become booleans, `null` becomes null,
a numeric string becomes a number, anything else is a trimmed string. So
`filter[realmId]=null` selects the global rows and `filter[builtIn]=!true`
selects the rest. The three wildcard forms keep their value raw, since a
substring is a substring.

Two things about the leading `!` are worth knowing before it bites:

- it negates the five operators that have an opposite (`equal`, `any of`, and
  the three wildcards) and is **silently discarded on the comparisons**.
  `filter[expiresAt]=!<=2026` is read as `<=2026`, not as its negation. This is
  a frozen wire quirk, kept because changing it would silently redefine
  existing clients' queries.
- it is part of the value, so it has to survive URL encoding like any other
  character.

A dotted key traverses a relation, and the join is implied:
`filter[realm.name]=master` filters roles by their realm's name without
`include=realm`. The key is resolved against the RELATED entity's own
allow-list, and the hop is authorized exactly as the include would be, so a
caller who may not read realms gets the whole condition dropped rather than an
error.

### Expression form

The same parameter also accepts a nested expression, which is the only way to
express a disjunction:

```
filter=and(eq(realmId,null),or(contains(name,'adm'),contains(displayName,'Adm')))
```

Functions: `and`, `or`, `not`, `eq`, `lt`, `lte`, `gt`, `gte`, `contains`,
`startsWith`, `endsWith`, `in`, `nin`, `elemMatch`, `size`. Membership is
variadic: `in(name,'admin','user')`.

**Every literal is quoted with single quotes, except `null`.** `eq(builtIn,'true')`
is a boolean true, and a bare `eq(builtIn,true)` is a syntax error, because an
unquoted word is a field reference. This is the one part of the dialect that
catches everyone once.

The form is detected from the value, so it needs no opt-in. `codec=url-expression`
alongside it states the dialect explicitly, which is worth doing when a value
could plausibly parse either way.

A top-level `or(...)` stays a disjunction, and nothing folds its branches into
the surrounding conjunction. It does have to satisfy the index rule below on its
own, though: an `or` counts as anchored only when every one of its branches is,
and a bare one has no sibling condition to anchor on its behalf. Scoping it, as
the example above does, is what lets a branch ride along.

## fields

`fields=id,name` projects a subset. `fields[$root]=id&fields[realm]=name`
projects per relation, with `$root` naming the entity itself.

Each entity has two halves to its column list: the ones returned when the
parameter is absent, and the ones that have to be asked for by name. The second
half is small and deliberate (`client.secret`, `user.email`,
`key.certificate`), and the reference states it per entity.

An `include` narrows the joined relation to its own default projection, so
`include=realm` returns the realm's ordinary columns rather than all of them.

## sort

`sort=name` ascends, `sort=-name` descends, and several keys are comma
separated.

A multi-key sort is honoured only when the key sequence is a **leftmost prefix
of one of the entity's declared indexes**. It is otherwise dropped whole, and
the rows come back unordered rather than as an error. `sort=name,-createdAt` on
roles is exactly that case: both keys sort individually, no index leads with
both, so neither applies. The reference prints each entity's index prefixes for
this reason.

## include

`include=realm` attaches one relation, comma separated for several, dotted for
a nested hop (`include=user.realm`).

Every hop is authorized separately. A relation the caller may not read is
stripped from the include, and every filter, sort and field key that traversed
it goes with it. The request still succeeds, with the un-joined row shape. That
is deliberate: a list endpoint that answered 403 because one optional relation
was not readable would be unusable for a caller whose permissions vary by row.

## page

`page[limit]` and `page[offset]`. A limit above the entity's maximum is
**clamped, not rejected**, so a client asking for 5000 rows receives the
maximum and has to page. The response's `meta.total` is the count before
pagination, and it is exact: authorization runs as a `WHERE` clause rather than
as a post-filter wherever it can be expressed as one.

## What fails, and how

The parameters fail soft. An unknown key in `fields`, `sort`, `include` or the
bracket `filter` form is dropped and the rest of the request is served, because
a client built against a newer release should degrade rather than break.

The exception is the **expression** filter form, which answers `400`. It is a
single value that either parses or does not, so a dropped key there would
silently widen the result set, and a query meant to select one row would return
the table. An unknown key inside it is rejected for the same reason.

Two more rules narrow what is accepted, and both come from the underlying
indexes:

- every `AND` group of a filter needs at least one condition on an
  index-leading key, and an `or(...)` counts only when every branch has one.
- `createdAt` and `updatedAt` are sortable but deliberately not filterable.
  They are stored through a transformer that applies on read and not to a
  comparison, so a filter on them would compare an ISO string against the
  driver's own storage format and quietly return the wrong rows. The
  `varchar(28)` ISO columns that are written as plain strings
  (`session.expiresAt`, `sessionToken.expiresAt`) are filterable and compare
  correctly.

## Discovering the vocabulary

Three surfaces publish the same descriptions, so nothing has to be hard-coded
against a release:

- **`meta.schema`** on every query-capable `GET`. The response that carries the
  rows also carries what could have been asked of them.
- **`GET /schemas`** returns every entity's description in one call, and
  **`GET /schemas/:name`** one of them. Both are authenticated. `meta.hash`
  fingerprints the whole surface, so a client that cached the descriptions
  compares one value instead of diffing them, and `meta.recordParameters` names
  the subset a single-record read accepts. An operator may switch these routes
  off (`QUERY_SCHEMA_DISCOVERY_ENABLED=false`), in which case both answer `404`;
  `meta.schema` is unaffected.
- **the OpenAPI document**, browsable at `/docs` and machine-readable at
  `/docs/openapi.json`. Each query-capable operation declares the five
  parameters and points at the root `x-authup-schemas` map for its full
  description, and `x-authup-schema-hash` is the same fingerprint.

A description reads like this:

```json
{
    "name": "role",
    "strict": false,
    "indexes": [["id"], ["name", "clientId", "realmId"], ["displayName"]],
    "fields": { "default": null, "allowed": ["id", "name", "..."] },
    "filters": { "allowed": ["id", "name", "..."], "caseSensitive": null, "indexed": "anchor" },
    "sorts": { "allowed": ["id", "name", "..."], "default": null, "indexed": true },
    "relations": { "allowed": ["realm"], "schemas": { "realm": "realm" } },
    "pagination": { "maxLimit": 50 }
}
```

Reading rules:

- the shape is **normalized**: every described parameter carries every
  constraint key. `null` means the constraint was never declared, an empty
  array means an explicit "nothing allowed".
- `default` and `allowed` under `fields` are **disjoint halves of one
  allow-list**, not a subset and its superset. What may be selected is their
  union; what comes back without the parameter is `default`, or everything when
  `default` is null.
- relation vocabulary is **referenced, not expanded**. `relations.schemas` names
  the schema governing each relation, which is where a dotted key's own
  allow-list lives. The two names differ where a relation is not named after its
  target, as `client.accessPolicy` is described by `policy`.
- `indexes` is the index topology the two rules above resolve against.
- the description is the **static upper bound**. It says what may be asked, never
  what a given caller may read: the relation gate and the per-column visibility
  conditions narrow the answer per request, silently and by design.

## Single-record reads

A single-record `GET` accepts `fields` and `include` only. It processes no
filter, no sort and no page, so its `meta.schema` advertises the two-parameter
subset rather than the whole vocabulary.

Record endpoints are still converging on this: one that does not decode the
query yet answers with its default projection instead of failing, and
`GET /userinfo` is a flat OIDC claims document rather than the record envelope.
Treat the subset as what a record read will accept, not as what every one of
them honours today.
