"use client";

import { ComingSoonModal } from "@/src/presentation/components/molecules/ComingSoonModal";
import { MainLayout } from "@/src/presentation/components/templates/MainLayout";
import { useComingSoonModal } from "@/src/presentation/hooks/useComingSoonModal";
import Link from "next/link";

interface FeatureCard {
  icon: string;
  title: string;
  description: string;
  href?: string;
}

interface QuickAction {
  icon: string;
  label: string;
  description: string;
}

const features: FeatureCard[] = [
  {
    icon: "🖼️",
    title: "Texture Editor",
    description: "สร้างและแก้ไข Texture, รองรับ 9-slice, Seamless preview",
  },
  {
    icon: "🗺️",
    title: "Tilemap Editor",
    description: "สร้าง Tilemap แบบ Layer-based พร้อม Auto-tile",
  },
  {
    icon: "🎬",
    title: "Spritesheet Editor",
    description: "จัดการ Animation frames พร้อม Timeline editor",
  },
  {
    icon: "📦",
    title: "Atlas Packer",
    description: "Pack textures อัตโนมัติ รองรับหลาย algorithm",
    href: "/atlas-packer",
  },
  {
    icon: "🎨",
    title: "Color Palette",
    description: "จัดการ Palette สี รองรับ Game-specific palettes",
    href: "/color-palette",
  },
  {
    icon: "📤",
    title: "Multi-Export",
    description: "Export ไปยัง Cocos, Phaser, Unity และอื่นๆ",
  },
];

const quickActions: QuickAction[] = [
  {
    icon: "📄",
    label: "New Project",
    description: "สร้างโปรเจคใหม่",
  },
  {
    icon: "📂",
    label: "Open Project",
    description: "เปิดโปรเจคที่มีอยู่",
  },
  {
    icon: "🖼️",
    label: "Import Image",
    description: "นำเข้ารูปภาพ",
  },
  {
    icon: "📚",
    label: "Templates",
    description: "เริ่มจาก Template",
  },
];

