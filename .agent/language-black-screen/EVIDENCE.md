2026-10-08. Broken public runtime cefccb07776fee9d99d49631b97cbd04bdd6953d.

CUA public first visit after Settings → Start again → English:
languageOpen=false; shellOpen=true; mainHidden=true; letter line opacities=[0,0,0,0].
Public index imported ./i18n.mjs?v=20261008-partners; earth-letter.js and city-comparison.mjs imported ./i18n.mjs.

Fixed index SHA-256 d43d1ba1977fadf91253fc275a8c66c36902a10bcc5909910d4ea72b5db13f62.
node tools/qa/language-module.mjs:
PASS: globe, introduction and comparison share one language module
Same identity assertion against origin/main: two URLs, fails as expected.
git diff --check: exit 0.

CUA IAB http://127.0.0.1:8808/ → Français:
French letter visible, .interaction-ready reached; keyboard Enter reveals all words.
Completed letter screenshot: letter.jpg. Clicked Découvre ton avenir.
Globe rendered, settings reopened language dialog, selected English, all globe controls and partner link updated to English. No console errors or warnings. Screenshot: globe.jpg.
node --check tools/qa/language-click.mjs: exit 0. The full scripted language-click suite was not run; CUA drove the real interface instead.

Independent fresh-context reviewer runs the static differential check and native Safari journey on localhost:8807.
Provider: OpenAI internal subagent; same-family review limitation. External CLIs found: codex, gemini, kimi, cursor-agent, claude. Their live account models, quota, entitlement and incremental cost UNKNOWN; no paid calls made. No xAI connector or callable route identified in tool registry.
Physical iPhone remains untested. No new design or generated assets.
