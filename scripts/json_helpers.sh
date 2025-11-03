#!/usr/bin/env bash

# Normalize API responses that wrap payloads under a top-level `data` key.
# Returns a compact JSON string so that downstream jq usage receives the
# business payload regardless of response envelope.
unwrap_json_payload() {
    local payload="$1"
    echo "${payload}" | jq -c '
        if type == "object" and has("data") then
            .data
        else
            .
        end
    '
}
