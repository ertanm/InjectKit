# InjectKit Browser Compatibility Matrix

## Build Targets

| Target | Manifest | Build Command |
|--------|----------|---------------|
| Chrome | MV3 | `npm run build` |
| Firefox | MV2 | `npm run build:firefox` |

## Feature Compatibility

| Feature | Chrome (latest) | Chrome 110+ | Firefox ESR | Firefox (latest) |
|---------|----------------|-------------|-------------|-----------------|
| Popup UI | Yes | Yes | Yes | Yes |
| Glassmorphism (backdrop-filter) | Yes | Yes | Yes | Yes |
| Content script inject | Yes | Yes | Yes | Yes |
| Cmd+K shortcut | Yes | Yes | Yes* | Yes* |
| chrome.storage.local | Yes | Yes | Yes (via polyfill) | Yes (via polyfill) |
| Dark mode | Yes | Yes | Yes | Yes |

*Firefox uses Ctrl+K by default, may conflict with browser search bar.

## Known Issues

- Firefox MV2 uses `browser.*` APIs instead of `chrome.*` — Plasmo handles polyfill
- `chrome.action.openPopup()` is not available in Firefox MV2; keyboard shortcut opens sidebar instead
- Content script matches may need adjustment for Firefox CSP differences

## Testing Checklist

- [ ] Popup opens and renders correctly
- [ ] Search filters in < 50ms
- [ ] Dark mode matches system preference
- [ ] Prompt inject works on ChatGPT
- [ ] Prompt inject works on Claude.ai
- [ ] Prompt inject works on v0.dev
- [ ] Offline cache loads when API unavailable
- [ ] Keyboard navigation (arrow keys + Enter)
