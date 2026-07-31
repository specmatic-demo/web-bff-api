# web-bff-api

REST version of the Web BFF. It provides 10 operations in [specs/web_bff.yaml](specs/web_bff.yaml): customer, catalog, order, quote, place-order, cancel-order, refund, and return flows.

It consumes only the pricing contract from the public [pricing-api](https://github.com/specmatic-demo/pricing-api) repository. The remaining operations use local demo behavior so the contract-test setup needs only one dependency mock.

## Run locally

```bash
docker compose up --build
```

This starts the BFF on `localhost:4000`.

## Start dependency mocks

```bash
docker run --rm -it \
  -v "$(pwd):/usr/src/app" \
  -v ~/.specmatic:/root/.specmatic \
  -w /usr/src/app \
  --network=host \
  specmatic/enterprise \
  mock
```

## Run contract tests

```bash
docker run --rm -it \
  -v "$(pwd):/usr/src/app" \
  -v ~/.specmatic:/root/.specmatic \
  -w /usr/src/app \
  --network=host \
  specmatic/enterprise \
  test
```
