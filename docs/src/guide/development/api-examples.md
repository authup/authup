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
