import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, where, Unsubscribe } from "firebase/firestore";
import React, { useEffect, useState, useRef } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { 
  ActivityIndicator, 
  Button, 
  Card, 
  IconButton, 
  Text, 
  useTheme, 
  Chip,
  Portal,    
  Dialog,    
  Paragraph 
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../config/firebaseConfig"; 
import { useAppTheme } from "../_layout";

export default function HomeScreen() {
  const theme = useTheme();
  const { isDark, toggleTheme } = useAppTheme();
  const router = useRouter();

  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [unpaidBalance, setUnpaidBalance] = useState<number>(0); 
  const [currentRental, setCurrentRental] = useState<any | null>(null);
  const [tick, setTick] = useState(0);

  // --- CUSTOM ALERT DIALOG STATE ---
  const [alertDialog, setAlertDialog] = useState({
    visible: false,
    title: "",
    message: "",
    isError: false, 
    buttonText: "OK"
  });

  // Refs to track alert history
  const lastAlertedStatusRef = useRef<string | null>(null);
  const currentRentalIdRef = useRef<string | null>(null);

  // Constants
  const GRACE_PERIOD_MINS = 5;

  // Re-render every second for countdown
  useEffect(() => {
    const interval = setInterval(() => setTick(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const [remainingTime, setRemainingTime] = useState("0m 0s");
  const [usedTime, setUsedTime] = useState("0m");
  const [rentalStatus, setRentalStatus] = useState<'active' | 'overdue' | 'penalty'>('active');

  const parseStartTime = (startTime: any) => {
    if (!startTime) return new Date(); 
    if (typeof startTime?.toDate === "function") return startTime.toDate();
    if (startTime instanceof Date) return startTime;
    return new Date(startTime);
  };

  useEffect(() => {
    if (currentRental) {
      // 1. Reset alert memory ONLY if it's a brand new rental transaction
      if (currentRentalIdRef.current !== currentRental.id) {
        currentRentalIdRef.current = currentRental.id;
        lastAlertedStatusRef.current = null; 
      }

      const start = parseStartTime(currentRental.startTime);
      const now = new Date();
      const durationMs = currentRental.duration * 60000;
      const graceMs = GRACE_PERIOD_MINS * 60000;
      const elapsedMs = now.getTime() - start.getTime();

      // --- CALCULATE STATUS ---
      let status: 'active' | 'overdue' | 'penalty' = 'active';
      if (elapsedMs > durationMs + graceMs) {
        status = 'penalty';
      } else if (elapsedMs > durationMs) {
        status = 'overdue';
      }
      setRentalStatus(status);

      // --- CALCULATE TIMES ---
      const usedMins = Math.floor(elapsedMs / 60000);
      const usedSecs = Math.floor((elapsedMs % 60000) / 1000);
      setUsedTime(`${usedMins}m ${usedSecs}s`);

      const remainingMs = durationMs - elapsedMs;
      if (remainingMs <= 0) {
        setRemainingTime("0m 0s");
      } else {
        const remMins = Math.floor(remainingMs / 60000);
        const remSecs = Math.floor((remainingMs % 60000) / 1000);
        setRemainingTime(`${remMins}m ${remSecs}s`);
      }

      // --- HANDLE ALERT NOTICE ---
      if (status !== lastAlertedStatusRef.current && !alertDialog.visible) {
        if (status === 'overdue') {
          lastAlertedStatusRef.current = status;
          setAlertDialog({
            visible: true,
            title: "Rental Expired",
            message: "Your rental duration has ended. Please return the device within the 5-minute grace period to avoid penalty fees.",
            isError: false,
            buttonText: "I'll Return It"
          });
        } 
        else if (status === 'penalty') {
          lastAlertedStatusRef.current = status;
          setAlertDialog({
            visible: true,
            title: "⚠️ Penalty Fee Active",
            message: "Grace period exceeded. A penalty of ₱5.00 per minute is now being deducted from your wallet. Please return the device immediately.",
            isError: true,
            buttonText: "I Understand"
          });
        }
      }
    }
  }, [tick, currentRental]); 

  // --- FIXED DATA FETCHING LOGIC ---
  useEffect(() => {
    let unsubscribeUser: Unsubscribe | null = null;
    let unsubscribeWallet: Unsubscribe | null = null;
    let unsubRental: Unsubscribe | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        setUserName("User");
        setWalletBalance(0);
        setUnpaidBalance(0);
        setCurrentRental(null);
        router.replace("/(auth)/login");
        return;
      }

      // 1. User Profile Listener (Name Only)
      const userDocRef = doc(db, "users", user.uid);
      unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(data.firstName || data.email?.split("@")[0] || "User");
        }
      }, (error) => console.log("User listener error", error));

      // 2. Wallet Listener (Balance + Debt)
      // ✅ Now fetching unpaidBalance from the wallet subcollection as requested
      const walletDocRef = doc(db, "users", user.uid, "wallet", "balance");
      unsubscribeWallet = onSnapshot(walletDocRef, (walletSnap) => {
        if (walletSnap.exists()) {
          const data = walletSnap.data();
          setWalletBalance(data?.currentBalance || 0);
          setUnpaidBalance(data?.unpaidBalance || 0);
        } else {
          setWalletBalance(0);
          setUnpaidBalance(0);
        }
      }, (error) => {
          console.log("Wallet listener error:", error.code);
      });

      // 3. Rental Listener
      const rentalQuery = query(
        collection(db, "volts"),
        where("studentUID", "==", user.uid),
        where("status", "==", "rented")
      );
      unsubRental = onSnapshot(rentalQuery, (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          setCurrentRental({ id: snapshot.docs[0].id, ...docData });
        } else {
          setCurrentRental(null);
        }
      }, (error) => {
          console.log("Rental listener error:", error.code);
      });

      setLoading(false);
    });

    return () => {
      unsubscribeAuth(); 
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeWallet) unsubscribeWallet(); 
      if (unsubRental) unsubRental(); 
    };
  }, []); 

  if (loading) {
    return (
      <LinearGradient colors={(theme.colors as any).gradientColors} style={styles.container}>
        <SafeAreaView style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={(theme.colors as any).gradientColors} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.topRow}>
          <IconButton
            icon={() => <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />}
            onPress={() => router.push("/profile")}
          />
          <Image
            source={isDark ? require("../../assets/images/white-logo.png") : require("../../assets/images/blue-logo.png")}
            style={styles.logoInline}
            resizeMode="contain"
          />
          <IconButton
            icon={() => <Ionicons name={isDark ? "sunny" : "moon"} size={28} color={theme.colors.primary} />}
            onPress={toggleTheme}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text variant="headlineMedium" style={[styles.header, { color: theme.colors.primary }]}>
            Welcome, {userName}!
          </Text>

          {/* --- NEW: UNPAID BALANCE CARD --- */}
          {/* Only visible when unpaidBalance is greater than 0 */}
          {unpaidBalance > 0 && (
            <Card style={[styles.card, { backgroundColor: theme.colors.errorContainer, borderWidth: 1, borderColor: theme.colors.error }]}>
                <Card.Content>
                    <View style={styles.rowBetween}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Ionicons name="warning" size={24} color={theme.colors.error} style={{marginRight: 8}} />
                            <Text style={[styles.cardTitle, { color: theme.colors.error, marginBottom: 0 }]}>
                                Unpaid Balance
                            </Text>
                        </View>
                    </View>
                    
                    <Text style={[styles.cardAmount, { color: theme.colors.error, marginTop: 10 }]}>
                        ₱ {unpaidBalance.toFixed(2)}
                    </Text>
                    
                    <Text style={[styles.cardSubtitle, { color: theme.colors.onErrorContainer, marginBottom: 15 }]}>
                        You have an outstanding balance from a previous rental penalty. Please settle this amount to resume renting.
                    </Text>

                    <Button 
                        mode="contained" 
                        buttonColor={theme.colors.error} 
                        textColor={theme.colors.onError}
                        icon="card"
                        onPress={() => router.push("/wallet/recharge")} 
                        style={{ borderRadius: 12 }}
                    >
                        Pay Now
                    </Button>
                </Card.Content>
            </Card>
          )}

          {/* Wallet Balance */}
          <Card style={[styles.card, { backgroundColor: theme.colors.onPrimary }]}>
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Wallet Balance</Text>
              <Text style={[styles.cardAmount, { color: theme.colors.primary }]}>₱ {walletBalance.toFixed(2)}</Text>
              <View style={{ alignItems: "flex-end" }}>
                <Button
                  mode="contained"
                  onPress={() => router.push("/wallet/recharge")}
                  icon={() => <Ionicons name="wallet" size={20} color={theme.colors.onSurface} />}
                  style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
                >
                  <Text style={[styles.actionButtonText, { color: theme.colors.onSurface }]}>Recharge Balance</Text>
                </Button>
              </View>
            </Card.Content>
          </Card>

          {/* Current Rentals */}
          <Card 
            style={[
              styles.card, 
              { backgroundColor: rentalStatus === 'penalty' ? theme.colors.errorContainer : theme.colors.onPrimary }
            ]}
          >
            <Card.Content>
              <View style={styles.rowBetween}>
                <Text style={[styles.cardTitle, { color: rentalStatus === 'penalty' ? theme.colors.error : theme.colors.primary }]}>
                  Current Rental(s)
                </Text>
                {rentalStatus === 'penalty' && (
                  <Chip icon="alert-circle" style={{ backgroundColor: theme.colors.error }} textStyle={{ color: 'white' }}>
                    PENALTY ACTIVE
                  </Chip>
                )}
              </View>

              {currentRental ? (
                <View style={{
                  backgroundColor: rentalStatus === 'penalty' ? theme.colors.error : theme.colors.primary,
                  borderRadius: 15,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  marginTop: 10,
                }}>
                  <View style={styles.rowBetween}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="flash" size={24} color={theme.colors.onPrimary} style={{ marginRight: 8 }} />
                      <View>
                        <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold", fontSize: 18 }}>Volt {currentRental.id}</Text>
                        <Text style={{ color: theme.colors.onPrimary, fontSize: 12, opacity: 0.8 }}>
                          Plan: {currentRental.duration} mins
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: theme.colors.onPrimary, fontSize: 12, opacity: 0.9 }}>
                        Time Used
                      </Text>
                      <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold", fontSize: 16, marginBottom: 4 }}>
                        {usedTime}
                      </Text>

                      <Text style={{ color: theme.colors.onPrimary, fontSize: 12, opacity: 0.9 }}>
                        {rentalStatus === 'active' ? "Time Left" : "Overdue"}
                      </Text>
                      <Text style={{ 
                        fontWeight: "bold", 
                        fontSize: 16,
                        color: rentalStatus !== 'active' ? '#FFEB3B' : theme.colors.onPrimary 
                      }}>
                        {remainingTime}
                      </Text>
                    </View>
                  </View>

                  {rentalStatus === 'penalty' && (
                    <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)', paddingTop: 8 }}>
                      <Text style={{ color: '#FFEB3B', fontWeight: 'bold', textAlign: 'center' }}>
                        ⚠ Grace Period Exceeded! 
                      </Text>
                      <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>
                        Deducting ₱5.00 per minute late fee.
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <>
                  <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>You have no active rental.</Text>
                  <View style={{ alignItems: "center", marginTop: 10 }}>
                    <Button 
                        mode="contained" 
                        onPress={() => router.push("/volts")} 
                        style={styles.actionButton}
                        // Disable rent button if there is unpaid debt
                        disabled={unpaidBalance > 0} 
                    >
                        {unpaidBalance > 0 ? "Account Locked" : "Rent Now"}
                    </Button>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>

          {/* Reminders */}
          <Card style={[styles.card, { backgroundColor: theme.colors.onPrimary }]}>
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Reminders</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Powerbanks must stay within the designated vicinity area of 8 meters.</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Each powerbank is equipped with a built-in security alarm.</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Maximum rental duration: 3 hours.</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Grace period for return: 5 minutes.</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Late returns incur a penalty 5 pesos per minute(grace).</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Lost or unreturned powerbanks will incur the full replacement fee.</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Minimum wallet balance required to rent: ₱55 for 30 min & 1 hour</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Minimum wallet balance required to rent: ₱100 for 2 hours & 3 hours</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Strictly no refunds.</Text>
            </Card.Content>
          </Card>
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* --- CUSTOM ALERT DIALOG --- */}
        <Portal>
          <Dialog visible={alertDialog.visible} onDismiss={() => setAlertDialog(prev => ({ ...prev, visible: false }))} style={{ backgroundColor: theme.colors.onPrimary }}>
            <Dialog.Title style={{ color: alertDialog.isError ? theme.colors.error : theme.colors.primary, fontWeight: 'bold' }}>
              {alertDialog.title}
            </Dialog.Title>
            <Dialog.Content>
              <Paragraph style={{ fontSize: 16, color: theme.colors.onSurface }}>
                {alertDialog.message}
              </Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button 
                onPress={() => setAlertDialog(prev => ({ ...prev, visible: false }))}
                textColor={alertDialog.isError ? theme.colors.error : theme.colors.primary}
              >
                {alertDialog.buttonText}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centeredContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  logoInline: { width: 50, height: 50 },
  scrollContent: { padding: 20 },
  header: { fontSize: 32, marginBottom: 30, fontWeight: "bold" },
  card: {
    borderRadius: 15,
    marginBottom: 20,
    paddingVertical: 5,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  cardAmount: {
    fontSize: 28,
    fontWeight: "bold",
  },
  cardSubtitle: {
    fontSize: 14,
    marginVertical: 4,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionButton: {
    borderRadius: 20,
    marginTop: 10,
  },
  actionButtonText: {
    fontWeight: "600",
  }
});