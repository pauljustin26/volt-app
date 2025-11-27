import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, where, getDoc, Unsubscribe } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, IconButton, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../config/firebaseConfig";
import { useAppTheme } from "../_layout";
// import * as Notifications from "expo-notifications";
// import Constants from "expo-constants";
// import { Platform } from "react-native";

export default function HomeScreen() {
  const theme = useTheme();
  const { isDark, toggleTheme } = useAppTheme();
  const router = useRouter();

  const [userName, setUserName] = useState("User");
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [currentRental, setCurrentRental] = useState<any | null>(null);
  const [tick, setTick] = useState(0);

  // Re-render every second for countdown
  useEffect(() => {
    const interval = setInterval(() => setTick(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const [remainingTime, setRemainingTime] = useState("0m 0s");
  const [usedTime, setUsedTime] = useState("0m");

  useEffect(() => {
    if (currentRental) {
      setRemainingTime(calculateRemainingTime(currentRental.startTime, currentRental.duration));
      setUsedTime(calculateUsedTime(currentRental.startTime));
    }
  }, [tick, currentRental]);
  
  const parseStartTime = (startTime: any) => {
    if (!startTime) return new Date(); // fallback
    // Firestore Timestamp
    if (typeof startTime?.toDate === "function") return startTime.toDate();
    // Already Date object
    if (startTime instanceof Date) return startTime;
    // String timestamp
    return new Date(startTime);
  };

  const calculateRemainingTime = (startTime: any, duration: number) => {
    const start = parseStartTime(startTime);
    if (!duration) return "0m";

    const end = new Date(start.getTime() + duration * 60000);
    const now = new Date();

    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) return "Expired";

    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  };

  const calculateUsedTime = (startTime: any) => {
    const start = parseStartTime(startTime);
    const now = new Date();

    const diffMs = now.getTime() - start.getTime();
    const usedMinutes = Math.floor(diffMs / 60000);

    return `${usedMinutes}m`;
  };


  // Main auth & user data initialization/routing listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/(auth)/login");
        setLoading(false);
        return;
      }

      // Fetch user name once (GET DOC - no cleanup needed)
      const userDocRef = doc(db, "users", user.uid);
      getDoc(userDocRef).then(userDoc => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(data.firstName || data.email?.split("@")[0] || "User");
        }
      });
      
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Dedicated useEffect for Firestore Real-time Listeners
  useEffect(() => {
    const user = auth.currentUser;
    let unsubscribeWallet: Unsubscribe = () => {};
    let unsubRental: Unsubscribe = () => {};

    if (user) {
      // Listen to wallet balance in real-time
      const walletDocRef = doc(db, "users", user.uid, "wallet", "balance");
      unsubscribeWallet = onSnapshot(walletDocRef, (walletSnap) => {
        if (walletSnap.exists()) {
          setWalletBalance(walletSnap.data()?.currentBalance || 0);
        } else {
          setWalletBalance(0);
        }
      }, (error) => {
          // Handle permission denied on logout
          if (error.code === 'permission-denied') setWalletBalance(0);
          console.error("Wallet listener error:", error.message);
      });

      // Listen to current rentals in real-time
      const rentalQuery = query(
        collection(db, "volts"),
        where("studentUID", "==", user.uid),
        where("status", "==", "rented")
      );
      unsubRental = onSnapshot(rentalQuery, (snapshot) => {
        if (!snapshot.empty) {
          setCurrentRental({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        } else {
          setCurrentRental(null);
        }
      }, (error) => {
          // Handle permission denied on logout
          if (error.code === 'permission-denied') setCurrentRental(null);
          console.error("Rental listener error:", error.message);
      });
    }

    // CRITICAL CLEANUP: Stop both listeners when the component unmounts.
    return () => {
      unsubscribeWallet();
      unsubRental();
    };

  }, [auth.currentUser]); // Dependency ensures listener restarts/stops on login/logout


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
        {/* Header */}
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
          {/* Greeting */}
          <Text variant="headlineMedium" style={[styles.header, { color: theme.colors.primary }]}>
            Welcome, {userName}!
          </Text>

          {/* Wallet Balance */}
          <Card style={[styles.card, { backgroundColor: theme.colors.onPrimary }]}>
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Wallet Balance</Text>
              <Text style={[styles.cardAmount, { color: theme.colors.primary }]}>₱ {walletBalance.toFixed(2)}</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>
                Minimum wallet balance of ₱100 required to rent.
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Button
                  mode="contained"
                  onPress={() => router.push("/wallet/recharge")} // replace with your top-up screen
                  icon={() => <Ionicons name="wallet" size={20} color={theme.colors.onSurface} />}
                  style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
                >
                  <Text style={[styles.actionButton, { color: theme.colors.onSurface }]}>Recharge Balance</Text>
                </Button>
              </View>
            </Card.Content>
          </Card>

          {/* Current Rentals */}
          <Card style={[styles.card, { backgroundColor: theme.colors.onPrimary }]}>
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Current Rental(s)</Text>
              {currentRental ? (
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: theme.colors.primary,
                  borderRadius: 15,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  marginTop: 10,
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="flash" size={20} color={theme.colors.onPrimary} style={{ marginRight: 8 }} />
                    <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold", fontSize: 16 }}>Volt {currentRental.id}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold", fontSize: 14 }}>
                      Used: {usedTime}
                    </Text>
                    <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold", fontSize: 14 }}>
                      Remaining: {remainingTime}
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>You have no active rental.</Text>
                  <View style={{ alignItems: "center", marginTop: 10 }}>
                    <Button mode="contained" onPress={() => router.push("/volts")} style={styles.actionButton}>Rent Now</Button>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>

          {/* Reminders */}
          <Card style={[styles.card, { backgroundColor: theme.colors.onPrimary }]}>
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Reminders</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Powerbanks cannot be taken outside the designated vicinity area.</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Powerbanks have a built-in buzzer/alarm for security.</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Maximum usage: 3 hours per rental. Grace period: 5 minutes. for returning</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Late returns incur a penalty per 5 pesos minute.</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Lost or unreturned powerbanks will incur the full replacement fee.</Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.primary }]}>• Minimum wallet balance: ₱100. No refunds.</Text>
            </Card.Content>
          </Card>
          <View style={{ height: 100 }} />
        </ScrollView>
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
    marginBottom: 30,
  },
  logoInline: { width: 50, height: 50 },
  scrollContent: { padding: 20 },
  header: { fontSize: 40 ,marginBottom: 40, fontWeight: "bold" },
  card: {
    borderRadius: 15,
    marginBottom: 20,
    paddingVertical: 10,
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
  cardText: {
    fontSize: 15,
    marginVertical: 2,
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
});