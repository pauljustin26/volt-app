import React, { useState, useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Button, Text, Card, useTheme, ActivityIndicator, HelperText } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { db, auth } from "../../config/firebaseConfig";
// Import Firestore listener functions
import { doc, onSnapshot } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function ReturnConfirmation() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const screenWidth = Dimensions.get("window").width;

  const [loading, setLoading] = useState(false);
  // State to track sensor status
  const [isInserted, setIsInserted] = useState(false); 
  const [sensorStatusText, setSensorStatusText] = useState("Checking...");

  const voltId = params.voltId as string;
  const uid = auth.currentUser?.uid;

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  // --- 1. Listen to Volt Status ---
  useEffect(() => {
    if (!voltId) return;

    const voltRef = doc(db, "volts", voltId);
    
    // Real-time listener
    const unsubscribe = onSnapshot(voltRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const status = data.sensorStatus || "UNKNOWN";
            
            setSensorStatusText(status);

            // Enable button ONLY if status is explicitly CHARGING
            if (status === "CHARGING") {
                setIsInserted(true);
            } else {
                setIsInserted(false);
            }
        }
    });

    return () => unsubscribe();
  }, [voltId]);
  
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

      if (!res.ok) {
          const errorText = await res.text();
          // Try to parse JSON error first
          try {
             const jsonErr = JSON.parse(errorText);
             throw new Error(jsonErr.message);
          } catch {
             throw new Error(errorText);
          }
      }
      
      router.push('/return/returnSuccess');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to return Volt');
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
            <Text style={[styles.label, { color: theme.colors.primary }]}>Volt ID: <Text style={{fontWeight:'bold'}}>{voltId}</Text></Text>
            
            {/* Status Indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <Text style={{ marginRight: 8, color: theme.colors.onSurface }}>Sensor Status:</Text>
                <Text style={{ 
                    fontWeight: 'bold', 
                    color: isInserted ? '#21DD3D' : theme.colors.error // Green if charging, Red if not
                }}>
                    {sensorStatusText}
                </Text>
            </View>
          </View>

          {/* Instructions */}
          {!isInserted && (
             <HelperText type="info" visible={true} style={{ textAlign: 'center', color: theme.colors.error }}>
                Please insert the Powerbank into the slot to enable return.
             </HelperText>
          )}

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
              // ⭐ DISABLE IF NOT INSERTED (CHARGING)
              disabled={!isInserted} 
            >
              {isInserted ? "Confirm Return" : "Waiting for Device..."}
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
    gap: 15,
  },
  header: {
    fontWeight: "700",
    textAlign: "center",
  },
  infoBox: {
    alignItems: "center",
    marginVertical: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    width: '100%'
  },
  label: {
    fontSize: 16,
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
    width: "100%",
    marginTop: 15,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    width: "100%",
    marginTop: 10,
  },
  backButtonLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
});
