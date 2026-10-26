"use client";

// Synthetic CCTV view (prototype paintFeeds L406): a drawn corridor with
// "PERSON" detection boxes. Not live video and no real people — redrawn on
// every simulation tick so the scene and the timestamp move a little.
import { useEffect, useRef } from "react";
import { timeStr } from "@/lib/format";
import { useAppStore } from "@/store/useAppStore";

const W = 420;
const H = 225;

function paint(x: CanvasRenderingContext2D, camera: number, time: number, ticks: number) {
  const grad = x.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, camera ? "#263941" : "#344754");
  grad.addColorStop(1, "#0b1c24");
  x.fillStyle = grad;
  x.fillRect(0, 0, W, H);

  // Floor and ceiling converging to a vanishing point
  const vp: [number, number] = [W * 0.5, 80];
  x.fillStyle = "#486167";
  x.beginPath();
  x.moveTo(0, H);
  x.lineTo(...vp);
  x.lineTo(W, H);
  x.fill();
  x.fillStyle = "#192d37";
  x.beginPath();
  x.moveTo(0, 0);
  x.lineTo(W, 0);
  x.lineTo(...vp);
  x.fill();
  x.strokeStyle = "#89a4aa33";
  x.lineWidth = 1;
  for (let i = -3; i <= 6; i++) {
    x.beginPath();
    x.moveTo(i * 100, H);
    x.lineTo(...vp);
    x.stroke();
  }
  for (let y = 100; y < 230; y += 24) {
    x.beginPath();
    x.moveTo(0, y);
    x.lineTo(W, y);
    x.stroke();
  }
  // Shopfronts / columns either side
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const sx = 210 + side * (65 + i * 44);
      const yy = 58 - i * 9;
      const hh = 67 + i * 18;
      x.fillStyle = i % 2 ? "#557379" : "#314953";
      x.fillRect(sx, yy, side * 22, hh);
      x.fillStyle = "#c1ceaa66";
      x.fillRect(sx, yy, side * 22, 3);
    }
  // People with detection boxes; they drift a few pixels per tick
  for (let i = 0; i < 5; i++) {
    const drift = ((ticks * (i % 2 ? 3 : -2) + i * 17) % 40) - 20;
    const px = 82 + i * 55 + camera * 13 + drift;
    const py = 116 + (i % 3) * 26;
    const hh = 20 + (i % 3) * 10;
    x.fillStyle = "#c6c5ab";
    x.beginPath();
    x.arc(px, py - hh, 3.8, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = ["#333f47", "#6d8284", "#54645e"][i % 3];
    x.fillRect(px - 4, py - hh + 4, 8, hh - 4);
    x.strokeStyle = "#6fe0ae";
    x.strokeRect(px - 10, py - hh - 9, 20, hh + 12);
    x.fillStyle = "#93ddbb";
    x.font = "7px monospace";
    x.fillText("PERSON", px - 10, py - hh - 12);
  }
  x.fillStyle = "#afc3bb";
  x.font = "8px monospace";
  x.fillText(`${timeStr(time)}:00   SYNTHETIC DEMO FEED`, 12, H - 10);
  // Scan lines
  x.fillStyle = "#a9c3c108";
  for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
}

export const CAMERAS = [
  { id: "CAM LOBBY-01", name: "Lobby arrival" },
  { id: "CAM RETAIL-02", name: "Retail corridor" },
] as const;

export function SyntheticFeed({ camera, className = "" }: { camera: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const time = useAppStore((s) => s.time);
  const ticks = useAppStore((s) => s.ticks);

  useEffect(() => {
    const x = ref.current?.getContext("2d");
    if (x) paint(x, camera, time, ticks);
  }, [camera, time, ticks]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      role="img"
      aria-label={`${CAMERAS[camera].id} · ภาพจำลอง ไม่ใช่กล้องจริง`}
      className={`block h-full w-full object-cover ${className}`}
    />
  );
}
