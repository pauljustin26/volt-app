import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Button,
  Divider,
  Modal,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../config/firebaseConfig";
import { onSnapshot, collection, query, orderBy, Unsubscribe } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);
  const theme = useTheme();

  // Combined listener useEffect for Auth State and Firestore Snapshot
  useEffect(() => {
    const user = auth.currentUser;
    let unsubscribeSnapshot: Unsubscribe = () => {}; // Initialize as no-op function

    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Firestore real-time listener
    // Path: /users/{uid}/transactions
    const txnsRef = collection(db, "users", user.uid, "transactions");
    const q = query(txnsRef, orderBy("createdAt", "desc"));

    unsubscribeSnapshot = onSnapshot( // Assign the actual unsubscribe function here
      q,
      (snapshot) => {
        const txns = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            reference: doc.id,
            type: data.type,
            description:
              data.type === "topup"
                ? "Wallet Top-up"
                : data.type === "rent"
                ? `Volt Rental ${data.voltID}`
                : `Volt Return ${data.voltID}`,
            amount: data.amount || data.totalFee || 0,
            status: data.status || "pending",
            date:
              data.completedAt?.toDate?.() ||
              data.startTime?.toDate?.() ||
              data.endTime?.toDate?.() ||
              data.createdAt?.toDate?.() ||
              new Date(),
          };
        });

        // Sort transactions by date descending (already mostly sorted by orderBy)
        setTransactions(txns.sort((a, b) => b.date.getTime() - a.date.getTime()));
        setLoading(false);
      },
      (error) => {
        console.error("Transaction snapshot error (Permission Denied expected on sign-out):", error.code, error.message);
        if (error.code === 'permission-denied') {
            setTransactions([]);
        }
        setLoading(false);
      }
    );

    // CRITICAL CLEANUP: Stop the Firestore listener when the component unmounts.
    return () => unsubscribeSnapshot();
    
    // Dependency on auth.currentUser is intentional for re-running the effect on login/logout
  }, [auth.currentUser]); 

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#21DD3D";
      case "pending":
        return "#FDAE37";
      case "failed":
        return "#EB4747";
      default:
        return theme.colors.primary;
    }
  };

  const getIconName = (type: string, status: string) => {
    if (type === "topup") return "wallet";
    if (status === "completed") return "checkmark-circle";
    if (status === "failed") return "close-circle";
    return "time-outline";
  };

  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <View style={styles.fixedHeader}>
          <Text
            variant="headlineMedium"
            style={[styles.listHeader, { color: theme.colors.primary }]}
          >
            Transaction History
          </Text>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={60} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, marginTop: 10 }}>No transactions found.</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.reference}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedTxn(item)}
                activeOpacity={0.8}
              >
                <Card
                  style={[styles.card, { backgroundColor: theme.colors.onPrimary }]}
                  elevation={3}
                >
                  <Card.Content style={styles.cardContent}>
                    <Ionicons
                      name={getIconName(item.type, item.status)}
                      size={28}
                      color={getStatusColor(item.status)}
                      style={{ marginRight: 12 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.statusText, { color: theme.colors.primary, fontWeight: 'bold' }]}
                      >
                        {item.description}
                      </Text>
                      <Text
                        style={[styles.statusText, { color: theme.colors.primary }]}
                      >
                        {item.date.toLocaleString()}
                      </Text>
                      <Text
                        style={[styles.statusText, { color: getStatusColor(item.status) }]}
                      >
                        Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Text>
                    </View>
                    <Text style={[styles.fee, { color: theme.colors.primary }]}>
                      ₱ {item.amount.toLocaleString("en-PH")}
                    </Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            )}
          />
        )}

        <Portal>
          <Modal
            visible={!!selectedTxn}
            onDismiss={() => setSelectedTxn(null)}
            contentContainerStyle={[
              styles.modalContainer,
              { backgroundColor: theme.colors.onPrimary },
            ]}
          >
            {selectedTxn && (
              <View>
                <Text
                  variant="headlineSmall"
                  style={[styles.modalTitle, { color: theme.colors.primary }]}
                >
                  Transaction Details
                </Text>
                <Divider style={{ marginVertical: 10 }} />
                <Text style={{ color: theme.colors.primary, marginBottom: 4 }}>
                  Reference: {selectedTxn.reference}
                </Text>
                <Text style={{ color: theme.colors.primary, marginBottom: 4 }}>
                  Description: {selectedTxn.description}
                </Text>
                <Text style={{ color: theme.colors.primary, marginBottom: 4 }}>
                  Amount: ₱ {selectedTxn.amount.toLocaleString("en-PH")}
                </Text>
                <Text style={{ color: theme.colors.primary, marginBottom: 12 }}>
                  Date: {selectedTxn.date.toLocaleString()}
                </Text>
                <Button
                  mode="contained"
                  style={{ marginTop: 20 }}
                  onPress={() => setSelectedTxn(null)}
                  buttonColor={theme.colors.primary}
                  textColor={theme.colors.onPrimary}
                >
                  Close
                </Button>
              </View>
            )}
          </Modal>
        </Portal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingTop: 16 },
  fixedHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  listHeader: { fontWeight: "700", marginTop: 12, marginBottom: 12 },
  card: { marginBottom: 12, borderRadius: 12 },
  cardContent: { flexDirection: "row", alignItems: "center" },
  statusText: { marginTop: 2, fontSize: 13 },
  fee: { fontWeight: "bold", fontSize: 16 },
  modalContainer: { padding: 20, margin: 20, borderRadius: 16 },
  modalTitle: { fontWeight: "bold", marginBottom: 10 },
});