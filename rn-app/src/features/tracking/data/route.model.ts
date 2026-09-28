export interface RoutePoint {
  id: number;
  shiftId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  recordedAt: string;
  synced: boolean;
}

export type NewRoutePoint = Omit<RoutePoint, 'id' | 'synced' | 'shiftId'>;

export interface ActiveShift {
  id: string;
  employeeId: string;
  startedAt: string;
}
