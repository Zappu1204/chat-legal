import { useState, useEffect } from 'react';

/**
 * A hook that tracks elapsed time for thinking operations
 * 
 * @param isThinking Whether thinking is in progress
 * @param startTime The timestamp when thinking started
 * @param finalTime The final thinking time if completed
 * @returns The current elapsed time in milliseconds
 */
export function useThinkingTimer(
  isThinking: boolean,
  startTime?: number,
  finalTime?: number
): number {
  const [elapsedTime, setElapsedTime] = useState<number>(finalTime ?? 0);
  
  useEffect(() => {
    // If thinking has completed, use the final time
    if (!isThinking && finalTime) {
      setElapsedTime(finalTime);
      return;
    }
    
    // If not thinking and no final time, keep the current elapsed time
    if (!isThinking) return;
    
    // Get start time, either from props or now
    const thinkingStartTime = startTime ?? Date.now();
    
    // Update elapsed time every 100ms
    const intervalId = setInterval(() => {
      setElapsedTime(Date.now() - thinkingStartTime);
    }, 100);
    
    return () => clearInterval(intervalId);
  }, [isThinking, startTime, finalTime]);
  
  return elapsedTime;
}
