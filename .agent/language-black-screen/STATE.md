Observed public failure: language dialog closed, earth-shell open, earth-letter-main still hidden, all letter line opacity zero.
Root cause: index.html imported i18n.mjs with a query while earth-letter.js and city-comparison.mjs used the plain URL, creating separate module instances and replacing the welcome event handlers.
Fix: use the shared plain URL everywhere. One production line changed.
Review checkpoint: 15 minutes; two concurrent agents maximum; no additional paid API or compute spend; remaining account budget UNKNOWN.
Next: verify local and public journeys, obtain independent review, publish only this fix and regression checks.
