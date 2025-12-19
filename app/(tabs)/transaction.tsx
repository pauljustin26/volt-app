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

  useEffect(() => {
    let unsubscribeSnapshot: Unsubscribe = () => {};
    setLoading(true);

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      unsubscribeSnapshot(); 

      if (!user) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      const txnsRef = collection(db, "users", user.uid, "transactions");
      const q = query(txnsRef, orderBy("createdAt", "desc"));

      unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const txns = snapshot.docs.map((doc) => {
             const data = doc.data();
             
             let displayAmount = 0;
             let description = "";

             if (data.type === 'rent') {
                 displayAmount = data.fee || 0;
                 description = `Volt ${data.voltID || ''} Rental`;
             } else if (data.type === 'return') {
                 // For the LIST view, we generally show the TOTAL paid (Fee + Penalty)
                 const penalty = data.penaltyFee || 0;
                 const baseFee = data.fee || 0;
                 displayAmount = baseFee + penalty; // Show full amount paid
                 
                 description = `Volt ${data.voltID || ''} Return`;
             } else if (data.type === 'topup') {
                 displayAmount = data.amount || 0;
                 description = "Wallet Recharge";
             } else {
                 description = "Transaction";
                 displayAmount = data.amount || 0;
             }

             return {
                 reference: doc.id,
                 type: data.type,
                 description,
                 amount: displayAmount,
                 status: data.status || "pending", 
                 
                 // Return Details
                 penaltyFee: data.penaltyFee || 0,
                 fee: data.fee || 0, // Base fee
                 overdueMinutes: data.overdueMinutes || 0,
                 usedMinutes: data.usedMinutes || 0,
                 allowedMinutes: data.allowedMinutes || 0,
                 
                 date:
                   data.completedAt?.toDate?.() ||
                   data.startTime?.toDate?.() ||
                   data.endTime?.toDate?.() ||
                   data.createdAt?.toDate?.() ||
                   new Date(),
             };
          });

          setTransactions(txns.sort((a, b) => b.date.getTime() - a.date.getTime()));
          setLoading(false);
        },
        (error) => {
          console.error("Snapshot error:", error);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot(); 
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed": 
      case "succeeded": return "#21DD3D"; // Green
      case "pending": return "#FDAE37";   // Orange
      case "denied": 
      case "failed": return "#EB4747";    // Red
      case "active": return theme.colors.primary; // Blue
      default: return theme.colors.primary;
    }
  };

  const getIconName = (type: string, status: string) => {
    if (status === "denied" || status === "failed") return "alert-circle"; 
    if (type === "topup") return "wallet";
    if (status === "completed" || status === "succeeded") return "checkmark-circle";
    return "time-outline"; 
  };

  const DetailRow = ({label, value, color, bold}: any) => (
    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
        <Text style={{color: color || theme.colors.onSurface, opacity: 0.8}}>{label}:</Text>
        <Text style={{color: color || theme.colors.onSurface, fontWeight: bold ? 'bold' : 'normal'}}>{value}</Text>
    </View>
  );

  // --- MODAL CONTENT RENDERER ---
  const renderModalContent = () => {
    if (!selectedTxn) return null;

    const isRent = selectedTxn.type === 'rent';
    const isReturn = selectedTxn.type === 'return';
    const isTopup = selectedTxn.type === 'topup';
    const isDenied = selectedTxn.status === 'denied' || selectedTxn.status === 'failed';
    const hasPenalty = selectedTxn.penaltyFee > 0;

    // 1. Determine Label logic
    let totalLabel = "Total Amount:"; // Always use this now as requested
    
    // 2. Determine Color logic
    let totalColor = theme.colors.primary;
    if (isDenied) totalColor = "#ccc";
    else if (isReturn && hasPenalty) totalColor = theme.colors.error; 

    return (
      <View>
        <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme.colors.primary }]}>
          Transaction Details
        </Text>
        <Divider style={{ marginVertical: 10, backgroundColor: "#d7d7d7ff" }} />
        
        <DetailRow label="Reference" value={selectedTxn.reference.slice(0, 15)} color={theme.colors.primary} />
        <DetailRow label="Type" value={selectedTxn.type.toUpperCase()} color={theme.colors.primary} />
        <DetailRow label="Date" value={selectedTxn.date.toLocaleString()} color={theme.colors.primary} />
        
        {/* ⭐ ADDED: Base Fee at Top */}
        {(isReturn || isRent) && (
             <DetailRow label="Base Fee" value={`₱ ${selectedTxn.fee}.00`} color={theme.colors.primary} />
        )}

        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
            <Text style={{color: theme.colors.primary, opacity: 0.8}}>Status:</Text>
            <Text style={{color: getStatusColor(selectedTxn.status), fontWeight: 'bold'}}>
                {selectedTxn.status.toUpperCase()}
            </Text>
        </View>

        {/* --- RETURN DETAILS --- */}
        {isReturn && (
          <View style={styles.penaltyContainer}>
            <Text style={{color: theme.colors.onSurfaceVariant, marginBottom: 8, fontWeight: 'bold'}}>
                Usage Breakdown
            </Text>
            <DetailRow label="Allowed Duration" value={`${selectedTxn.allowedMinutes} mins`} color={theme.colors.primary} />
            <DetailRow label="Time Used" value={`${selectedTxn.usedMinutes} mins`} color={theme.colors.primary} />
            
            {hasPenalty ? (
                <>
                    <Divider style={{marginVertical: 6, backgroundColor: "#d7d7d7ff"}} />
                    <DetailRow label="Overdue By" value={`${selectedTxn.overdueMinutes} mins`} color={theme.colors.error} bold />
                    {/* ⭐ ADDED: Penalty Fee in Breakdown */}
                    <DetailRow label="Penalty Fee" value={`+ ₱ ${selectedTxn.penaltyFee}.00`} color={theme.colors.error} bold />
                </>
            ) : (
                <Text style={{color: '#21DD3D', fontStyle: 'italic', marginTop: 4, marginBottom: 8, textAlign: 'center'}}>
                    Returned within time limit.
                </Text>
            )}
          </View>
        )}


        <Divider style={{ marginVertical: 15, backgroundColor: "#d7d7d7ff" }} />
        
        {/* --- TOTAL ROW --- */}
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{fontSize: 18, color: theme.colors.primary}}>
                {totalLabel}
            </Text>
            <Text style={{fontSize: 24, fontWeight: 'bold', color: totalColor }}>
                <Text style={isDenied ? {textDecorationLine: 'line-through'} : {}}>
                    ₱ {selectedTxn.amount.toLocaleString("en-PH")}
                </Text>
            </Text>
        </View>

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
    );
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Text
                          style={[styles.statusText, { color: theme.colors.primary, fontWeight: 'bold', marginRight: 8 }]}
                        >
                          {item.description}
                        </Text>
                      </View>
                      
                      <Text style={[styles.statusText, { color: theme.colors.primary, opacity: 0.7 }]}>
                        {item.date.toLocaleString()}
                      </Text>
                    </View>
                    
                    <View style={{ alignItems: 'flex-end' }}>
                        {item.status === 'denied' ? (
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#EB4747' }}>
                                DENIED
                            </Text>
                        ) : item.status === 'active' ? (
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.colors.primary }}>
                                ACTIVE
                            </Text>
                        ) : (
                            <Text style={[styles.fee, { color: theme.colors.primary }]}>
                                ₱ {item.amount.toLocaleString("en-PH")}
                            </Text>
                        )}
                    </View>
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
            {renderModalContent()}
          </Modal>
        </Portal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingTop: 16, paddingBottom: 100 },
  fixedHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  listHeader: { fontWeight: "700", marginTop: 12, marginBottom: 12 },
  card: { marginBottom: 12, borderRadius: 12 },
  cardContent: { flexDirection: "row", alignItems: "center" },
  statusText: { marginTop: 2, fontSize: 13 },
  fee: { fontWeight: "bold", fontSize: 16 },
  modalContainer: { padding: 20, margin: 20, borderRadius: 16 },
  modalTitle: { fontWeight: "bold", marginBottom: 10 },
  penaltyContainer: {
      backgroundColor: 'rgba(0,0,0,0.03)',
      padding: 10,
      borderRadius: 8,
      marginTop: 10
  }
});