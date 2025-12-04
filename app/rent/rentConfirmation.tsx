// app/rent/rentConfirmation.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions, BackHandler, TouchableOpacity } from "react-native";
import {
  Button,
  Text,
  Card,
  useTheme,
  ActivityIndicator,
  Snackbar,
  Portal,
  Dialog,
  Paragraph
} from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig"; // Ensure path
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

  // --- 1. STATE FOR WALLET BALANCE ---
  const [userBalance, setUserBalance] = useState<number | null>(null);

  // --- 2. UPDATED RENT OPTIONS WITH MINIMUM REQUIREMENT ---
  const rentOptions = [
    { label: "1 min (Test)", duration: 1, fee: 5, minReq: 0 },
    { label: "30 mins", duration: 30, fee: 15, minReq: 55 },
    { label: "1 hour", duration: 60, fee: 25, minReq: 55 },
    { label: "2 hours", duration: 120, fee: 40, minReq: 100 },
    { label: "3 hours", duration: 180, fee: 60, minReq: 100 },
  ];

  const [selectedOption, setSelectedOption] = useState(rentOptions[1]); 
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(EXPIRE_MINUTES * 60);
  const [expired, setExpired] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [showLowBalanceDialog, setShowLowBalanceDialog] = useState(false);
  
  // New state to hold dynamic error message for dialog
  const [dialogMessage, setDialogMessage] = useState(""); 

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  // --- 3. FETCH WALLET BALANCE ON MOUNT ---
  useEffect(() => {
    const fetchBalance = async () => {
        try {
            if (auth.currentUser) {
                const walletDoc = await getDoc(doc(db, "users", auth.currentUser.uid, "wallet", "balance"));
                if (walletDoc.exists()) {
                    setUserBalance(walletDoc.data().currentBalance || 0);
                } else {
                    setUserBalance(0);
                }
            }
        } catch (e) {
            console.error("Failed to load balance", e);
        }
    };
    fetchBalance();
  }, []);

  // ... (releaseVolt, Countdown, BackButton logic remains the same) ...
  const releaseVolt = async () => {
    if (!expired && voltId) {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        await fetch(`${API_URL}/volts/release`, {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ voltId }),
        });
      } catch (err) { console.error(err); }
    }
  };
  
  // ... (Keep existing useEffects for Timer, BackHandler, etc.) ...

  // --- 4. HANDLE CONFIRM WITH PRE-CHECK ---
  const handleConfirm = async () => {
    if (!voltId) return;

    // Client-side Check: Check specific requirement
    if (userBalance !== null && userBalance < selectedOption.minReq) {
        setDialogMessage(`This plan requires a minimum wallet balance of ₱${selectedOption.minReq}. You currently have ₱${userBalance.toFixed(2)}.`);
        setShowLowBalanceDialog(true);
        return;
    }

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

      if (!res.ok) {
        const errorText = await res.text(); 
        let errorMessage = errorText;
        try {
            const jsonError = JSON.parse(errorText);
            errorMessage = jsonError.message || errorText;
        } catch (e) {}

        if (errorMessage.toLowerCase().includes("balance") || errorMessage.toLowerCase().includes("funds")) {
            // Fallback if backend throws check
            setDialogMessage(errorMessage);
            setShowLowBalanceDialog(true); 
            return; 
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      router.push({
        pathname: "/rent/rentSuccess",
        params: { transactionId: data.transactionId },
      });
    } catch (err: any) {
      alert(err.message || "Failed to confirm rent. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = ("0" + (seconds % 60)).slice(-2);
    return `${mins}:${secs}`;
  };

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
            
            <View style={styles.iconContainer}>
               <Ionicons name="flash" size={48} color={theme.colors.primary} />
            </View>

            <View style={{ width: "100%", marginVertical: 10 }}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Select Duration
              </Text>

              <View style={styles.optionsContainer}>
                {rentOptions.map((opt) => {
                  const isSelected = selectedOption.label === opt.label;
                  // Check if affordable
                  const isAffordable = userBalance !== null ? userBalance >= opt.minReq : true;

                  return (
                    <TouchableOpacity
                      key={opt.label}
                      onPress={() => setSelectedOption(opt)}
                      activeOpacity={0.7}
                      style={[
                        styles.optionCard,
                        {
                          borderColor: isSelected ? theme.colors.primary : 'transparent',
                          backgroundColor: theme.colors.onPrimary, 
                          borderWidth: isSelected ? 2 : 0,
                          // Visual indication: Lower opacity if unaffordable
                          opacity: isAffordable ? 1 : 0.6 
                        },
                      ]}
                    >
                      <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                          
                          {/* SHOW REQUIRED BALANCE TEXT IF UNAFFORDABLE */}
                          {!isAffordable && (
                              <Text style={{ fontSize: 12, color: theme.colors.error, marginLeft: 34, marginTop: 2 }}>
                                Requires ₱{opt.minReq}
                              </Text>
                          )}
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

      {/* --- INSUFFICIENT BALANCE DIALOG --- */}
      <Portal>
        <Dialog 
            visible={showLowBalanceDialog} 
            onDismiss={() => setShowLowBalanceDialog(false)}
            style={{ backgroundColor: theme.colors.onPrimary }}
        >
          <Dialog.Title style={{ color: theme.colors.error, fontWeight: 'bold' }}>
             Insufficient Balance
          </Dialog.Title>
          <Dialog.Content>
            {/* Dynamic Message based on selection */}
            <Paragraph style={{ fontSize: 16 }}>
              {dialogMessage}
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
                onPress={async () => {
                    // Do NOT release volt yet, user might just want to change option
                    setShowLowBalanceDialog(false);
                }} 
                textColor={theme.colors.onSurface}
            >
                Back
            </Button>
            <Button 
                onPress={async () => {
                    await releaseVolt();
                    setShowLowBalanceDialog(false);
                    router.push("/wallet/recharge"); 
                }} 
                mode="contained"
                buttonColor={theme.colors.primary}
            >
                Top Up Now
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
        style={{ 
          backgroundColor: theme.colors.primary,
          alignSelf: "center",
          marginBottom: 20,
          borderRadius: 16,
          width: "90%",
        }}
        action={{ label: "OK", onPress: () => setSnackbarVisible(false) }}
      >
        Reservation expired. Returning to Volt selection...
      </Snackbar>
    </LinearGradient>
  );
}

// 🧱 STYLES (Unchanged)
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