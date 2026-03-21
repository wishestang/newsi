import { DigestView } from "@/components/digest/digest-view";
import { StatusPanel } from "@/components/states/status-panel";
import { isLocalPreviewMode } from "@/lib/env";

export default function TodayPage() {
  if (isLocalPreviewMode()) {
    return (
      <DigestView
        title="Today's Synthesis"
        intro="Two signals stood out across your tracked space today: AI productization is moving toward bundled workflows, and quiet, editorial interfaces are becoming a competitive advantage again."
        sections={[
          {
            title: "AI Agents Are Becoming Product Surfaces",
            summary: [
              "The most interesting movement is no longer around standalone model demos, but around how agentic behavior is packaged into usable workflows. Teams are collapsing multi-step research, planning, and execution tasks into narrower, opinionated experiences.",
              "That shift matters because product value is moving from raw model capability to orchestration, context retention, and trust in the output shape. The winners may look more like well-edited tools than generic chat boxes.",
            ],
            keyPoints: [
              "Workflow packaging is becoming a moat.",
              "Users care more about predictable outputs than broad model flexibility.",
            ],
            whyItMatters:
              "This is the kind of pattern Newsi itself needs to embody: a focused workflow, not an open-ended prompt box.",
          },
          {
            title: "Editorial Interfaces Feel More Valuable Again",
            summary: [
              "A second pattern is visual rather than purely technical. As more AI products compete on similar capabilities, calmer interfaces with stronger hierarchy and fewer controls are starting to feel more trustworthy.",
              "Products that look like feeds, dashboards, or control panels often make intelligence feel noisy. Interfaces that feel more like reading surfaces create a clearer sense of synthesis.",
            ],
            keyPoints: [
              "Visual restraint is becoming a product differentiator.",
              "Reading-oriented layouts reinforce trust and comprehension.",
            ],
          },
        ]}
      />
    );
  }

  return (
    <StatusPanel
      label="Scheduled"
      body="Your first digest will appear after the next local 07:00 run."
    />
  );
}
