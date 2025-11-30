// app/rent/rentConfirmation.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions, AppState, BackHandler, TouchableOpacity } from "react-native";
import {
  Button,
  Text,
  Card,
  useTheme,
  ActivityIndicator,
  Snackbar,
} from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

export default function RentConfirmation() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const theme = useTheme();
  const screenWidth = Dimensions.get("window").width;

  const studentUID = params.studentUID as string;
  const voltId = params.voltId as string;
  const EXPIRE_MINUTES = 1;

  // Rent options
  const rentOptions = [
    { label: "30 mins", duration: 30, fee: 15 },
    { label: "1 hour", duration: 60, fee: 25 },
    { label: "2 hours", duration: 120, fee: 40 },
    { label: "3 hours", duration: 180, fee: 60 },
  ];

  // Default selection
  const [selectedOption, setSelectedOption] = useState(rentOptions[1]); // default 1 hour

  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(EXPIRE_MINUTES * 60);
  const [expired, setExpired] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  
  // -------------------------------------------
  // Release reservation
  // -------------------------------------------
  const releaseVolt = async () => {
    if (!expired && voltId) {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await fetch(`${API_URL}/volts/release`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ voltId }),
        });

        if (!res.ok) throw new Error(await res.text());
      } catch (err) {
        console.error("Error releasing volt:", err);
      }
    }
  };

  // -------------------------------------------
  // Countdown + expiration
  // -------------------------------------------
  useEffect(() => {
    if (!voltId) return;

    const interval = setInterval(async () => {
      try {
        const voltSnap = await getDoc(doc(db, "volts", voltId));
        if (!voltSnap.exists()) return;

        const voltData = voltSnap.data();
        if (voltData?.status === "reserved" && voltData.reservedAt) {
          const now = Timestamp.now();
          const remaining =
            EXPIRE_MINUTES * 60 - (now.seconds - voltData.reservedAt.seconds);

          if (remaining <= 0) {
            await releaseVolt();
            setExpired(true);
            setSnackbarVisible(true);
            clearInterval(interval);
            setTimeout(() => router.back(), 2000);
          } else {
            setTimeLeft(remaining);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [voltId]);
  // // -------------------------------------------
  // // App background behavior (UNCHANGED)
  // // -------------------------------------------
  // useEffect(() => {
  //   const subscription = AppState.addEventListener("change", async (state) => {
  //     if ((state === "background" || state === "inactive") && !expired) {
  //       await releaseVolt();
  //     }
  //   });
  //   return () => subscription.remove();
  // }, [expired]);
  // -------------------------------------------
  // Back button
  // -------------------------------------------
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        releaseVolt();
        return false;
      };
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [])
  );

  // -------------------------------------------
  // Navigation away
  // -------------------------------------------
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", async () => {
      await releaseVolt();
    });
    return unsubscribe;
  }, []);

  // -------------------------------------------
  // Confirm rent
  // -------------------------------------------
  const handleConfirm = async () => {
    if (!voltId) return;

    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/rent/confirm`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voltID: voltId,
          fee: selectedOption.fee,
          duration: selectedOption.duration,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      router.push({
        pathname: "/rent/rentSuccess",
        params: { transactionId: data.transactionId },
      });
    } catch (err) {
      alert("Failed to confirm rent. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = ("0" + (seconds % 60)).slice(-2);
    return `${mins}:${secs}`;
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------
  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.content}>
        <Text variant="headlineLarge" style={[styles.header, { color: theme.colors.primary }]}>
          Confirm Rent Details
        </Text>

        <Card style={[styles.card, { width: screenWidth * 0.9, backgroundColor: theme.colors.onPrimary }]}>
          <Card.Content style={styles.cardContent}>
            
            {/* Top Icon */}
            <View style={styles.iconContainer}>
               <Ionicons name="flash" size={48} color={theme.colors.primary} />
            </View>

            {/* Rent Options UI */}
            <View style={{ width: "100%", marginVertical: 10 }}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Select Duration
              </Text>

              {/* Custom Card List */}
              <View style={styles.optionsContainer}>
                {rentOptions.map((opt) => {
                  const isSelected = selectedOption.label === opt.label;
                  return (
                    <TouchableOpacity
                      key={opt.label}
                      onPress={() => setSelectedOption(opt)}
                      activeOpacity={0.7}
                      style={[
                        styles.optionCard,
                        {
                          // ⭐ Uses theme primary color for border/bg when selected
                          borderColor: isSelected ? theme.colors.primary : 'transparent',
                          backgroundColor: isSelected ? theme.colors.onPrimary : theme.colors.onPrimary, 
                          borderWidth: isSelected ? 2 : 0,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         {/* Replaces Radio Button with Icon */}
                         <Ionicons 
                            name={isSelected ? "radio-button-on" : "radio-button-off"} 
                            size={22} 
                            color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant} 
                            style={{ marginRight: 12 }}
                         />
                         <Text style={{
                            fontSize: 16,
                            fontWeight: isSelected ? "700" : "500",
                            color: isSelected ? theme.colors.primary : theme.colors.onSurface
                          }}>
                            {opt.label}
                          </Text>
                      </View>

                      <Text style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        color: isSelected ? theme.colors.primary : theme.colors.onSurface
                      }}>
                        ₱{opt.fee}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Total Fee Summary */}
            <View style={styles.summaryContainer}>
               <Text style={{ fontSize: 14, color: theme.colors.primary }}>Total Fee</Text>
               <Text style={{ fontSize: 28, fontWeight: "800", color: theme.colors.primary }}>₱{selectedOption.fee}</Text>
            </View>

            {loading ? (
              <ActivityIndicator animating size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : (
              <Button
                mode="contained"
                onPress={handleConfirm}
                style={styles.button}
                contentStyle={{ height: 56 }}
                labelStyle={styles.buttonLabel}
                buttonColor={theme.colors.primary}
                disabled={expired}
              >
                {/* ⭐ Button Text Changed: Confirm (Timer) */}
                Confirm ({expired ? "Expired" : formatTime(timeLeft)})
              </Button>
            )}

            <Button
              mode="text"
              onPress={async () => {
                await releaseVolt();
                router.back();
              }}
              style={styles.backButton}
              labelStyle={styles.backButtonLabel}
              textColor={theme.colors.primary}
            >
              Cancel
            </Button>
          </Card.Content>
        </Card>
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={{ 
          backgroundColor: theme.colors.primary,
          alignSelf: "center", // ⭐ Fixes horizontal centering
          marginBottom: 20,    // ⭐ Adds floating effect
          borderRadius: 16,    // ⭐ Rounds corners
          width: "90%",        // ⭐ Ensures correct width for centering
        }}
        action={{ label: "OK", onPress: () => setSnackbarVisible(false) }}
      >
        Reservation expired. Returning to Volt selection...
      </Snackbar>
    </LinearGradient>
  );
}

// 🧱 STYLES
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { textAlign: "center", marginBottom: 20, fontWeight: "800", fontSize: 26 },
  card: { borderRadius: 28, paddingVertical: 10, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  cardContent: { alignItems: "center", paddingHorizontal: 16 },
  
  iconContainer: {
    marginBottom: 10,
    padding: 15,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },

  sectionTitle: {
    textAlign: "left",
    marginBottom: 12,
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 4,
    opacity: 0.8
  },

  optionsContainer: {
    width: '100%',
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    width: '100%',
  },

  summaryContainer: { 
    alignItems: "center", 
    marginTop: 20, 
    marginBottom: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    width: '100%',
  },
  
  button: { borderRadius: 16, width: "100%", elevation: 2 },
  buttonLabel: { fontSize: 18, fontWeight: "700", letterSpacing: 0.5 },
  backButton: { width: "100%", marginTop: 8 },
  backButtonLabel: { fontSize: 14, fontWeight: "600" },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
});

