# TechNest Pharma Design System

## 🎨 Brand Colors

### Primary Colors (From Logo)
```css
/* Navy Blue - Used for Tech & Pharma text */
--brand-navy: oklch(0.358 0.118 255)
HEX: #003B78 / #00548C

/* Medical Green - Used for Nest text */
--brand-green: oklch(0.56 0.144 151)
HEX: #158B45 / #2D995B
```

### Light Theme
```css
/* Surfaces */
--background: oklch(0.985 0.004 250)      /* Soft cool-white page */
--card: oklch(1 0 0)                      /* Pure white cards */
--sidebar: oklch(0.992 0.003 250)         /* Elevated sidebar */

/* Text */
--foreground: oklch(0.18 0.028 255)       /* Deep text */
--muted-foreground: oklch(0.48 0.028 255) /* Secondary text */

/* Primary (Navy Blue) */
--primary: oklch(0.358 0.118 255)
--primary-hover: oklch(0.32 0.12 255)
--primary-foreground: oklch(0.99 0.005 250)

/* Success (Medical Green) */
--success: oklch(0.56 0.144 151)
--success-foreground: oklch(0.99 0.005 250)

/* Semantic Colors */
--destructive: oklch(0.55 0.22 26)        /* Red */
--warning: oklch(0.74 0.16 75)            /* Amber */

/* Interactive */
--accent: oklch(0.93 0.035 255)
--secondary: oklch(0.96 0.008 250)
--border: oklch(0.895 0.01 250)
```

### Dark Theme
```css
/* Surfaces */
--background: oklch(0.165 0.018 255)      /* Deep navy-charcoal */
--card: oklch(0.202 0.021 255)            /* Layered lighter */
--sidebar: oklch(0.185 0.019 255)

/* Primary (Lifted for dark mode) */
--primary: oklch(0.66 0.14 253)
--primary-hover: oklch(0.71 0.14 253)

/* Success (Lifted for dark mode) */
--success: oklch(0.68 0.15 151)
```

---

## 📐 Spacing Scale

```css
/* Premium spacing system */
px-3    = 12px   /* Compact */
px-4    = 16px   /* Default */
px-5    = 20px   /* Enhanced */
px-6    = 24px   /* Spacious */
px-7    = 28px   /* Premium */

gap-4   = 16px   /* Cards */
gap-5   = 20px   /* Sections */
gap-7   = 28px   /* Major groups */
```

---

## 🎯 Border Radius

```css
--radius: 0.75rem               /* Base: 12px */
--radius-sm: calc(0.75rem - 4px)  /* 8px */
--radius-md: calc(0.75rem - 2px)  /* 10px */
--radius-lg: 0.75rem              /* 12px */
--radius-xl: calc(0.75rem + 4px)  /* 16px */

/* Component Usage */
rounded-lg    = 12px   /* Buttons, small elements */
rounded-xl    = 16px   /* Inputs, badges */
rounded-2xl   = 24px   /* Cards, tables */
rounded-full  = 9999px /* Badges, avatars */
```

---

## 🌟 Shadow System

```css
/* 5-tier elevation system */

--shadow-xs
Usage: Inputs at rest, subtle elevation
Box Shadow: 0 1px 2px 0 oklch(0.2 0.03 255 / 0.05)

--shadow-sm
Usage: Cards at rest, buttons at rest
Box Shadow: 0 1px 3px 0 oklch(0.2 0.03 255 / 0.08)

--shadow-md
Usage: Hover states, modals
Box Shadow: 0 4px 12px -2px oklch(0.2 0.05 255 / 0.12)

--shadow-lg
Usage: Important elevated elements
Box Shadow: 0 12px 28px -6px oklch(0.2 0.06 255 / 0.16)

--shadow-xl
Usage: Maximum elevation, overlays
Box Shadow: 0 20px 40px -8px oklch(0.2 0.06 255 / 0.20)
```

---

## ✍️ Typography

### Font Families
```css
--font-sans: Geist Sans, system-ui, sans-serif
--font-mono: Geist Mono, monospace
```

### Font Sizes
```css
text-xs     = 12px    /* Labels, badges */
text-sm     = 14px    /* Body, descriptions */
text-base   = 16px    /* Default */
text-lg     = 18px    /* Subheadings */
text-xl     = 20px    /* Section titles */
text-2xl    = 24px    /* Card titles */
text-3xl    = 30px    /* Page headers */
text-4xl    = 36px    /* Hero (mobile) */
text-5xl    = 48px    /* Hero (tablet) */
text-6xl    = 60px    /* Hero (desktop) */
```

### Font Weights
```css
font-normal   = 400   /* Descriptions */
font-medium   = 500   /* Body text */
font-semibold = 600   /* Buttons, labels */
font-bold     = 700   /* Headers, emphasis */
```

### Line Heights
```css
leading-tight   = 1.25   /* Headings */
leading-snug    = 1.375  /* Compact text */
leading-normal  = 1.5    /* Default */
leading-relaxed = 1.625  /* Descriptions */
```

### Letter Spacing
```css
tracking-tight   = -0.02em  /* Large headings */
tracking-normal  = 0        /* Default */
tracking-wide    = 0.025em  /* Buttons */
tracking-wider   = 0.05em   /* Labels */
tracking-[0.1em] = 0.1em    /* Section headers */
```

---

## 🔘 Component Sizes

