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

Some collections answer grouped counts next to their rows. The security event log does
(`GET /events/stats`), which is what the admin console's dashboard reads. The rows to
count are selected with the same `filter[...]` vocabulary the collection read takes;
`granularity` (`hour` or `day`, default `day`) sets the bucket width and `days`
(default `30`) the window, counted back from now. The window times the buckets per day
may not exceed 744 (31 days of hours).

```shell
curl -X GET 'http://localhost:3000/events/stats?filter[name]=login&days=7' \
  -H 'Authorization: Bearer ***'
```

### Response

Only buckets holding rows are listed; a consumer fills the gaps between `from` and `to`
with zeros. `from` is snapped onto a bucket boundary, and `enabled` says whether the
deployment records events at all. A reader without `event_read` is answered the counts
of its own rows.

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
        "from": "2026-09-15T00:00:00.000Z",
        "to": "2026-09-22T10:15:00.000Z",
        "granularity": "day",
        "days": 7,
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
