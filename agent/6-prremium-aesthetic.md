# Skill: Dark Mode Premium & shadcn Customization

Use this design blueprint to maintain consistency across all web dashboards and checkout registers.

## 1. Tailwind Color Palette (Linear-esque)
- **Backgrounds:** Absolute dark finishes combined with deep slate surfaces (`bg-[#09090b]` for base canvas, `bg-[#18181b]` for panels).
- **Borders:** Thin, high-precision structural lines (`border-zinc-800` or `border-neutral-800/50`).
- **Typography:** High-scannability contrast configurations (`text-zinc-100` for primary emphasis, `text-zinc-400` for helper data tags).

## 2. Component Design Principles
- **Modals & Dialogs:** Use shadcn/ui `<Dialog />` with a crisp backdrop blur (`backdrop-blur-sm`).
- **Loading States:** Implement skeleton patterns matching exact layout distributions to eliminate layout shifts when local databases are updating records.