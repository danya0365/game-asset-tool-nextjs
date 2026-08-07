"use client";
import { cn } from "@/src/presentation/lib/cn";

import JSZip from "jszip";
import React, { useCallback, useRef, useState } from "react";
import { MainLayout } from "../templates/MainLayout";

type ExportFormat =
  | "cocos-plist"
  | "cocos-auto-atlas"
  | "phaser-json-array"
  | "phaser-json-hash"
  | "unity-spritesheet"
  | "godot-tres"
  | "libgdx"
  | "css-sprites"
  | "json-generic";

interface ExportFormatInfo {
  id: ExportFormat;
  name: string;
  engine: string;
  icon: string;
  description: string;
  extensions: string[];
}

interface AssetFile {
  id: string;
  name: string;
  type: "image" | "spritesheet" | "tilemap" | "animation";
  file: File;
  preview: string;
  width?: number;
  height?: number;
}

interface ExportSettings {
  format: ExportFormat;
  scale: number;
  padding: number;
  powerOfTwo: boolean;
  trimTransparency: boolean;
  includeMetadata: boolean;
  outputName: string;
}

const EXPORT_FORMATS: ExportFormatInfo[] = [
  {
    id: "cocos-plist",
    name: "Cocos Creator (.plist)",
    engine: "Cocos Creator",
    icon: "🎮",
    description: "TexturePacker format สำหรับ Cocos Creator",
    extensions: [".plist", ".png"],
  },
  {
    id: "cocos-auto-atlas",
    name: "Cocos Auto Atlas",
    engine: "Cocos Creator",
    icon: "🎮",
    description: "Auto Atlas format สำหรับ Cocos Creator 3.x",
    extensions: [".pac", ".png"],
  },
  {
    id: "phaser-json-array",
    name: "Phaser JSON Array",
    engine: "Phaser",
    icon: "⚡",
    description: "JSON Array format สำหรับ Phaser 3",
    extensions: [".json", ".png"],
  },
  {
    id: "phaser-json-hash",
    name: "Phaser JSON Hash",
    engine: "Phaser",
    icon: "⚡",
    description: "JSON Hash format สำหรับ Phaser 3",
    extensions: [".json", ".png"],
  },
  {
    id: "unity-spritesheet",
    name: "Unity Sprite Atlas",
    engine: "Unity",
    icon: "🔷",
    description: "Sprite Atlas metadata สำหรับ Unity",
    extensions: [".spriteatlas", ".png"],
  },
  {
    id: "godot-tres",
    name: "Godot Resource",
    engine: "Godot",
    icon: "🤖",
    description: "AtlasTexture resource สำหรับ Godot 4",
    extensions: [".tres", ".png"],
  },
  {
    id: "libgdx",
    name: "LibGDX Atlas",
    engine: "LibGDX",
    icon: "☕",
    description: "TextureAtlas format สำหรับ LibGDX",
    extensions: [".atlas", ".png"],
  },
  {
    id: "css-sprites",
    name: "CSS Sprites",
    engine: "Web",
    icon: "🌐",
    description: "CSS Sprite sheet สำหรับ Web",
    extensions: [".css", ".png"],
  },
  {
    id: "json-generic",
    name: "Generic JSON",
    engine: "Universal",
    icon: "📄",
    description: "JSON format ทั่วไป",
    extensions: [".json", ".png"],
  },
];

