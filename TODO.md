# Game Asset Tool - TODO List

## Project Overview

เว็บแอพสำหรับเป็นเครื่องมือช่วยในการเขียนเกม (Texture, Tilemap, Tileset, Spritesheet, Spriteset)
แรงบันดาลใจจาก: Tile Editor, TexturePacker, Aseprite, Tiled Map Editor

---

## Phase 1: Foundation & Layout ✅ (Completed)

### 1.1 Project Setup

- [x] Set up folder structure (Clean Architecture)
  - `src/presentation/components/` - UI Components
  - `src/presentation/contexts/` - React Contexts
  - `src/presentation/hooks/` - Custom Hooks
  - `src/presentation/stores/` - Zustand Stores
  - `src/presentation/presenters/` - Presenters
  - `src/domain/types/` - TypeScript Types
  - `src/domain/data/` - Data Models
  - `src/infrastructure/` - External Services

### 1.2 Theme System

- [x] Create ThemeProvider with dark mode support
- [x] Create ThemeToggle component
- [x] Persist theme preference (localStorage)

### 1.3 MainLayout (IE5 Browser Style)

- [x] Title Bar with app name and window controls
- [x] Menu Bar (File, Edit, View, Tools, Help)
- [x] Toolbar with icon buttons
- [x] Address Bar / Breadcrumb
- [x] Status Bar (Footer)
- [x] Full screen layout (no scroll)
- [x] Windows 98 retro aesthetic
- [x] Mobile responsive layout

### 1.4 Landing Page

- [x] Welcome screen with app branding
- [x] Quick actions / Recent projects
- [x] Feature highlights
- [x] Mobile responsive layout

---

## Phase 2: Core Editor Framework ✅ (Completed)

### 2.1 Canvas System ✅

- [x] HTML5 Canvas wrapper component
- [x] Zoom in/out functionality
- [x] Pan/scroll navigation (middle mouse)
- [x] Grid overlay toggle
- [x] Pixel-perfect rendering
- [x] Canvas resize handling

### 2.2 Tool System ✅

- [x] Tool registry (Pencil, Eraser, Fill, Picker)
- [ ] Selection tool (Rectangle, Lasso, Magic Wand)
- [x] Pencil/Brush tool with click-drag drawing
- [x] Eraser tool
- [ ] Fill (Bucket) tool
- [x] Color picker (Eyedropper)
- [ ] Move tool
- [x] Zoom tool (scroll wheel)
- [x] Hand tool (Pan - middle mouse)

### 2.3 Color System ✅ (Completed in Color Palette Tool)

- [x] Color palette panel
- [x] Primary/Secondary color selector
- [x] RGB/HSV/HEX color picker
- [ ] Color history
- [x] Import/Export palettes (.pal, .gpl, .ase)
- [x] Popular game palettes (NES, SNES, GB, etc.)

### 2.4 Layer System ✅

- [x] Layer panel
- [x] Add/Remove layers
- [x] Layer visibility toggle
- [x] Layer opacity
- [ ] Layer blending modes
- [x] Layer reordering
- [ ] Layer grouping
- [ ] Merge layers

### 2.5 History System ✅

- [x] Undo/Redo functionality
- [x] History stack (50 states)
- [x] Menu and Toolbar integration

---

## Phase 3: Texture Editor ✅ (Basic Implementation)

### 3.1 Texture Canvas

- [x] Create new texture (custom size)
- [x] Import image files (PNG, JPG, GIF, WebP)
- [x] Texture preview panel
- [x] 9-slice editor for UI textures
- [ ] Seamless texture preview

### 3.2 Texture Operations

- [ ] Resize texture
- [ ] Crop texture
- [ ] Rotate/Flip
- [x] Filters (Blur, Sharpen, Pixelate, Grayscale, Invert, Sepia)
- [x] Color adjustments (Brightness, Contrast, Saturation)
- [x] Outline generator
- [x] Shadow generator

### 3.3 Texture Atlas / Packing ✅ (Completed)

- [x] Import multiple images
- [x] Auto-pack algorithm (MaxRects)
- [ ] Manual arrangement
- [x] Padding/Spacing settings
- [x] Power of 2 sizing option
- [x] Trim transparency option (per sprite & trim all)
- [x] Preview packed result with zoom/pan controls
- [x] Sprite strip import (auto-detect frames)
- [x] Animation preview with FPS control
- [x] Drag & drop support
- [x] Image file validation
- [x] Export to multiple formats (JSON, Cocos, Phaser, Unity, CSS)
- [x] Layout modes (Optimal, Horizontal Strip, Vertical Strip, Grid)
- [x] Sort methods (Name, Width, Height, Area, Perimeter)
- [x] Auto-pack on settings change

