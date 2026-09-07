- [x] Actual pixels change over time for all7filters with fixedcamera; reducedmotion freezesnewmotion.
- [x] Wildfire mapped surface follows endpoints and selectedyear; Dhaka31.6to32.8 preserved; fixedriverreferenceexplicit.
- [x] Bottom-leftbeta notice visible, disclaimer/contactpresent, no controloverlap ondesktop/mobile.
- [x] Labels nearpointer/center visible, othersfade/noninteractive; pointer/camera updatesandcityselection work.
- [x] Temporal/layout/regressionchecks, independentreview and performance/resourcebudgets pass.

Evidence mapping: filterpixels/reducedmotion → motion-pixels-reduced/motion.json; wildfire endpoints → fire-audit/results.json and motion-temporal; notice/labels/mobiletaps → motion-review/final-review.json,ui.json,hits-final.json,notice-final.json; regressions → motion-matrix; resources → budget.json,motion-performance,motion-network. Paths relative to evidence/. Coverage is compositional across frozen revisions as detailed in EVIDENCE.md.
