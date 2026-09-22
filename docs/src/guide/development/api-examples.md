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

Most collections answer grouped counts of the rows created per time bucket next to
their rows, under `GET /<collection>/@stats`: realms, clients, scopes, identity
providers, keys, trust anchors, users, paths, roles, policies, permissions, sessions and
events. The admin console's dashboard and the trend strip above each list read them.
The rows to count are selected with the same `filter[...]` vocabulary the collection
read takes, and the caller is gated exactly like that read;
`granularity` (`hour` or `day`, default `day`) sets the bucket width and `days`
(default `30`) the window, counted back from now. The window times the buckets per day
may not exceed 744 (31 days of hours).

```shell
curl -X GET 'http://localhost:3000/events/@stats?filter[name]=login&days=7' \
  -H 'Authorization: Bearer ***'
```

`@` marks a reserved segment that can never be a name or an id, which is why a
statistic of `users` cannot collide with a user named `stats`.

### Response

Only buckets holding rows are listed; a consumer fills the gaps between `from` and `to`
with zeros. The window holds exactly `days` times the buckets per day bucket starts, the
last of them the bucket holding `to`, and `total` counts every row the filter admits,
regardless of the window, so `GET /sessions/@stats?filter[expiresAt]=>2026-09-22T10:15:00.000Z`
answers the active sessions. Events group their buckets by `scope` and `name` and add
`enabled`, which says whether the deployment records events at all. A reader without
`event_read` is answered the counts of its own rows.

```json
{
    "data": [
        {
            "bucket": "2026-09-21T00:00:00.000Z",
            "scope": "oauth2",
            "name": "login",
            "count": 41
        },
        {
            "bucket": "2026-09-22T00:00:00.000Z",
            "scope": "oauth2",
            "name": "login",
            "count": 17
        }
    ],
    "meta": {
        "from": "2026-09-16T00:00:00.000Z",
        "to": "2026-09-22T10:15:00.000Z",
        "granularity": "day",
        "days": 7,
        "total": 1283,
        "enabled": true,
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
