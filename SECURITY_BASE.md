
# Security Base v1.0

This file documents the minimal security protections added to the Dragon Egg Catcher mini-game.

## Implemented Protections

1.  **Storage Integrity (Client-Side)**
    *   **Mechanism:** Wraps `localStorage` profile data with a simple hash (`generateHash`).
    *   **Effect:** Prevents trivial editing of JSON data in DevTools. If hash mismatches on load, profile resets (or warns).
    *   **Limitations:** Key is client-side (`SEC_SALT`). Determined attackers can reverse-engineer it.

2.  **API Rate Limiting**
    *   **Mechanism:** In-memory throttle (`checkRateLimit`) in `apiClient.ts`.
    *   **Effect:** Blocks rapid calls to `submitScore` (3s), `checkUsername` (500ms), and `purchase` (1s).
    *   **Limitations:** Resets on page reload. Does not replace server-side rate limiting.

3.  **Input Sanitization**
    *   **Mechanism:** Regex filtering `/[^a-zA-Z0-9 ]/g` on username inputs.
    *   **Effect:** Prevents injection of special characters, HTML, or emojis that could break UI or backend.

## Server-Side Requirements (TODO)

If a real backend is connected, the following **MUST** be implemented server-side:

*   **Authoritative State:** Store Stars, Scales, and Inventory on the server. Never trust `submitPurchase` from client.
*   **Score Validation:** Calculate max possible score based on time elapsed. Reject scores that are mathematically impossible.
*   **Replay Protection:** Add a `nonce` or signed timestamp to `submitScore` requests.
*   **Rate Limiting:** Enforce strict API limits by IP/User ID (e.g., Redis-based).
