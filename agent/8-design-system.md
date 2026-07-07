# Skill: "Nerva the Knowing" Design System & Token Guide

Use this checklist for writing all Tailwind classes, styling shadcn/ui primitives, and organizing layout components.

## 1. Color Token Mapping
Every view must strictly implement this high-contrast palette:
- **Canvas Base:** `#F7F8FA` (`bg-[#F7F8FA]`) - Clean, light off-white/gray surface for primary page backgrounds.
- **Hero Anchors:** `#121212` (`bg-[#121212]`) - Deep obsidian/off-black for core dashboard blocks, major section headers, and premium container cards.
- **The Pulse Accent:** `#2DD4BF` (`text-[#2DD4BF]` / `bg-[#2DD4BF]`) - Vibrant electric teal-cyan, reserved exclusively for active operational states, metric trends, active status dots, and key data callouts.
- **Primary Ink Black:** `#0A0A0A` (`text-[#0A0A0A]`) - Primary text color on light backgrounds.
- **Primary High-Contrast White:** `#FFFFFF` (`text-[#FFFFFF]`) - Primary text color inside obsidian cards and dark elements.
- **Muted UI Grays:** `#D1D5DB` (`border-[#D1D5DB]` / `text-gray-400`) - Warm neutral gray for thin borders, structural divider lines, and disabled interaction states.

## 2. Typography & Structural Hierarchy
Ensure all text layout elements strictly follow the Inter geometric hierarchy:
- **Page Titles (Level 1):** `font-black text-[28px] md:text-[32px] text-[#0A0A0A] tracking-tight`
- **Card & Section Titles:** `font-semibold text-[20px] md:text-[24px]` (Use `text-[#FFFFFF]` if inside an obsidian container, otherwise `text-[#0A0A0A]`).
- **Critical Monetary/Data Pushes:** `font-bold text-[#2DD4BF]` or prominent sizing for financial tracking numbers.
- **Standard Body Text:** `font-normal text-[14px] text-zinc-700 leading-relaxed` for instructions and labels.
- **Secondary Tracking/Timestamps:** `font-medium text-[12px] text-zinc-400` (e.g., "Shift Open: Active" status indicators)[cite: 2].