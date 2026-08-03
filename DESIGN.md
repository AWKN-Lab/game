# Design System Specification: The Celestial Scholar

## 1. Overview & Creative North Star
**Creative North Star: "The Astral Archive"**

This design system moves away from the sterile, utilitarian nature of traditional educational platforms, leaning instead into the immersive, mystical atmosphere of high-end adventure gaming. The goal is to transform "learning" into "discovery." 

To break the "template" look, we utilize **intentional asymmetry** and **tonal depth**. Layouts should feel like a scholar’s magical desk: overlapping parchment-like cards, floating glass orbs of information, and golden filigree that guides the eye. We avoid rigid, boxy grids in favor of layered surfaces that feel like they are floating in a deep, cosmic void.

## 2. Colors & Surface Logic

The color palette is anchored in the deep mysteries of the night sky, punctuated by the "alchemical gold" of achievement and vibrant "Vision" highlights for character-driven content.

### The Palette (Material Design Tokens)
*   **Surface/Background:** `#041133` (Deep Navy) — The foundation of the "void."
*   **Primary:** `#efbd8a` (Gold/Bronze) — Used for critical actions and royal accents.
*   **Secondary:** `#b6c4ff` (Ethereal Blue) — Used for interactive sub-elements.
*   **Tertiary:** `#ffb2b8` (Furina Pink) / Custom Orange (Hu Tao) — Used for character-specific highlights or milestones.

### The "No-Line" Rule
Explicitly prohibit 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts or subtle tonal transitions. For instance, a lesson module (using `surface-container-low`) sits directly on the main `surface` background. The change in depth, not a line, creates the separation.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical, translucent layers.
1.  **Base Layer:** `surface` (#041133)
2.  **Section Layer:** `surface-container-low` (#0d1a3c) - Used for broad content areas.
3.  **Component Layer:** `surface-container` (#121e40) - Used for cards and interactive modules.
4.  **Elevation Layer:** `surface-bright` (#2d385b) - Reserved for active states or "hovering" glass cards.

### The "Glass & Gradient" Rule
To achieve the "mystical" feel, use **Glassmorphism** for floating menus and modal overlays. Use a combination of `surface-variant` at 60% opacity with a `20px` backdrop-blur. 
*   **Signature Texture:** Primary buttons should use a subtle linear gradient from `primary` (#efbd8a) to `primary_container` (#5a3912) at a 135-degree angle to simulate the sheen of polished bronze.

## 3. Typography
The typography strategy pairs the authority of a serif heading with the high-performance readability of modern sans-serifs.

*   **Display & Headlines (Noto Serif):** Used for chapter titles and "Quest" headings. The serif adds a sense of history and "educational prestige."
*   **Body (Manrope):** A clean, geometric sans-serif used for instructional text. It provides a necessary modern contrast to the ornate surroundings.
*   **Labels (Plus Jakarta Sans):** Used for technical metadata (e.g., "Time to Complete," "XP Gain"). It is tracked out (1-2%) for a premium, airy feel.

**Hierarchy Goal:** Large, high-contrast headline scales (e.g., `display-lg`) against small, muted body text creates an editorial, "Adventure Log" aesthetic.

## 4. Elevation & Depth

### Tonal Layering
Depth is achieved by "stacking" the surface-container tiers. Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural "recessed" effect without shadows.

### Ambient Shadows & "The Ghost Border"
*   **Shadows:** When an element must float (like a rewards chest or a pop-up), use a shadow tinted with the `on-surface` color (#dbe1ff) at 6% opacity with a 32px blur. Never use pure black shadows.
*   **The Ghost Border:** If accessibility requires a stroke, use `outline-variant` (#444651) at **15% opacity**. It should be a whisper of a line, suggestive rather than restrictive.
*   **Inner Glow:** For active interactive elements, apply a 2px inner-shadow/glow using the `primary` (Gold) or `tertiary` (Pink/Red) token to simulate "elemental energy."

## 5. Components

### Buttons (The "Sigil" Style)
*   **Primary:** Gradient fill (Gold), `md` (0.75rem) rounded corners. On hover, add a 4px outer glow of the same color.
*   **Secondary:** Glassmorphic background with a "Ghost Border" of `secondary`.
*   **Tertiary:** Text only, using `label-md` in all-caps with 0.1em letter spacing.

### Cards & Modules
*   **Forbid Dividers:** Never use horizontal lines. Separate content using `surface-container` shifts or `2rem` vertical spacing.
*   **Ornate Accents:** Cards should feature a single "ornate" corner—specifically the top-left—using a 2px gold accent vector or a custom `primary` border-radius logic (e.g., `4px 24px 4px 4px`).

### Input Fields
*   **Visual State:** Inputs are `surface-container-lowest` with a bottom-only 1px "Ghost Border." On focus, the border animates to 100% opacity `primary` gold with a subtle bloom effect.

### Chips (Element Tags)
*   Selection chips use the `tertiary` (Pink) for Furina-themed content or `error` (Red) for Hu Tao-themed content. They should have a `full` roundedness and a subtle `0.1` opacity glow of their own color.

### Progress Orbs (Custom Component)
Instead of a flat progress bar, use a circular "Vision" orb that fills with a liquid gradient of `secondary` blue as the student progresses through the lesson.

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical margins. If a header is left-aligned, let the sub-text be slightly offset to the right to create a "pathway" for the eye.
*   **Do** use backdrop-blur on all navigation elements to keep the cosmic background visible.
*   **Do** use the `tertiary` highlights sparingly—only for moments of "level up" or "special discovery."

### Don't:
*   **Don't** use 100% opaque black or white. Everything should have a hint of the blue/navy tint to maintain the "mystical" atmosphere.
*   **Don't** use sharp 90-degree corners. The minimum radius is `sm` (0.25rem) to ensure the UI feels "crafted" rather than "industrial."
*   **Don't** clutter the screen. If the information density is high, use "Stacked Glass" (nested containers) rather than multiple separate boxes.