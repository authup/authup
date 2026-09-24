# Examples

The following examples demonstrate how to interact with a resource in the API via HTTP. 
This section uses the **Permission** resource as an example to showcase various operations.

For these examples, it is assumed that the backend application is running at `http://localhost:3000`.  
Make sure to replace `Bearer ***` with a valid access token in all requests.  
For a complete list of API endpoints and detailed specifications, visit the Swagger documentation at:  
`http://localhost:3000/docs`

## GET Collection

You can fetch a list of permissions using the following cURL command:

```shell
curl -X GET 'http://localhost:3000/permissions' \
  -H 'Authorization: Bearer ***'
```

### Response

```json
{
    "data": [
        {
            "id": "xxx",
            "builtIn": true,
            "name": "user_read",
            "displayName": "Read Users",
            "description": "Allows reading user data."
        },
        {
            "id": "xxx",
            "builtIn": true,
            "name": "role_edit",
            "displayName": "Manage Roles",
            "description": "Allows updating roles."
        }
    ],
    "meta": {
        "limit": 50,
        "offset": 0,
        "total": 200
    }
}
```

## GET Statistics

Most collections answer grouped counts next to their rows, under
`GET /<collection>/@stats`: realms, clients, scopes, identity providers, keys, trust
anchors, users, paths, roles, policies, permissions, sessions and events. The admin
console's dashboard and the activity boxes above each list read them. A statistic is a
grouped read in the [query language](api-query-language.md): the rows to count are
selected with the same `filter` vocabulary the collection read takes, `group` groups
them and `aggregate` measures each group, and the caller is gated exactly like the
collection read. Three rules apply on top:

- the first group is `bucket(createdAt,<unit>)`, the unit `hour`, `day` or `month`;
- the filter carries a lower bound on `createdAt` (an upper bound is optional, the
  window otherwise ends now);
- the window spans at most 744 buckets (31 days of hours, two years of days).

Buckets are UTC. After the bucket, events may group by `scope`, `name` and `refType`;
the other collections count per bucket only. `count` is the one aggregate.

```shell
curl -G 'http://localhost:3000/events/@stats' \
  --data-urlencode 'filter[name]=login' \
  --data-urlencode 'filter[createdAt]=>=2026-09-16T00:00:00.000Z' \
  --data-urlencode 'group=bucket(createdAt,day),scope,name' \
  --data-urlencode 'aggregate=count' \
  -H 'Authorization: Bearer ***'
```

`@` marks a reserved segment that can never be a name or an id, which is why a
statistic of `users` cannot collide with a user named `stats`.

### Response

One row per group, the bucket start under `createdAt`. Only buckets holding rows are
listed; a consumer fills the gaps between `from` and `to` with zeros. `from` is the
lower bound snapped onto the start of its bucket. `total` counts every row the filter
admits without its window, so
`GET /sessions/@stats?filter[expiresAt]=>2026-09-22T10:15:00.000Z&filter[createdAt]=>=2026-09-22T00:00:00.000Z&group=bucket(createdAt,day)&aggregate=count`
answers the active sessions under `total`. Events add `enabled`, which says whether the
deployment records events at all, plus `retentionDays` and `entityRetentionDays`, how
far back the source that answered reaches (`0` = forever), so a client never offers a
window past them. Day and month counts of events come from daily rollups, which are
kept longer than the events themselves; hour buckets read the events and are refused
past their retention. A reader without `event_read` is answered the counts of its own
rows. A reader whose `event_read` reaches some realms only (`realm_admin`) is answered
the rollups of those realms plus its own events elsewhere, which only the events
themselves hold, so that part reaches back only as far as their retention.

```json
{
    "data": [
        {
            "createdAt": "2026-09-21T00:00:00.000Z",
            "scope": "oauth2",
            "name": "login",
            "count": 41
        },
        {
            "createdAt": "2026-09-22T00:00:00.000Z",
            "scope": "oauth2",
            "name": "login",
            "count": 17
        }
    ],
    "meta": {
        "from": "2026-09-16T00:00:00.000Z",
        "to": "2026-09-22T10:15:00.000Z",
        "bucket": "day",
        "total": 1283,
        "enabled": true,
        "retentionDays": 0,
        "entityRetentionDays": 0,
        "schema": {}
    }
}
```

## GET Record

To fetch details of a specific permission by its **id** or **name**:

```shell
curl -X GET 'http://localhost:3000/permissions/user_read' \
  -H 'Authorization: Bearer ***'
```

### Response

```json
{
    "id": "xxx",
    "builtIn": true,
    "name": "user_read",
    "displayName": "Read Users",
    "description": "Allows reading user data."
}
```

## CREATE Record
To create a new permission, send a POST request with the necessary details:
```ssh
curl -X POST 'http://localhost:3000/permissions' \
  -H 'Authorization: Bearer ***' \
  -H 'Content-Type: application/json' \
  -d '{
        "name": "profile_edit",
        "displayName": "Edit Profile",
        "description": "Allows users to edit their own profile."
      }'
```

### Response

```json
{
  "id": "***",
  "builtIn": false,
  "name": "profile_edit",
  "displayName": "Edit Profile",
  "description": "Allows users to edit their own profile."
}
```

## UPDATE Record
To update an existing permission by its **id** or **name**:
```ssh
curl -X POST 'http://localhost:3000/permissions/profile_edit' \
  -H 'Authorization: Bearer ***' \
  -H 'Content-Type: application/json' \
  -d '{
        "displayName": "Modify Profile",
        "description": "Allows users to modify their own profile information."
      }'
```

### Response
````json
{
  "id": "***",
  "builtIn": false,
  "name": "profile_edit",
  "displayName": "Modify Profile",
  "description": "Allows users to modify their own profile information."
}
````

## DELETE Record
To delete a permission by its **id** or **name**:

```ssh
curl -X DELETE 'http://localhost:3000/permissions/profile_edit' \
  -H 'Authorization: Bearer ***'
```

### Response
````json
{
  "id": "***",
  "builtIn": false,
  "name": "profile_edit",
  "displayName": "Modify Profile",
  "description": "Allows users to modify their own profile information."
}
````
