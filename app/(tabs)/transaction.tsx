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
  Chip,
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
    let unsubscribeSnapshot: Unsubscribe = () => {};
    // Start by assuming we are loading
    setLoading(true);

    // 1. Listen for AUTH State Changes first
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      // 2. Auth state is confirmed (user object or null)

      // Clean up previous Firestore listener if it exists
      unsubscribeSnapshot(); 

      if (!user) {
        // User is not signed in
        setTransactions([]);
        setLoading(false);
        return;
      }

      // 3. User is signed in, set up Firestore listener
      const txnsRef = collection(db, "users", user.uid, "transactions");
      const q = query(txnsRef, orderBy("createdAt", "desc"));

      unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          // ... your existing snapshot mapping logic ...
          const txns = snapshot.docs.map((doc) => {
             const data = doc.data();
             
             let displayAmount = 0;
             let description = "";

             if (data.type === 'rent') {
                 displayAmount = data.fee || 0;
                 description = `Volt ${data.voltID || ''}`;
             } else if (data.type === 'return') {
                 displayAmount = data.penaltyFee || 0;
                 description = `Volt ${data.voltID || ''}`;
             } else if (data.type === 'topup') {
                 displayAmount = data.amount || 0;
                 description = "Wallet Recharge";
             }

             return {
                 reference: doc.id,
                 type: data.type,
                 description,
                 amount: displayAmount,
                 status: data.status || "pending",
                 
                 penaltyFee: data.penaltyFee || 0,
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
          if (error.code === 'permission-denied') {
              setTransactions([]);
          }
          setLoading(false);
        }
      );
    });

    // 4. Return cleanup function for both listeners
    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot(); 
    }
  }, []); // Empty dependency array, as auth.onAuthStateChanged handles state changes


  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "#21DD3D";
      case "pending": return "#FDAE37";
      case "failed": return "#EB4747";
      // Active status usually implies ongoing, use primary color or a specific status color
      case "active": return theme.colors.primary; 
      default: return theme.colors.primary;
    }
  };

  const getIconName = (type: string, status: string, penalty: number) => {
    if (type === "topup") return "wallet";
    // Modified: Always return checkmark for completed, even if late
    if (status === "completed") return "checkmark-circle";
    if (status === "failed") return "close-circle";
    return "time-outline"; // Active rent falls here
  };

  // Helper for modal rows
  const DetailRow = ({label, value, color, bold}: any) => (
    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
        <Text style={{color: color, opacity: 0.7}}>{label}:</Text>
        <Text style={{color: color, fontWeight: bold ? 'bold' : 'normal'}}>{value}</Text>
    </View>
  );

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
                      name={getIconName(item.type, item.status, item.penaltyFee)}
                      size={28}
                      // Modified: Use standard status color (green for completed)
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
                        
                        {/* LATE Chip REMOVED here */}
                      </View>
                      
                      <Text style={[styles.statusText, { color: theme.colors.primary, opacity: 0.7 }]}>
                        {item.date.toLocaleString()}
                      </Text>
                    </View>
                    
                    {/* Amount / Status Display */}
                    <View style={{ alignItems: 'flex-end' }}>
                        {item.status === 'active' ? (
                            <Text style={[styles.fee, { color: theme.colors.primary }]}>
                                Active
                            </Text>
                        ) : item.type === 'return' ? (
                            // Return Transaction Logic
                            <>
                                <Text style={[styles.fee, { color: theme.colors.primary }]}>
                                    Completed
                                </Text>
                                {item.penaltyFee > 0 && (
                                    <Text style={{ fontSize: 11, color: theme.colors.error, fontWeight: '600' }}>
                                        Penalty: ₱ {item.amount.toLocaleString("en-PH")}
                                    </Text>
                                )}
                            </>
                        ) : (
                            // Rent (Initial Fee) or Topup
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

        {/* --- DETAILS MODAL --- */}
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
                  {/* Always show "Transaction Details" */}
                  Transaction Details
                </Text>
                <Divider style={{ marginVertical: 10, backgroundColor: "#d7d7d7ff" }} />
                
                <DetailRow label="Reference" value={selectedTxn.reference} color={theme.colors.primary} />
                <DetailRow label="Type" value={selectedTxn.type.toUpperCase()} color={theme.colors.primary} />
                <DetailRow label="Date" value={selectedTxn.date.toLocaleString()} color={theme.colors.primary} />

                {/* --- RENTAL / RETURN BREAKDOWN --- */}
                {selectedTxn.type === 'return' && (
                  <View style={styles.penaltyContainer}>
                    <Text style={{color: theme.colors.onSurfaceVariant, marginBottom: 8, fontWeight: 'bold'}}>Usage Breakdown</Text>
                    
                    <DetailRow label="Allowed Duration" value={`${selectedTxn.allowedMinutes} mins`} color={theme.colors.primary} />
                    <DetailRow label="Time Used" value={`${selectedTxn.usedMinutes} mins`} color={theme.colors.primary} />
                    
                    {selectedTxn.overdueMinutes > 0 ? (
                        <>
                            <Divider style={{marginVertical: 6, backgroundColor: "#d7d7d7ff"}} />
                            <DetailRow 
                                label="Overdue By" 
                                value={`${selectedTxn.overdueMinutes} mins`} 
                                color={theme.colors.error} 
                                bold 
                            />
                            <DetailRow 
                                label="Penalty Deducted" 
                                value={`₱ ${selectedTxn.penaltyFee.toFixed(2)}`} 
                                color={theme.colors.error} 
                                bold
                            />
                        </>
                    ) : (
                        <Text style={{color: '#21DD3D', fontStyle: 'italic', marginTop: 4, textAlign: 'center'}}>Returned within time limit.</Text>
                    )}
                  </View>
                )}

                <Divider style={{ marginVertical: 15, backgroundColor: "#d7d7d7ff" }} />
                
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Text style={{fontSize: 18, color: theme.colors.primary}}>
                        {selectedTxn.type === 'return' ? "Total Penalty:" : "Total Amount:"}
                    </Text>
                    <Text style={{fontSize: 24, fontWeight: 'bold', color: selectedTxn.penaltyFee > 0 ? theme.colors.error : theme.colors.primary}}>
                        ₱ {selectedTxn.amount.toLocaleString("en-PH")}
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