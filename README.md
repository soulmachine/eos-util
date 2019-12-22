# eos-utils

Powerful util library based on eosjs.

## Use eosjs in typescript

In order to get access to the `TextEncoding` and `TextDecoding` types, you need to add `@types/text-encoding` as a dev dependency: `npm install --save-dev @types/text-encoding`

If you're using Node (not a browser) then you'll also need to make sure the `dom` lib is referenced in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["xxx", "dom"]
  }
}
```

See <https://github.com/EOSIO/eosjs/pull/568/files>.
