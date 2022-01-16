[![npm version](https://badge.fury.io/js/@typescript-auth%2Fcore.svg)](https://badge.fury.io/js/@typescript-auth%2Fcore)
[![main](https://github.com/Tada5hi/typescript-auth/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/typescript-auth/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/typescript-auth/branch/master/graph/badge.svg?token=FHE347R1NW)](https://codecov.io/gh/Tada5hi/typescript-auth)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/typescript-auth/badge.svg)](https://snyk.io/test/github/Tada5hi/typescript-auth)

# @typescript-auth/core ☀
The main propose of this package, is to provide general utilities for authorization & authentication.
It also contains core functions, for few other modules of the `@typescript-auth` namespace.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Ability/Permissions](#abilitypermissions)
  - [HTTP Header](#http-header)
  - [Protocols](#protocols)
    - [Oauth2](#oauth2)

## Installation

```bash
npm install @typescript-auth/core --save
```

## Usage

### Ability/Permissions
The `AbilityManager` provides an easy way to group permissions for a client session 
and allows sharing those permissions between UI, API and microservices.
It easily scales between a claim based and subject/attribute based authorization.

**AbilityManager**

```typescript
import {
    AbilityManager,
    buildAbilityMetaFromName,
    PermissionItem
} from "@typescript-auth/core";

type User = {
    id: number;
    name: string;
    age: number;
}

const permissions: PermissionItem<User>[] = [
    {
        id: 'user_add', 
        condition: {
            age: {$gt: 20}
        }
    },
    {
        id: 'user_drop'
    }
];

const manager = new AbilityManager(permissions);

console.log(manager.can('add', 'user', {age: 40}));
// true

console.log(manager.can('add', 'user', {age: 18}))
// false

console.log(manager.can('drop','user'));
// true
```

**AbilityMeta**

```typescript
import {
    buildAbilityMetaFromName
} from "@typescript-auth/core";

const meta = buildAbilityMetaFromName('user_add');
console.log(meta);
// {action: 'add', subject: 'user'}
```

### HTTP Header

The http utilities turn around header parsing and building.

**AuthorizationHeader**

```typescript
import {
    parseAuthorizationHeader,
    stringifyAuthorizationHeader
} from "@typescript-auth/core";

const basicValue = Buffer
    .from('admin:start123')
    .toString('base64');

const value = parseAuthorizationHeader(`Basic ${basicValue}`);
console.log(value);
// {type: 'Basic', username: 'admin', password: 'start123'}

// -------------------------------------------------

let headerValue = stringifyAuthorizationHeader({
    type: 'Basic',
    username: 'admin',
    password: 'start123'
});
console.log(headerValue);
// Basic xxxxxxx

headerValue = stringifyAuthorizationHeader({
    type: 'Bearer',
    token: 'start123'
});
console.log(headerValue);
// Bearer start123
```

### Protocols

#### Oauth2
**URL**
```typescript
import {Oauth2Client} from "@typescript-auth/core";

let oauth2Client = new Oauth2Client({
    token_host: 'https://example.com/',
    client_id: 'client'
});

let url = oauth2Client.buildAuthorizeURL({
    redirect_uri: 'https://example.com/redirect'
});
console.log(url);
// https://example.com/oauth/authorize?response_type=code&client_id=client&redirect_uri=https://example.com/redirect
```

**Token**

```typescript
import {Oauth2Client} from "@typescript-auth/core";

const oauth2Client = new Oauth2Client({
    client_id: 'client',
    client_secret: 'secret',
    token_host: 'https://example.com/',
    redirect_uri: 'https://example.com/redirect',
    scope: ['email']
});

let token = await oauth2Client.getTokenWithRefreshToken({refresh_token: 'refresh_token'});
console.log(token);
// {...}

token = await oauth2Client.getTokenWithClientCredentials();
token = await oauth2Client.getTokenWithPasswordGrant({username: 'admin', password: 'start123'});
token = await oauth2Client.getTokenWithAuthorizeGrant({state: 'state', code: 'code'});

```
