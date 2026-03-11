# Design: Settings UI Modernization (Vercel/Stripe Dashboard Style)

Date: 2026-03-11

## Summary

Modernize both Options and Popup pages with a Vercel/Stripe Dashboard visual style. Update design tokens, add focus styles via injected global CSS, add provider color indicators, and make the save area sticky.

## Design Tokens Changes

### Colors
- `page`: `#f3f4f6` → `#fafafa`
- `surfaceElevated`: `#fcfdff` → `#ffffff`
- `surfaceMuted`: `#eef2ff` → `#f4f4f5`
- `border`: `#d1d5db` → `#e4e4e7`
- `borderMuted`: `#e5e7eb` → `#f4f4f5`
- New: `borderFocus`: `#2563eb`
- `controls.primary.background`: `#111827` → `#18181b`

### Shadows
- `soft`: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)`
- `medium`: `0 4px 12px rgba(0,0,0,0.1)`

### Radius
- `small`: `8px` → `6px`
- `medium`: `12px` → `8px`
- `large`: `16px` → `12px`

## Options Page Changes

### Layout
- Section cards: `surface` background + `border` + `shadow.soft`
- Card gap: `spacing.md` → `spacing.sm`

### Inputs
- Unified `border-radius: radius.small` (6px)
- Focus styles via injected `<style>` tag (see Focus section)

### Enabled toggle rows
- Background: `surfaceMuted` for contrast with card white

### Save area
- `position: sticky; bottom: 0` with white background + top border

### Provider color indicators
- Colored dot before each provider `<h2>` title via inline `<span>`
  - OpenAI: `#10a37f` (green)
  - Claude: `#d97706` (amber)
  - Gemini: `#4285f4` (blue)

## Popup Page Changes

- Automatic via design token updates (colors, radius, shadows)
- No structural changes needed

## Focus Styles Implementation

Inject global `<style>` tag via `useEffect` in both Options and Popup:

```css
input:focus, select:focus, textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  outline: none;
}
button:focus-visible {
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  outline: none;
}
```

## Files Changed

- `src/ui/design-tokens.ts` — token updates
- `src/options.tsx` — layout, sticky save, global styles injection
- `src/popup.tsx` — global styles injection
- `src/components/provider-settings-form.tsx` — color dot, input radius

## Testing

- Existing tests should pass with minor assertion updates for changed token values (radius, colors)
- `tests/ui/design-tokens.test.ts` may need updates for new token values
- Visual verification in Chrome for both popup and options pages
