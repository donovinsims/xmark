# Apple web-app audit — 2026-11-04

Scope: pastepost in iPhone/iPad Safari and Home Screen, plus applicable Mac Add to Dock checks. Based on Joe Bell’s apple-web-app skill and conformance checklist: https://www.ui-skills.com/skills/joe-bell/apple-web-app . Code, HTTP assets, build/tests, and desktop browser responsive checks were used. No real iPhone/iPad or installed Mac Dock app was tested.

## Findings and fixes

- Header and reader lacked safe-area protection. Added top/side spacing with usable zero-inset defaults; content and reader actions also clear side insets.
- Bottom navigation had a fixed height despite adding bottom safe-area padding. Height and content clearance now grow with the inset. Reader content also clears its padded action dock.
- Clear-Vault dialog lacked focus containment, restoration, Escape dismissal, and background scroll locking. Replaced its outer surface with a native modal dialog and restored focus on dismissal. Its content scrolls within the visual viewport when the keyboard changes available space.
- Reader used a visual overlay without modal isolation. It now uses a native modal dialog, locks background scrolling, supports Escape through existing Back navigation, and restores focus.
- Browser theme color was fixed; saved theme applied after hydration. Added pre-paint theme initialization and theme-color updates. Added explicit translucent Apple status-bar behavior with corresponding safe-area spacing.
- Draft URL and bulk input were lost on relaunch. Both now restore from local storage. Storage failures no longer throw from theme, settings, history saves, or draft persistence.
- Added one-tap Paste link, with existing parser validation, invalid/denied feedback, and protection for nonempty or concurrently edited drafts. Paste does not extract automatically.
- Platform-generated manifest had generic host-derived naming and black colors. Added an app-owned manifest with stable root identity/scope, standalone display, pastepost naming, matching default launch color, and existing 192/512 PNGs. Platform-owned files remain unchanged.
- Added keyboard focus indicators and reduced-motion styling. Zoom and text selection remain available.
- Startup script pointed at another checkout. It now resolves its own directory and backgrounds npm run dev with nohup.

## Checklist

| Check | Result and evidence |
| --- | --- |
| Viewport and Apple capability tags | Passed: rendered HTML has viewport-fit=cover, capable/title/status-bar tags; zoom is unrestricted. |
| Manifest identity, start URL, scope, display | Passed: /manifest.webmanifest returns HTTP 200 with pastepost identity, root scope/start URL, standalone display. |
| Icons and delivery | Passed: unauthenticated HTTP 200; Apple PNG 180×180, manifest PNGs 192×192 and 512×512. No pre-rounded mask assumption introduced. |
| Safe-area layout and zero insets | Passed code/zero-inset browser check; positive insets and cold-launch timing Unverified on device. |
| Scroll root and fixed bars | Existing document scrolling retained; inset-aware navigation/reader clearance added. Touch bounce and installed scrolling Unverified. |
| Theme and status-bar sampling | Passed browser light/dark switching and meta updates. Real Safari/status-bar contrast, sampling, and saved-install behavior Unverified. |
| Overlays and keyboard | Native modal focus containment/isolation, Escape, cleanup, visual-viewport sizing, and internal scrolling implemented and inspected. Real keyboard, long-reader touch scrolling, focus restoration, and installed Back require device/runtime confirmation. |
| Zoom, selection, touch feedback | Passed code inspection: no zoom lock or body text-selection suppression; controls have visible focus; reduced motion disables animations. Real pinch/touch Unverified. |
| iPad window controls | Unverified: requires windowed iPad observation; no speculative fixed window-control padding added. |
| Installed navigation | Reader has Back plus existing browser-history handling; Extract/Vault/Settings remain directly reachable. Real installed flow Unverified. |
| Recoverable state continuity | Passed: URL and bulk drafts survive browser reload; malformed/blocked storage covered by tests. OS suspension/eviction Unverified. |
| Install hints | Not applicable: app has no custom install prompt; platform install tutorial retained. |
| Startup images | Optional polish deferred: none declared/generated; no broken startup-image links. Real launch appearance Unverified. |
| Mac Add to Dock | Applicable manifest/icon/navigation/storage guidance reviewed. Identity/assets pass independent checks; installed icon cache, title-bar color, scope handling, and window behavior Unverified. |
| Release-specific workarounds | Not applicable: no matching device regression demonstrated; none added. |
| Progressive blur and other decorative recipes | Optional, deferred to preserve existing design. Existing translucent blurred bars retained. |

## Verification

- npm run typecheck passed.
- npm run build:dev passed (no deployment or database migration).
- Existing npm test suite passed; new draft/clipboard/storage tests also passed and are included in npm test.
- 47 PWA integration/unit checks passed.
- git diff --check passed.
- Browser checks: URL/bulk restoration, valid/invalid paste, nonempty-draft protection, keyboard activation, both themes; mobile 390px document width equals viewport width with 72px zero-inset navigation. A preview screenshot was captured.
- Browser automation mouse targeting became unreliable after viewport changes; keyboard activation continued to work. Device appearance claims above are deliberately not inferred from desktop emulation.

## Boundaries

No account sync, credential sync, new packages, commits, or deployment. Existing Vault limits remain unchanged. Browser and installed-app local storage remain separate. Offline/service workers/push are outside this skill and this update.
