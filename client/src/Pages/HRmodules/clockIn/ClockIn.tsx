import { useState, useEffect, useRef } from "react";
import { Clock, User, CheckCircle2, Loader2, LogOut, Coffee } from "lucide-react";
import { format } from "date-fns";
import api from "@/service/api";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Types
type Employee = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  status: string;
};

type Schedule = {
  id: string;
  employeeId: string;
  shiftDate: string | Date;
  startTime: string | Date;
  endTime: string | Date;
  breakTime?: number | null;
  position?: string | null;
  status: string;
};

type ClockInOutCycle = {
  clockIn: string;
  clockOut: string | null;
};

type BreakCycle = {
  breakClockIn: string;
  breakClockOut: string | null;
};

type Timesheet = {
  id: string;
  employeeId: string;
  scheduleId?: string | null; // Link to schedule
  clockInTime?: string | null; // Legacy field for backward compatibility
  clockOutTime?: string | null; // Legacy field for backward compatibility
  clockInAndOutTime?: ClockInOutCycle[] | null;
  breakClockInTime?: string | null; // Legacy field for backward compatibility
  breakClockOutTime?: string | null; // Legacy field for backward compatibility
  breakClockInAndOutTime?: BreakCycle[] | null;
  breakDuration?: number;
  status: string;
  schedule?: Schedule | null;
};

