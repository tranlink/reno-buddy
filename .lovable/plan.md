

## Add Dark Mode Toggle

### What will change

**1. Create a ThemeProvider wrapper** (`src/components/ThemeProvider.tsx`)
- Wrap the app with `next-themes`'s `ThemeProvider` so the `.dark` class gets applied to `<html>`
- Set default theme to "system" and storage key to "reno-theme"

**2. Update `src/App.tsx`**
- Wrap the app content with the new `ThemeProvider`

**3. Add a theme toggle button in the header** (`src/components/AppLayout.tsx`)
- Add a Sun/Moon icon button next to the project selector in the header
- Clicking it cycles between light and dark mode
- Uses `useTheme()` from `next-themes`

### Why this works out of the box
- Dark mode CSS variables are already fully defined in `src/index.css` (the `.dark` class block)
- `next-themes` is already installed as a dependency
- All UI components already use CSS variables (`hsl(var(--background))`, etc.), so they will adapt automatically

### Technical details

**ThemeProvider.tsx:**
```tsx
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
```

**AppLayout.tsx header addition:**
- Import `Moon`, `Sun` from `lucide-react`
- Import `useTheme` from `next-themes`
- Add a button that toggles between light/dark before the project selector

