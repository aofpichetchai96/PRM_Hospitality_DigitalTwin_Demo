// Simulation state: clock, scenario inputs, rooms, incidents, work orders and
// the assistant chat (prototype S, L342).
import type { StateCreator } from "zustand";
import { answerQuestion } from "@/data/aiScript";
import { footfallAt, REFERENCE_FOOTFALL, SCENARIO_LIMITS } from "@/data/energy";
import { INCIDENT_STEPS, INITIAL_INCIDENTS, SIMULATED_INCIDENTS } from "@/data/events";
import { adjustOccupancy, generateRooms } from "@/data/rooms";
import { timeStr } from "@/lib/format";
import type { ChatMessage, Incident, IncidentStatus, Room, RoomStatus, WorkOrder } from "@/types";
import { buildAskContext } from "./selectors";
import { initialTwin } from "./twinSlice";
import type { AppState } from "./useAppStore";

export const TICK_MS = 6000;
const TICK_HOURS = 1 / 60;
const FOOTFALL_PER_TICK = 23;
const DAY_START = 6;
const DAY_END = 23.99;
const CHAT_LIMIT = 50;

export interface SimState {
  /** Decimal hour, 06:00–23:59 */
  time: number;
  paused: boolean;
  ticks: number;
  /** Energy Lab slider (%); room statuses follow it */
  occupancy: number;
  setpoint: number;
  outdoor: number;
  tariff: number;
  operatingHours: number;
  /** Mall entry counts so far today */
  footfall: number;
  rooms: Room[];
  incidents: Incident[];
  workOrders: WorkOrder[];
  chat: ChatMessage[];
}

export type Scenario = Partial<Pick<SimState, "occupancy" | "setpoint" | "outdoor" | "tariff">>;

export interface SimActions {
  tick: () => void;
  setTime: (time: number) => void;
  togglePause: () => void;
  setScenario: (patch: Scenario) => void;
  setRoomStatus: (id: string, status: RoomStatus) => void;
  advanceIncident: (id: string) => void;
  createWorkOrder: (assetCode: string, owner?: string, incidentId?: string) => WorkOrder;
  simulateIncident: () => string;
  ask: (question: string) => void;
  resetDemo: () => void;
}

export function initialSim(): SimState {
  return {
    time: 14.5,
    paused: false,
    ticks: 0,
    occupancy: 84,
    setpoint: 24,
    outdoor: 32,
    tariff: 4.5,
    operatingHours: 16,
    footfall: REFERENCE_FOOTFALL,
    rooms: generateRooms(84),
    incidents: INITIAL_INCIDENTS.map((e) => ({ ...e })),
    workOrders: [],
    chat: [],
  };
}

const clamp = (v: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, v));

export const createSimSlice: StateCreator<AppState, [], [], SimState & SimActions> = (set, get) => ({
  ...initialSim(),

  tick: () =>
    set((s) => {
      const time = s.time + TICK_HOURS;
      // A new demo day starts at 06:00 with the morning footfall
      if (time >= DAY_END) return { ticks: s.ticks + 1, time: DAY_START, footfall: footfallAt(DAY_START) };
      return { ticks: s.ticks + 1, time, footfall: s.footfall + FOOTFALL_PER_TICK };
    }),

  setTime: (time) => {
    const t = Math.min(DAY_END, Math.max(DAY_START, time));
    set({ time: t, footfall: footfallAt(t) });
  },

  togglePause: () => set((s) => ({ paused: !s.paused })),

  setScenario: (patch) =>
    set((s) => {
      const next: Partial<SimState> = {};
      for (const key of ["setpoint", "outdoor", "occupancy", "tariff"] as const) {
        const v = patch[key];
        if (v !== undefined && Number.isFinite(v)) next[key] = clamp(v, SCENARIO_LIMITS[key]);
      }
      if (next.occupancy !== undefined && next.occupancy !== s.occupancy)
        next.rooms = adjustOccupancy(s.rooms, next.occupancy);
      return next;
    }),

  setRoomStatus: (id, status) =>
    set((s) => ({ rooms: s.rooms.map((r) => (r.id === id && r.status !== status ? { ...r, status } : r)) })),

  advanceIncident: (id) => {
    const e = get().incidents.find((x) => x.id === id);
    if (!e || e.status >= 3) return;
    const status = (e.status + 1) as IncidentStatus;
    set((s) => ({ incidents: s.incidents.map((x) => (x.id === id ? { ...x, status } : x)) }));
    if (status === 2) get().createWorkOrder(e.assetCode, e.owner, id);
    if (status === 3)
      set((s) => ({
        workOrders: s.workOrders.map((w) => (w.incidentId === id ? { ...w, status: "Completed" } : w)),
      }));
    get().notify(`${e.id} → ${INCIDENT_STEPS[status]} (simulation only)`);
  },

  createWorkOrder: (assetCode, owner = "Engineering team", incidentId) => {
    const existing = incidentId ? get().workOrders.find((w) => w.incidentId === incidentId) : undefined;
    if (existing) return existing;
    const w: WorkOrder = {
      id: `WO-${String(get().workOrders.length + 1).padStart(3, "0")}`,
      assetCode,
      owner,
      status: "Assigned",
      incidentId,
      time: timeStr(get().time),
    };
    set((s) => ({ workOrders: [...s.workOrders, w] }));
    // Incident workflow already reports its own step
    if (!incidentId) get().notify(`${w.id} สร้างใบงานจำลองแล้ว · ${owner}`);
    return w;
  },

  simulateIncident: () => {
    const idx = get().incidents.length + 1;
    const template = SIMULATED_INCIDENTS[(idx - 4) % SIMULATED_INCIDENTS.length];
    const e: Incident = {
      ...template,
      id: `INC-${String(idx).padStart(3, "0")}`,
      status: 0,
      time: timeStr(get().time),
    };
    set((s) => ({ incidents: [e, ...s.incidents] }));
    get().notify(`${e.id}: เพิ่มเหตุการณ์จำลองแล้ว`);
    return e.id;
  },

  ask: (question) => {
    const q = question.trim();
    if (!q) return;
    const answer = answerQuestion(q, buildAskContext(get()));
    set((s) => ({
      panel: "agent",
      chat: [...s.chat, { role: "user" as const, text: q }, { role: "assistant" as const, ...answer }].slice(
        -CHAT_LIMIT,
      ),
    }));
  },

  // Back to the seeded t0 state in one step (PLAN 8.1); the camera flies home
  resetDemo: () =>
    set((s) => {
      const twin = initialTwin();
      return {
        ...initialSim(),
        ...twin,
        camera: { ...twin.camera, n: s.camera.n + 1 },
        // Presenter preferences survive a reset
        sidebarExpanded: s.sidebarExpanded,
        quality: s.quality,
        toast: { text: "รีเซ็ต Demo แล้ว", n: (s.toast?.n ?? 0) + 1 },
      };
    }),
});