export function LandingView() {
  const { isOpen, featureName, showComingSoon, hideComingSoon } =
    useComingSoonModal();

  return (
    <MainLayout title="Game Asset Tool - Home">
      <div className="h-full overflow-auto ie-scrollbar p-2 md:p-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="ie-panel mb-2 md:mb-4">
            <div className="ie-panel-inset p-3 md:p-6 text-center">
              <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                🎮 Game Asset Tool
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                เครื่องมือครบวงจรสำหรับสร้างและจัดการ Game Assets
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Texture • Tilemap • Tileset • Spritesheet • Animation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-4">
            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <div className="ie-panel">
                <div className="ie-groupbox">
                  <span className="ie-groupbox-title">Quick Actions</span>
                  <div className="space-y-2 -mt-2">
                    {quickActions.map((action) => (
                      <button
                        key={action.label}
                        className="ie-button w-full text-left flex items-center gap-3 py-2"
                        onClick={() => showComingSoon(action.label)}
                      >
                        <span className="text-lg">{action.icon}</span>
                        <div>
                          <div className="font-medium text-xs">
                            {action.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {action.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Projects */}
                <div className="ie-groupbox mt-2 md:mt-4">
                  <span className="ie-groupbox-title">Recent Projects</span>
                  <div className="ie-listview -mt-2 max-h-32 overflow-auto ie-scrollbar">
                    <button
                      className="ie-listview-item w-full text-left"
                      onClick={() =>
                        showComingSoon("Open Project: my-game-assets.gat")
                      }
                    >
                      <span>📁</span>
                      <span>my-game-assets.gat</span>
                    </button>
                    <button
                      className="ie-listview-item w-full text-left"
                      onClick={() =>
                        showComingSoon("Open Project: platformer-tiles.gat")
                      }
                    >
                      <span>📁</span>
                      <span>platformer-tiles.gat</span>
                    </button>
                    <button
                      className="ie-listview-item w-full text-left"
                      onClick={() =>
                        showComingSoon("Open Project: character-sprites.gat")
                      }
                    >
                      <span>📁</span>
                      <span>character-sprites.gat</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="lg:col-span-2">
              <div className="ie-panel">
                <div className="ie-groupbox">
                  <span className="ie-groupbox-title">Features</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 -mt-2">
                    {features.map((feature) =>
                      feature.href ? (
                        <Link
                          key={feature.title}
                          href={feature.href}
                          className="ie-panel-inset p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors block"
                        >
                          <div className="text-2xl mb-1">{feature.icon}</div>
                          <div className="font-medium text-xs mb-1 text-gray-900 dark:text-gray-100">
                            {feature.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {feature.description}
                          </div>
                        </Link>
                      ) : (
                        <button
                          key={feature.title}
                          className="ie-panel-inset p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          onClick={() => showComingSoon(feature.title)}
                        >
                          <div className="text-2xl mb-1">{feature.icon}</div>
                          <div className="font-medium text-xs mb-1 text-gray-900 dark:text-gray-100">
                            {feature.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {feature.description}
                          </div>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Export Formats */}
              <div className="ie-panel mt-2 md:mt-4">
                <div className="ie-groupbox">
                  <span className="ie-groupbox-title">Supported Formats</span>
                  <div className="flex flex-wrap gap-2 -mt-2">
                    <button
                      className="ie-button ie-button-sm"
                      onClick={() => showComingSoon("Export: Cocos Creator")}
                    >
                      Cocos Creator
                    </button>
                    <button
                      className="ie-button ie-button-sm"
                      onClick={() => showComingSoon("Export: Phaser")}
                    >
                      Phaser
                    </button>
                    <button
                      className="ie-button ie-button-sm"
                      onClick={() => showComingSoon("Export: Unity")}
                    >
                      Unity
                    </button>
                    <button
                      className="ie-button ie-button-sm"
                      onClick={() => showComingSoon("Export: Godot")}
                    >
                      Godot
                    </button>
                    <button
                      className="ie-button ie-button-sm"
                      onClick={() => showComingSoon("Export: LibGDX")}
                    >
                      LibGDX
                    </button>
                    <button
                      className="ie-button ie-button-sm"
                      onClick={() => showComingSoon("Export: GameMaker")}
                    >
                      GameMaker
                    </button>
                    <button
                      className="ie-button ie-button-sm"
                      onClick={() => showComingSoon("Export: CSS Sprites")}
                    >
                      CSS Sprites
                    </button>
                    <button
                      className="ie-button ie-button-sm"
                      onClick={() => showComingSoon("Export: JSON")}
                    >
                      JSON
                    </button>
                  </div>
                </div>
              </div>

              {/* Getting Started */}
              <div className="ie-panel mt-2 md:mt-4">
                <div className="ie-groupbox">
                  <span className="ie-groupbox-title">Getting Started</span>
                  <div className="ie-panel-inset p-2 md:p-3 -mt-2">
                    <ol className="list-decimal list-inside text-xs space-y-1 text-gray-700 dark:text-gray-300">
                      <li>สร้าง Project ใหม่หรือเปิด Project ที่มีอยู่</li>
                      <li>Import รูปภาพหรือสร้าง Asset ใหม่ด้วย Editor</li>
                      <li>จัดการ Layers, Animation และ Properties</li>
                      <li>Export ไปยัง Format ที่ต้องการ</li>
                    </ol>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="ie-button ie-button-sm"
                        onClick={() => showComingSoon("Documentation")}
                      >
                        📖 Documentation
                      </button>
                      <button
                        className="ie-button ie-button-sm"
                        onClick={() => showComingSoon("Keyboard Shortcuts")}
                      >
                        ⌨️ Keyboard Shortcuts
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="ie-panel mt-2 md:mt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-1 px-2 md:px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Game Asset Tool v0.1.0</span>
              <span>Made with ❤️ for Game Developers</span>
              <span>© 2024</span>
            </div>
          </div>
        </div>
      </div>
      {/* Coming Soon Modal */}
      <ComingSoonModal
        isOpen={isOpen}
        onClose={hideComingSoon}
        featureName={featureName}
      />
    </MainLayout>
  );
}
