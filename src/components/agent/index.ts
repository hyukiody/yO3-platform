// Agent Components - Public API (re-exports from new taxonomy structure)
export { default as AgentInsightPanel, getProtocolColor, getProtocolLabel } from '@agent/insight/ui/react/component/insightCards/AgentInsightPanel';
export type { AgentInsight } from '@agent/insight/ui/react/component/insightCards/AgentInsightPanel';

export { default as ProtocolTimeline } from '@agent/insight/ui/react/component/protocolEvents/ProtocolTimeline';
export type { ProtocolEvent } from '@agent/insight/ui/react/component/protocolEvents/ProtocolTimeline';

export { default as VisionEngineStatus } from '@agent/status/ui/react/component/visionEngine/VisionEngineStatus';
export type { VisionEngineHealth } from '@agent/status/ui/react/component/visionEngine/VisionEngineStatus';