---

## Phase 4: Tilemap & Tileset Editor ✅ (Basic Implementation)

### 4.1 Tileset Management

- [x] Import tileset image
- [x] Define tile size (8x8, 16x16, 32x32, 64x64)
- [x] Auto-slice tileset
- [x] Manual tile selection
- [ ] Tile metadata (collision, animation, tags)
- [x] Tileset preview with grid

### 4.2 Tilemap Editor

- [x] Create new tilemap (grid size)
- [x] Multiple tilemap layers
- [x] Paint tiles on map (Pencil tool)
- [x] Eraser tool
- [x] Bucket fill for tiles
- [x] Tile picker tool
- [ ] Rectangle select tiles
- [ ] Copy/Paste tile regions
- [ ] Auto-tile rules (terrain matching)
- [ ] Wang tile support

### 4.3 Tilemap Features

- [x] Zoom & Pan controls
- [x] Grid toggle
- [x] Reset view (1:1)
- [x] Hover position indicator
- [x] Selected tile preview (3x scale)
- [x] Layer management (add, remove, rename, reorder)
- [x] Layer visibility toggle
- [x] Clear layer
- [x] Auto-center canvas on creation
- [x] Export to JSON
- [x] Keyboard shortcuts (1-4, B/E/G/I, H, +/-, 0, Space)
- [x] Right-click to erase
- [x] Space+drag to pan
- [x] Tileset palette zoom controls
- [x] Pixel-perfect rendering (imageSmoothing disabled)
- [x] Import JSON (Custom, Tiled, Cocos, Phaser formats)
- [ ] Mini-map preview
- [ ] Collision layer
- [ ] Object layer
- [ ] Custom properties per tile
- [ ] Animated tiles preview
- [ ] Tile variations (random)

---

## Phase 5: Spritesheet & Animation Editor ✅ (Basic Implementation)

### 5.1 Spritesheet Import/Creation

- [x] Import spritesheet image
- [x] Auto-detect frames (grid-based)
- [x] Manual frame definition
- [x] Frame reordering (via selection order)
- [ ] Frame duplication
- [ ] Frame deletion

### 5.2 Animation System

- [x] Animation timeline
- [x] Play/Pause/Stop controls
- [x] Frame duration (FPS-based timing)
- [x] Loop settings
- [ ] Ping-pong animation
- [ ] Onion skinning (ghost frames)
- [x] Animation preview window

### 5.3 Animation Management

- [x] Multiple animations per spritesheet
- [x] Animation tags/names
- [ ] Animation states (Idle, Walk, Run, Jump, etc.)
- [ ] Animation events/triggers
- [ ] Animation blending preview
- [x] Export animations to JSON

---

## Phase 6: Export System

### 6.1 Export Formats - Cocos Creator

- [ ] Texture Packer (.plist + .png)
- [ ] Auto Atlas format
- [ ] Spine JSON format
- [ ] DragonBones format
- [ ] Tilemap TMX format

### 6.2 Export Formats - Phaser

- [ ] JSON Array format
- [ ] JSON Hash format
- [ ] XML (Starling) format
- [ ] Tilemap JSON format
- [ ] Phaser 3 Atlas format

### 6.3 Export Formats - Unity

- [ ] Unity Sprite Atlas (.spriteatlas)
- [ ] Sprite metadata (.meta)
- [ ] Animation clips (.anim)
- [ ] Tilemap palette
- [ ] ScriptableObject data

### 6.4 Export Formats - General

- [ ] CSS Sprites
- [ ] LibGDX format
- [ ] Godot format
- [ ] GameMaker format
- [ ] Aseprite format
- [ ] Raw JSON/XML data
- [ ] PNG sequence export

### 6.5 Export Settings

- [ ] Output directory selection
- [ ] Naming conventions
- [ ] Scale options (1x, 2x, 4x)
- [ ] Image format (PNG, WebP, JPG)
- [ ] Compression settings
- [ ] Batch export

---

## Phase 7: Project Management

### 7.1 Project System

