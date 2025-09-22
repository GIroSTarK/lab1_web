## Backend roles (user/admin)

The server now supports roles:

- user: default role after registration
- admin: elevated role with extra permissions (can delete any room)

### Configure admin secret

Set an environment variable before starting the server:

```
ADMIN_SECRET=change_me_to_secure_value
```

If not set, a development default is used.

### Elevate a user to admin

Send a POST request with a valid auth token and the secret:

```
POST /api/admin/elevate
Authorization: Bearer <JWT>
Content-Type: application/json

{ "secret": "<ADMIN_SECRET>" }
```

Response includes a refreshed JWT embedding the role and the updated user object.

Client changes are minimal and backward-compatible; `User.role` is optional.
