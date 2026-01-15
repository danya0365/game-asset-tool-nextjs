"use client";

import React, { useCallback, useRef, useState } from "react";
import { MainLayout } from "../templates/MainLayout";

interface ShuffleData {
  gridSize: number;
  blockWidth: number;
  blockHeight: number;
  imageWidth: number;
  imageHeight: number;
  shuffleMap: number[]; // shuffled position -> original position
}

export default function ImageShuffleView() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [shuffledImageUrl, setShuffledImageUrl] = useState<string>("");
  const [reconstructedImageUrl, setReconstructedImageUrl] = useState<string>("");
  const [shuffleData, setShuffleData] = useState<ShuffleData | null>(null);
  const [gridSize, setGridSize] = useState<number>(4);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reconstructCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fisher-Yates shuffle algorithm
  const shuffleArray = (array: number[]): number[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setShuffledImageUrl("");
        setShuffleData(null);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const processShuffleImage = useCallback(() => {
    if (!originalImage || !canvasRef.current) return;

    setIsProcessing(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgWidth = originalImage.width;
    const imgHeight = originalImage.height;
    
    // Calculate block dimensions
    const blockWidth = Math.floor(imgWidth / gridSize);
    const blockHeight = Math.floor(imgHeight / gridSize);
    
    // Adjust canvas size to fit exact blocks
    const actualWidth = blockWidth * gridSize;
    const actualHeight = blockHeight * gridSize;
    
    canvas.width = actualWidth;
    canvas.height = actualHeight;

    // Create array of indices and shuffle
    const totalBlocks = gridSize * gridSize;
    const indices = Array.from({ length: totalBlocks }, (_, i) => i);
    const shuffledIndices = shuffleArray(indices);

    // Draw shuffled image
    ctx.clearRect(0, 0, actualWidth, actualHeight);
    
    for (let i = 0; i < totalBlocks; i++) {
      const originalIndex = shuffledIndices[i];
      
      // Source position (from original image)
      const srcX = (originalIndex % gridSize) * blockWidth;
      const srcY = Math.floor(originalIndex / gridSize) * blockHeight;
      
      // Destination position (on shuffled canvas)
      const destX = (i % gridSize) * blockWidth;
      const destY = Math.floor(i / gridSize) * blockHeight;
      
      ctx.drawImage(
        originalImage,
        srcX, srcY, blockWidth, blockHeight,
        destX, destY, blockWidth, blockHeight
      );
    }

    // Generate shuffled image URL
    const shuffledUrl = canvas.toDataURL("image/png");
    setShuffledImageUrl(shuffledUrl);

    // Create inverse mapping for reconstruction
    // shuffleMap[destPosition] = originalIndex that was placed there
    const shuffleMap = shuffledIndices;

    // Store shuffle data
    const newShuffleData = {
      gridSize,
      blockWidth,
      blockHeight,
      imageWidth: actualWidth,
      imageHeight: actualHeight,
      shuffleMap,
    };
    setShuffleData(newShuffleData);

    // Generate reconstructed image using canvas (avoids CSS sub-pixel issues)
    const reconstructCanvas = reconstructCanvasRef.current;
    if (reconstructCanvas) {
      const rctx = reconstructCanvas.getContext("2d");
      if (rctx) {
        reconstructCanvas.width = actualWidth;
        reconstructCanvas.height = actualHeight;
        rctx.clearRect(0, 0, actualWidth, actualHeight);
        
        // Draw blocks back to original positions
        for (let originalIndex = 0; originalIndex < totalBlocks; originalIndex++) {
          // Find which shuffled position contains this original block
          const shuffledPosition = shuffleMap.indexOf(originalIndex);
          
          // Source from shuffled canvas
          const srcCol = shuffledPosition % gridSize;
          const srcRow = Math.floor(shuffledPosition / gridSize);
          const srcX = srcCol * blockWidth;
          const srcY = srcRow * blockHeight;
          
          // Destination in reconstructed (original position)
          const destCol = originalIndex % gridSize;
          const destRow = Math.floor(originalIndex / gridSize);
          const destX = destCol * blockWidth;
          const destY = destRow * blockHeight;
          
          rctx.drawImage(
            canvas,
            srcX, srcY, blockWidth, blockHeight,
            destX, destY, blockWidth, blockHeight
          );
        }
        
        setReconstructedImageUrl(reconstructCanvas.toDataURL("image/png"));
      }
    }

    setIsProcessing(false);
  }, [originalImage, gridSize]);

  const handleReshuffle = () => {
    processShuffleImage();
  };

  const downloadShuffledImage = () => {
    if (!shuffledImageUrl) return;
    
    const link = document.createElement("a");
    link.download = "shuffled-image.png";
    link.href = shuffledImageUrl;
    link.click();
  };

  const downloadJsonData = () => {
    if (!shuffleData) return;
    
    const json = JSON.stringify(shuffleData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.download = "shuffle-data.json";
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  // Calculate display scale for preview
  const getDisplayScale = (imgWidth: number, imgHeight: number, maxSize: number) => {
    const scale = Math.min(maxSize / imgWidth, maxSize / imgHeight, 1);
    return scale;
  };

  return (
    <MainLayout title="Image Shuffle Tool">
      <div className="h-full overflow-auto p-4 bg-background">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">🧩 Image Block Shuffle Tool</h1>
            <p className="text-muted">
              อัพโหลดรูปภาพ → สลับบล็อก → ใช้ CSS reconstruction เพื่อแสดงรูปต้นฉบับ
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-surface border border-border rounded-lg">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-info text-white rounded hover:bg-info-dark transition-colors"
              >
                📁 เลือกรูปภาพ
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-foreground">Grid Size:</label>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="px-3 py-2 bg-input-bg border border-input-border rounded text-foreground"
              >
                <option value={2}>2×2</option>
                <option value={3}>3×3</option>
                <option value={4}>4×4</option>
                <option value={5}>5×5</option>
                <option value={6}>6×6</option>
                <option value={8}>8×8</option>
                <option value={10}>10×10</option>
              </select>
            </div>

            <button
              onClick={processShuffleImage}
              disabled={!originalImage || isProcessing}
              className="px-4 py-2 bg-success text-white rounded hover:bg-success-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔀 Shuffle
            </button>

            {shuffledImageUrl && (
              <button
                onClick={handleReshuffle}
                className="px-4 py-2 bg-warning text-white rounded hover:bg-warning-dark transition-colors"
              >
                🔄 Re-shuffle
              </button>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original Image */}
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h2 className="text-lg font-semibold text-foreground mb-3">📷 รูปต้นฉบับ</h2>
              <div className="min-h-[300px] flex items-center justify-center bg-muted-light dark:bg-muted-dark rounded border border-border-light">
                {originalImage ? (
                  <img
                    src={originalImage.src}
                    alt="Original"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "400px",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span className="text-muted">ยังไม่ได้เลือกรูปภาพ</span>
                )}
              </div>
            </div>

            {/* Shuffled Image */}
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h2 className="text-lg font-semibold text-foreground mb-3">🔀 รูปที่ถูก Shuffle</h2>
              <div className="min-h-[300px] flex items-center justify-center bg-muted-light dark:bg-muted-dark rounded border border-border-light">
                {shuffledImageUrl ? (
                  <img
                    src={shuffledImageUrl}
                    alt="Shuffled"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "400px",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span className="text-muted">
                    {originalImage ? "กด Shuffle เพื่อสลับบล็อก" : "รอรูปต้นฉบับ"}
                  </span>
                )}
              </div>
              
              {shuffledImageUrl && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={downloadShuffledImage}
                    className="px-3 py-1.5 bg-info text-white text-sm rounded hover:bg-info-dark transition-colors"
                  >
                    💾 Download Shuffled Image
                  </button>
                  <button
                    onClick={downloadJsonData}
                    className="px-3 py-1.5 bg-success text-white text-sm rounded hover:bg-success-dark transition-colors"
                  >
                    📄 Download JSON
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Canvas-based Reconstruction Display */}
          {reconstructedImageUrl && shuffleData && (
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                ✨ Reconstructed Image (จาก Shuffled Data)
              </h2>
              <p className="text-sm text-muted mb-4">
                รูปภาพต้นฉบับที่ประกอบกลับจาก shuffled image โดยใช้ข้อมูล JSON mapping
              </p>
              
              <div className="flex justify-center">
                <div className="border-2 border-dashed border-success rounded overflow-hidden">
                  <img
                    src={reconstructedImageUrl}
                    alt="Reconstructed"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "500px",
                      objectFit: "contain",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* JSON Data Preview */}
          {shuffleData && (
            <div className="p-4 bg-surface border border-border rounded-lg">
              <h2 className="text-lg font-semibold text-foreground mb-3">📋 Shuffle Data (JSON)</h2>
              <pre className="p-4 bg-gray-900 text-green-400 rounded overflow-x-auto text-sm">
                {JSON.stringify(shuffleData, null, 2)}
              </pre>
            </div>
          )}

          {/* Hidden Canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
          <canvas ref={reconstructCanvasRef} className="hidden" />
        </div>
      </div>
    </MainLayout>
  );
}
