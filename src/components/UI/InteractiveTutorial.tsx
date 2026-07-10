import { TutorialProvider, useTutorial } from './tutorial/TutorialContext';
import { TutorialOverlay } from './tutorial/TutorialOverlay';
import { CoachBubble } from './tutorial/CoachBubble';
import { ObjectiveTracker } from './tutorial/ObjectiveTracker';
import { HintEngine } from './tutorial/HintEngine';

interface InteractiveTutorialProps {
  telemetry: any;
  stickState: any;
  orchestrator: any;
  onCheckpointsUpdated: (cps: any[]) => void;
}

export function InteractiveTutorial({ 
  telemetry, 
  stickState, 
  orchestrator,
  onCheckpointsUpdated 
}: InteractiveTutorialProps) {
  return (
    <TutorialProvider
      telemetry={telemetry}
      stickState={stickState}
      orchestrator={orchestrator}
      onCheckpointsUpdated={onCheckpointsUpdated}
    >
      <TutorialSubContainer />
    </TutorialProvider>
  );
}

function TutorialSubContainer() {
  const { isTutorialActive } = useTutorial();

  if (!isTutorialActive) return null;

  return (
    <>
      {/* Spotlight and Backdrop */}
      <TutorialOverlay />

      {/* SMART COACH ONBOARDING CARD */}
      <CoachBubble />

      {/* PERSISTENT FLIGHT OBJECTIVE HUD */}
      <ObjectiveTracker />

      {/* ADAPTIVE HELP ENGINE */}
      <HintEngine />
    </>
  );
}
