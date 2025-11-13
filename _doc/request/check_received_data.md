# Validate input data

Validation prevents bad data and security issues.

Approaches:
- Use schema validators (Zod, Joi, Yup) for structured checks.
- For simple cases, perform manual checks (required fields, types, ranges).

Example with a validator:
```js
const parsed = schema.parse(await request.json());
```

On failure:
- Return 400 or 422 with descriptive error messages.
- Avoid leaking internal validation logic in responses.

A schema mechanism is currently in development and will allow automatically verifying the validity of input data and generating your API documentation.

See: `jopi-toolkit/jk-schemas`.
