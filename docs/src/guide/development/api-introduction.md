# API

The **Authup API** provides a powerful and flexible interface to integrate authentication and authorization capabilities into applications.  
This section of the Developer Guide offers an overview of the API's structure, its key workflows, and best practices for using it effectively.

## Swagger
The full API reference is available via the built-in Swagger documentation.  
Once the backend is running, the Swagger interface can be accessed at:
**http://<BACKEND_URL>/docs** (e.g. `http://localhost:3000/docs`)

The document behind it is served next to it, at
**http://<BACKEND_URL>/docs/openapi.json**, which is the copy to feed a code
generator: the Swagger page inlines it into HTML and answers every other path
under the mount with that same page.

## What You'll Learn
This section is structured as follows:
- [OAuth2](./api-oauth2): A guide on how to implement OAuth2 flows for secure authentication and authorization.
- [Query Language](./api-query-language): The five query parameters every collection read accepts, their operators and their failure modes.
- [Query Reference](./api-query-reference): The queryable vocabulary of each entity, generated per release.
- [Examples](./api-examples): Practical examples of interacting with the API (e.g. users, roles, permissions) resources.
- [Error Handling](./api-error-handling.md): Learn how to manage and interpret API errors to handle failures gracefully.
