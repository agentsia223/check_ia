# Bambara Voice Verify — Design

**Date:** 2026-06-15
**Status:** Approved (design), pending implementation plan
**Scope:** Frontend only (`client/`). Redesign the inline Bambara voice block in `SubmitFact.js`.

## Goal

Turn fact-checking by Bambara voice into a single fluid gesture. Today it takes three
actions: click-record, click-stop, then click-verify. The new experience: the user
speaks, and verification starts on its own when they stop — no extra button press. It
should feel like "verify by speaking".

## Non-goals (YAGNI)

- Waveform / live audio visualization
- Audio playback or scrubbing of the recording
- Persisting or uploading the raw audio beyond the existing transcribe call
- Languages other than Bambara
- Any backend change (the `/api/bambara/transcribe/`, `/api/bambara/translate/`, and
  `/api/submissions/` endpoints are reused as-is)

## Interaction model

A state machine drives the block:

```
idle → recording → transcribing → review(countdown) → verifying → result
  ▲         │            │              │                  │
  └─────────┴────────────┴──────────────┴──────────────────┘   (any error → idle)
```

Platform detection uses `window.matchMedia('(pointer: coarse)')` (input type, not screen
width), because the natural gesture depends on touch vs keyboard.

- **Desktop (fine pointer):** `Spacebar` toggles. Tap Space to start, tap Space again to
  stop. The mic button is also clickable (same toggle) for discoverability and
  accessibility. Hint chip: *"Appuyez sur Espace pour parler"*.
- **Mobile / touch (coarse pointer):** large mic button. Press-and-hold to record, release
  to stop. Hint: *"Maintenez pour parler"*.

### Spacebar rules

- Spacebar acts as the record toggle **only when focus is not in a text input** (textarea,
  source field), so typing spaces is never hijacked.
- Spacebar is ignored during `transcribing` and `verifying`.
- `Escape` cancels the review countdown (see below); it does nothing in other phases.

## Flow after recording stops

1. `MediaRecorder.onstop` builds the audio blob, stops the media stream/tracks.
2. **transcribe** the blob (BM) via `POST /api/bambara/transcribe/`.
3. **translate** the transcript (BM→FR) via `POST /api/bambara/translate/`, and fill the
   `texte` field with the French translation (unchanged pipeline — verification runs on the
   French text; the Bambara transcript is shown for reference).
4. Enter **review**: show the transcript and a ~3s countdown —
   *"Vérification automatique dans 3… · Annuler"*.
5. If not cancelled, automatically call the **same verification path** the manual submit
   button uses (`POST /api/submissions/`). No press required to proceed.
6. **Cancel** (the Annuler button or `Escape`) stops the countdown and leaves the
   translated text in the editable textarea, so the user can correct it and verify manually.

### Tunable defaults

- Review countdown: **3 seconds**
- Minimum recording duration: **400 ms** (shorter recordings are treated as accidental)

## Edge cases

| Case | Behavior |
|------|----------|
| Empty / whitespace transcript | No verification; error toast; back to `idle` |
| Transcribe or translate API failure | No verification; error toast; back to `idle` |
| Mic permission denied / unsupported browser | Error toast; stay `idle` (current behavior) |
| Recording shorter than 400 ms | Ignored with a toast; back to `idle` |
| Not logged in | Blocked before recording starts (matches current `handleSubmit`) |
| Component unmounts mid-recording | Media stream/tracks stopped (reuse `stopMediaStream`); pending timers cleared |
| User edits textarea during countdown | Countdown continues against the latest text; cancel still available |

## Structure / refactor

`SubmitFact.js` is ~741 lines; the voice concern is extracted into focused, testable units
so the form file shrinks and the capture logic can be unit-tested in isolation.

- **`client/src/hooks/useBambaraVoiceVerify.js`** — owns the `MediaRecorder` lifecycle, the
  state machine, the spacebar/hold handlers, and the transcribe → translate → countdown →
  verify orchestration. Receives `{ getAccessToken, onVerify, isLoggedIn }` and exposes
  `{ phase, transcript, countdown, error, isTouch, start, stop, toggle, cancel }`. Calls
  `onVerify(text)` when the countdown elapses.
- **`client/src/components/BambaraVoiceVerify.js`** — presentational inline block: mic
  button, status text, hint chip, countdown + Annuler, transcript line. No network or
  recorder logic of its own; it renders the hook's state and wires its handlers.
- **`client/src/components/SubmitFact.js`** — lift the existing `POST /api/submissions/`
  logic into a `submitForVerification(text)` function reused by both the manual submit
  button and the voice auto-verify, then render
  `<BambaraVoiceVerify onVerify={submitForVerification} … />` in place of the current inline
  voice block. The textarea, source field, and manual submit button stay.

### Interfaces

- `useBambaraVoiceVerify({ getAccessToken, isLoggedIn, onVerify })` →
  `{ phase, transcript, countdown, error, start, stop, toggle, cancel, isTouch }`
- `submitForVerification(text)` → performs the submission POST and sets
  `submissionId` / `status` exactly as today; returns nothing (side effects only).

## Testing

React Testing Library + Jest, matching `SubmitFact.test.js`. Mock `axios`,
`navigator.mediaDevices.getUserMedia`, and `MediaRecorder`. Use fake timers for the
countdown.

- toggle start/stop (desktop) and hold start/stop (touch) move through the right phases
- empty transcript → **no** `/submissions/` POST fired
- transcribe/translate failure → **no** `/submissions/` POST fired
- countdown elapses → `/submissions/` POST fired once with the translated text
- cancel (Annuler / Escape) during countdown → **no** POST fired
- spacebar in a focused textarea does **not** start recording
- recording shorter than 400 ms → ignored, no transcribe call
- existing `SubmitFact.test.js` stays green

## Affected files

- New: `client/src/hooks/useBambaraVoiceVerify.js`
- New: `client/src/components/BambaraVoiceVerify.js`
- New: `client/src/components/BambaraVoiceVerify.test.js` (or co-located hook test)
- Edit: `client/src/components/SubmitFact.js` (extract `submitForVerification`, swap in the
  new block, remove the old voice handlers/state that moved into the hook)
- Edit: `client/src/components/SubmitFact.test.js` (adjust for the extracted block if needed)
