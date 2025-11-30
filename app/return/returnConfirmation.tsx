import React, { useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Button, Text, Card, useTheme, ActivityIndicator } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { db, auth } from "../../config/firebaseConfig";
import { doc, updateDoc, query, where, getDocs, collection, arrayRemove, writeBatch } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function ReturnConfirmation() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const screenWidth = Dimensions.get("window").width;

  const [loading, setLoading] = useState(false);
  const voltId = params.voltId as string;
  const uid = auth.currentUser?.uid;

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  
  // Confirm return
  const handleConfirmReturn = async () => {
    if (!voltId) return;

    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/return/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voltID: voltId }),
      });

      if (!res.ok) throw new Error(await res.text()); ``
      router.push('/return/returnSuccess');
    } catch (err) {
      console.error(err);
      alert('Failed to return Volt');
    } finally {
      setLoading(false);
    }
  };



  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Card
        style={[styles.card, { width: screenWidth * 0.9, backgroundColor: theme.colors.onPrimary }]}
        mode="elevated"
      >
        <Card.Content style={styles.cardContent}>
          <Ionicons name="cube-outline" size={60} color={theme.colors.primary} />

          <Text variant="headlineMedium" style={[styles.header, { color: theme.colors.primary }]}>
            Confirm Return
          </Text>

          <View style={styles.infoBox}>
            <Text style={[styles.label, { color: theme.colors.primary }]}>Volt ID</Text>
            <Text style={[styles.value, { color: theme.colors.primary }]}>{voltId}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.primary }]}>
                Processing return...
              </Text>
            </View>
          ) : (
            <Button
              mode="contained"
              onPress={handleConfirmReturn}
              style={styles.button}
              labelStyle={styles.buttonLabel}
              buttonColor={theme.colors.primary}
            >
              Confirm Return
            </Button>
          )}

          <Button
            mode="text"
            onPress={() => router.back()}
            style={styles.backButton}
            labelStyle={[styles.backButtonLabel, { color: theme.colors.primary }]}
            icon={({ size, color }) => <Ionicons name="arrow-back" size={size} color={color} />}
          >
            Go Back
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
  header: {
    fontWeight: "700",
    textAlign: "center",
  },
  infoBox: {
    alignItems: "center",
    marginVertical: 10,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 3,
  },
  loadingContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  button: {
    borderRadius: 14,
    width: "85%",
    marginTop: 15,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    width: "85%",
    marginTop: 10,
  },
  backButtonLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
});
