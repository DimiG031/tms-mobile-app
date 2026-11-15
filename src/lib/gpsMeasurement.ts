export function gpsMeasurement(location: { timestamp: number; coords: { latitude: number; longitude: number; speed?: number | null } }, vehicleId: string, tourId: string) {
  const { latitude, longitude, speed } = location.coords;
  if (!Number.isFinite(location.timestamp) || !Number.isFinite(new Date(location.timestamp).getTime()) || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { vehicleId, tourId, timestamp: new Date(location.timestamp).toISOString(), latitude, longitude,
    speedKmH: typeof speed === "number" && Number.isFinite(speed) && speed >= 0 ? speed * 3.6 : null };
}
