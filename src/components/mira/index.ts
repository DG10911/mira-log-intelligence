export { MascotBot } from "@/components/platform/mascot-bot";
export { ConsoleMascot } from "@/components/platform/console-mascot";
export { MiraBubble } from "./MiraBubble";
export { MiraDebugPanel } from "./MiraDebugPanel";
export { useMiraController, dispatchMira } from "./MiraController";
export type { MiraIntent, MiraBubbleData } from "./MiraController";
export {
  REACTIONS,
  SEVERITY_TO_REACTION,
  SEVERITY_BUBBLE,
  TONE_COLOR,
  type MiraReaction,
  type MiraTone,
} from "./MiraState";
