Current climate follow-up: local UI and structural audit VERIFIED on runtime75fc3ec.
See climate/STATE.md and climate/EVIDENCE.md. Scientific accuracy remains UNVERIFIED
because current generators/manifests and per-hazard provenance flags are unavailable.
Local8087 updated; public deployment and physical gates below unchanged.

Current local design follow-up: VERIFIED panel redesign on branch design/place-panel,
runtime9129b5b. See panel/STATE.md and panel/EVIDENCE.md. Local preview8087;
public deployment below remains the earlier release. Physical gates unchanged.

STATUS: ACTIVE — full completion not claimed.

2026-09-07: PR #1 merged as 2058efc; startup preload follow-up deployed as
a9fb348039ce97ea2e398716c9136d5afb384674. Public HTML SHA-256:
363767dd83794f862291da7ebe4ea1ffc0685c3a71289d45526efab5565d27fe.

Implemented and independently reviewed: timeline/globe interaction, country/city
labels, no-data reset, gesture discrimination, mobile spacing, accessible focus,
prepared JPEG sharing and retry, story focus containment, double-click protection,
source contrast, geolocation access and hovered risk detail persistence.
Scientific datasets, pipeline, fonts, audio and vendored runtime are preserved.

Public verification: 15 files return 200 and match local hashes; entry, Paris 2050
diagnosis and ready story visually inspected. Four export/encoding/adapter cases
pass. Cold startup: 2.03s at 4 Mb/s and 9.96s at 700 kb/s, with 150ms and 200ms latency respectively;
critical transfer below 833 KB. Minified JS equivalent: 897,874 bytes (<900,000).
Clean CI passed on final PR, merge and final preload runtime (34107419691), nine checks out of nine.

Physical gate: paired iPhone 15 Pro Max was detected, but iPhone Mirroring returned
device-in-use, transport and timeout errors. Actual iOS→Instagram sharing and
home-screen icon/standalone launch remain required and unverified. Browser WebKit
and a native-share adapter are not substitutes for these physical checks.

Resource policy: at most two concurrent agents, no additional paid API/assets/compute
spend. Independent reviewer used fresh context but the same model family; no
multi-provider corroboration or comparative quality score is claimed.

Next: perform the two actual iPhone checks
when the paired device can connect. Historical files are not current proof.
