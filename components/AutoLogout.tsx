import React, { useRef, useEffect } from 'react';
import { View, PanResponder, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebaseConfig'; // Adjust path to match your structure

// TIMEOUT CONFIGURATION
// 2 minutes = 120000 ms. Adjust as needed.
const IDLE_LOGOUT_TIME = 2 * 60 * 1000; 

export const AutoLogoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const timerId = useRef<any>(null);

  // The actual logout function
  const handleLogout = async () => {
    try {
      if (auth.currentUser) {
        console.log("Auto-logging out due to inactivity...");
        await signOut(auth);
        router.replace('/login'); // Or your login route
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Resets the timer
  const resetTimer = () => {
    if (timerId.current) {
      clearTimeout(timerId.current);
    }
    // Only start timer if user is actually logged in
    if (auth.currentUser) {
      timerId.current = setTimeout(handleLogout, IDLE_LOGOUT_TIME);
    }
  };

  // Watch for auth state changes (User logs in -> start timer)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        resetTimer();
      } else {
        if (timerId.current) clearTimeout(timerId.current);
      }
    });
    return () => {
      unsubscribe();
      if (timerId.current) clearTimeout(timerId.current);
    };
  }, []);

  // PanResponder captures all touches/clicks on the screen
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        resetTimer();
        return false; // Return false so we don't block buttons/inputs
      },
      onMoveShouldSetPanResponder: () => {
        resetTimer();
        return false;
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => false,
    })
  ).current;

  return (
    <View 
      style={{ flex: 1 }} 
      {...panResponder.panHandlers}
    >
      {children}
    </View>
  );
};