# Notifications Telemetry Assets

Templates and snippets for wiring realtime notification telemetry into Honeycomb and PagerDuty.

## Contents

- `honeycomb-dashboard.json` – import into Honeycomb to create the realtime overview board (latency, active connections, reconnect success, delivery outcomes).
- `pagerduty-alerts.yaml` – starting point for latency, connection drop, and reconnect success alerts.

## Usage

1. Set `NOTIFICATIONS_TELEMETRY_ENABLED=true` alongside Honeycomb API keys in the backend `.env`.
2. Deploy the Honeycomb exporter (`backend/src/telemetry/honeycomb.exporter.ts`) and verify logs include `notifications_ws_*` metrics.
3. Import the dashboard JSON into your Honeycomb dataset.
4. Apply the PagerDuty alert configuration (replace placeholders such as `baseline_active_connections`).
5. Validate telemetry during the realtime flag dry run and update thresholds before general availability.
