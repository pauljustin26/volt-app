import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Dimensions, Image, StyleSheet, View, ScrollView, Alert, TouchableOpacity  } from "react-native";
import { ActivityIndicator, Button, Card, IconButton, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, doc, onSnapshot, getDoc, Unsubscribe } from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";
import { useAppTheme } from "../_layout";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";

export default function VoltsList() {
  const theme = useTheme();
  const { isDark, toggleTheme } = useAppTheme();
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;

  const [loading, setLoading] = useState(true);
  const [volts, setVolts] = useState<any[]>([]);
  const [myRentals, setMyRentals] = useState<any[]>([]);
  const [reservingVoltId, setReservingVoltId] = useState<string | null>(null);
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  // TabView state
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "available", title: "Rent" },
    { key: "myRentals", title: "Return" },
  ]);

  // Load all volts
  useEffect(() => {
    // Listener for all volts
    const voltsQuery = collection(db, "volts");
    let unsubscribeVolts: Unsubscribe = () => {};
    let unsubscribeRentals: Unsubscribe = () => {};

    unsubscribeVolts = onSnapshot(voltsQuery, (snapshot) => {
      const voltsData: any[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setVolts(voltsData);
      setLoading(false);
    }, (error) => {
        if (error.code === 'permission-denied') setVolts([]);
        console.error("Volts listener error:", error.message);
        setLoading(false);
    });

    // Listener for user rentals (Only runs if user is present)
    const user = auth.currentUser;
    if (user) {
        const rentalsQuery = collection(db, "volts");
        unsubscribeRentals = onSnapshot(rentalsQuery, (snapshot) => {
            const rentalData = snapshot.docs
                .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as any)
                .filter((volt) => volt.studentUID === user.uid && volt.status === "rented");
            setMyRentals(rentalData);
        }, (error) => {
            if (error.code === 'permission-denied') setMyRentals([]);
            console.error("MyRentals listener error:", error.message);
        });
    }


    // CRITICAL CLEANUP: Unsubscribe all listeners
    return () => {
        unsubscribeVolts();
        unsubscribeRentals();
    };

  }, [auth.currentUser]);

  const handleRent = async (volt: any) => {
    if (!auth.currentUser) {
      Alert.alert("Not logged in", "Please log in to rent a volt.");
      return;
    }

    // ⭐ 1. CHECK FOR EXISTING RENTAL LIMIT HERE
    if (myRentals.length > 0) {
      Alert.alert(
        "Limit Reached", 
        "You already have an active rental. Please return your current Volt before renting another one."
      );
      return;
    }

    try {
      setReservingVoltId(volt.id);

      const token = await auth.currentUser.getIdToken();
      // Fetch student ID from Firestore user document (one-time read)
      const userDocSnapshot = await getDoc(doc(db, "users", auth.currentUser.uid));
      const studentId = userDocSnapshot.data()?.studentId;

      if (!studentId) throw new Error("Student ID not found");

      // Reserve the volt (backend call)
      const reserveRes = await fetch(`${API_URL}/volts/reserve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          voltId: volt.id,
          studentId,
        }),
      });

      const reserveData = await reserveRes.json();

      if (!reserveRes.ok) throw new Error(reserveData.message || "Failed to reserve volt");

      // Navigate to confirmation screen for final rent/payment
      router.push({
        pathname: "/rent/rentConfirmation",
        params: { voltId: volt.id, studentUID: auth.currentUser.uid },
      });

    } catch (err: any) {
      console.error("Rent failed:", err.message);
      Alert.alert("Rent Failed", err.message);
    } finally {
      setReservingVoltId(null);
    }
  };


  // Render pill list for volts
  const renderVoltPills = (voltList: any[], isRental = false) => {
    return voltList.map((volt) => {
      let dotColor = "#EB4747";
      let statusText = "Unavailable";
      let statusTextColor = theme.colors.onPrimary;

      if (volt.status === "available") {
        dotColor = "#21DD3D";
        statusText = "Available";
        statusTextColor = theme.colors.onPrimary;
      } else if (volt.status === "reserved") {
        dotColor = "#FFC107";
        statusText = "Reserved";
        statusTextColor = theme.colors.onPrimary;
      }

      if (volt.studentUID === auth.currentUser?.uid && volt.status === "rented") {
        dotColor = "#21DD3D";
        statusText = "Renting";
        statusTextColor = theme.colors.onPrimary;
      }

      const handlePress = () => {
        if (isRental) {
          router.push({
            pathname: "/return/returnConfirmation",
            params: { voltId: volt.id, studentUID: volt.studentUID },
          });
        } else if (volt.status === "available") {
          handleRent(volt);
        }
      };

      return (
        <TouchableOpacity
          key={volt.id}
          onPress={handlePress}
          activeOpacity={0.7}
          style={{ width: "100%", marginTop: 10 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: theme.colors.primary,
              borderRadius: 15,
              paddingVertical: 12,
              paddingHorizontal: 16,
              height: 55,
            }}
          >
            {/* Left Section: Icon + Volt ID */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Image
                source={isDark ? require("../../assets/images/pb-dark.png") : require("../../assets/images/pb-white.png")}
                style={{ width: 24, height: 24, marginRight: 8 }}
                resizeMode="contain"
              />
              <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold", fontSize: 16 }}>
                Volt {volt.id}
              </Text>
            </View>

            {/* Right Section: Status text FIRST, then dot */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  color: statusTextColor,
                  fontWeight: "bold",
                  marginRight: 6,
                }}
              >
                {statusText}
              </Text>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: dotColor,
                }}
              />
            </View>
          </View>
        </TouchableOpacity>
      );
    });
  };



// Rent tab
const AvailableRoute = () => {
  const availableVolts = volts.filter(
    (volt) => !volt.studentUID || volt.studentUID !== auth.currentUser?.uid
  );

  return (
    <ScrollView
      contentContainerStyle={{ paddingVertical: 16, alignItems: "center" }}
      showsVerticalScrollIndicator={false}
    >
      <Card style={[styles.card, {backgroundColor: theme.colors.onPrimary}, { width: "90%" }]}>
        <Card.Content>
          <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>
            Available Units
          </Text>
          <View style={{ marginTop: 8 }}>
            {renderVoltPills(availableVolts)}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};


// Return tab
const MyRentalsRoute = () => (
  <ScrollView contentContainerStyle={{ paddingVertical: 16, alignItems: "center" }}>
    <Card style={[styles.card, {backgroundColor: theme.colors.onPrimary}, { width: "90%" }]}>
      <Card.Content>
        <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Current Rental's</Text>
        {myRentals.length > 0 ? (
          <View style={{ marginTop: 8 }}>{renderVoltPills(myRentals, true)}</View>
        ) : (
          <Text style={{ color: theme.colors.primary, marginTop: 16 }}>
            You don’t have any active rentals.
          </Text>
        )}
      </Card.Content>
    </Card>
  </ScrollView>
);


  const renderScene = SceneMap({
    available: AvailableRoute,
    myRentals: MyRentalsRoute,
  });

  if (loading) {
    return (
      <LinearGradient
        colors={(theme.colors as any).gradientColors}
        style={styles.container}
      >
        <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Top Row */}
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

        {/* TabView */}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          style={{ flex: 1 }}
          renderTabBar={(props) => (
            <TabBar
              {...(props as any)}
              indicatorStyle={{ backgroundColor: theme.colors.primary, height: 3, borderRadius: 3 }}
              style={{ backgroundColor: "transparent", elevation: 0, shadowOpacity: 0 }}
              activeColor={theme.colors.primary}
              inactiveColor={theme.colors.primary}
              labelStyle={{ fontWeight: "bold", textTransform: "none" }}
              renderLabel={({ route, focused, color }: any) => (
                <Text style={{ color, fontWeight: focused ? "bold" : "normal" }}>{route.title}</Text>
              )}
            />
          )}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  logoInline: { width: 50, height: 50 },
  card: { borderRadius: 16, padding: 10, elevation: 4, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 6 },
});