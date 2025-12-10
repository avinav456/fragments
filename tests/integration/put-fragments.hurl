# Test PUT route - Create a fragment first
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
```
Original fragment
```

HTTP/1.1 201
[Captures]
fragment_id: jsonpath "$.fragment.id"

# Update the fragment with new data
PUT http://localhost:8080/v1/fragments/{{fragment_id}}
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
```
Updated fragment
```

HTTP/1.1 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.fragment.id" == "{{fragment_id}}"
jsonpath "$.fragment.size" == 17


# Trying to update a text fragment with wrong format
# Create a text fragment
POST http://localhost:8080/v1/fragments
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
```
Original text
```

HTTP/1.1 201
[Captures]
text_id: jsonpath "$.fragment.id"

# Try to update with wrong Content-Type
PUT http://localhost:8080/v1/fragments/{{text_id}}
Content-Type: application/json
[BasicAuth]
user1@email.com:password1
{"error": "wrong type"}

HTTP/1.1 400
[Asserts]
jsonpath "$.status" == "error"


# Try to update a fragment that doesn't exist
PUT http://localhost:8080/v1/fragments/99999999-9999-9999-9999-999999999999
Content-Type: text/plain
[BasicAuth]
user1@email.com:password1
```
Some data
```

HTTP/1.1 404
[Asserts]
jsonpath "$.status" == "error"