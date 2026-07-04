# Design System: StudyConnect Chat Interface Redesign

## 1. Visual Theme & Atmosphere
The StudyConnect Chat interface is redesigned with a "Zenith Academic" atmosphere: clinical yet warm, focused, and distraction-free. The environment feels like a modern high-end architectural studio or university reading room. The interface balances high information density with ample surrounding whitespace to promote focus during long study sessions. It implements a premium dark mode default with a clean light mode counterpart.

- **Density:** 7/10 (Daily Utility App - information is scannable and structured, using compact spacing for chat logs and monospaced timestamps to maintain readability).
- **Variance:** 6/10 (Subtle offset asymmetry in the layout, alternating message structures, and offset sidebar metadata).
- **Motion:** 5/10 (Fluid but restrained CSS transitions and spring-like animations for panel entries and list cascades. No distracting animation loops during reading).

---

## 2. Color Palette & Roles
The color theme utilizes high-contrast neutral backgrounds with a single primary accent color representing focus and connection. The "AI Purple/Blue Neon" glow is strictly BANNED.

### Light Mode Colors
- **Canvas White** (`#F9FAFB`) — App frame background.
- **Pure Surface** (`#FFFFFF`) — Chat panels and cards.
- **Charcoal Ink** (`#111827`) — Primary body text and headlines.
- **Muted Steel** (`#4B5563`) — Secondary text, metadata, and timestamps.
- **Whisper Border** (`#E5E7EB`) — Standard borders and structural line dividers.
- **Zenith Teal** (`#0D9488`) — Single accent color for active states, unread badges, and primary calls to action (CTA).

### Dark Mode Colors
- **Abyss Canvas** (`#0B0F19`) — App frame background.
- **Obsidian Surface** (`#111827`) — Chat panels and conversation view containers.
- **Ghost White** (`#F3F4F6`) — Primary body text and headlines.
- **Slate Mist** (`#9CA3AF`) — Secondary text and metadata.
- **Shadow Border** (`#1F2937`) — Standard borders and dividers.
- **Zenith Teal** (`#0D9488`) — Accent color for active items, hover transitions, and CTA rings.

---

## 3. Typography Rules
- **Display/Headlines:** `Outfit` (or `Satoshi`) — Track-tight (`letter-spacing: -0.02em`), bold weight, clean typographic scale. Font size is kept restrained (`1.25rem` to `1.5rem` for titles) to prevent screen shouting.
- **Body & Inputs:** `Satoshi` (or default system Sans-Serif sans Inter) — Standard body text and message bubbles. Set with relaxed line-height (`line-height: 1.5`), tracking neutral, and maximum width for readability (65 characters per line max).
- **Mono:** `JetBrains Mono` — For monospaced numbers, file sizes, and message timestamps (e.g., `14:23`).
- **Banned:** `Inter` and generic browser default serif fonts (`Times New Roman`, `Georgia`). No italic text for normal messages.

---

## 4. Component Stylings

### Chat Sidebar & Friend List
- Render list items with zero-border layouts, separated by generous negative space (`margin-bottom: 4px`).
- Hover state: Slight background fill change with a `50ms` transition.
- Active selected state: A subtle vertical accent bar on the left edge (`width: 3px`, height matches layout, color is `Zenith Teal`).

### Message Bubbles
- **Sender (Mine):** Zenith Teal gradient to Charcoal Ink (`linear-gradient(135deg, #0D9488, #111827)`). Rounded corners (`18px 18px 4px 18px`) for immediate orientation.
- **Receiver (Friend):** Background uses `Obsidian Surface` (Dark) or `Pure Surface` (Light). Clean outline border (`1px solid var(--border)`). Rounded corners (`18px 18px 18px 4px`).
- No outer neon glows, shadows are muted and color-matched to the background.

### Buttons & Inputs
- **Inputs:** Message composer input utilizes a textarea that expands dynamically but stays bounded (`max-height: 120px`). Border transitions to `Zenith Teal` on focus. No floating labels.
- **Buttons:** Tactical push-down effect on press (`transform: translateY(1px)`). Primary button is filled with `Zenith Teal`, secondary button is ghost/outline style.

### Loaders & Empty States
- **Loaders:** Custom skeleton shimmers matching the exact shape of sidebar list items and message bubbles. Circular spinners are BANNED.
- **Empty States:** Composed typography blocks with descriptive text and secondary instruction (e.g., "Select a contact from the sidebar to view academic discussions"). Emojis are BANNED in layout elements.

---

## 5. Layout Principles
- **No Overlapping Elements:** Clean margins and grid alignments. Stacking components or absolute overlays are BANNED except for dropdown overlays and explicit modal layers.
- **Split Layout:** Double-column layout on Desktop (`360px` sidebar, flexible width conversation view). Mobile view collapses into a clean single-column view using `min-h-[100dvh]`.
- **Spacing:** Uniform spacing using Tailwind scale equivalents (e.g., `16px` / `24px` / `32px`). Grid alignment enforces a clean structural vertical line from header to composer.

---

## 6. Motion & Interaction
- **Spring Transitions:** Use spring-like CSS transitions (`transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.1)`) on interactive controls.
- **List Cascading:** Staggered delay loading on contact list items (`5ms` incremental animation delay) to create a premium waterfall entry feel.
- **Hardware Acceleration:** Animations restricted to `transform` and `opacity` to maintain 60FPS rendering on lower-end devices.

---

## 7. Banned Patterns & Clichés (Anti-Patterns)
- **NO `Inter` font** — Use `Outfit` or `Satoshi` for custom premium appeal.
- **NO Purple / Neon neon-glow shadows** — Keep cards flat or with tight, Hue-tinted soft shadows.
- **NO Emojis in static UI elements** — Emojis are reserved only for message text and user-triggered message reactions. Decorative icons must be SVG.
- **NO generic names or placeholder copy** — "Acme Study", "John Doe" are banned. Use realistic, localization-focused placeholders.
- **NO browser default scrollbars** — Style custom thin scrollbars matched to the theme neutrals.
