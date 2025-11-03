#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/json_helpers.sh"

fail() {
    echo "Assertion failed: $1"
    echo "Expected: $2"
    echo "Actual:   $3"
    exit 1
}

assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="$3"

    if [[ "$expected" != "$actual" ]]; then
        fail "$message" "$expected" "$actual"
    fi
}

test_unwrap_object_payload() {
    local input='{"data":{"id":"abc123","name":"Demo"}}'
    local expected='{"id":"abc123","name":"Demo"}'
    local actual
    actual="$(unwrap_json_payload "$input")"
    assert_equals "$expected" "$actual" "unwrap_json_payload should unwrap object data payloads"
}

test_unwrap_array_payload() {
    local input='{"data":[{"id":1},{"id":2}]}'
    local expected='[{"id":1},{"id":2}]'
    local actual
    actual="$(unwrap_json_payload "$input")"
    assert_equals "$expected" "$actual" "unwrap_json_payload should unwrap array data payloads"
}

test_passthrough_when_no_data_key() {
    local input='{"id":"abc123","name":"Demo"}'
    local expected='{"id":"abc123","name":"Demo"}'
    local actual
    actual="$(unwrap_json_payload "$input")"
    assert_equals "$expected" "$actual" "unwrap_json_payload should passthrough when no data key present"
}

test_handles_null_data() {
    local input='{"data":null}'
    local expected='null'
    local actual
    actual="$(unwrap_json_payload "$input")"
    assert_equals "$expected" "$actual" "unwrap_json_payload should return null when payload data is null"
}

test_unwrap_object_payload
test_unwrap_array_payload
test_passthrough_when_no_data_key
test_handles_null_data

echo "json_helpers tests passed"
