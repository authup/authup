# @authelion/common 🎉

[![npm version](https://badge.fury.io/js/@authelion%2Fcommon.svg)](https://badge.fury.io/js/@authelion%2Fcommon)
[![main](https://github.com/Tada5hi/authelion/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/authelion/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/authelion/branch/master/graph/badge.svg?token=FHE347R1NW)](https://codecov.io/gh/Tada5hi/authelion)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/authelion/badge.svg)](https://snyk.io/test/github/Tada5hi/authelion)

The main propose of this package, is to provide general classes, interfaces & types for authorization & authentication.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Ability & Permission](#abilitypermissions)
  - [HTTP Clients](#http-clients)
    - [General](#general)
    - [OAuth2](#oauth2)

## Installation

```bash
npm install @authelion/common --save
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
} from "@authelion/common";

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
} from "@authelion/common";

const meta = buildAbilityMetaFromName('user_add');
console.log(meta);
// {action: 'add', subject: 'user'}
```

### HTTP Clients

#### General

```typescript
import {HTTPClient} from "@authelion/common";

const client = new HTTPClient({
    driver: {
        baseURL: 'http://127.0.0.1:3010/'
    }
});

(async () => {
    const response = await client.role.getMany({
        page: {
            limit: 10,
            offset: 0
        }
    });
    
    console.log(response);
    // {
    //      meta: {total: 1, limit: 10, offset: 0},
    //      data: [{id: 'xxx', name: 'admin', description: null}], 
    // }
})();
```

#### OAuth2
**URL**
```typescript
import {HTTPOAuth2Client} from "@authelion/common";

let client = new HTTPOAuth2Client({
    token_host: 'https://example.com/',
    client_id: 'client'
});

let url = client.buildAuthorizeURL({
    redirect_uri: 'https://example.com/redirect'
});
console.log(url);
// https://example.com/oauth/authorize?response_type=code&client_id=client&redirect_uri=https://example.com/redirect
```

**Token**

```typescript
import {HTTPOAuth2Client} from "@authelion/common";

const client = new HTTPOAuth2Client({
    client_id: 'client',
    client_secret: 'secret',
    token_host: 'https://example.com/',
    redirect_uri: 'https://example.com/redirect',
    scope: ['email']
});

let token = await client.getTokenWithRefreshToken({refresh_token: 'refresh_token'});
console.log(token);
// {...}

token = await client.getTokenWithClientCredentials();
token = await client.getTokenWithPasswordGrant({username: 'admin', password: 'start123'});
token = await client.getTokenWithAuthorizeGrant({state: 'state', code: 'code'});

```
