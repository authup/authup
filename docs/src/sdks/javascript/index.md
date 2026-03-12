# JavasScript

Authup provides several JavaScript SDKs for integrating **Authup** into various types of web applications.
These SDKs are also partially used by the frontend and backend application.

## 1. Kit
The **Kit** library provides a set of basic utilities to help you interact with Authup, including:
- **Policy Engine**: Implement and manage policies to govern access and authorization.
- **Permission Checker**: Easily check user permissions within your app.
- **Workflows**: Interfaces for common workflows like OAuth2 authentication and authorization.

## 2. Core-Kit
The **Core-Kit** library provides fundamental interfaces and utilities. It includes:
- **Domain Entities**: Interfaces for core entities such as `User`, `Role`, `Permission`, and more.

## 3. Core-HTTP-Kit
The **Core-HTTP-Kit** offers a robust client for interacting with the **Authup HTTP API**.
It provides sub-clients for specific domain entities and workflows, enabling you to:
- Perform CRUD operations on users, roles, permissions, etc.
- Execute OAuth2 workflows (e.g., token management).

## 4. Client-Vue
The **Client-Vue** library provides integration components for Vue.js applications. It offers:
- **General Components**: Components for working with various resources (e.g., `User`, `Role`, etc.).
- **Resource Form Components**: Opinionated form components for managing each resource.
- **Resource Collection- & Record-Components**: Flexible components to render a set or a single resource entities (via slots).

## 5. Client-Nuxt
For Nuxt.js applications, the **Client-Nuxt** library builds upon the [Client-Vue](#4-client-vue) library by providing:
- A Nuxt plugin that registers the **Client-Vue** library.
- A middleware that verifies the browser-stored token (if set) and checks whether the user has permission for the target route.

## 6. Server-HTTP-Adapter
The **Server-HTTP-Adapter** provides middleware for JavaScript HTTP servers (e.g., Express.js).
This middleware validates incoming requests by checking for a **Bearer Token** in the request headers.
The token is validated either by directly querying the **Authup API** or using a locally cached public key (previously fetched from the API).

## 7. Server-Socket-IO-Adapter
The **Server-Socket-IO-Adapter** is designed for real-time applications using **Socket.IO**.
It provides middleware that validates incoming requests by checking for a **Bearer Token** in the socket request.
The token is validated the same way, like it is the case in the [Server-HTTP-Adapter](#6-server-http-adapter) library.