### Buttons
```css
/* Size Presets */
sm:  h-9  (36px) rounded-lg  px-4  text-xs
default: h-10 (40px) rounded-xl  px-5  text-sm
lg:  h-11 (44px) rounded-xl  px-7  text-base
icon: size-10 (40x40px)

/* States */
hover: shadow-lg, -translate-y-0.5
active: scale-[0.97]
disabled: opacity-60
```

### Inputs
```css
h-10 (40px)
rounded-xl (16px)
px-4 py-2.5
border: 1px
font-medium
```

### Cards
```css
rounded-2xl (24px)
padding: p-6 (24px) or p-7 (28px)
border: 1px, border/60
shadow-md
hover: shadow-lg
```

### Badges
```css
rounded-full
px-3 py-1
text-xs font-semibold
ring-1 ring-inset
```

---

## ⚡ Animation System

### Durations
```css
duration-200  = 200ms   /* Quick interactions */
duration-300  = 300ms   /* Standard transitions */
duration-500  = 500ms   /* Data updates */
```

### Easing
```css
ease-out      /* Default */
ease-in-out   /* Smooth */
```

### Common Patterns
```css
/* Hover Lift */
hover:-translate-y-0.5
hover:-translate-y-1
transition-all duration-300

/* Scale */
hover:scale-105   /* Icons */
hover:scale-110   /* Emphasis */
active:scale-[0.97]

/* Fade */
opacity-0 → opacity-100
transition-opacity duration-300

/* Spin */
animate-spin

/* Pulse */
animate-ping (notification badge)
```

---

## 🎨 Utility Classes

### Custom Utilities
```css
/* Gradients */
.bg-gradient-primary
  background: linear-gradient(135deg, primary, primary-hover)

.bg-gradient-success
  background: linear-gradient(135deg, success, darker-success)

/* Glass Effect */
.glass
  background: white / 70% opacity
  backdrop-filter: blur(12px) saturate(180%)

.glass-dark
  background: dark / 60% opacity
  backdrop-filter: blur(12px) saturate(180%)

/* Dot Grid */
.bg-dot-grid
  radial-gradient pattern for backgrounds

/* Shimmer */
.animate-shimmer
  loading animation
```

---

## 🎯 Component Patterns

### Stat Card
```tsx
<Card className="p-6 hover:-translate-y-1 hover:shadow-lg">
  <TopAccentBar />
  <IconBadge size-10 />
  <Value className="text-3xl font-bold" />
  <Label className="text-sm font-medium text-muted-foreground" />
</Card>
```

### Data Table
```tsx
<div className="rounded-2xl border border-border/60 bg-card shadow-md">
  <table>
    <thead className="bg-gradient-to-r from-secondary/60">
      <th className="text-xs font-bold uppercase">
    </thead>
    <tbody>
      <tr className="hover:bg-accent/50">
    </tbody>
  </table>
</div>
```

### Page Header
```tsx
<div className="flex gap-4 border-b pb-6">
  <GradientBar className="w-1 h-8 rounded-full" />
  <div>
    <h1 className="text-3xl font-bold" />
    <p className="text-sm font-medium text-muted-foreground" />
  </div>
</div>
```

---

## 🏷️ Icon Guidelines

### Sizes
```css
size-4   = 16px   /* Small buttons, inline */
size-5   = 20px   /* Default buttons */
size-6   = 24px   /* Large buttons, cards */
size-9   = 36px   /* Badge icons */
size-10  = 40px   /* Stat cards */
size-12  = 48px   /* Hero icons */
```

### Stroke Width
```css
strokeWidth={2}    /* Default */
strokeWidth={2.5}  /* Emphasis, active states */
```

### Hover Effects
```css
hover:scale-105   /* Subtle */
hover:scale-110   /* Prominent */
transition-all duration-200
```

---

## ♿ Accessibility

### Contrast Ratios
```css
Text on background: 8:1 (AAA)
Interactive elements: 4.5:1 (AA)
Disabled states: Reduced opacity 60%
```

### Focus States
```css
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ring/30
focus-visible:border-ring
```

### Interactive Targets
```css
Minimum: 44x44px (11 spacing units)
Buttons: h-10 (40px) or h-11 (44px)
Touch-friendly on mobile
```

---

## 📱 Responsive Breakpoints

```css
sm:  640px   /* Small tablets */
md:  768px   /* Tablets */
lg:  1024px  /* Small laptops */
xl:  1280px  /* Desktops */
2xl: 1536px  /* Large screens */
```

### Usage
```css
/* Mobile First */
grid-cols-2          /* Mobile: 2 columns */
md:grid-cols-3       /* Tablet: 3 columns */
xl:grid-cols-6       /* Desktop: 6 columns */
```

---

## 🎨 Usage Examples

### Premium Button
```tsx
<button className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md hover:bg-primary-hover hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200">
  Click Me
</button>
```

### Premium Card
```tsx
<div className="rounded-2xl border border-border/60 bg-card p-6 shadow-md hover:shadow-lg transition-all duration-300">
  Content
</div>
```

### Premium Input
```tsx
<input className="h-10 w-full rounded-xl border border-input bg-card px-4 py-2.5 font-medium shadow-sm focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring focus-visible:shadow-md transition-all" />
```

---

**Design System Version**: 1.0  
**Last Updated**: January 2025  
**Maintained by**: TechNest Pharma Team