export default function ClockIn() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [currentTimesheet, setCurrentTimesheet] = useState<Timesheet | null>(null);
  const [allTodayTimesheets, setAllTodayTimesheets] = useState<Timesheet[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<Schedule | null>(null);
  const [allTodaySchedules, setAllTodaySchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [breakClockingIn, setBreakClockingIn] = useState(false);
  const [breakClockingOut, setBreakClockingOut] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [firstClockInTime, setFirstClockInTime] = useState<Date | null>(null);
  const [workCountdownPausedAt, setWorkCountdownPausedAt] = useState<{ hours: number; minutes: number; seconds: number; isOverdue: boolean } | null>(null);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [localBreakClockInTime, setLocalBreakClockInTime] = useState<Date | null>(null);
  const isProcessingRef = useRef(false);
  const autoClockOutProcessedRef = useRef(false);
  const isClockInInProgressRef = useRef(false);
  const scheduleOverdueAutoClockOutRef = useRef(false);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);


  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Check timesheet status and fetch schedule when employee is selected
  useEffect(() => {
    if (selectedEmployeeId) {
      // Show loading only on initial employee selection
      checkTimesheetStatus(selectedEmployeeId, true);
      fetchTodaySchedule(selectedEmployeeId);
    } else {
      setCurrentTimesheet(null);
      setAllTodayTimesheets([]);
      setTodaySchedule(null);
      setAllTodaySchedules([]);
      setFirstClockInTime(null); // Reset first clock in time when employee is deselected
    }
  }, [selectedEmployeeId]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get("/hr/employees/get");
      if (response.data.success) {
        // Filter only active employees
        const activeEmployees = (response.data.data || []).filter(
          (emp: Employee) => emp.status === "active"
        );
        setEmployees(activeEmployees);
      }
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaySchedule = async (employeeId: string) => {
    try {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");

      const response = await api.get("/hr/schedules/get", {
        params: {
          employeeId,
          startDate: todayStr,
          endDate: todayStr,
          status: "scheduled",
        },
      });

      if (response.data.success) {
        const schedules = response.data.data || [];
        // Filter schedules for today
        const todaySchedules = schedules.filter((s: Schedule) => {
          const scheduleDate = new Date(s.shiftDate);
          return format(scheduleDate, "yyyy-MM-dd") === todayStr;
        });

        // Store all schedules for the day
        setAllTodaySchedules(todaySchedules);

        if (todaySchedules.length === 0) {
          setTodaySchedule(null);
          return;
        }

        // Sort schedules by start time to find the appropriate one
        const sortedSchedules = [...todaySchedules].sort((a, b) => {
          const aStart = extractTime(a.startTime);
          const bStart = extractTime(b.startTime);
          const [aHours, aMinutes] = aStart.split(':').map(Number);
          const [bHours, bMinutes] = bStart.split(':').map(Number);
          const aTotal = aHours * 60 + aMinutes;
          const bTotal = bHours * 60 + bMinutes;
          return aTotal - bTotal;
        });

        // Find the current active schedule (one that hasn't ended yet, or the last one)
        const now = new Date();
        let activeSchedule = sortedSchedules[sortedSchedules.length - 1]; // Default to last schedule

        for (const schedule of sortedSchedules) {
          const scheduleDateStr = String(schedule.shiftDate).split("T")[0];
          const [year, month, day] = scheduleDateStr.split('-').map(Number);
          const scheduleDate = new Date(year, month - 1, day);

          const endTimeStr = extractTime(schedule.endTime);
          const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
          const scheduleEnd = new Date(scheduleDate);
          scheduleEnd.setHours(endHours, endMinutes, 0, 0);

          // If schedule hasn't ended yet, use it
          if (now <= scheduleEnd) {
            activeSchedule = schedule;
            break;
          }
        }

        setTodaySchedule(activeSchedule || null);
      }
    } catch (error: any) {
      console.error("Error fetching schedule:", error);
    }
  };

  const checkTimesheetStatus = async (employeeId: string, showLoading: boolean = false) => {
    if (showLoading) {
      setCheckingStatus(true);
    }
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await api.get("/hr/timesheets/get", {
        params: {
          employeeId,
          startDate: today.toISOString(),
          endDate: tomorrow.toISOString(),
        },
      });

      if (response.data.success) {
        const timesheets = response.data.data || [];
        // Store all timesheets for the day to calculate total used break time
        setAllTodayTimesheets(timesheets);

        // Find open timesheet (clocked in but not clocked out)
        // IMPORTANT: Only consider timesheets that have clockInTime, not just breakClockInTime
        // Check JSON array first, then fallback to legacy fields
        const openTimesheet = timesheets.find((ts: Timesheet) => {
          if (ts.status !== "pending") return false;

          // Check JSON array structure
          if (ts.clockInAndOutTime && Array.isArray(ts.clockInAndOutTime) && ts.clockInAndOutTime.length > 0) {
            const lastCycle = ts.clockInAndOutTime[ts.clockInAndOutTime.length - 1];
            return lastCycle.clockIn && !lastCycle.clockOut;
          }

          // Fallback to legacy fields - ONLY if clockInTime exists (not just breakClockInTime)
          return !!(ts.clockInTime && !ts.clockOutTime);
        });

        // Also find timesheets that only have break time (no clock in) - for break tracking without clock in
        // This allows us to track breaks even when not clocked in
        const breakOnlyTimesheet = !openTimesheet ? timesheets.find((ts: Timesheet) => {
          if (ts.status !== "pending") return false;

          // Has break time but no clock in time
          const hasBreakTime = (ts.breakClockInAndOutTime && Array.isArray(ts.breakClockInAndOutTime) && ts.breakClockInAndOutTime.length > 0) ||
            (ts.breakClockInTime && !ts.breakClockOutTime);

          const hasNoClockIn = (!ts.clockInAndOutTime || !Array.isArray(ts.clockInAndOutTime) || ts.clockInAndOutTime.length === 0) &&
            !ts.clockInTime;

          return hasBreakTime && hasNoClockIn;
        }) : null;

        // Set currentTimesheet to the clocked-in one, or the break-only one if no clock-in exists
        setCurrentTimesheet(openTimesheet || breakOnlyTimesheet || null);

        // Clear local break time if timesheet has break time from server (to use server time)
        const timesheetToCheck = openTimesheet || breakOnlyTimesheet;
        if (timesheetToCheck) {
          const hasServerBreakTime = (() => {
            if (timesheetToCheck.breakClockInAndOutTime && Array.isArray(timesheetToCheck.breakClockInAndOutTime) && timesheetToCheck.breakClockInAndOutTime.length > 0) {
              const lastBreakCycle = timesheetToCheck.breakClockInAndOutTime[timesheetToCheck.breakClockInAndOutTime.length - 1];
              return !!lastBreakCycle.breakClockIn;
            }
            return !!timesheetToCheck.breakClockInTime;
          })();

          if (hasServerBreakTime) {
            setLocalBreakClockInTime(null); // Use server time instead
          }
        }

        // Initialize firstClockInTime from timesheet if it exists and firstClockInTime is not set
        // This ensures late time is frozen from the first clock in, even after page refresh
        if (openTimesheet) {
          let firstClockIn: string | null = null;

          // Get first clock in from JSON array or legacy field
          if (openTimesheet.clockInAndOutTime && Array.isArray(openTimesheet.clockInAndOutTime) && openTimesheet.clockInAndOutTime.length > 0) {
            firstClockIn = openTimesheet.clockInAndOutTime[0].clockIn;
          } else if (openTimesheet.clockInTime) {
            firstClockIn = openTimesheet.clockInTime;
          }

          // Only set firstClockInTime if we found a clock in time AND it's not already set
          // This preserves the frozen late time even after clock out/refresh
          if (firstClockIn && !firstClockInTime) {
            setFirstClockInTime(new Date(firstClockIn));
          }
        } else {
          // If no open timesheet and no firstClockInTime set, reset it
          // This only happens when switching employees or when there's no timesheet at all
          if (!firstClockInTime) {
            setFirstClockInTime(null);
          }
        }
      }
    } catch (error: any) {
      console.error("Error checking timesheet status:", error);
    } finally {
      if (showLoading) {
        setCheckingStatus(false);
      }
    }
  };

  const handleClockIn = async () => {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    // Check if already clocked in
    if (currentTimesheet) {
      const hasClockIn = (() => {
        if (currentTimesheet.clockInAndOutTime && Array.isArray(currentTimesheet.clockInAndOutTime) && currentTimesheet.clockInAndOutTime.length > 0) {
          const lastCycle = currentTimesheet.clockInAndOutTime[currentTimesheet.clockInAndOutTime.length - 1];
          return !!(lastCycle.clockIn && !lastCycle.clockOut);
        }
        return !!(currentTimesheet.clockInTime && !currentTimesheet.clockOutTime);
      })();

      if (hasClockIn) {
        toast.error("Employee is already clocked in");
        return;
      }
    }

    // Always end any active break before clocking in, regardless of whether break time is overdue
    // This ensures clean state before clock in. The overdue check only prevents starting NEW breaks.
    // If on break (either through timesheet or local break time), automatically end the break first
    const isOnBreakCheck = (() => {
      // Check local break time first
      if (localBreakClockInTime) {
        return true;
      }
      // Then check timesheet
      if (currentTimesheet) {
        if (currentTimesheet.breakClockInAndOutTime && Array.isArray(currentTimesheet.breakClockInAndOutTime) && currentTimesheet.breakClockInAndOutTime.length > 0) {
          const lastBreakCycle = currentTimesheet.breakClockInAndOutTime[currentTimesheet.breakClockInAndOutTime.length - 1];
          return !!(lastBreakCycle.breakClockIn && !lastBreakCycle.breakClockOut);
        }
        return !!(currentTimesheet.breakClockInTime && !currentTimesheet.breakClockOutTime);
      }
      return false;
    })();

    if (isOnBreakCheck) {
      // Automatically end the break before clocking in
      // This is safe even if break time is overdue - we're ending an existing break, not starting a new one
      try {
        await handleBreakClockOut();
        // Wait a moment for break to end and state to update
        await new Promise(resolve => setTimeout(resolve, 300));
        // Refresh timesheet status in background (no loading indicator)
        checkTimesheetStatus(selectedEmployeeId, false).catch(console.error);
      } catch (error) {
        console.error("Error ending break before clock in:", error);
        // Continue with clock in even if break end fails
      }
    }

    if (isProcessingRef.current) {
      return; // Prevent multiple simultaneous calls
    }

    isProcessingRef.current = true;
    isClockInInProgressRef.current = true; // Mark that clock in is in progress
    setClockingIn(true);
    try {
      await api.post("/hr/timesheets/create", {
        employeeId: selectedEmployeeId,
      });
      toast.success("Clocked in successfully!");

      // Store first clock in time for late calculation
      if (!firstClockInTime) {
        setFirstClockInTime(new Date());
      }

      // Refresh timesheet status in background (no loading indicator for smoother UI)
      // IMPORTANT: Do NOT start a break automatically, even if break time is overdue
      // When break time is overdue, only clock in is allowed, no break operations
      checkTimesheetStatus(selectedEmployeeId, false).catch(console.error);

      // Ensure local break time is cleared after clock in (prevent any automatic break start)
      setLocalBreakClockInTime(null);
    } catch (error: any) {
      console.error("Error clocking in:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to clock in";
      toast.error(errorMessage);
    } finally {
      setClockingIn(false);
      isProcessingRef.current = false;
      // Reset clock in progress flag after a short delay
      setTimeout(() => {
        isClockInInProgressRef.current = false;
      }, 1000);
    }
  };

  const handleClockOut = async () => {
    if (!currentTimesheet) {
      toast.error("No active timesheet found");
      return;
    }

    setClockingOut(true);
    try {
      await api.put(`/hr/timesheets/update/${currentTimesheet.id}`, {
        clockOutTime: new Date().toISOString(),
      });
      toast.success("Clocked out successfully!");

      // Refresh timesheet status in background (no loading indicator for smoother UI)
      checkTimesheetStatus(selectedEmployeeId, false).catch(console.error);
    } catch (error: any) {
      console.error("Error clocking out:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to clock out";
      toast.error(errorMessage);
    } finally {
      setClockingOut(false);
    }
  };

  const handleBreakClockIn = async () => {
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    // Check if employee has break time allocated
    if (!hasBreakTimeAllocated) {
      toast.error("You don't have break time");
      return;
    }

    // CRITICAL: Check if break time is overdue - if so, prevent starting break
    const breakTimeOverdue = isBreakTimeOverdue();
    if (breakTimeOverdue) {
      toast.error("All scheduled break time has been used. Cannot start break.");
      return;
    }

    if (isProcessingRef.current) {
      return; // Prevent multiple simultaneous calls
    }

    // Helper function to check if on break
    const checkIfOnBreak = (timesheet: Timesheet): boolean => {
      if (timesheet.breakClockInAndOutTime && Array.isArray(timesheet.breakClockInAndOutTime) && timesheet.breakClockInAndOutTime.length > 0) {
        const lastBreakCycle = timesheet.breakClockInAndOutTime[timesheet.breakClockInAndOutTime.length - 1];
        return !!(lastBreakCycle.breakClockIn && !lastBreakCycle.breakClockOut);
      }
      return !!(timesheet.breakClockInTime && !timesheet.breakClockOutTime);
    };

    // Set local break time immediately for UI update
    const now = new Date();
    setLocalBreakClockInTime(now);

    // If clocked in, pause work countdown and start break
    if (currentTimesheet && isClockedIn) {
      if (checkIfOnBreak(currentTimesheet)) {
        // Already on break - just refresh status to show break countdown, don't show error
        checkTimesheetStatus(selectedEmployeeId, false).catch(console.error);
        return;
      }

      // Store current work countdown before pausing
      const currentWorkCountdown = getWorkCountdown();
      if (currentWorkCountdown && !(currentWorkCountdown as any).isOverdue) {
        setWorkCountdownPausedAt(currentWorkCountdown as { hours: number; minutes: number; seconds: number; isOverdue: boolean });
        setBreakStartTime(now); // Store when break started
      }

      // Start break (don't clock out, just pause work)
      // If we have a paused break countdown from previous break, it will be used automatically in getBreakCountdown()
      isProcessingRef.current = true;
      setBreakClockingIn(true);
      try {
        await api.put(`/hr/timesheets/update/${currentTimesheet.id}`, {
          breakClockInTime: now.toISOString(),
        });
        toast.success("Break started! Work countdown paused.");

        // Refresh timesheet status in background (no loading indicator)
        checkTimesheetStatus(selectedEmployeeId, false).catch(console.error);
      } catch (error: any) {
        console.error("Error starting break:", error);
        const errorMessage =
          error.response?.data?.error || "Failed to start break";

        // If already on break, don't show error - just refresh status to show break countdown
        if (errorMessage.includes("already on break")) {
          // Refresh timesheet status to get current break state and show countdown
          checkTimesheetStatus(selectedEmployeeId, false).catch(console.error);
          // Don't show error toast, just silently refresh
        } else {
          toast.error(errorMessage);
          setLocalBreakClockInTime(null); // Reset on error
        }
      } finally {
        setBreakClockingIn(false);
        isProcessingRef.current = false;
      }
      return;
    }

    // If not clocked in and no timesheet exists
    if (!currentTimesheet) {
      // If employee has break time, allow starting break without requiring clock in
      // Note: Backend createTimesheet API will auto-clock in, but we allow this for break tracking
      // The user can still use break time even though backend technically clocked them in

      if (!hasBreakTimeAllocated) {
        toast.error("You don't have break time");
        setLocalBreakClockInTime(null);
        return;
      }

      isProcessingRef.current = true;
      setBreakClockingIn(true);
      try {
        // Create timesheet for break tracking only (without clocking in)
        const createResponse = await api.post("/hr/timesheets/create", {
          employeeId: selectedEmployeeId,
          breakOnly: true, // Tell backend to create timesheet without clocking in
        });
        const newTimesheet = createResponse.data.data as Timesheet;

        // Add break time to the timesheet
        await api.put(`/hr/timesheets/update/${newTimesheet.id}`, {
          breakClockInTime: now.toISOString(),
        });

        toast.success("Break started!");

        // Refresh timesheet status in background (no loading indicator)
        checkTimesheetStatus(selectedEmployeeId, false).catch(console.error);
      } catch (error: any) {
        console.error("Error starting break:", error);
        const errorMessage =
          error.response?.data?.error || "Failed to start break";

        // If already on break, don't show error - just refresh status to show break countdown
        if (errorMessage.includes("already on break")) {
          // Refresh timesheet status to get current break state and show countdown
          checkTimesheetStatus(selectedEmployeeId, false).catch(console.error);
          // Don't show error toast, just silently refresh
        } else {
          toast.error(errorMessage);
          setLocalBreakClockInTime(null); // Reset on error
        }
      } finally {
        setBreakClockingIn(false);
        isProcessingRef.current = false;
      }
      return;
    }

    // If timesheet exists but not clocked in, just start break
    // At this point, currentTimesheet must exist (we checked earlier)
    const timesheet = currentTimesheet as Timesheet;
    if (checkIfOnBreak(timesheet)) {
      toast.error("You are already on break");
      setLocalBreakClockInTime(null);
      return;
    }

    isProcessingRef.current = true;
    setBreakClockingIn(true);
    try {
      await api.put(`/hr/timesheets/update/${timesheet.id}`, {
        breakClockInTime: now.toISOString(),
      });
      toast.success("Break started!");

      // Refresh timesheet status in background (no loading indicator)
      checkTimesheetStatus(selectedEmployeeId, false).catch(console.error);
    } catch (error: any) {
      console.error("Error starting break:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to start break";

      // If already on break, don't show error - just refresh status to show break countdown
      if (errorMessage.includes("already on break")) {
        // Refresh timesheet status to get current break state and show countdown
        checkTimesheetStatus(selectedEmployeeId, false).catch(console.error);
        // Don't show error toast, just silently refresh
      } else {
        toast.error(errorMessage);
        setLocalBreakClockInTime(null); // Reset on error
      }
    } finally {
      setBreakClockingIn(false);
      isProcessingRef.current = false;
    }
  };

  const handleBreakClockOut = async () => {
    if (isProcessingRef.current) {
      return; // Prevent multiple simultaneous calls
    }

    // Check if we're on break - either through timesheet or local break time
    const hasBreakClockIn = (() => {
      // First check local break time (for immediate UI updates)
      if (localBreakClockInTime) {
        return true;
      }
      // Then check timesheet
      if (currentTimesheet) {
        if (currentTimesheet.breakClockInAndOutTime && Array.isArray(currentTimesheet.breakClockInAndOutTime) && currentTimesheet.breakClockInAndOutTime.length > 0) {
          const lastBreakCycle = currentTimesheet.breakClockInAndOutTime[currentTimesheet.breakClockInAndOutTime.length - 1];
          return !!(lastBreakCycle.breakClockIn && !lastBreakCycle.breakClockOut);
        }
        return !!(currentTimesheet.breakClockInTime && !currentTimesheet.breakClockOutTime);
      }
      return false;
    })();

    if (!hasBreakClockIn) {
      toast.error("You haven't clocked in for break yet");
      return;
    }

    // If we have local break time but no timesheet, we need to create/find the timesheet first
    if (!currentTimesheet && localBreakClockInTime) {
      // Try to find or create timesheet for break tracking
      isProcessingRef.current = true;
      setBreakClockingOut(true);
      try {
        // First, try to refresh timesheet status to see if one was created
        await checkTimesheetStatus(selectedEmployeeId, false);

        // Get the updated timesheet - we need to fetch it again since state update is async
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const response = await api.get("/hr/timesheets/get", {
          params: {
            employeeId: selectedEmployeeId,
            startDate: today.toISOString(),
            endDate: tomorrow.toISOString(),
          },
        });

        let timesheetToUpdate: Timesheet | null = null;
        if (response.data.success) {
          const timesheets = response.data.data || [];
          // Find break-only timesheet or any pending timesheet with break time
          timesheetToUpdate = timesheets.find((ts: Timesheet) => {
            if (ts.status !== "pending") return false;
            const hasBreakTime = (ts.breakClockInAndOutTime && Array.isArray(ts.breakClockInAndOutTime) && ts.breakClockInAndOutTime.length > 0) ||
              (ts.breakClockInTime && !ts.breakClockOutTime);
            return hasBreakTime;
          }) || null;
        }

        // If still no timesheet, create one
        if (!timesheetToUpdate) {
          const createResponse = await api.post("/hr/timesheets/create", {
            employeeId: selectedEmployeeId,
            breakOnly: true,
          });
          timesheetToUpdate = createResponse.data.data as Timesheet;

          // Update the timesheet with break clock in and out times
          await api.put(`/hr/timesheets/update/${timesheetToUpdate.id}`, {
            breakClockInTime: localBreakClockInTime.toISOString(),
            breakClockOutTime: new Date().toISOString(),
          });

          toast.success("Break ended!");
        } else {
          // Timesheet found, update it
          await api.put(`/hr/timesheets/update/${timesheetToUpdate.id}`, {
            breakClockOutTime: new Date().toISOString(),
          });
          toast.success("Break ended!");
        }

        // Clear break start time and local break time
        setBreakStartTime(null);
        setLocalBreakClockInTime(null);

        // Refresh timesheet status in background (no loading indicator)
        checkTimesheetStatus(selectedEmployeeId, false).catch(console.error);
      } catch (error: any) {
        console.error("Error ending break:", error);
        const errorMessage =
          error.response?.data?.error || "Failed to end break";
        toast.error(errorMessage);
      } finally {
        setBreakClockingOut(false);
        isProcessingRef.current = false;
      }
      return;
    }

    // If we have a timesheet, use it normally
    if (!currentTimesheet) {
      toast.error("No active timesheet found");
      return;
    }

    // Check if break already ended
    const breakAlreadyEnded = (() => {
      if (currentTimesheet.breakClockInAndOutTime && Array.isArray(currentTimesheet.breakClockInAndOutTime) && currentTimesheet.breakClockInAndOutTime.length > 0) {
        const lastBreakCycle = currentTimesheet.breakClockInAndOutTime[currentTimesheet.breakClockInAndOutTime.length - 1];
        return !!lastBreakCycle.breakClockOut;
      }
      return !!currentTimesheet.breakClockOutTime;
    })();

    if (breakAlreadyEnded) {
      toast.error("Break already ended");
      return;
    }

    isProcessingRef.current = true;
    setBreakClockingOut(true);
    try {
      await api.put(`/hr/timesheets/update/${currentTimesheet.id}`, {
        breakClockOutTime: new Date().toISOString(),
      });

      // Clear break start time to allow work countdown to resume naturally from paused value
      setBreakStartTime(null);
      setLocalBreakClockInTime(null); // Clear local break time

      toast.success("Break ended! Work countdown resumed.");

      // Refresh timesheet status in background (no loading indicator)
      checkTimesheetStatus(selectedEmployeeId, false).catch(console.error);
    } catch (error: any) {
      console.error("Error ending break:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to end break";
      toast.error(errorMessage);
    } finally {
      setBreakClockingOut(false);
      isProcessingRef.current = false;
    }
  };

  const selectedEmployee = employees.find((emp) => emp.id === selectedEmployeeId);
  // Check if actually clocked in (has clockInTime or clockInAndOutTime with clock in)
  const isClockedIn = currentTimesheet ? (() => {
    // Check JSON array structure first
    if (currentTimesheet.clockInAndOutTime && Array.isArray(currentTimesheet.clockInAndOutTime) && currentTimesheet.clockInAndOutTime.length > 0) {
      const lastCycle = currentTimesheet.clockInAndOutTime[currentTimesheet.clockInAndOutTime.length - 1];
      return !!(lastCycle.clockIn && !lastCycle.clockOut);
    }
    // Fallback to legacy fields
    return !!(currentTimesheet.clockInTime && !currentTimesheet.clockOutTime);
  })() : false;

  // Get clock in time from JSON array or legacy field
  const clockInTime = currentTimesheet
    ? (() => {
      if (currentTimesheet.clockInAndOutTime && Array.isArray(currentTimesheet.clockInAndOutTime) && currentTimesheet.clockInAndOutTime.length > 0) {
        const lastCycle = currentTimesheet.clockInAndOutTime[currentTimesheet.clockInAndOutTime.length - 1];
        return lastCycle.clockIn ? new Date(lastCycle.clockIn) : null;
      }
      return currentTimesheet.clockInTime ? new Date(currentTimesheet.clockInTime) : null;
    })()
    : null;

  // Get break times from JSON array or legacy fields, or use local break time if available
  const breakClockInTime = localBreakClockInTime || (currentTimesheet
    ? (() => {
      if (currentTimesheet.breakClockInAndOutTime && Array.isArray(currentTimesheet.breakClockInAndOutTime) && currentTimesheet.breakClockInAndOutTime.length > 0) {
        const lastBreakCycle = currentTimesheet.breakClockInAndOutTime[currentTimesheet.breakClockInAndOutTime.length - 1];
        return lastBreakCycle.breakClockIn ? new Date(lastBreakCycle.breakClockIn) : null;
      }
      return currentTimesheet.breakClockInTime ? new Date(currentTimesheet.breakClockInTime) : null;
    })()
    : null);

  const breakClockOutTime = currentTimesheet
    ? (() => {
      if (currentTimesheet.breakClockInAndOutTime && Array.isArray(currentTimesheet.breakClockInAndOutTime) && currentTimesheet.breakClockInAndOutTime.length > 0) {
        const lastBreakCycle = currentTimesheet.breakClockInAndOutTime[currentTimesheet.breakClockInAndOutTime.length - 1];
        return lastBreakCycle.breakClockOut ? new Date(lastBreakCycle.breakClockOut) : null;
      }
      return currentTimesheet.breakClockOutTime ? new Date(currentTimesheet.breakClockOutTime) : null;
    })()
    : null;

  const isOnBreak = breakClockInTime !== null && breakClockOutTime === null;

  // Helper function to extract time from schedule time string (HH:mm format)
  const extractTime = (timeValue: string | Date): string => {
    if (timeValue instanceof Date) {
      const hours = timeValue.getHours().toString().padStart(2, '0');
      const minutes = timeValue.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    const timeStr = String(timeValue);
    if (timeStr.includes('T')) {
      const timePart = timeStr.split('T')[1];
      if (timePart) {
        return timePart.split(':').slice(0, 2).join(':');
      }
    }
    return timeStr.substring(0, 5);
  };

  // Helper function to check if a time falls within schedule interval
  const isTimeWithinScheduleInterval = (time: Date, schedule: Schedule | null): boolean => {
    if (!schedule) return true; // If no schedule, include all times

    const scheduleDateStr = String(schedule.shiftDate).split("T")[0];
    const [year, month, day] = scheduleDateStr.split('-').map(Number);
    const scheduleDate = new Date(year, month - 1, day);

    const startTimeStr = extractTime(schedule.startTime);
    const endTimeStr = extractTime(schedule.endTime);
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    const [endHours, endMinutes] = endTimeStr.split(':').map(Number);

    const scheduleStart = new Date(scheduleDate);
    scheduleStart.setHours(startHours, startMinutes, 0, 0);

    const scheduleEnd = new Date(scheduleDate);
    scheduleEnd.setHours(endHours, endMinutes, 0, 0);

    // Handle overnight shifts (end time is next day)
    if (scheduleEnd <= scheduleStart) {
      scheduleEnd.setDate(scheduleEnd.getDate() + 1);
    }

    return time >= scheduleStart && time <= scheduleEnd;
  };

  // Helper function to get clock in/out cycles within schedule interval
  const getClockInOutCyclesWithinInterval = (timesheet: Timesheet, schedule: Schedule | null): ClockInOutCycle[] => {
    if (!timesheet) return [];

    let cycles: ClockInOutCycle[] = [];

    if (timesheet.clockInAndOutTime && Array.isArray(timesheet.clockInAndOutTime)) {
      cycles = timesheet.clockInAndOutTime;
    } else if (timesheet.clockInTime) {
      cycles = [{
        clockIn: timesheet.clockInTime,
        clockOut: timesheet.clockOutTime || null,
      }];
    }

    if (!schedule) return cycles; // If no schedule, return all cycles

    // Filter cycles to only include those within schedule interval
    return cycles.filter((cycle: ClockInOutCycle) => {
      const clockIn = new Date(cycle.clockIn);
      // Check if clock in is within schedule interval
      return isTimeWithinScheduleInterval(clockIn, schedule);
    });
  };


  // Helper function to parse date string and extract date components (local time only)
  const parseLocalDate = (dateString: string): Date => {
    try {
      // Parse date from string (format: "2024-01-01" or "2024-01-01T14:30:00.000Z")
      const datePart = dateString.includes('T') ? dateString.split('T')[0] : dateString.split(' ')[0];
      const dateComponents = datePart.split('-');
      const year = parseInt(dateComponents[0] || '0', 10);
      const month = parseInt(dateComponents[1] || '1', 10) - 1; // Month is 0-indexed
      const day = parseInt(dateComponents[2] || '1', 10);

      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day, 0, 0, 0);
      }
    } catch (error) {
      // If parsing fails, use today
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  };

  // Helper function to parse time string and extract time components (local time only)
  const parseLocalTime = (timeString: string, baseDate?: Date): Date => {
    // Use provided baseDate or today's date
    const base = baseDate || new Date();
    const year = base.getFullYear();
    const month = base.getMonth();
    const day = base.getDate();

    // Manually parse time string to extract hours, minutes, seconds
    // Handle ISO format: "2024-01-01T14:30:00.000Z" or "2024-01-01T14:30:00Z"
    // Or date format: "2024-01-01T14:30:00"
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    try {
      // Extract time part from ISO string (everything after 'T')
      const timePart = timeString.includes('T')
        ? timeString.split('T')[1]?.split('.')[0]?.split('Z')[0] || timeString.split('T')[1]
        : timeString.includes(' ')
          ? timeString.split(' ')[1]?.split('.')[0]?.split('Z')[0] || timeString.split(' ')[1]
          : timeString;

      // Parse HH:mm:ss format
      const timeComponents = timePart.split(':');
      hours = parseInt(timeComponents[0] || '0', 10);
      minutes = parseInt(timeComponents[1] || '0', 10);
      seconds = parseInt(timeComponents[2] || '0', 10);

      // Validate parsed values
      if (isNaN(hours)) hours = 0;
      if (isNaN(minutes)) minutes = 0;
      if (isNaN(seconds)) seconds = 0;
    } catch (error) {
      // If parsing fails, use current time
      hours = base.getHours();
      minutes = base.getMinutes();
      seconds = base.getSeconds();
    }

    // Create date using local time components only (no timezone conversion)
    // Date constructor with individual components always uses local timezone
    return new Date(year, month, day, hours, minutes, seconds);
  };

  // Calculate countdown based on scheduled end time using local time only
  // ALWAYS use todaySchedule (last schedule) for ALL operations to ensure we use the latest schedule
  // This ensures clock-in validation uses the last schedule even if there's a timesheet with an older schedule
  const scheduleToUse = todaySchedule;

  // Calculate total work time in hours within schedule interval (excluding breaks)
  const calculateWorkTimeInInterval = (): number => {
    if (!scheduleToUse) return 0;

    let totalWorkMinutes = 0;

    // Get all timesheets for today - include timesheets with matching scheduleId OR timesheets without scheduleId (for same employee)
    const relevantTimesheets = allTodayTimesheets.filter((ts: Timesheet) => {
      // If schedule has an ID, prefer matching scheduleId
      if (scheduleToUse.id) {
        return ts.scheduleId === scheduleToUse.id || !ts.scheduleId;
      }
      // If schedule has no ID, include all timesheets for this employee
      return true;
    });

    // If no timesheets, return 0
    if (relevantTimesheets.length === 0) {
      return 0;
    }

    relevantTimesheets.forEach((timesheet: Timesheet) => {
      // Get cycles within schedule interval
      let cycles = getClockInOutCyclesWithinInterval(timesheet, scheduleToUse);

      // If no cycles found but timesheet has clock in/out, try to include it if it's within schedule
      if (cycles.length === 0) {
        // Check if timesheet has clock in/out that might be within schedule
        if (timesheet.clockInAndOutTime && Array.isArray(timesheet.clockInAndOutTime) && timesheet.clockInAndOutTime.length > 0) {
          // Re-check all cycles - maybe the filter was too strict
          timesheet.clockInAndOutTime.forEach((cycle: ClockInOutCycle) => {
            if (cycle.clockIn) {
              const clockIn = new Date(cycle.clockIn);
              // Include if clock in is within schedule interval
              if (isTimeWithinScheduleInterval(clockIn, scheduleToUse)) {
                cycles.push(cycle);
              }
            }
          });
        } else if (timesheet.clockInTime) {
          const clockIn = new Date(timesheet.clockInTime);
          if (isTimeWithinScheduleInterval(clockIn, scheduleToUse)) {
            cycles.push({
              clockIn: timesheet.clockInTime,
              clockOut: timesheet.clockOutTime || null,
            });
          }
        }
      }

      cycles.forEach((cycle: ClockInOutCycle) => {
        if (cycle.clockIn && cycle.clockOut) {
          const clockIn = new Date(cycle.clockIn);
          const clockOut = new Date(cycle.clockOut);

          // Clamp times to schedule interval
          const scheduleDateStr = String(scheduleToUse.shiftDate).split("T")[0];
          const [year, month, day] = scheduleDateStr.split('-').map(Number);
          const scheduleDate = new Date(year, month - 1, day);

          const startTimeStr = extractTime(scheduleToUse.startTime);
          const endTimeStr = extractTime(scheduleToUse.endTime);
          const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
          const [endHours, endMinutes] = endTimeStr.split(':').map(Number);

          const scheduleStart = new Date(scheduleDate);
          scheduleStart.setHours(startHours, startMinutes, 0, 0);

          const scheduleEnd = new Date(scheduleDate);
          scheduleEnd.setHours(endHours, endMinutes, 0, 0);

          // Handle overnight shifts
          if (scheduleEnd <= scheduleStart) {
            scheduleEnd.setDate(scheduleEnd.getDate() + 1);
          }

          // Clamp clock in to schedule start (if before)
          let effectiveClockIn = clockIn;
          if (effectiveClockIn < scheduleStart) {
            effectiveClockIn = scheduleStart;
          }

          // Clamp clock out to schedule end (if after)
          let effectiveClockOut = clockOut;
          if (effectiveClockOut > scheduleEnd) {
            effectiveClockOut = scheduleEnd;
          }

          const diffMs = effectiveClockOut.getTime() - effectiveClockIn.getTime();
          const diffMinutes = diffMs / (1000 * 60); // Use decimal minutes for accuracy
          totalWorkMinutes += Math.max(0, diffMinutes);
        } else if (cycle.clockIn && !cycle.clockOut) {
          // Currently clocked in - calculate from clock in to now (clamped to schedule)
          const clockIn = new Date(cycle.clockIn);

          const scheduleDateStr = String(scheduleToUse.shiftDate).split("T")[0];
          const [year, month, day] = scheduleDateStr.split('-').map(Number);
          const scheduleDate = new Date(year, month - 1, day);

          const startTimeStr = extractTime(scheduleToUse.startTime);
          const endTimeStr = extractTime(scheduleToUse.endTime);
          const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
          const [endHours, endMinutes] = endTimeStr.split(':').map(Number);

          const scheduleStart = new Date(scheduleDate);
          scheduleStart.setHours(startHours, startMinutes, 0, 0);

          const scheduleEnd = new Date(scheduleDate);
          scheduleEnd.setHours(endHours, endMinutes, 0, 0);

          // Handle overnight shifts
          if (scheduleEnd <= scheduleStart) {
            scheduleEnd.setDate(scheduleEnd.getDate() + 1);
          }

          // Clamp clock in to schedule start (if before)
          let effectiveClockIn = clockIn;
          if (effectiveClockIn < scheduleStart) {
            effectiveClockIn = scheduleStart;
          }

          // Clamp current time to schedule end (if after)
          let effectiveNow = currentTime;
          if (effectiveNow > scheduleEnd) {
            effectiveNow = scheduleEnd;
          }

          const diffMs = effectiveNow.getTime() - effectiveClockIn.getTime();
          const diffMinutes = diffMs / (1000 * 60); // Use decimal minutes for accuracy
          totalWorkMinutes += Math.max(0, diffMinutes);
        }
      });
    });

    // Subtract break time (also within interval)
    let totalBreakMinutes = 0;
    relevantTimesheets.forEach((timesheet: Timesheet) => {
      if (timesheet.breakClockInAndOutTime && Array.isArray(timesheet.breakClockInAndOutTime)) {
        timesheet.breakClockInAndOutTime.forEach((breakCycle: BreakCycle) => {
          const breakIn = new Date(breakCycle.breakClockIn);
          // Only count breaks within schedule interval
          if (isTimeWithinScheduleInterval(breakIn, scheduleToUse)) {
            if (breakCycle.breakClockIn && breakCycle.breakClockOut) {
              const breakOut = new Date(breakCycle.breakClockOut);
              const diffMs = breakOut.getTime() - breakIn.getTime();
              const diffMinutes = diffMs / (1000 * 60);
              totalBreakMinutes += Math.max(0, diffMinutes);
            } else if (breakCycle.breakClockIn && !breakCycle.breakClockOut) {
              // Currently on break
              const now = currentTime;
              const diffMs = now.getTime() - breakIn.getTime();
              const diffMinutes = diffMs / (1000 * 60);
              totalBreakMinutes += Math.max(0, diffMinutes);
            }
          }
        });
      } else if (timesheet.breakClockInTime) {
        const breakIn = new Date(timesheet.breakClockInTime);
        // Only count breaks within schedule interval
        if (isTimeWithinScheduleInterval(breakIn, scheduleToUse)) {
          if (timesheet.breakClockOutTime) {
            const breakOut = new Date(timesheet.breakClockOutTime);
            const diffMs = breakOut.getTime() - breakIn.getTime();
            const diffMinutes = diffMs / (1000 * 60);
            totalBreakMinutes += Math.max(0, diffMinutes);
          } else {
            // Currently on break
            const now = currentTime;
            const diffMs = now.getTime() - breakIn.getTime();
            const diffMinutes = diffMs / (1000 * 60);
            totalBreakMinutes += Math.max(0, diffMinutes);
          }
        }
      }
    });

    totalWorkMinutes = Math.max(0, totalWorkMinutes - totalBreakMinutes);

    // Convert to hours and round to 2 decimal places
    return parseFloat((totalWorkMinutes / 60).toFixed(2));
  };

  // Calculate work hours - recalculate when timesheets, schedule, or current time changes
  // Use useMemo to recalculate when dependencies change
  const workHoursInInterval = selectedEmployee && scheduleToUse ? calculateWorkTimeInInterval() : 0;

  // Get work countdown (paused when on break, resumed when break ends)
  const getWorkCountdown = () => {
    if (!scheduleToUse) return null;

    // If on break and clocked in, return paused countdown (frozen)
    if (isOnBreak && isClockedIn && workCountdownPausedAt) {
      return workCountdownPausedAt;
    }

    // If just ended break and we have paused countdown, use it (will be updated by useEffect)
    if (!isOnBreak && isClockedIn && workCountdownPausedAt && breakStartTime === null) {
      return workCountdownPausedAt;
    }

    // Get schedule date in local time
    const scheduleDate = scheduleToUse.shiftDate
      ? parseLocalDate(String(scheduleToUse.shiftDate))
      : new Date();

    // Parse endTime - handle both DateTime objects and ISO strings
    let scheduledEndTime: Date;

    const endTimeValue = scheduleToUse.endTime;
    if (endTimeValue instanceof Date || (typeof endTimeValue === 'object' && endTimeValue !== null && 'getHours' in endTimeValue)) {
      const endDate = endTimeValue as Date;
      scheduledEndTime = new Date(
        scheduleDate.getFullYear(),
        scheduleDate.getMonth(),
        scheduleDate.getDate(),
        endDate.getHours(),
        endDate.getMinutes(),
        endDate.getSeconds(),
        endDate.getMilliseconds()
      );
    } else {
      const endTimeStr = typeof endTimeValue === 'string'
        ? endTimeValue
        : String(endTimeValue);
      scheduledEndTime = parseLocalTime(endTimeStr, scheduleDate);
    }

    // Use current local time (no conversion)
    const now = new Date(
      currentTime.getFullYear(),
      currentTime.getMonth(),
      currentTime.getDate(),
      currentTime.getHours(),
      currentTime.getMinutes(),
      currentTime.getSeconds(),
      currentTime.getMilliseconds()
    );

    // Calculate difference in milliseconds
    const diff = scheduledEndTime.getTime() - now.getTime();

    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, isOverdue: true };
    }

    // Calculate hours, minutes, seconds correctly
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { hours, minutes, seconds, isOverdue: false };
  };

  // Get break countdown (only when on break)
  const getBreakCountdown = () => {
    if (!isOnBreak || !breakClockInTime) return null;

    if (!scheduledBreakMinutes || scheduledBreakMinutes <= 0) {
      return null;
    }

    // Calculate total used break time from ALL timesheets for the day (not just current)
    // This ensures we account for breaks taken before clocking out and starting a new break
    let totalUsedBreakSeconds = 0;

    // Check all timesheets for the day, not just the current one
    const currentBreakInTime = new Date(breakClockInTime);
    allTodayTimesheets.forEach((timesheet: Timesheet) => {
      // Calculate from JSON array structure (preferred method)
      if (timesheet.breakClockInAndOutTime && Array.isArray(timesheet.breakClockInAndOutTime)) {
        timesheet.breakClockInAndOutTime.forEach((breakCycle: BreakCycle) => {
          if (breakCycle.breakClockIn && breakCycle.breakClockOut) {
            // Completed break cycle - check if it's the current break
            const cycleBreakIn = new Date(breakCycle.breakClockIn);
            const isCurrentBreak = Math.abs(cycleBreakIn.getTime() - currentBreakInTime.getTime()) < 1000; // Within 1 second

            if (!isCurrentBreak) {
              // This is a completed break from a previous timesheet or earlier break
              const breakIn = new Date(breakCycle.breakClockIn);
              const breakOut = new Date(breakCycle.breakClockOut);
              const diffMs = breakOut.getTime() - breakIn.getTime();
              const diffSeconds = Math.floor(diffMs / 1000);
              totalUsedBreakSeconds += Math.max(0, diffSeconds);
            }
          }
          // Don't count current break (the one we're on) - it will be added separately below
        });
      } else if (timesheet.breakClockInTime && timesheet.breakClockOutTime) {
        // Legacy: completed break - only count if it's not the current break
        // Check if this is the current break by comparing breakClockInTime
        const timesheetBreakIn = new Date(timesheet.breakClockInTime);
        const isCurrentBreak = Math.abs(timesheetBreakIn.getTime() - currentBreakInTime.getTime()) < 1000; // Within 1 second

        if (!isCurrentBreak) {
          // This is a completed break from a previous timesheet or earlier break
          const breakIn = new Date(timesheet.breakClockInTime);
          const breakOut = new Date(timesheet.breakClockOutTime);
          const diffMs = breakOut.getTime() - breakIn.getTime();
          const diffSeconds = Math.floor(diffMs / 1000);
          totalUsedBreakSeconds += Math.max(0, diffSeconds);
        }
      }
    });

    // Get total scheduled break time in seconds
    const scheduledBreakSeconds = scheduledBreakMinutes * 60;

    // Calculate current break elapsed time in seconds
    const breakIn = new Date(breakClockInTime);
    const now = currentTime;
    const currentBreakElapsedSeconds = Math.floor((now.getTime() - breakIn.getTime()) / 1000);

    // Total used = completed breaks + current break elapsed
    const totalUsedSeconds = totalUsedBreakSeconds + currentBreakElapsedSeconds;

    // Remaining seconds = scheduled - total used
    const remainingSeconds = Math.max(0, scheduledBreakSeconds - totalUsedSeconds);

    if (remainingSeconds <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, isOverdue: true };
    }

    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    return { hours, minutes, seconds, isOverdue: false };
  };

  // Get scheduled break duration in minutes (directly from breakTime field)
  const getScheduledBreakDuration = (): number | null => {
    if (!scheduleToUse || !scheduleToUse.breakTime) {
      return null;
    }

    // breakTime is already in minutes, just return it
    const breakTime = typeof scheduleToUse.breakTime === 'number'
      ? scheduleToUse.breakTime
      : parseInt(String(scheduleToUse.breakTime), 10);

    return !isNaN(breakTime) && breakTime > 0 ? breakTime : null;
  };

  const scheduledBreakMinutes = getScheduledBreakDuration();

  const countdown = isOnBreak ? getBreakCountdown() : getWorkCountdown();
  const hasSchedule = scheduleToUse !== null;

  // Update countdown every second
  useEffect(() => {
    if (selectedEmployee && (countdown || isOnBreak)) {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [selectedEmployee, countdown, isOnBreak]);

  // Break countdown is now calculated in real-time in getBreakCountdown(), no need for interval update

  // Auto clock out when break time finishes (only if already clocked in, not when trying to clock in)
  useEffect(() => {
    // IMPORTANT: Do NOT auto clock out if break time is overdue
    // When break time is overdue, breaks should not be started, and if one exists, it should be manually ended
    // This prevents the cycle: clock in -> break starts (shouldn't happen) -> auto clock out

    // Check if break time is overdue first - if so, don't do anything automatically
    const breakTimeOverdue = isBreakTimeOverdue();

    // Only auto clock out if:
    // 1. On break
    // 2. Already clocked in (not trying to clock in)
    // 3. Break time is NOT overdue (if overdue, don't auto clock out)
    // 4. Break countdown shows overdue (current break exceeded time)
    // 5. Not currently processing any action or clocking in
    if (isOnBreak && breakClockInTime && scheduledBreakMinutes && currentTimesheet && isClockedIn &&
      !breakTimeOverdue && // CRITICAL: Don't auto clock out if break time is overdue
      !autoClockOutProcessedRef.current && !isProcessingRef.current && !clockingIn && !isClockInInProgressRef.current) {
      const breakCountdown = getBreakCountdown();
      // Only auto clock out if break countdown shows overdue (current break exceeded time)
      // AND break time is not overdue (meaning there was time available when break started)
      if (breakCountdown && (breakCountdown as any).isOverdue) {
        // Break time finished, auto clock out (only once)
        autoClockOutProcessedRef.current = true;
        handleClockOut().finally(() => {
          // Reset after a delay to allow for future auto clock-outs
          setTimeout(() => {
            autoClockOutProcessedRef.current = false;
          }, 5000);
        });
      }
    } else if (!isOnBreak) {
      // Reset when not on break
      autoClockOutProcessedRef.current = false;
    }
  }, [currentTime, isOnBreak, breakClockInTime, scheduledBreakMinutes, currentTimesheet, isClockedIn, clockingIn]);

  // Break countdown is now calculated in real-time in getBreakCountdown() from actual break times
  // No need for initialization effect - it calculates directly from scheduled time and used time

  // Store work countdown when break starts
  useEffect(() => {
    if (isOnBreak && !workCountdownPausedAt && isClockedIn) {
      const pausedCountdown = getWorkCountdown();
      if (pausedCountdown && !(pausedCountdown as any).isOverdue) {
        setWorkCountdownPausedAt(pausedCountdown as { hours: number; minutes: number; seconds: number; isOverdue: boolean });
        setBreakStartTime(new Date());
      }
    }
  }, [isOnBreak, isClockedIn]);

  // Update paused countdown when not on break (resume counting)
  useEffect(() => {
    if (!isOnBreak && workCountdownPausedAt && isClockedIn && breakStartTime === null) {
      // Countdown naturally from paused value
      const timer = setInterval(() => {
        setWorkCountdownPausedAt((prev) => {
          if (!prev) return null;

          let totalSeconds = prev.hours * 3600 + prev.minutes * 60 + prev.seconds;
          if (totalSeconds <= 0) {
            return { hours: 0, minutes: 0, seconds: 0, isOverdue: true };
          }

          totalSeconds -= 1; // Decrease by 1 second
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;

          return { hours, minutes, seconds, isOverdue: false };
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOnBreak, workCountdownPausedAt, isClockedIn, breakStartTime]);

  // Calculate used break time in minutes (accumulates from all break cycles)
  const getUsedBreakTime = (): number => {
    if (!currentTimesheet) return 0;

    let totalUsedSeconds = 0;

    // Calculate from JSON array structure (preferred method)
    if (currentTimesheet.breakClockInAndOutTime && Array.isArray(currentTimesheet.breakClockInAndOutTime)) {
      currentTimesheet.breakClockInAndOutTime.forEach((breakCycle: BreakCycle) => {
        if (breakCycle.breakClockIn && breakCycle.breakClockOut) {
          // Completed break cycle
          const breakIn = new Date(breakCycle.breakClockIn);
          const breakOut = new Date(breakCycle.breakClockOut);
          const diffMs = breakOut.getTime() - breakIn.getTime();
          const diffSeconds = Math.floor(diffMs / 1000);
          totalUsedSeconds += Math.max(0, diffSeconds);
        } else if (breakCycle.breakClockIn && !breakCycle.breakClockOut) {
          // Currently on break - calculate from break in to now
          const breakIn = new Date(breakCycle.breakClockIn);
          const now = new Date();
          const diffMs = now.getTime() - breakIn.getTime();
          const diffSeconds = Math.floor(diffMs / 1000);
          totalUsedSeconds += Math.max(0, diffSeconds);
        }
      });
    } else {
      // Fallback to legacy fields
      if (currentTimesheet.breakClockInTime && currentTimesheet.breakClockOutTime) {
        // Completed break
        const breakIn = new Date(currentTimesheet.breakClockInTime);

        const breakOut = new Date(currentTimesheet.breakClockOutTime);
        const diffMs = breakOut.getTime() - breakIn.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        totalUsedSeconds += Math.max(0, diffSeconds);
      } else if (currentTimesheet.breakClockInTime && !currentTimesheet.breakClockOutTime) {
        // Currently on break
        const breakIn = new Date(currentTimesheet.breakClockInTime);
        const now = new Date();
        const diffMs = now.getTime() - breakIn.getTime();
        const diffSeconds = Math.floor(diffMs / 1000);
        totalUsedSeconds += Math.max(0, diffSeconds);
      }
    }

    // Convert seconds to minutes (round up to ensure we don't lose time)
    return Math.ceil(totalUsedSeconds / 60);
  };

  // Calculate total used break time from timesheets with the SAME scheduleId (same interval)
  // Each schedule interval has its own break time allocation
  const getTotalUsedBreakTime = (): number => {
    let totalUsedBreakSeconds = 0;
    const currentScheduleId = scheduleToUse?.id;

    // Only count break time from timesheets with the same scheduleId
    allTodayTimesheets.forEach((timesheet: Timesheet) => {
      // Skip if scheduleId doesn't match (different interval)
      if (currentScheduleId && timesheet.scheduleId !== currentScheduleId) {
        return;
      }
      if (timesheet.breakClockInAndOutTime && Array.isArray(timesheet.breakClockInAndOutTime)) {
        timesheet.breakClockInAndOutTime.forEach((breakCycle: BreakCycle) => {
          if (breakCycle.breakClockIn && breakCycle.breakClockOut) {
            // Completed break cycle
            const breakIn = new Date(breakCycle.breakClockIn);
            const breakOut = new Date(breakCycle.breakClockOut);
            const diffMs = breakOut.getTime() - breakIn.getTime();
            const diffSeconds = Math.floor(diffMs / 1000);
            totalUsedBreakSeconds += Math.max(0, diffSeconds);
          } else if (breakCycle.breakClockIn && !breakCycle.breakClockOut) {
            // Currently on break - calculate from break in to now
            const breakIn = new Date(breakCycle.breakClockIn);
            const now = currentTime;
            const diffMs = now.getTime() - breakIn.getTime();
            const diffSeconds = Math.floor(diffMs / 1000);
            totalUsedBreakSeconds += Math.max(0, diffSeconds);
          }
        });
      } else if (timesheet.breakClockInTime) {
        if (timesheet.breakClockOutTime) {
          // Legacy: completed break
          const breakIn = new Date(timesheet.breakClockInTime);
          const breakOut = new Date(timesheet.breakClockOutTime);
          const diffMs = breakOut.getTime() - breakIn.getTime();
          const diffSeconds = Math.floor(diffMs / 1000);
          totalUsedBreakSeconds += Math.max(0, diffSeconds);
        } else {
          // Legacy: currently on break
          const breakIn = new Date(timesheet.breakClockInTime);
          const now = currentTime;
          const diffMs = now.getTime() - breakIn.getTime();
          const diffSeconds = Math.floor(diffMs / 1000);
          totalUsedBreakSeconds += Math.max(0, diffSeconds);
        }
      }
    });

    // Convert seconds to minutes (round up to ensure we don't lose time)
    return Math.ceil(totalUsedBreakSeconds / 60);
  };

  const usedBreakMinutes = getUsedBreakTime();
  // Stop break countdown when clocked in
  const remainingBreakMinutes = (scheduledBreakMinutes !== null && !isClockedIn)
    ? Math.max(0, scheduledBreakMinutes - usedBreakMinutes)
    : (scheduledBreakMinutes !== null && isClockedIn)
      ? null // Don't show remaining when clocked in
      : null;

  // Check if start time has been reached - compare full Date objects (date + time)
  const isStartTimeReached = (): boolean => {
    if (!scheduleToUse) return false;

    try {
      // Get schedule date in local time
      const scheduleDate = scheduleToUse.shiftDate
        ? parseLocalDate(String(scheduleToUse.shiftDate))
        : new Date();

      // Parse startTime - handle both DateTime objects and ISO strings
      let scheduledStartTime: Date;

      const startTimeValue = scheduleToUse.startTime;
      if (startTimeValue instanceof Date || (typeof startTimeValue === 'object' && startTimeValue !== null && 'getHours' in startTimeValue)) {
        const startDate = startTimeValue as Date;
        scheduledStartTime = new Date(
          scheduleDate.getFullYear(),
          scheduleDate.getMonth(),
          scheduleDate.getDate(),
          startDate.getHours(),
          startDate.getMinutes(),
          startDate.getSeconds(),
          startDate.getMilliseconds()
        );
      } else {
        const startTimeStr = typeof startTimeValue === 'string'
          ? startTimeValue
          : String(startTimeValue);
        scheduledStartTime = parseLocalTime(startTimeStr, scheduleDate);
      }

      // Get current time as a Date object
      const now = new Date(
        currentTime.getFullYear(),
        currentTime.getMonth(),
        currentTime.getDate(),
        currentTime.getHours(),
        currentTime.getMinutes(),
        currentTime.getSeconds(),
        currentTime.getMilliseconds()
      );

      // Compare: if current time >= scheduled start time, it's reached
      return now.getTime() >= scheduledStartTime.getTime();
    } catch (error) {
      console.error("Error checking if start time is reached:", error);
      return false;
    }
  };

  // Check if schedule is overdue - compare full Date objects (date + time)
  const isScheduledTimeOverdue = (): boolean => {
    if (!scheduleToUse) return false;

    try {
      // Get schedule date in local time
      const scheduleDate = scheduleToUse.shiftDate
        ? parseLocalDate(String(scheduleToUse.shiftDate))
        : new Date();

      // Parse endTime - handle both DateTime objects and ISO strings
      let scheduledEndTime: Date;

      const endTimeValue = scheduleToUse.endTime;
      if (endTimeValue instanceof Date || (typeof endTimeValue === 'object' && endTimeValue !== null && 'getHours' in endTimeValue)) {
        const endDate = endTimeValue as Date;
        scheduledEndTime = new Date(
          scheduleDate.getFullYear(),
          scheduleDate.getMonth(),
          scheduleDate.getDate(),
          endDate.getHours(),
          endDate.getMinutes(),
          endDate.getSeconds(),
          endDate.getMilliseconds()
        );
      } else {
        const endTimeStr = typeof endTimeValue === 'string'
          ? endTimeValue
          : String(endTimeValue);
        scheduledEndTime = parseLocalTime(endTimeStr, scheduleDate);
      }

      // Get current time as a Date object
      const now = new Date(
        currentTime.getFullYear(),
        currentTime.getMonth(),
        currentTime.getDate(),
        currentTime.getHours(),
        currentTime.getMinutes(),
        currentTime.getSeconds(),
        currentTime.getMilliseconds()
      );

      // Compare: if current time > scheduled end time, it's overdue
      return now.getTime() > scheduledEndTime.getTime();
    } catch (error) {
      console.error("Error checking if schedule is overdue:", error);
      return false;
    }
  };

  const isOverdue = isScheduledTimeOverdue();
  const startTimeReached = isStartTimeReached();
  const canClockIn = hasSchedule && startTimeReached && !isClockedIn;

  // Get scheduled start time for display
  const getScheduledStartTime = (): string | null => {
    if (!scheduleToUse) return null;

    try {
      // Get schedule date in local time
      const scheduleDate = scheduleToUse.shiftDate
        ? parseLocalDate(String(scheduleToUse.shiftDate))
        : new Date();

      // Parse startTime - handle both DateTime objects and ISO strings
      let scheduledStartTime: Date;

      const startTimeValue = scheduleToUse.startTime;
      if (startTimeValue instanceof Date || (typeof startTimeValue === 'object' && startTimeValue !== null && 'getHours' in startTimeValue)) {
        const startDate = startTimeValue as Date;
        scheduledStartTime = new Date(
          scheduleDate.getFullYear(),
          scheduleDate.getMonth(),
          scheduleDate.getDate(),
          startDate.getHours(),
          startDate.getMinutes(),
          startDate.getSeconds(),
          startDate.getMilliseconds()
        );
      } else {
        const startTimeStr = typeof startTimeValue === 'string'
          ? startTimeValue
          : String(startTimeValue);
        scheduledStartTime = parseLocalTime(startTimeStr, scheduleDate);
      }

      // Format as "h:mm a" (e.g., "9:00 AM")
      return format(scheduledStartTime, "h:mm a");
    } catch (error) {
      console.error("Error getting scheduled start time:", error);
      return null;
    }
  };

  const scheduledStartTimeDisplay = getScheduledStartTime();

  // Helper function to find next schedule
  const findNextSchedule = (): Schedule | null => {
    if (allTodaySchedules.length === 0 || !scheduleToUse) return null;

    // Sort schedules by start time
    const sortedSchedules = [...allTodaySchedules].sort((a, b) => {
      const aStart = extractTime(a.startTime);
      const bStart = extractTime(b.startTime);
      const [aHours, aMinutes] = aStart.split(':').map(Number);
      const [bHours, bMinutes] = bStart.split(':').map(Number);
      const aTotal = aHours * 60 + aMinutes;
      const bTotal = bHours * 60 + bMinutes;
      return aTotal - bTotal;
    });

    // Find current schedule index
    const currentIndex = sortedSchedules.findIndex(s => s.id === scheduleToUse.id);
    if (currentIndex === -1 || currentIndex === sortedSchedules.length - 1) {
      return null; // No next schedule
    }

    // Get next schedule
    return sortedSchedules[currentIndex + 1];
  };

  // Get next schedule's clock-in time
  const getNextScheduleClockInTime = (): string | null => {
    const nextSchedule = findNextSchedule();
    if (!nextSchedule) return null;

    try {
      // Get schedule date in local time
      const scheduleDate = nextSchedule.shiftDate
        ? parseLocalDate(String(nextSchedule.shiftDate))
        : new Date();

      // Parse startTime - handle both DateTime objects and ISO strings
      let scheduledStartTime: Date;

      const startTimeValue = nextSchedule.startTime;
      if (startTimeValue instanceof Date || (typeof startTimeValue === 'object' && startTimeValue !== null && 'getHours' in startTimeValue)) {
        const startDate = startTimeValue as Date;
        scheduledStartTime = new Date(
          scheduleDate.getFullYear(),
          scheduleDate.getMonth(),
          scheduleDate.getDate(),
          startDate.getHours(),
          startDate.getMinutes(),
          startDate.getSeconds(),
          startDate.getMilliseconds()
        );
      } else {
        const startTimeStr = typeof startTimeValue === 'string'
          ? startTimeValue
          : String(startTimeValue);
        scheduledStartTime = parseLocalTime(startTimeStr, scheduleDate);
      }

      // Format as "h:mm a" (e.g., "9:00 AM")
      return format(scheduledStartTime, "h:mm a");
    } catch (error) {
      console.error("Error getting next schedule clock-in time:", error);
      return null;
    }
  };

  const nextScheduleClockInTime = getNextScheduleClockInTime();

  // Background polling function to check and auto clock-out when schedule ends
  // This runs independently and works even when component is not actively updating
  // It fetches fresh data each time to ensure accuracy
  const backgroundAutoClockOutCheck = async () => {
    // Only check if we have a selected employee
    if (!selectedEmployeeId) return;

    // Prevent multiple simultaneous checks
    if (isProcessingRef.current || scheduleOverdueAutoClockOutRef.current) return;

    try {
      // Fetch fresh timesheet status to get latest clock in/out state
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const timesheetResponse = await api.get("/hr/timesheets/get", {
        params: {
          employeeId: selectedEmployeeId,
          startDate: today.toISOString(),
          endDate: tomorrow.toISOString(),
        },
      });

      if (!timesheetResponse.data.success) return;

      const timesheets = timesheetResponse.data.data || [];

      // Find open timesheet (clocked in but not clocked out)
      const openTimesheet = timesheets.find((ts: Timesheet) => {
        if (ts.status !== "pending") return false;

        // Check JSON array structure
        if (ts.clockInAndOutTime && Array.isArray(ts.clockInAndOutTime) && ts.clockInAndOutTime.length > 0) {
          const lastCycle = ts.clockInAndOutTime[ts.clockInAndOutTime.length - 1];
          return lastCycle.clockIn && !lastCycle.clockOut;
        }

        // Fallback to legacy fields
        return !!(ts.clockInTime && !ts.clockOutTime);
      });

      if (!openTimesheet) return; // Not clocked in

      // Fetch fresh schedule data
      const todayStr = format(today, "yyyy-MM-dd");
      const scheduleResponse = await api.get("/hr/schedules/get", {
        params: {
          employeeId: selectedEmployeeId,
          startDate: todayStr,
          endDate: todayStr,
          status: "scheduled",
        },
      });

      if (!scheduleResponse.data.success) return;

      const schedules = scheduleResponse.data.data || [];
      const todaySchedules = schedules.filter((s: Schedule) => {
        const scheduleDate = new Date(s.shiftDate);
        return format(scheduleDate, "yyyy-MM-dd") === todayStr;
      });

      if (todaySchedules.length === 0) return; // No schedule

      // Sort schedules by start time to find the appropriate one
      const sortedSchedules = [...todaySchedules].sort((a, b) => {
        const aStart = extractTime(a.startTime);
        const bStart = extractTime(b.startTime);
        const [aHours, aMinutes] = aStart.split(':').map(Number);
        const [bHours, bMinutes] = bStart.split(':').map(Number);
        const aTotal = aHours * 60 + aMinutes;
        const bTotal = bHours * 60 + bMinutes;
        return aTotal - bTotal;
      });

      // Find the current active schedule (one that hasn't ended yet, or the last one)
      const now = new Date();
      let activeSchedule = sortedSchedules[sortedSchedules.length - 1]; // Default to last schedule

      for (const schedule of sortedSchedules) {
        const scheduleDateStr = String(schedule.shiftDate).split("T")[0];
        const [year, month, day] = scheduleDateStr.split('-').map(Number);
        const scheduleDate = new Date(year, month - 1, day);

        const endTimeStr = extractTime(schedule.endTime);
        const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
        const scheduleEnd = new Date(scheduleDate);
        scheduleEnd.setHours(endHours, endMinutes, 0, 0);

        // If schedule hasn't ended yet, use it
        if (now <= scheduleEnd) {
          activeSchedule = schedule;
          break;
        }
      }

      if (!activeSchedule) return;

      // Get schedule date in local time
      const scheduleDate = activeSchedule.shiftDate
        ? parseLocalDate(String(activeSchedule.shiftDate))
        : new Date();

      // Parse endTime
      let scheduledEndTime: Date;
      const endTimeValue = activeSchedule.endTime;
      if (endTimeValue instanceof Date || (typeof endTimeValue === 'object' && endTimeValue !== null && 'getHours' in endTimeValue)) {
        const endDate = endTimeValue as Date;
        scheduledEndTime = new Date(
          scheduleDate.getFullYear(),
          scheduleDate.getMonth(),
          scheduleDate.getDate(),
          endDate.getHours(),
          endDate.getMinutes(),
          endDate.getSeconds(),
          endDate.getMilliseconds()
        );
      } else {
        const endTimeStr = typeof endTimeValue === 'string'
          ? endTimeValue
          : String(endTimeValue);
        scheduledEndTime = parseLocalTime(endTimeStr, scheduleDate);
      }

      // Check if schedule end time has passed (with 1 minute buffer to avoid race conditions)
      const oneMinuteInMs = 60 * 1000;
      const isScheduleOverdue = now.getTime() > (scheduledEndTime.getTime() + oneMinuteInMs);

      // Only auto clock out if schedule is overdue
      if (isScheduleOverdue && !scheduleOverdueAutoClockOutRef.current) {
        scheduleOverdueAutoClockOutRef.current = true;

        // Find next schedule before clocking out
        const findNextSchedule = () => {
          if (sortedSchedules.length === 0 || !activeSchedule) return null;

          // Find current schedule index
          const currentIndex = sortedSchedules.findIndex(s => s.id === activeSchedule.id);
          if (currentIndex === -1 || currentIndex === sortedSchedules.length - 1) {
            return null; // No next schedule
          }

          // Get next schedule
          return sortedSchedules[currentIndex + 1];
        };

        const nextSchedule = findNextSchedule();

        // Auto clock out
        try {
          await api.put(`/hr/timesheets/update/${openTimesheet.id}`, {
            clockOutTime: new Date().toISOString(),
          });

          // Refresh timesheet status
          await checkTimesheetStatus(selectedEmployeeId, false);

          // Switch to next schedule if available
          if (nextSchedule) {
            // Update todaySchedule state to trigger UI update
            setTodaySchedule(nextSchedule);

            // Get formatted clock-in time for next schedule
            const nextScheduleDate = nextSchedule.shiftDate
              ? parseLocalDate(String(nextSchedule.shiftDate))
              : new Date();

            let nextScheduledStartTime: Date;
            const nextStartTimeValue = nextSchedule.startTime;
            if (nextStartTimeValue instanceof Date || (typeof nextStartTimeValue === 'object' && nextStartTimeValue !== null && 'getHours' in nextStartTimeValue)) {
              const nextStartDate = nextStartTimeValue as Date;
              nextScheduledStartTime = new Date(
                nextScheduleDate.getFullYear(),
                nextScheduleDate.getMonth(),
                nextScheduleDate.getDate(),
                nextStartDate.getHours(),
                nextStartDate.getMinutes(),
                nextStartDate.getSeconds(),
                nextStartDate.getMilliseconds()
              );
            } else {
              const nextStartTimeStr = typeof nextStartTimeValue === 'string'
                ? nextStartTimeValue
                : String(nextStartTimeValue);
              nextScheduledStartTime = parseLocalTime(nextStartTimeStr, nextScheduleDate);
            }

            const nextClockInTime = format(nextScheduledStartTime, "h:mm a");
            toast.success(`Schedule ended. Auto clocked out. Next schedule - Clock in by: ${nextClockInTime}`);
          } else {
            toast.success("Schedule ended. Auto clocked out. No schedule found");
          }
        } catch (error: any) {
          console.error("Error auto clocking out:", error);
          // Don't show error toast for background operations to avoid spam
        } finally {
          // Reset after a delay to allow for future checks
          setTimeout(() => {
            scheduleOverdueAutoClockOutRef.current = false;
          }, 5000);
        }
      }
    } catch (error) {
      console.error("Error in background auto clock-out check:", error);
      // Silently fail - don't spam errors for background operations
    }
  };

  // Background polling interval - runs every 30 seconds to check for overdue schedules
  // This ensures auto clock-out works even when component is not actively updating
  useEffect(() => {
    // Only start polling if we have a selected employee
    if (!selectedEmployeeId) return;

    // Run initial check after a short delay
    const initialTimeout = setTimeout(() => {
      backgroundAutoClockOutCheck();
    }, 2000); // Wait 2 seconds before first check

    // Set up interval to check every 30 seconds
    const backgroundInterval = setInterval(() => {
      backgroundAutoClockOutCheck();
    }, 30000); // Check every 30 seconds

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(backgroundInterval);
    };
  }, [selectedEmployeeId]); // Only depend on selectedEmployeeId to avoid recreating interval

  // Auto clock out when schedule is overdue (schedule end time has passed)
  // This is the immediate check that runs when currentTime updates
  useEffect(() => {
    // Only auto clock out if:
    // 1. Schedule is overdue (end time has passed)
    // 2. Employee is clocked in
    // 3. Not currently processing any action
    // 4. Not already processed this auto clock-out
    if (isOverdue && isClockedIn && currentTimesheet &&
      !scheduleOverdueAutoClockOutRef.current && !isProcessingRef.current && !clockingOut && !clockingIn && !isClockInInProgressRef.current) {
      // Schedule is overdue, automatically clock out
      scheduleOverdueAutoClockOutRef.current = true;

      // Find next schedule before clocking out
      const nextSchedule = findNextSchedule();

      handleClockOut().finally(() => {
        // Switch to next schedule if available
        if (nextSchedule) {
          setTodaySchedule(nextSchedule);
          const nextClockInTime = getNextScheduleClockInTime();
          if (nextClockInTime) {
            toast.success(`Schedule ended. Auto clocked out. Next schedule - Clock in by: ${nextClockInTime}`);
          } else {
            const nextStart = extractTime(nextSchedule.startTime);
            const nextEnd = extractTime(nextSchedule.endTime);
            toast.success(`Switched to next schedule: ${nextStart} - ${nextEnd}`);
          }
        } else {
          toast.success("Schedule ended. Auto clocked out. No schedule found");
        }

        // Reset after a delay to allow for future checks
        setTimeout(() => {
          scheduleOverdueAutoClockOutRef.current = false;
        }, 5000);
      });
    } else if (!isOverdue) {
      // Reset when schedule is not overdue
      scheduleOverdueAutoClockOutRef.current = false;
    }
  }, [currentTime, isOverdue, isClockedIn, currentTimesheet, clockingOut, clockingIn, allTodaySchedules, scheduleToUse]);

  // Check if employee has break time allocated in schedule
  const hasBreakTimeAllocated = scheduledBreakMinutes !== null && scheduledBreakMinutes > 0;

  // Check if break time is overdue (all used up) using timesheets with the SAME scheduleId
  // Each schedule interval has its own break time allocation
  const isBreakTimeOverdue = (): boolean => {
    if (!scheduledBreakMinutes || scheduledBreakMinutes <= 0) {
      return false;
    }

    // Calculate total used break time from timesheets with the same scheduleId only
    let totalUsedBreakSeconds = 0;
    const currentScheduleId = scheduleToUse?.id;

    allTodayTimesheets.forEach((timesheet: Timesheet) => {
      // Skip if scheduleId doesn't match (different interval)
      if (currentScheduleId && timesheet.scheduleId !== currentScheduleId) {
        return;
      }
      if (timesheet.breakClockInAndOutTime && Array.isArray(timesheet.breakClockInAndOutTime)) {
        timesheet.breakClockInAndOutTime.forEach((breakCycle: BreakCycle) => {
          if (breakCycle.breakClockIn && breakCycle.breakClockOut) {
            // Completed break cycle
            const breakIn = new Date(breakCycle.breakClockIn);
            const breakOut = new Date(breakCycle.breakClockOut);
            const diffMs = breakOut.getTime() - breakIn.getTime();
            const diffSeconds = Math.floor(diffMs / 1000);
            totalUsedBreakSeconds += Math.max(0, diffSeconds);
          } else if (breakCycle.breakClockIn && !breakCycle.breakClockOut) {
            // Currently on break - calculate from break in to now
            const breakIn = new Date(breakCycle.breakClockIn);
            const now = currentTime;
            const diffMs = now.getTime() - breakIn.getTime();
            const diffSeconds = Math.floor(diffMs / 1000);
            totalUsedBreakSeconds += Math.max(0, diffSeconds);
          }
        });
      } else if (timesheet.breakClockInTime) {
        if (timesheet.breakClockOutTime) {
          // Legacy: completed break
          const breakIn = new Date(timesheet.breakClockInTime);
          const breakOut = new Date(timesheet.breakClockOutTime);
          const diffMs = breakOut.getTime() - breakIn.getTime();
          const diffSeconds = Math.floor(diffMs / 1000);
          totalUsedBreakSeconds += Math.max(0, diffSeconds);
        } else {
          // Legacy: currently on break
          const breakIn = new Date(timesheet.breakClockInTime);
          const now = currentTime;
          const diffMs = now.getTime() - breakIn.getTime();
          const diffSeconds = Math.floor(diffMs / 1000);
          totalUsedBreakSeconds += Math.max(0, diffSeconds);
        }
      }
    });

    const scheduledBreakSeconds = scheduledBreakMinutes * 60;
    const remainingBreakSeconds = scheduledBreakSeconds - totalUsedBreakSeconds;

    // Break time is overdue if all time has been used
    return remainingBreakSeconds <= 0;
  };

  const breakTimeOverdue = isBreakTimeOverdue();

  // Allow break time if: schedule has break time and remaining time > 0
  const hasBreakTimeRemaining = hasBreakTimeAllocated && (remainingBreakMinutes === null || remainingBreakMinutes > 0) && !breakTimeOverdue;
  // Can start break only if:
  // - Not already on break
  // - Has break time allocated in schedule (scheduledBreakMinutes > 0)
  // - Break time is NOT overdue (all break time has been used) - this prevents starting break when overdue
  // - Has break time remaining (if clocked in) or has break time allocated (if not clocked in, but still not overdue)
  // - If there's a schedule: start time is reached and not overdue
  // Note: When break time is overdue, the button is disabled and break cannot be started
  const canStartBreak = !isOnBreak && hasBreakTimeAllocated && !breakTimeOverdue &&
    (isClockedIn ? hasBreakTimeRemaining : true) &&
    hasSchedule && (startTimeReached && !isOverdue);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 mb-20">
      <Card className="shadow-sm max-w-4xl mx-auto">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Clock className="h-6 w-6" />
            Clock In / Out
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Select an employee to clock in or out and track work hours
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-6">
            {/* Employee Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Select Employee
              </label>
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                  disabled={clockingIn || checkingStatus}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <SelectItem value="" disabled>
                        No active employees found
                      </SelectItem>
                    ) : (
                      employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName} ({employee.role})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Show only "Select employee first" when no employee selected */}
            {!selectedEmployee && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <div className="text-lg text-muted-foreground">
                    Select employee first
                  </div>
                </div>
              </div>
            )}

            {/* Countdown Display - Show at top when employee is selected */}
            {selectedEmployee && (
              <div className="flex flex-col items-center justify-center py-6">
                {isOnBreak ? (
                  // Show both work (paused if clocked in) and break (counting) countdowns when on break
                  <div className="flex flex-col md:flex-row gap-6 items-center justify-center w-full">
                    {/* Work Countdown (Paused) - Only show if clocked in */}
                    {isClockedIn && workCountdownPausedAt ? (
                      <div className="text-center space-y-2">
                        <div className="text-3xl md:text-4xl font-bold font-mono text-muted-foreground/60">
                          {String(workCountdownPausedAt.hours).padStart(2, "0")}:
                          {String(workCountdownPausedAt.minutes).padStart(2, "0")}:
                          {String(workCountdownPausedAt.seconds).padStart(2, "0")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Work (Paused)
                        </div>
                      </div>
                    ) : null}

                    {/* Break Countdown (Active) - Always show when on break */}
                    {getBreakCountdown() ? (
                      <div className="text-center space-y-2">
                        {(getBreakCountdown() as any)?.isOverdue ? (
                          <>
                            <div className="text-4xl md:text-5xl font-bold font-mono text-destructive">
                              OVERDUE
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Break time finished
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-4xl md:text-5xl font-bold font-mono text-orange-500">
                              {String(getBreakCountdown()?.hours || 0).padStart(2, "0")}:
                              {String(getBreakCountdown()?.minutes || 0).padStart(2, "0")}:
                              {String(getBreakCountdown()?.seconds || 0).padStart(2, "0")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Break time remaining
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : isClockedIn && getWorkCountdown() ? (
                  // Show work countdown only when clocked in (work time remaining)
                  <div className="text-center space-y-2">
                    {(getWorkCountdown() as any)?.isOverdue ? (
                      <>
                        {scheduleOverdueAutoClockOutRef.current ? (
                          <>
                            <div className="text-4xl md:text-5xl font-bold font-mono text-blue-500">
                              Clocking Out...
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Schedule ended - Auto clocking out
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-4xl md:text-5xl font-bold font-mono text-muted-foreground">
                              Schedule Ended
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Shift ended
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-4xl md:text-5xl font-bold font-mono">
                          {String(getWorkCountdown()?.hours || 0).padStart(2, "0")}:
                          {String(getWorkCountdown()?.minutes || 0).padStart(2, "0")}:
                          {String(getWorkCountdown()?.seconds || 0).padStart(2, "0")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Work time remaining
                        </div>
                      </>
                    )}
                  </div>
                ) : !hasSchedule ? (
                  <div className="text-center py-4">
                    <div className="text-lg text-muted-foreground">
                      No schedule found for today
                    </div>
                  </div>
                ) : isOverdue && !isClockedIn ? (
                  // When schedule is overdue and not clocked in, show next schedule or "No schedule found"
                  <div className="text-center py-4 space-y-2">
                    {nextScheduleClockInTime ? (
                      <>
                        <div className="text-lg text-muted-foreground">
                          Schedule ended
                        </div>
                        <div className="text-lg font-semibold text-primary">
                          Next schedule - Clock in by: {nextScheduleClockInTime}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Next shift start time
                        </div>
                      </>
                    ) : (
                      <div className="text-lg text-muted-foreground">
                        No schedule found
                      </div>
                    )}
                  </div>
                ) : !startTimeReached ? (
                  <div className="text-center py-4 space-y-2">
                    <div className="text-lg text-muted-foreground">
                      Wait till the start time reach
                    </div>
                    {scheduledStartTimeDisplay && (
                      <div className="text-base font-semibold text-primary">
                        Clock in by: {scheduledStartTimeDisplay}
                      </div>
                    )}
                  </div>
                ) : !isClockedIn && scheduledStartTimeDisplay ? (
                  // Show clock in time requirement when not clocked in and start time reached
                  <div className="text-center py-4 space-y-2">
                    <div className="text-lg font-semibold text-primary">
                      Clock in by: {scheduledStartTimeDisplay}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Scheduled start time
                    </div>
                  </div>
                ) : null}

                {/* Time Remaining - Show at bottom when employee is selected and clocked in */}
                {selectedEmployee && isClockedIn && (
                  <div className="mt-4 text-center">
                    <div className="text-sm text-muted-foreground">
                      {/* Time remaining */}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Employee Info & Status */}
            {selectedEmployee && (
              <div className="mt-6 w-full max-w-md space-y-3 mx-auto flex justify-center">
                <div className="p-4 rounded-lg border bg-card w-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Employee</span>
                    <Badge variant={isClockedIn ? "default" : "secondary"}>
                      {isClockedIn ? "Clocked In" : "Not Clocked In"}
                    </Badge>
                  </div>
                  <div className="text-lg font-semibold">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedEmployee.role} • {selectedEmployee.employeeId}
                  </div>
                  {scheduleToUse && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-muted-foreground">Work time :</span>
                      <span className="font-medium">
                        {(() => {
                          const totalMinutes = Math.round(workHoursInInterval * 60);
                          if (totalMinutes === 0) {
                            return <span className="text-muted-foreground">0 min (not clocked in yet)</span>;
                          } else if (totalMinutes < 60) {
                            // Show only minutes if less than 1 hour
                            return `${totalMinutes} min`;
                          } else {
                            // Show hours and minutes if 1 hour or more
                            const hours = Math.floor(totalMinutes / 60);
                            const minutes = totalMinutes % 60;
                            return (
                              <>
                                {hours}h {minutes > 0 && `${minutes} min`}
                                <span className="text-muted-foreground ml-1">
                                  ({workHoursInInterval.toFixed(2)}h)
                                </span>
                              </>
                            );
                          }
                        })()}
                      </span>
                    </div>
                  )}
                  {isClockedIn && clockInTime && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">Clocked in at:</span>
                      <span className="font-medium">
                        {format(clockInTime, "h:mm a")}
                      </span>
                    </div>
                  )}
                  {isOnBreak && breakClockInTime && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
                      <Coffee className="h-4 w-4 text-orange-500" />
                      <span className="text-muted-foreground">On break:</span>
                      <span className="font-medium">
                        {(() => {
                          // Show total break time from all today's breaks (accumulated)
                          const totalBreakMinutes = getTotalUsedBreakTime();
                          return `${totalBreakMinutes} min`;
                        })()}
                      </span>

                    </div>
                  )}
                  {usedBreakMinutes > 0 && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
                      <Coffee className="h-4 w-4 text-blue-500" />
                      <span className="text-muted-foreground">Break used:</span>
                      <span className="font-medium">
                        {usedBreakMinutes} min
                        {usedBreakMinutes >= 60 && (
                          <span className="text-muted-foreground ml-1">
                            ({Math.floor(usedBreakMinutes / 60)}h {usedBreakMinutes % 60}m)
                          </span>
                        )}
                        {breakTimeOverdue && (
                          <span className="text-red-500 ml-2 font-semibold">
                            overdue
                          </span>
                        )}
                      </span>
                      {scheduledBreakMinutes !== null && remainingBreakMinutes !== null && !isClockedIn && (
                        <span className="text-muted-foreground ml-2">
                          ({remainingBreakMinutes} min remaining)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Buttons - Only show when employee is selected */}
            {selectedEmployee && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mt-8 w-full sm:w-auto">
                {checkingStatus ? (
                  <Button disabled className="w-full sm:min-w-[200px] sm:w-auto">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Status...
                  </Button>
                ) : (
                  <>
                    {/* Clock In / Clock Out Button */}
                    {isClockedIn ? (
                      <Button
                        onClick={handleClockOut}
                        disabled={clockingOut}
                        size="lg"
                        variant="destructive"
                        className="w-full sm:min-w-[200px] sm:w-auto text-base sm:text-lg h-11 sm:h-12"
                      >
                        {clockingOut ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                            <span className="hidden sm:inline">Clocking Out...</span>
                            <span className="sm:hidden">Out...</span>
                          </>
                        ) : (
                          <>
                            <LogOut className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            Clock Out
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleClockIn}
                        disabled={clockingIn || isOverdue || !canClockIn}
                        size="lg"
                        className="w-full sm:min-w-[200px] sm:w-auto text-base sm:text-lg h-11 sm:h-12"
                      >
                        {clockingIn ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                            <span className="hidden sm:inline">Clocking In...</span>
                            <span className="sm:hidden">In...</span>
                          </>
                        ) : (
                          <>
                            <Clock className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            Clock In
                          </>
                        )}
                      </Button>
                    )}

                    {/* Start Break / End Break Button */}
                    {isOnBreak ? (
                      <Button
                        onClick={handleBreakClockOut}
                        disabled={breakClockingOut}
                        size="lg"
                        variant="default"
                        className="w-full sm:min-w-[200px] sm:w-auto text-base sm:text-lg h-11 sm:h-12 bg-orange-500 hover:bg-orange-600"
                      >
                        {breakClockingOut ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                            <span className="hidden sm:inline">Ending Break...</span>
                            <span className="sm:hidden">Ending...</span>
                          </>
                        ) : (
                          <>
                            <Coffee className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            End Break
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleBreakClockIn}
                        disabled={breakClockingIn || !canStartBreak}
                        size="lg"
                        variant="outline"
                        className="w-full sm:min-w-[200px] sm:w-auto text-base sm:text-lg h-11 sm:h-12 border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                      >
                        {breakClockingIn ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                            <span className="hidden sm:inline">Starting Break...</span>
                            <span className="sm:hidden">Starting...</span>
                          </>
                        ) : (
                          <>
                            <Coffee className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            Start Break
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

