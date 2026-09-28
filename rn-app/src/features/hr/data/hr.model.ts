export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
}

export type LeaveType = 'CASUAL' | 'SICK' | 'EARNED';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  type: LeaveType;
  from: string;
  to: string;
  reason: string;
  status: LeaveStatus;
}

export type AttendanceAction = 'check-in' | 'check-out';

export interface QueuedAttendance {
  action: AttendanceAction;
  date: string;
  timestamp: string;
}

/** The employee's local calendar date (YYYY-MM-DD). A UTC date would be wrong near midnight. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
