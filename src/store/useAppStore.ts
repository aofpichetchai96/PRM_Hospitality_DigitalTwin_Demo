// One store built from slices so selectors can combine rooms, scenario and
// view state without crossing stores (PLAN 4.6).
import { create } from "zustand";
import { createSimSlice, type SimActions, type SimState } from "./simSlice";
import { createTwinSlice, type TwinActions, type TwinState } from "./twinSlice";

export type AppState = TwinState & TwinActions & SimState & SimActions;

export const useAppStore = create<AppState>()((...a) => ({
  ...createTwinSlice(...a),
  ...createSimSlice(...a),
}));
