"use client";

import { ThemeToggle } from "@/src/presentation/components/atoms/ThemeToggle";
import { ComingSoonModal } from "@/src/presentation/components/molecules/ComingSoonModal";
import { useComingSoonModal } from "@/src/presentation/hooks/useComingSoonModal";
import { useState } from "react";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

interface MenuItem {
  label: string;
  items: {
    label: string;
    shortcut?: string;
    divider?: boolean;
    disabled?: boolean;
  }[];
}

const menuItems: MenuItem[] = [
  {
    label: "File",
    items: [
      { label: "New Project", shortcut: "Ctrl+N" },
      { label: "Open Project", shortcut: "Ctrl+O" },
      { label: "Save Project", shortcut: "Ctrl+S" },
      { label: "Save As...", shortcut: "Ctrl+Shift+S" },
      { label: "", divider: true },
      { label: "Import Image...", shortcut: "Ctrl+I" },
      { label: "Export...", shortcut: "Ctrl+E" },
      { label: "", divider: true },
      { label: "Exit", shortcut: "Alt+F4" },
    ],
  },
  {
    label: "Edit",
    items: [
      { label: "Undo", shortcut: "Ctrl+Z" },
      { label: "Redo", shortcut: "Ctrl+Y" },
      { label: "", divider: true },
      { label: "Cut", shortcut: "Ctrl+X" },
      { label: "Copy", shortcut: "Ctrl+C" },
      { label: "Paste", shortcut: "Ctrl+V" },
      { label: "Delete", shortcut: "Del" },
      { label: "", divider: true },
      { label: "Select All", shortcut: "Ctrl+A" },
    ],
  },
  {
    label: "View",
    items: [
      { label: "Zoom In", shortcut: "Ctrl++" },
      { label: "Zoom Out", shortcut: "Ctrl+-" },
      { label: "Fit to Window", shortcut: "Ctrl+0" },
      { label: "Actual Size", shortcut: "Ctrl+1" },
      { label: "", divider: true },
      { label: "Show Grid", shortcut: "Ctrl+G" },
      { label: "Show Rulers", shortcut: "Ctrl+R" },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Texture Editor" },
      { label: "Tilemap Editor" },
      { label: "Spritesheet Editor" },
      { label: "Animation Editor" },
      { label: "", divider: true },
      { label: "Atlas Packer" },
      { label: "Color Palette" },
    ],
  },
  {
    label: "Help",
    items: [
      { label: "Documentation", shortcut: "F1" },
      { label: "Keyboard Shortcuts" },
      { label: "", divider: true },
      { label: "About Game Asset Tool" },
    ],
  },
];

const toolbarButtons = [
  { icon: "📄", label: "New", title: "New Project" },
  { icon: "📂", label: "Open", title: "Open Project" },
  { icon: "💾", label: "Save", title: "Save Project" },
  { divider: true },
  { icon: "✂️", label: "Cut", title: "Cut" },
  { icon: "📋", label: "Copy", title: "Copy" },
  { icon: "📥", label: "Paste", title: "Paste" },
  { divider: true },
  { icon: "↩️", label: "Undo", title: "Undo" },
  { icon: "↪️", label: "Redo", title: "Redo" },
  { divider: true },
  { icon: "🔍", label: "Zoom", title: "Zoom" },
  { icon: "🖼️", label: "Texture", title: "Texture Editor" },
  { icon: "🗺️", label: "Tilemap", title: "Tilemap Editor" },
  { icon: "🎬", label: "Sprite", title: "Spritesheet Editor" },
];

