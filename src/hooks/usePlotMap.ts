'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPlotMap, savePlotMapPositions } from '@/lib/api/plot-map';
import type { PlotMapCellPosition, PlotMapId, PlotMapOverlayPlot } from '@/lib/plot-maps/types';

export function usePlotMap(mapId: PlotMapId | null) {
  const [plots, setPlots] = useState<PlotMapOverlayPlot[]>([]);
  const [positions, setPositions] = useState<PlotMapCellPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!mapId) {
      setPlots([]);
      setPositions([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await getPlotMap(mapId);
      if (response.success) {
        setPlots(response.data.plots);
        setPositions(response.data.positions);
      } else {
        setError(response.error?.message || '区画図データの取得に失敗しました');
        setPlots([]);
        setPositions([]);
      }
    } catch {
      setError('区画図データの取得に失敗しました');
      setPlots([]);
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }, [mapId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const savePositions = useCallback(
    async (next: PlotMapCellPosition[]): Promise<boolean> => {
      if (!mapId) return false;
      setIsSaving(true);
      try {
        const response = await savePlotMapPositions(mapId, next);
        if (!response.success) return false;
        setPositions(response.data.positions);
        return true;
      } catch {
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [mapId]
  );

  return { plots, positions, isLoading, isSaving, error, refresh, savePositions };
}
