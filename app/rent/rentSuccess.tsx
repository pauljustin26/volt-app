// app/rent/rentSuccess.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import { Button, Text, Card, useTheme } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";
import { LinearGradient } from "expo-linear-gradient";

export default function RentSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const screenWidth = Dimensions.get("window").width;

  const transactionId = params.transactionId as string;
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<any>(null);

  useEffect(() => {
      const fetchTransaction = async () => {
        if (!transactionId || !auth.currentUser) {
          setLoading(false);
          return;
        }

        try {
          const txnSnap = await getDoc(doc(db, "users", auth.currentUser.uid, "transactions", transactionId));
          if (txnSnap.exists()) setTransaction(txnSnap.data());
        } catch (err) {
          console.error("Error fetching transaction:", err);
        } finally {
          setLoading(false);
        }
      };
    fetchTransaction();
  }, [transactionId]);

  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <Text variant="headlineLarge" style={[styles.header, { color: theme.colors.primary }]}>
        Success!
      </Text>

      <Card
        style={[
          styles.card,
          { width: screenWidth * 0.9, backgroundColor: theme.colors.onPrimary },
        ]}
      >
        <Card.Content style={styles.cardContent}>
          <Ionicons name="lock-open-outline" size={70} color={theme.colors.primary} />

          <Text style={[styles.subText, { color: theme.colors.primary }]}>
            Volt unlocked! Please take your power bank.
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : transaction ? (
            <View style={styles.infoContainer}>
              <View style={styles.infoBox}>
                <Text style={[styles.label, { color: theme.colors.primary }]}>Volt ID:</Text>
                <Text style={[styles.value, { color: theme.colors.primary }]}>
                  {transaction.voltID}
                </Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={[styles.label, { color: theme.colors.primary }]}>Fee:</Text>
                <Text style={[styles.value, { color: theme.colors.primary }]}>₱{transaction.fee}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={[styles.label, { color: theme.colors.primary }]}>Status:</Text>
                <Text style={[styles.value, { color: theme.colors.primary }]}>
                  {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </Text>
              </View>
            </View>
          ) : null}

          <Button
            mode="contained"
            onPress={() => router.push("/")}
            style={styles.button}
            labelStyle={styles.buttonLabel}
            buttonColor={theme.colors.primary}
          >
            Go to Home
          </Button>

          <Button
            mode="outlined"
            onPress={() => router.push("/transaction")}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            View Transaction
          </Button>
        </Card.Content>
      </Card>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    textAlign: "center",
    marginBottom: 25,
    fontWeight: "700",
  },
  subText: {
    textAlign: "center",
    marginVertical: 10,
    fontSize: 15,
  },
  card: {
    borderRadius: 20,
    paddingVertical: 25,
    paddingHorizontal: 20,
    elevation: 6,
  },
  cardContent: {
    alignItems: "center",
    gap: 20,
  },
  infoContainer: {
    marginTop: 10,
    gap: 12,
    width: "100%",
    alignItems: "center",
  },
  infoBox: {
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
  },
  value: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 3,
  },
  button: {
    borderRadius: 14,
    width: "85%",
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