export function MainLayout({
  children,
  title = "Game Asset Tool",
}: MainLayoutProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [address] = useState("gat://home");
  const { isOpen, featureName, showComingSoon, hideComingSoon } =
    useComingSoonModal();

  const handleMenuClick = (label: string) => {
    setActiveMenu(activeMenu === label ? null : label);
  };

  const handleMenuBlur = () => {
    setTimeout(() => setActiveMenu(null), 150);
  };

  const handleMenuItemClick = (itemLabel: string) => {
    setActiveMenu(null);
    showComingSoon(itemLabel);
  };

  const handleToolbarClick = (toolTitle: string) => {
    showComingSoon(toolTitle);
  };

  const handleAddressBarClick = (action: string) => {
    showComingSoon(action);
  };

  const handleWindowButtonClick = (action: string) => {
    showComingSoon(action);
  };

  return (
    <div className="ie-window">
      {/* Title Bar */}
      <div className="ie-titlebar">
        <div className="ie-titlebar-icon">🎮</div>
        <div className="ie-titlebar-text">{title}</div>
        <div className="ie-titlebar-buttons">
          <ThemeToggle />
          <button
            className="ie-titlebar-btn ie-titlebar-minimize"
            title="Minimize"
            onClick={() => handleWindowButtonClick("Minimize Window")}
          >
            <span>_</span>
          </button>
          <button
            className="ie-titlebar-btn ie-titlebar-maximize"
            title="Maximize"
            onClick={() => handleWindowButtonClick("Maximize Window")}
          >
            <span>□</span>
          </button>
          <button
            className="ie-titlebar-btn ie-titlebar-close"
            title="Close"
            onClick={() => handleWindowButtonClick("Close Window")}
          >
            <span>×</span>
          </button>
        </div>
      </div>

      {/* Menu Bar */}
      <div className="ie-menubar">
        {menuItems.map((menu) => (
          <div key={menu.label} className="ie-menu-item">
            <button
              className={`ie-menu-trigger ${
                activeMenu === menu.label ? "active" : ""
              }`}
              onClick={() => handleMenuClick(menu.label)}
              onBlur={handleMenuBlur}
            >
              {menu.label}
            </button>
            {activeMenu === menu.label && (
              <div className="ie-menu-dropdown">
                {menu.items.map((item, idx) =>
                  item.divider ? (
                    <div key={idx} className="ie-menu-divider" />
                  ) : (
                    <button
                      key={idx}
                      className={`ie-menu-dropdown-item ${
                        item.disabled ? "disabled" : ""
                      }`}
                      disabled={item.disabled}
                      onClick={() => handleMenuItemClick(item.label)}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span className="ie-menu-shortcut">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="ie-toolbar">
        {toolbarButtons.map((btn, idx) =>
          btn.divider ? (
            <div key={idx} className="ie-toolbar-divider" />
          ) : (
            <button
              key={idx}
              className="ie-toolbar-btn"
              title={btn.title}
              onClick={() =>
                handleToolbarClick(btn.title || btn.label || "Tool")
              }
            >
              <span className="ie-toolbar-icon">{btn.icon}</span>
              <span className="ie-toolbar-label">{btn.label}</span>
            </button>
          )
        )}
      </div>

      {/* Address Bar */}
      <div className="ie-addressbar">
        <span className="ie-addressbar-label">Address</span>
        <div className="ie-addressbar-input-wrapper">
          <span className="ie-addressbar-icon">📍</span>
          <input
            type="text"
            className="ie-addressbar-input"
            value={address}
            readOnly
          />
        </div>
        <button
          className="ie-button ie-button-sm"
          onClick={() => handleAddressBarClick("Navigate")}
        >
          Go
        </button>
        <button
          className="ie-button ie-button-sm"
          onClick={() => handleAddressBarClick("Links")}
        >
          Links
        </button>
      </div>

      {/* Main Content Area */}
      <div className="ie-content">{children}</div>

      {/* Status Bar */}
      <div className="ie-statusbar">
        <div className="ie-statusbar-section ie-statusbar-main">
          <span className="ie-statusbar-icon">✅</span>
          <span>Ready</span>
        </div>
        <div className="ie-statusbar-section">
          <span>Game Asset Tool v0.1.0</span>
        </div>
        <div className="ie-statusbar-section ie-statusbar-logo">
          <span>🌐</span>
          <span>Internet</span>
        </div>
      </div>

      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={isOpen}
        onClose={hideComingSoon}
        featureName={featureName}
      />
    </div>
  );
}
