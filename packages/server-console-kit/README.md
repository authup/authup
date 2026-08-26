# @authup/server-console-kit

[![npm version](https://badge.fury.io/js/@authup%2Fserver-console-kit.svg)](https://badge.fury.io/js/@authup%2Fserver-console-kit)
[![CI](https://github.com/authup/authup/actions/workflows/main.yml/badge.svg)](https://github.com/authup/authup/actions/workflows/main.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/authup/badge.svg)](https://snyk.io/test/github/Tada5hi/authup)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

The page-serving mechanism every authup console service shares.

A console service turns a built console bundle into an HTTP response, and
the steps are the same whichever console it serves: read the shared
locale / color-mode cookies, stamp them onto the shell, splice the
rendered markup or the runtime config into the template, rebase the asset
URLs when authup is served under a sub-path, and set the security headers
a login surface needs.

This package owns those steps so no two services can spell them
differently. `replaceTemplateMarker` in particular is what defends the
`$'`-expansion trap: a string replacement re-interprets `$&`, `` $` ``,
`$'` and `$$` in the value, and the values spliced into a console shell
carry raw request input. It must exist exactly once.

## Installation

```bash
npm install @authup/server-console-kit --save
```

## Usage

```typescript
import {
    applyUIPageHeaders,
    readUIClientPreferences,
    rebaseAssetURLs,
    replaceTemplateMarker,
    stampHtmlAttributes,
} from '@authup/server-console-kit';

const preferences = readUIClientPreferences(event);

let body = replaceTemplateMarker(template, '<!--app-html-->', appHtml);
body = stampHtmlAttributes(body, preferences);
body = rebaseAssetURLs(body, basePath, '/console/auth/');

applyUIPageHeaders(event);
```

## License

Made with 💚

Published under [Apache-2.0 License](./LICENSE).
