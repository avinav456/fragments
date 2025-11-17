# tests/integration/post-fragments-unauthenticated.hurl
# Test that posting a fragment without authentication produces a 401 error

POST http://localhost:8080/v1/fragments
Content-Type: text/plain
`This should fail - no authentication!`

# We expect to get back an HTTP 401 Unauthorized
HTTP/1.1 401

[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.message" exists