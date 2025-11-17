# Test that posting an unsupported Content-Type produces a 415 error

POST http://localhost:8080/v1/fragments
Content-Type: application/xml
[BasicAuth]
user1@email.com:password1
`<data>This is XML data</data>`

# We expect to get back an HTTP 415 Unsupported Media Type
HTTP/1.1 415

[Asserts]
jsonpath "$.status" == "error"
jsonpath "$.error.message" exists