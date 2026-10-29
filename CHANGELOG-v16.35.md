# v16.35 — Dashboard hierarchy refinement

- Refined the existing P/L hero so it reads as the primary dashboard summary.
- Reduced visual weight on secondary metric cards while retaining existing metric order and calculations.
- Tuned the floating New Journal action for touch use and mobile safe-area spacing.
- Added restrained glass surfaces and gold radial accents, including a light-theme treatment.
- Preserved reduced-transparency and reduced-motion support.
- CSS-only change: no journal data model, calculations, authentication, or persistence logic changed.

Note: this patch styles existing dashboard data and does not fabricate separate daily/monthly P/L values if the current dashboard does not expose them as separate metrics.
