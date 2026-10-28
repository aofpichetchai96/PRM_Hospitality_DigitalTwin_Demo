import { asset } from "@/lib/asset";

/** The AI Assistant mascot: 64 px WebP made from public/images/Glossy-Gold-Robot-Mascot.png */
export function AssistantIcon({ size = 18 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static icon, no optimisation needed
    <img src={asset("/images/robot-mascot.webp")} alt="" aria-hidden width={size} height={size} className="shrink-0" />
  );
}