- [ ] Create new project
- [ ] Open existing project
- [ ] Save project (.gat format)
- [ ] Auto-save feature
- [ ] Project templates
- [ ] Recent projects list

### 7.2 Asset Management

- [ ] Asset browser panel
- [ ] Folder organization
- [ ] Asset search/filter
- [ ] Asset tags
- [ ] Asset preview
- [ ] Drag & drop import

### 7.3 History & Undo

- [ ] Undo/Redo system
- [ ] History panel
- [ ] Action descriptions
- [ ] History snapshots

---

## Phase 8: Advanced Features

### 8.1 Collaboration (Optional)

- [ ] Cloud project storage
- [ ] Share projects via link
- [ ] Real-time collaboration
- [ ] Version history

### 8.2 Plugin System

- [ ] Plugin API
- [ ] Custom tool plugins
- [ ] Custom export format plugins
- [ ] Plugin marketplace

### 8.3 AI-Assisted Features

- [ ] Auto-palette extraction
- [ ] Background removal
- [ ] Sprite upscaling
- [ ] Auto-tileset generation
- [ ] Animation suggestions

### 8.4 Performance

- [ ] WebGL rendering
- [ ] Web Workers for heavy operations
- [ ] Lazy loading
- [ ] Caching system
- [ ] Large file handling

---

## Phase 9: UI/UX Polish

### 9.1 Windows 98 / IE5 Theme

- [ ] Window frames with 3D borders
- [ ] Classic button styles
- [ ] Menu dropdowns
- [ ] Dialog boxes
- [ ] Tooltip styling
- [ ] Progress bars
- [ ] Tab controls

### 9.2 Keyboard Shortcuts

- [ ] Global shortcuts
- [ ] Tool shortcuts
- [ ] Customizable keybindings
- [ ] Shortcut cheatsheet

### 9.3 Accessibility

- [ ] High contrast mode
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Customizable UI scale

### 9.4 Localization

- [ ] Thai language (default)
- [ ] English language
- [ ] Language selector

---

## Phase 10: Documentation & Help

### 10.1 In-App Help

- [ ] Getting started guide
- [ ] Tool tutorials
- [ ] Keyboard shortcut reference
- [ ] FAQ section

### 10.2 Developer Documentation

- [ ] API documentation
- [ ] Plugin development guide
- [ ] Contributing guidelines

---

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Form Handling**: react-hook-form + zod
- **Canvas**: HTML5 Canvas / Fabric.js / Konva.js
- **File Handling**: Browser File API
- **Storage**: IndexedDB (localforage)
- **Export**: JSZip for bundled exports

---

## File Structure (Clean Architecture)

```
src/
├── domain/
│   ├── types/           # TypeScript interfaces & types
│   └── data/            # Data models & constants
├── infrastructure/
│   ├── canvas/          # Canvas rendering engine
│   ├── storage/         # File & project storage
│   └── export/          # Export format handlers
└── presentation/
    ├── components/      # UI Components (Atomic Design)
    │   ├── atoms/
    │   ├── molecules/
    │   ├── organisms/
    │   └── templates/
    ├── contexts/        # React Contexts
    ├── hooks/           # Custom Hooks
    ├── stores/          # Zustand Stores
    └── presenters/      # Presenter classes
```

---

## Current Sprint

**Sprint 1: Foundation** ✅ Completed

1. ✅ Create TODO.md
2. ✅ Set up folder structure
3. ✅ Create ThemeProvider + Theme Toggle
4. ✅ Create MainLayout (IE5 style)
5. ✅ Create Landing Page
6. ✅ Add IE5 CSS styles

**Sprint 2: Atlas Packer** ✅ Completed

1. ✅ Atlas Packer page with MaxRects algorithm
2. ✅ Sprite strip import with auto-detection
3. ✅ Animation preview with playback controls
4. ✅ Export to multiple formats
5. ✅ Mobile responsive layout

**Sprint 3: Color Palette Tool** ✅ Completed

1. ✅ Create Color Palette page
2. ✅ RGB/HSV/HEX color picker
3. ✅ Save/Load palettes
4. ✅ Popular game palettes (NES, SNES, GB)

**Sprint 4: Core Editor Framework** ✅ Completed

1. ✅ Canvas System (wrapper, zoom, pan, grid)
2. ✅ Tool System (pencil, eraser, picker)
3. ✅ Layer System (panel, add/remove, visibility, opacity)
4. ✅ History System (undo/redo)
5. ✅ Export PNG

