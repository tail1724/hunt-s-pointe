Hide the Ezra starter prompt chip container on mobile view only.

The selected element is the horizontal scrollable starter chip list on the Ezra landing state (`src/pages/Ezra.tsx`, line 251). It currently renders as `flex` on mobile and switches to `sm:grid` on larger screens.

Change:
- In `src/pages/Ezra.tsx`, line 251, replace the base `flex` display class with `hidden` so the container is hidden below the `sm` breakpoint. The existing `sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0` rules will keep the grid visible at `sm` and above.

Before:
```
<div className="mt-5 flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4 ezra-scroll-hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
```

After:
```
<div className="mt-5 hidden gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4 ezra-scroll-hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
```

Verification:
- Open `/app/ezra` in mobile viewport (390x844). Confirm the starter chip row is no longer visible.
- Switch to desktop viewport. Confirm the two-column starter chip grid still renders.
- No other files or logic are changed.