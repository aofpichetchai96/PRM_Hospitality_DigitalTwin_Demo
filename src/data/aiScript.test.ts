import { beforeEach, describe, expect, it } from "vitest";
import { buildAskContext, selectKpis } from "@/store/selectors";
import { useAppStore } from "@/store/useAppStore";
import { answerQuestion, answerText, type Intent, QUICK_CHIPS, routeIntent } from "./aiScript";
import { VIEW_IDS } from "./views";

const s = () => useAppStore.getState();
const ask = (q: string) => answerQuestion(q, buildAskContext(s()));

beforeEach(() => s().resetDemo());

describe("AI Building Assistant", () => {
  it.each<[string, Intent]>([
    ["สรุปสถานะอาคารตอนนี้", "building"],
    ["ทำไมค่าไฟสูงวันนี้", "energy"],
    ["ห้องพักว่างพร้อมขายกี่ห้อง", "rooms"],
    ["Lobby หนาแน่นไหม", "public"],
    ["คุณภาพอากาศแต่ละ Zone", "public"],
    ["มี Alarm อะไรค้างอยู่", "alarms"],
    ["อุปกรณ์ใดต้องซ่อมบำรุง", "alarms"],
    ["แนะนำวิธีลดการใช้พลังงาน", "recommend"],
  ])("routes %s to %s", (q, intent) => {
    expect(routeIntent(q, { view: "overview" })).toBe(intent);
    expect(ask(q).intent).toBe(intent);
  });

  it("answers a generic question with the open scene's topic", () => {
    expect(routeIntent("ช่วยวิเคราะห์ให้หน่อย", { view: "boh" })).toBe("alarms");
    expect(routeIntent("ช่วยวิเคราะห์ให้หน่อย", { view: "public" })).toBe("public");
    expect(routeIntent("what is the weather on Mars", { view: "public" })).toBeNull();
  });

  it("splits every topic answer into data, analysis and recommendation, with source and time window", () => {
    for (const q of ["สรุปสถานะอาคาร", "ค่าไฟวันนี้", "ห้องว่างกี่ห้อง", "Lobby หนาแน่นไหม", "Alarm ค้าง", "แนะนำ"]) {
      const a = ask(q);
      expect(a.data, q).toBeTruthy();
      expect(a.analysis, q).toBeTruthy();
      expect(a.recommendation, q).toBeTruthy();
      expect(a.source, q).toContain("SIM");
      expect(a.period, q).toContain("14:30");
    }
  });

  it("uses the same numbers as the KPI strip and panels", () => {
    const k = selectKpis(s());
    expect(ask("ทำไมค่าไฟสูงวันนี้").data).toContain(`${Math.round(k.demand.value).toLocaleString("en-US")} kW`);
    expect(ask("ห้องพักว่างพร้อมขายกี่ห้อง").data).toContain("Available **62**");
    expect(ask("ห้องพักว่างพร้อมขายกี่ห้อง").data).toContain("Reserved **34**");
    expect(ask("มี Alarm อะไรค้างอยู่").data).toContain("ค้าง **3**");
    expect(ask("Lobby หนาแน่นไหม").data).toContain("**202 คน**");
  });

  it("points alarm advice at the worst open alarm's SOP", () => {
    expect(ask("มี Alarm อะไรค้างอยู่").sopFor).toBe("INC-001");
    const id = s().simulateIncident("ctTrip");
    const a = ask("มี Alarm อะไรค้างอยู่ และควรทำอะไรก่อน");
    expect(a.sopFor).toBe(id);
    expect(a.recommendation).toContain("Cooling tower fan trip");
    expect(a.recommendation).toContain("Breaker");
  });

  it("answers about the alarm a question names, with its likely cause and SOP (the 3D alarm card asks this way)", () => {
    const a = ask("INC-003 ประสิทธิภาพ Chiller ควรตรวจสอบ ต้อง Action อะไรต่อ ตาม SOP");
    expect(a.sopFor).toBe("INC-003");
    expect(a.analysis).toContain("Condenser tube");
    expect(a.recommendation).toContain("Chiller efficiency low");
  });

  it("answers carbon questions from the carbon model and event questions from today's bookings", () => {
    const c = ask("Carbon footprint เดือนนี้เป็นอย่างไร");
    expect(c.intent).toBe("energy");
    expect(c.data).toContain("tCO₂e");
    expect(c.analysis).toContain("Chilled water");
    const e = ask("วันนี้มีงานอะไรใน Event Hall บ้าง");
    expect(e.data).toContain("Hospitality Leaders Summit");
    expect(e.analysis).toContain("Grand Ballroom 320/480");
  });

  it("recommends the 25 °C setpoint with the energy model's saving", () => {
    expect(answerText(ask("แนะนำวิธีลดการใช้พลังงาน"))).toContain("ปรับ Setpoint เป็น 25 °C");
  });

  it("offers chips for every scene, each answered by one of the six topics", () => {
    for (const view of VIEW_IDS) {
      s().setView(view);
      expect(QUICK_CHIPS[view].length).toBeGreaterThanOrEqual(3);
      for (const c of QUICK_CHIPS[view]) expect(ask(c.question).source, c.question).not.toContain("Scripted demo");
    }
  });

  it("still answers the floor plan, facade and fallback questions", () => {
    expect(answerText(ask("Tell me about the library"))).toContain("Library gallery");
    expect(answerText(ask("ฟาซาดอาคารออกแบบอย่างไร"))).toContain("ครีบสีขาว");
    expect(ask("what is the weather on Mars").source).toContain("No external AI");
  });
});
