'use client';

import { PlotSectionMap } from './PlotSectionMap';
import { usePlotMap } from '@/hooks/usePlotMap';
import type { PlotMapId } from '@/lib/plot-maps/types';

export function PlotMapSection({
  mapId,
  onClose,
  onDirtyChange,
}: {
  mapId: PlotMapId;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { plots, positions, isLoading, isSaving, error, savePositions } = usePlotMap(mapId);
  return (
    <PlotSectionMap
      mapId={mapId}
      plots={plots}
      positions={positions}
      isLoading={isLoading}
      isSaving={isSaving}
      error={error}
      onClose={onClose}
      onSave={savePositions}
      onDirtyChange={onDirtyChange}
    />
  );
}
