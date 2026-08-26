@authup/server-config-kit

Declarative configuration schema: one registry per config type, deriving the environment reader, the validator mounts, the defaults and a JSON Schema document.

A registry is a plain object mapping every key of a config type onto its zod
type, its description, its default and (optionally) the environment variable
name plus the reader that turns a raw string into a value. This package holds
the declaration shape, the environment readers, and the four passes over such a
registry: read the environment, build the defaults, mount the validator, and
emit a JSON Schema document. WHICH keys exist is the caller's registry, never
this package's business.

It declares NO `@authup/*` dependency at all and sits at the foundation layer
next to `kit` and `errors`. A server package must be able to read its own
configuration without depending on server-core, and without inheriting
server-kit's tail (native `@node-rs/bcrypt` and `jsonwebtoken`, `winston`,
`redis`, the socket.io emitter, `@rapiq/core`). Keep it that way.