**Sprint 5: Atlas Packer Enhancements** ✅ Completed

1. ✅ Trim transparent pixels per sprite

**Sprint 6: Spritesheet Editor** ✅ Completed

1. ✅ Create Spritesheet Editor page route
2. ✅ Import spritesheet image with grid detection
3. ✅ Frame selection (click/shift+click multi-select)
4. ✅ Create animations from selected frames
5. ✅ Animation preview with play/pause controls
6. ✅ Timeline editor
7. ✅ Export animations to JSON
8. ✅ Link from Landing page

**Sprint 7: Tilemap Freeform Enhancements** ✅ Completed

1. ✅ Freeform mode drag-select multiple tiles
2. ✅ Auto Draw from selection
3. ✅ Reference Image upload with overlay
4. ✅ Reference Image pan/scale/offset controls
5. ✅ Auto Draw from Reference Image (tile matching)
6. ✅ Building templates for preset sizes

**Sprint 8: Multi-Export** ✅ Completed

1. ✅ Create Multi-Export page route at /multi-export
2. ✅ Support 9 export formats (Cocos, Phaser, Unity, Godot, LibGDX, CSS, Generic)
3. ✅ Batch export with ZIP download
4. ✅ Cocos Creator as default format
5. ✅ Export settings (scale, padding, power of two, trim)
6. ✅ Export log with progress indicator
7. ✅ Link from Landing page

**Sprint 9: Texture Editor & Tilemap Import** ✅ Completed

1. ✅ Create Texture Editor page at /texture-editor
2. ✅ 9-Slice editor for UI textures
3. ✅ Filters (Blur, Sharpen, Pixelate, Grayscale, Invert, Sepia)
4. ✅ Color adjustments (Brightness, Contrast, Saturation)
5. ✅ Outline generator
6. ✅ Shadow generator
7. ✅ Tilemap Import JSON (Custom, Tiled, Cocos, Phaser formats)
8. ✅ Link from Landing page

**Sprint 10: Advanced Features** ✅ Completed

1. ✅ Auto-tile rules (terrain matching) - 4x4 tile selection, bitmask painting
2. ✅ Spritesheet onion skinning - Ghost frames with opacity control
3. ✅ Project management - Storage utility, Recent projects, Save/Load .gat files

**Sprint 11: UI Enhancements** ✅ Completed

1. ✅ Seamless texture preview - Tiled preview with adjustable grid count
2. ✅ Mini-map preview for tilemap - Overview with viewport indicator
3. ✅ Animation states (Idle, Walk, Run, Jump, Attack, Hurt, Death, Custom)

**Sprint 12: Game Engine Integration** ✅ Completed

1. ✅ Collision layer for tilemap - Red overlay with visual indicators
2. ✅ Animated tiles preview - Toggle animation in toolbar, frame cycling
3. ✅ Export Cocos Creator animation format - Animation clips with states

**Sprint 13: Editor Enhancements** ✅ Completed

1. ✅ Undo/Redo for tilemap editor - History stack, Cmd+Z/Cmd+Shift+Z shortcuts
2. ✅ Multi-tileset support - Tileset selector, add/remove tilesets
3. ✅ Tile properties editor - Collision, animated, animation frames

**Sprint 14: UX Improvements** ✅ Completed

1. ✅ Keyboard shortcuts help dialog - Press `?` to open, styled kbd keys
2. ✅ Recent files in tilemap editor - Shows 5 recent projects in sidebar
3. ✅ Template maps presets - Empty, Platformer, Top-Down, Dungeon, Puzzle, Large World

**Sprint 15: Advanced Editing** ✅ Completed

1. ✅ Auto-save tilemap to localStorage - Every 30 seconds, saved projects list
2. ✅ Copy/Paste tile selection - Select tool (5/S), ⌘C/⌘V to copy/paste
3. ✅ Flip/Rotate tiles - Toggle buttons in toolbar

**Sprint 16: Next Features** 🔄 Current

1. 🔄 Stamp brush (place multiple tiles at once)
2. 🔄 Selection fill (fill selected area)
3. 🔄 Layer opacity slider

---

## Notes

- Follow SOLID principles
- Follow Clean Architecture pattern
- Use Atomic Design for components
- All pages follow CREATE_PAGE_PATTERN.md
- Full screen app (no page scroll)
- Windows 98 / IE5 retro aesthetic