export default function MultiExportView() {
  // Assets state
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  // Export settings
  const [settings, setSettings] = useState<ExportSettings>({
    format: "cocos-plist", // Cocos Creator as default
    scale: 1,
    padding: 2,
    powerOfTwo: true,
    trimTransparency: false,
    includeMetadata: true,
    outputName: "export",
  });

  // UI state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLog, setExportLog] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Add log message
  const addLog = useCallback((message: string) => {
    setExportLog((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);
  }, []);

  // Handle file import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAssets: AssetFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      const preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });

      // Get image dimensions
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = preview;
      });

      newAssets.push({
        id: generateId(),
        name: file.name.replace(/\.[^/.]+$/, ""),
        type: "image",
        file,
        preview,
        width: img.width,
        height: img.height,
      });
    }

    setAssets((prev) => [...prev, ...newAssets]);
    addLog(`เพิ่ม ${newAssets.length} ไฟล์`);
    e.target.value = "";
  };

  // Remove asset
  const removeAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setSelectedAssets((prev) => prev.filter((sid) => sid !== id));
  };

  // Toggle asset selection
  const toggleAssetSelection = (id: string) => {
    setSelectedAssets((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // Select all assets
  const selectAllAssets = () => {
    if (selectedAssets.length === assets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(assets.map((a) => a.id));
    }
  };

  // Generate Cocos Plist format
  const generateCocosPlist = (asset: AssetFile): string => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>frames</key>
    <dict>
        <key>${asset.name}.png</key>
        <dict>
            <key>frame</key>
            <string>{{0,0},{${asset.width},${asset.height}}}</string>
            <key>offset</key>
            <string>{0,0}</string>
            <key>rotated</key>
            <false/>
            <key>sourceColorRect</key>
            <string>{{0,0},{${asset.width},${asset.height}}}</string>
            <key>sourceSize</key>
            <string>{${asset.width},${asset.height}}</string>
        </dict>
    </dict>
    <key>metadata</key>
    <dict>
        <key>format</key>
        <integer>2</integer>
        <key>realTextureFileName</key>
        <string>${asset.name}.png</string>
        <key>size</key>
        <string>{${asset.width},${asset.height}}</string>
        <key>textureFileName</key>
        <string>${asset.name}.png</string>
    </dict>
</dict>
</plist>`;
  };

  // Generate Phaser JSON Array format
  const generatePhaserJsonArray = (asset: AssetFile): string => {
    return JSON.stringify(
      {
        frames: [
          {
            filename: `${asset.name}.png`,
            frame: { x: 0, y: 0, w: asset.width, h: asset.height },
            rotated: false,
            trimmed: false,
            spriteSourceSize: { x: 0, y: 0, w: asset.width, h: asset.height },
            sourceSize: { w: asset.width, h: asset.height },
          },
        ],
        meta: {
          app: "Game Asset Tool",
          version: "1.0",
          image: `${asset.name}.png`,
          format: "RGBA8888",
          size: { w: asset.width, h: asset.height },
          scale: settings.scale.toString(),
        },
      },
      null,
      2
    );
  };

  // Generate Phaser JSON Hash format
  const generatePhaserJsonHash = (asset: AssetFile): string => {
    return JSON.stringify(
      {
        frames: {
          [asset.name]: {
            frame: { x: 0, y: 0, w: asset.width, h: asset.height },
            rotated: false,
            trimmed: false,
            spriteSourceSize: { x: 0, y: 0, w: asset.width, h: asset.height },
            sourceSize: { w: asset.width, h: asset.height },
          },
        },
        meta: {
          app: "Game Asset Tool",
          version: "1.0",
          image: `${asset.name}.png`,
          format: "RGBA8888",
          size: { w: asset.width, h: asset.height },
          scale: settings.scale.toString(),
        },
      },
      null,
      2
    );
  };

  // Generate Unity Sprite Atlas format
  const generateUnitySpriteAtlas = (asset: AssetFile): string => {
    return JSON.stringify(
      {
        m_ObjectHideFlags: 0,
        m_CorrespondingSourceObject: { fileID: 0 },
        m_PrefabInstance: { fileID: 0 },
        m_PrefabAsset: { fileID: 0 },
        m_Name: asset.name,
        m_EditorData: {
          textureSettings: {
            anisoLevel: 1,
            compressionQuality: 50,
            maxTextureSize: 2048,
            textureCompression: 0,
            filterMode: 0,
            generateMipMaps: false,
            readable: false,
            crunchedCompression: false,
            sRGB: true,
          },
          platformSettings: [],
          packingSettings: {
            padding: settings.padding,
            blockOffset: 1,
            allowAlphaSplitting: false,
            enableRotation: false,
            enableTightPacking: false,
          },
          packedSprites: [
            {
              name: asset.name,
              rect: { x: 0, y: 0, width: asset.width, height: asset.height },
              pivot: { x: 0.5, y: 0.5 },
            },
          ],
        },
      },
      null,
      2
    );
  };

  // Generate Godot Resource format
  const generateGodotResource = (asset: AssetFile): string => {
    return `[gd_resource type="AtlasTexture" format=3]

[ext_resource type="Texture2D" path="res://${asset.name}.png" id="1"]

[resource]
atlas = ExtResource("1")
region = Rect2(0, 0, ${asset.width}, ${asset.height})
`;
  };

  // Generate LibGDX Atlas format
  const generateLibGDXAtlas = (asset: AssetFile): string => {
    return `
${asset.name}.png
size: ${asset.width}, ${asset.height}
format: RGBA8888
filter: Nearest, Nearest
repeat: none
${asset.name}
  rotate: false
  xy: 0, 0
  size: ${asset.width}, ${asset.height}
  orig: ${asset.width}, ${asset.height}
  offset: 0, 0
  index: -1
`;
  };

  // Generate CSS Sprites format
  const generateCSSSprites = (asset: AssetFile): string => {
    return `.sprite-${asset.name} {
  background-image: url('${asset.name}.png');
  background-position: 0 0;
  width: ${asset.width}px;
  height: ${asset.height}px;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
`;
  };

  // Generate Generic JSON format
  const generateGenericJSON = (asset: AssetFile): string => {
    return JSON.stringify(
      {
        name: asset.name,
        type: asset.type,
        width: asset.width,
        height: asset.height,
        format: "png",
        metadata: settings.includeMetadata
          ? {
              createdBy: "Game Asset Tool",
              createdAt: new Date().toISOString(),
              scale: settings.scale,
              padding: settings.padding,
            }
          : undefined,
      },
      null,
      2
    );
  };

  // Export assets
  const handleExport = async () => {
    const assetsToExport =
      selectedAssets.length > 0
        ? assets.filter((a) => selectedAssets.includes(a.id))
        : assets;

    if (assetsToExport.length === 0) {
      addLog("❌ ไม่มี asset ที่จะ export");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportLog([]);
    addLog(`🚀 เริ่ม export ${assetsToExport.length} assets...`);

    const zip = new JSZip();
    const formatInfo = EXPORT_FORMATS.find((f) => f.id === settings.format);

    try {
      for (let i = 0; i < assetsToExport.length; i++) {
        const asset = assetsToExport[i];
        const progress = Math.round(((i + 1) / assetsToExport.length) * 100);
        setExportProgress(progress);
        addLog(`📦 Processing: ${asset.name}`);

        // Add image file
        const imageBlob = await fetch(asset.preview).then((r) => r.blob());
        zip.file(`${asset.name}.png`, imageBlob);

        // Generate metadata based on format
        let metadataContent = "";
        let metadataExt = "";

        switch (settings.format) {
          case "cocos-plist":
            metadataContent = generateCocosPlist(asset);
            metadataExt = ".plist";
            break;
          case "cocos-auto-atlas":
            metadataContent = generateCocosPlist(asset); // Similar format
            metadataExt = ".pac";
            break;
          case "phaser-json-array":
            metadataContent = generatePhaserJsonArray(asset);
            metadataExt = ".json";
            break;
          case "phaser-json-hash":
            metadataContent = generatePhaserJsonHash(asset);
            metadataExt = ".json";
            break;
          case "unity-spritesheet":
            metadataContent = generateUnitySpriteAtlas(asset);
            metadataExt = ".spriteatlas";
            break;
          case "godot-tres":
            metadataContent = generateGodotResource(asset);
            metadataExt = ".tres";
            break;
          case "libgdx":
            metadataContent = generateLibGDXAtlas(asset);
            metadataExt = ".atlas";
            break;
          case "css-sprites":
            metadataContent = generateCSSSprites(asset);
            metadataExt = ".css";
            break;
          case "json-generic":
          default:
            metadataContent = generateGenericJSON(asset);
            metadataExt = ".json";
            break;
        }

        zip.file(`${asset.name}${metadataExt}`, metadataContent);
      }

      addLog(`✅ สร้างไฟล์เสร็จสิ้น`);
      addLog(`📥 กำลังสร้าง ZIP...`);

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${settings.outputName}-${
        formatInfo?.engine || "export"
      }.zip`;
      a.click();
      URL.revokeObjectURL(url);

      addLog(`🎉 Export สำเร็จ! ดาวน์โหลด ${assetsToExport.length} ไฟล์`);
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    } finally {
      setIsExporting(false);
      setExportProgress(100);
    }
  };

  const currentFormat = EXPORT_FORMATS.find((f) => f.id === settings.format);

  return (
    <MainLayout title="Multi-Export - Game Asset Tool">
      <div className="ie-window-content flex flex-col h-full">
        {/* Toolbar */}
        <div className="ie-toolbar mb-2 flex items-center gap-2 flex-wrap">
          <button
            className="ie-button"
            onClick={() => fileInputRef.current?.click()}
          >
            📂 Import Assets
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="ie-separator" />

          <button
            className="ie-button"
            onClick={selectAllAssets}
            disabled={assets.length === 0}
          >
            {selectedAssets.length === assets.length
              ? "☐ Deselect All"
              : "☑ Select All"}
          </button>

          <button
            className="ie-button text-error"
            onClick={() => {
              setAssets([]);
              setSelectedAssets([]);
            }}
            disabled={assets.length === 0}
          >
            🗑️ Clear All
          </button>

          <div className="flex-1" />

          <button
            className="ie-button bg-success text-on-brand font-bold px-4"
            onClick={handleExport}
            disabled={assets.length === 0 || isExporting}
          >
            {isExporting ? "⏳ Exporting..." : "📤 Export"}
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 gap-2 overflow-hidden">
          {/* Left Panel - Assets */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="ie-groupbox flex-1 overflow-hidden flex flex-col">
              <span className="ie-groupbox-title">
                📁 Assets ({assets.length})
                {selectedAssets.length > 0 &&
                  ` - ${selectedAssets.length} selected`}
              </span>
              <div className="ie-panel-inset flex-1 overflow-auto p-2">
                {assets.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        className={cn("relative group cursor-pointer border-2 rounded", selectedAssets.includes(asset.id) ? "border-brand-500 bg-brand-100 " : "border-border ")}
                        onClick={() => toggleAssetSelection(asset.id)}
                      >
                        <div
                          className="w-full aspect-square bg-muted-surface"
                          // eslint-disable-next-line react/forbid-dom-props -- ค่า runtime (สีที่ผู้ใช้เลือก / zoom / ขนาดที่คำนวณจากภาพ) เป็น token ไม่ได้
                          style={{
                            backgroundImage: `url(${asset.preview})`,
                            backgroundSize: "contain",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            imageRendering: "pixelated",
                          }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-overlay text-on-brand text-[8px] px-1 truncate">
                          {asset.name}
                        </div>
                        <button
                          className="absolute top-0 right-0 bg-error text-on-brand text-xs w-4 h-4 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAsset(asset.id);
                          }}
                        >
                          ×
                        </button>
                        {selectedAssets.includes(asset.id) && (
                          <div className="absolute top-0 left-0 bg-brand-500 text-on-brand text-xs w-4 h-4 rounded-br flex items-center justify-center">
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📤</div>
                      <p>Import assets to begin</p>
                      <p className="text-xs mt-1">
                        Drag & Drop หรือคลิก Import
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Export Log */}
            <div className="ie-groupbox h-32">
              <span className="ie-groupbox-title">📋 Export Log</span>
              <div className="ie-panel-inset h-full overflow-auto p-1 font-mono text-xs">
                {exportLog.length > 0 ? (
                  exportLog.map((log, i) => (
                    <div key={i} className="text-muted">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-muted text-center py-2">
                    Log จะแสดงที่นี่เมื่อทำการ export
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Settings */}
          <div className="w-72 flex flex-col gap-2">
            {/* Export Format */}
            <div className="ie-groupbox">
              <span className="ie-groupbox-title">🎯 Export Format</span>
              <div className="ie-panel-inset p-2 max-h-48 overflow-auto">
                {EXPORT_FORMATS.map((format) => (
                  <div
                    key={format.id}
                    className={cn("flex items-center gap-2 p-2 cursor-pointer rounded mb-1", settings.format === format.id ? "bg-brand-100 border border-brand-500" : "hover:bg-muted-surface ")}
                    onClick={() =>
                      setSettings((s) => ({ ...s, format: format.id }))
                    }
                  >
                    <span className="text-xl">{format.icon}</span>
                    <div className="flex-1">
                      <div className="text-xs font-bold">{format.name}</div>
                      <div className="text-[10px] text-muted">
                        {format.engine}
                      </div>
                    </div>
                    {settings.format === format.id && (
                      <span className="text-success">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Format Info */}
            {currentFormat && (
              <div className="ie-groupbox">
                <span className="ie-groupbox-title">ℹ️ Format Info</span>
                <div className="p-2 text-xs">
                  <p className="mb-1">{currentFormat.description}</p>
                  <p className="text-muted">
                    Output: {currentFormat.extensions.join(" + ")}
                  </p>
                </div>
              </div>
            )}

            {/* Export Settings */}
            <div className="ie-groupbox">
              <span className="ie-groupbox-title">⚙️ Settings</span>
              <div className="p-2 space-y-2 text-xs">
                <div>
                  <label className="block mb-1">Output Name:</label>
                  <input
                    type="text"
                    className="ie-input w-full"
                    value={settings.outputName}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, outputName: e.target.value }))
                    }
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block mb-1">Scale:</label>
                    <select
                      className="ie-select w-full"
                      value={settings.scale}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          scale: parseFloat(e.target.value),
                        }))
                      }
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={4}>4x</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1">Padding:</label>
                    <input
                      type="number"
                      className="ie-input w-full"
                      value={settings.padding}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          padding: parseInt(e.target.value) || 0,
                        }))
                      }
                      min={0}
                      max={16}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.powerOfTwo}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          powerOfTwo: e.target.checked,
                        }))
                      }
                    />
                    Power of Two
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.trimTransparency}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          trimTransparency: e.target.checked,
                        }))
                      }
                    />
                    Trim Transparency
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.includeMetadata}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          includeMetadata: e.target.checked,
                        }))
                      }
                    />
                    Include Metadata
                  </label>
                </div>
              </div>
            </div>

            {/* Progress */}
            {isExporting && (
              <div className="ie-groupbox">
                <span className="ie-groupbox-title">⏳ Progress</span>
                <div className="p-2">
                  <div className="w-full bg-muted-surface rounded h-4 overflow-hidden">
                    <div
                      className="bg-brand-500 h-full transition-all duration-300"
                      // eslint-disable-next-line react/forbid-dom-props -- ค่า runtime (สีที่ผู้ใช้เลือก / zoom / ขนาดที่คำนวณจากภาพ) เป็น token ไม่ได้
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-center mt-1">
                    {exportProgress}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="ie-statusbar mt-2">
          <span>
            {assets.length > 0
              ? `Assets: ${assets.length} | Selected: ${selectedAssets.length} | Format: ${currentFormat?.name}`
              : "No assets loaded"}
          </span>
        </div>
      </div>
    </MainLayout>
  );
}
