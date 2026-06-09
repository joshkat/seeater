# Styling & Theming

How the UI is styled, how theming works, and how to add new UI that looks consistent.

---

## The system: Tailwind v4 + DaisyUI

All DOM UI is styled with **utility classes**, not inline `style={{...}}` objects. Two layers:

- **[Tailwind CSS v4](https://tailwindcss.com/)** — low-level utilities: `flex`, `gap-2`, `p-4`,
  `text-sm`, `rounded`, `w-full`, `items-center`, breakpoints like `sm:` / `lg:`, etc.
- **[DaisyUI](https://daisyui.com/)** — component classes built on Tailwind: `btn`, `input`,
  `card`, `badge`, `dropdown`, `menu`, `join`, `checkbox`, `select`, etc.

The payoff: **adding a new button is just a className** — no need to know any bespoke CSS:

```tsx
<button className="btn btn-primary btn-sm">Save</button>      // filled primary
<button className="btn btn-sm">Cancel</button>                // neutral
<button className="btn btn-error btn-sm">Delete</button>      // danger
<span className="badge badge-success">Going</span>            // status pill
```

Setup lives in `apps/web/vite.config.ts` (the `@tailwindcss/vite` plugin) and
`apps/web/src/styles/global.css` (the `@import "tailwindcss"` + DaisyUI theme definitions).

> The **canvas** (react-konva) is the exception — Konva nodes (`<Circle>`, `<Rect>`, `<Text>`) are
> painted to a `<canvas>` and take **Konva props** (`fill`, `stroke`, `radius`), not CSS classes.

---

## Theme tokens (use these, not hard-coded colors)

DaisyUI themes define **semantic color tokens**. Always style with the token, never a raw hex —
that's what makes every theme (light/dark/black/synthwave) look right automatically.

| Token                                 | Use for                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `bg-base-100`                         | Cards, panels, popovers (the "surface")                                   |
| `bg-base-200`                         | The page background / subtle fills                                        |
| `bg-base-300`                         | Borders, dividers (`border-base-300`)                                     |
| `text-base-content`                   | Default text. Use `/60`, `/40` for muted (`text-base-content/60`)         |
| `*-primary`                           | Primary actions/brand (blue): `btn-primary`, `bg-primary`, `text-primary` |
| `*-secondary` / `*-accent`            | Secondary emphasis                                                        |
| `*-success` / `*-error` / `*-warning` | Status: green / red / amber (e.g. RSVP, save state)                       |

Example — a panel that adapts to any theme:

```tsx
<aside className="border-l border-base-300 bg-base-100 p-4 text-base-content">
  <h2 className="text-[15px] font-semibold">Properties</h2>
  <p className="text-sm text-base-content/60">Select a table to edit it.</p>
</aside>
```

If you write `text-gray-500` or `bg-white`, it'll look wrong in dark themes — reach for the tokens.

---

## How theming works (and persists)

- The active theme is stored as a `data-theme` attribute on the `<html>` element. DaisyUI swaps all
  the token values based on it.
- **Persistence + no flash:** `apps/web/src/lib/theme.ts` saves the choice to `localStorage` and
  `main.tsx` calls `restoreTheme()` **before React renders**, so the saved theme is applied
  instantly on load with no flash of the default.
- The **theme picker** is in `features/editor/components/Toolbar.tsx`; it lists the themes from
  `theme.ts`'s `THEMES` array and calls `applyTheme(...)`.

To **add a theme:** define it in `global.css` (a `@plugin "daisyui/theme" { ... }` block, or use a
built-in DaisyUI theme name), then add an entry to `THEMES` in `lib/theme.ts`. That's it.

---

## Patterns you'll reuse

- **Segmented control** → DaisyUI `join` with `join-item` buttons; mark the active one
  (`btn-primary`/`btn-active`). Used by the chair-layout and RSVP controls.
- **Overflow / context menu** → `dropdown dropdown-end` + a `menu` `dropdown-content`. Used on the
  event cards.
- **Modal/dialog** → a fixed full-screen overlay (`fixed inset-0 z-50 grid place-items-center
bg-black/40`) with a `bg-base-100 rounded-box` panel; stop click-propagation on the panel so
  clicking the backdrop closes it. Used by New Event / Duplicate dialogs.
- **Cards** → `rounded-box border border-base-300 bg-base-100 p-4 shadow-sm`.
- **Muted/secondary text** → `text-base-content/60` (or `/40` for very subtle).
- **Responsive** → Tailwind breakpoints are available (`sm:grid-cols-2 lg:grid-cols-3`), used by the
  dashboard grid.

---

## Quick rules

1. **Classes, not inline styles** (except truly dynamic values like a guest's generated avatar
   color, or a resizable panel's pixel width — those stay as small `style={{...}}`).
2. **Semantic tokens, not raw colors**, so every theme works.
3. **One component per file**; keep styling co-located with the component.
4. **Konva canvas nodes use Konva props**, not CSS.
