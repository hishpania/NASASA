import type { LatLng } from "@/features/fields";
import { useEffect, useState } from "react";
import type { ClimateSeries } from "../model/climate";
import { nasaPower } from "../services/NasaPowerApi";

type ClimateState =
  | { status: "loading"; key: string }
  | { status: "loaded"; key: string; series: ClimateSeries }
  | { status: "failed"; key: string; message: string };

export function useClimateData(point: LatLng | null, days: number) {
  const lat = point?.lat ?? null;
  const lng = point?.lng ?? null;
  const key =
    lat !== null && lng !== null
      ? `${lat.toFixed(4)},${lng.toFixed(4)}:${days}`
      : "";
  const [state, setState] = useState<ClimateState | null>(null);

  useEffect(() => {
    if (lat === null || lng === null) {
      return;
    }
    const controller = new AbortController();
    nasaPower
      .daily({ lat, lng }, days, controller.signal)
      .then((series) => setState({ status: "loaded", key, series }))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: "failed",
            key,
            message:
              reason instanceof Error ? reason.message : "Request failed",
          });
        }
      });
    return () => controller.abort();
  }, [key, lat, lng, days]);

  if (!point) {
    return { status: "idle" as const };
  }
  if (!state || state.key !== key) {
    return { status: "loading" as const };
  }
  return state;
}
