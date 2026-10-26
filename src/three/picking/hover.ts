// Transient hover state for the 3D tooltip — kept out of the app store so
// pointer moves never re-render the UI (3D_PLAN 5.2, PLAN R5).
import { create } from "zustand";
import type { FloorId } from "@/types";

export type HoverInfo = { title: string; detail: string; x: number; y: number; floor?: FloorId };

export const useHover = create<{ hover: HoverInfo | null }>()(() => ({ hover: null }));

export const setHover = (hover: HoverInfo | null) => useHover.setState({ hover });
