# Skill: Offline-First Ingestion & Reactive State

Use this layout pattern when handling register inputs, barcode tracking, and table lists.

## 1. Zero-Latency Registers
- **Optimistic Binding:** POS checkouts must read and write directly to the local embedded database[cite: 1]. The UI components must never await cloud processing hooks to append items to a cart array[cite: 1].
- **Batch Serialization:** When processing state synchronizations, bundle transactions into isolated packages capped at exactly 500 actions before executing backend endpoint sweeps[cite: 1].

## 2. Peripheral Capture
- When constructing barcode interfaces, leverage native stream processing elements or specialized keyboard-listener hooks to intercept decoded scanner signals instantly without losing viewport focus[cite: 1].