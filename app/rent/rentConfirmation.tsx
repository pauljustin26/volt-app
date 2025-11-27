// app/rent/rentConfirmation.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions, AppState, BackHandler } from "react-native";
import {
  Button,
  Text,
  Card,
  RadioButton,
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

  // ⭐ ADDED — Rent options
  const rentOptions = [
    { label: "30 mins", duration: 30, fee: 15 },
    { label: "1 hour", duration: 60, fee: 25 },
    { label: "2 hours", duration: 120, fee: 40 },
    { label: "3 hours", duration: 180, fee: 60 },
  ];

  // ⭐ ADDED — Default selection
  const [selectedOption, setSelectedOption] = useState(rentOptions[1]); // default 1 hour

  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(EXPIRE_MINUTES * 60);
  const [expired, setExpired] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  
  // -------------------------------------------
  // Release reservation (UNCHANGED)
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
  // Countdown + expiration (UNCHANGED)
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

  // -------------------------------------------
  // App background behavior (UNCHANGED)
  // -------------------------------------------
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      if ((state === "background" || state === "inactive") && !expired) {
        await releaseVolt();
      }
    });
    return () => subscription.remove();
  }, [expired]);

  // -------------------------------------------
  // Back button (UNCHANGED)
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
  // Navigation away (UNCHANGED)
  // -------------------------------------------
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", async () => {
      await releaseVolt();
    });
    return unsubscribe;
  }, []);

  // -------------------------------------------
  // Confirm rent — ⭐ UPDATED to include selected option
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
          fee: selectedOption.fee,        // ⭐ ADDED
          duration: selectedOption.duration, // ⭐ ADDED
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      router.push({
        pathname: "/rent/rentSuccess",
        params: { transactionId: data.transactionId },
      });
    } catch (err) {
      console.error("Rent confirmation failed:", err);
      alert("Failed to confirm rent. Try again.");
    } finally {
      setLoading(false);
    }
  };


  // ------------------------------------------------------------
  // UI (Almost unchanged — only added radio button selection)
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
          Confirm Your Rent
        </Text>

        <Card style={[styles.card, { width: screenWidth * 0.9, backgroundColor: theme.colors.onPrimary }]}>
          <Card.Content style={styles.cardContent}>
            <Ionicons name="flash-outline" size={65} color={theme.colors.primary} />

            {/* ⭐ ADDED — Rent Options */}
            <View style={{ marginBottom: 10, width: "100%" }}>
              <Text style={{ textAlign: "center", marginBottom: 10, fontWeight: "bold" }}>
                Choose Rent Duration
              </Text>

              <RadioButton.Group
                onValueChange={(value) =>
                  setSelectedOption(rentOptions.find((o) => o.label === value)!)
                }
                value={selectedOption.label}
              >
                {rentOptions.map((opt) => (
                  <View key={opt.label} style={{ flexDirection: "row", alignItems: "center", marginVertical: 2 }}>
                    <RadioButton value={opt.label} />
                    <Text>{opt.label}</Text>
                  </View>
                ))}
              </RadioButton.Group>
            </View>

            {/* ⭐ UPDATED UI to show selected fee */}
            <View style={styles.infoBox}>
              <Text style={[styles.label, { color: theme.colors.primary }]}>Fee: </Text>
              <Text style={[styles.label, { color: theme.colors.primary }]}>
                ₱{selectedOption.fee} for {selectedOption.label}
              </Text>
            </View>

            {!expired && (
              <Text style={{ fontSize: 16, marginTop: 10, color: theme.colors.primary }}>
                Time left to confirm: {Math.floor(timeLeft / 60)}:
                {("0" + (timeLeft % 60)).slice(-2)}s
              </Text>
            )}

            {loading ? (
              <ActivityIndicator animating size="large" color={theme.colors.primary} />
            ) : (
              <Button
                mode="contained"
                onPress={handleConfirm}
                style={styles.button}
                labelStyle={styles.buttonLabel}
                buttonColor={theme.colors.primary}
                disabled={expired}
              >
                Confirm Rent
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
              icon={({ size, color }) => (
                <Ionicons name="arrow-back" size={size} color={color} />
              )}
            >
              Go Back
            </Button>
          </Card.Content>
        </Card>
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={{ backgroundColor: theme.colors.primary }}
        action={{ label: "OK", onPress: () => setSnackbarVisible(false) }}
      >
        Reservation expired. Returning to Volt selection...
      </Snackbar>
    </LinearGradient>
  );
}


// 🧱 STYLES (UNCHANGED)
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { textAlign: "center", marginBottom: 25, fontWeight: "700" },
  card: { borderRadius: 20, paddingVertical: 25, paddingHorizontal: 20, elevation: 6 },
  cardContent: { alignItems: "center", gap: 18 },
  infoBox: { alignItems: "center" },
  label: { fontSize: 16, fontWeight: "bold" },
  button: { borderRadius: 14, width: "85%", marginTop: 20 },
  buttonLabel: { fontSize: 16, fontWeight: "600" },
  backButton: { width: "85%" },
  backButtonLabel: { fontSize: 15, fontWeight: "500" },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
});
