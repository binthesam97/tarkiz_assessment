const EARTH_RADIUS_M = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in metres (haversine). */
export function distanceBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function routeDistance(points: { latitude: number; longitude: number }[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index++) total += distanceBetween(points[index - 1]!, points[index]!);
  return total;
}
