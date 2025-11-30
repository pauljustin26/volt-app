import React, { useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  Text, 
  Button, 
  Card, 
  useTheme, 
  ActivityIndicator, 
  Snackbar 
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { collection, doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "../../config/firebaseConfig"; 
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

// Hardcoded status colors 
const STATUS_COLORS = {
    succeeded: { color: '#1B8552', background: '#D6F5E3' }, // Green
    denied: { color: '#EB4747', background: '#FDE4E4' },     // Red
    pending: { color: '#FDAE37', background: '#FFF7E6' },    // Orange/Yellow
};

// --- Status Indicator Component ---
const StatusIndicator = ({ status, theme, amount, txnId }: { status: 'pending' | 'succeeded' | 'denied', theme: any, amount: number, txnId: string }) => {
  const { color, background } = STATUS_COLORS[status];
  const amountText = `₱${amount.toFixed(2)}`;
  
  let iconName: keyof typeof Ionicons.glyphMap;
  let title: string;
  let message: string;
  
  const isResolved = status !== 'pending';

  switch (status) {
    case 'succeeded':
      iconName = 'checkmark-circle';
      title = 'Transaction Approved!';
      message = `${amountText} has been added to your wallet. You can now use your balance for renting.`;
      break;
    case 'denied':
      iconName = 'close-circle';
      title = 'Transaction Denied';
      message = `The submission for ${amountText} was denied by an administrator. Please check your transaction history for details and submit a new request if needed.`;
      break;
    case 'pending':
    default:
      iconName = 'time';
      title = 'Awaiting Approval';
      message = `Your recharge balance request for ${amountText} has been submitted. We are verifying your receipt.`;
  }

  return (
    <Card style={[styles.statusCard, { borderLeftColor: color, backgroundColor: theme.colors.onPrimary }]}>
        <Card.Content style={styles.statusContent}>
            <View style={{ alignItems: 'center', width: '100%' }}>
                {status === 'pending' ? (
                    <ActivityIndicator size={36} color={color} style={{ marginBottom: 15 }} />
                ) : (
                    <Ionicons name={iconName} size={36} color={color} style={{ marginBottom: 15 }} />
                )}

                <Text style={[styles.statusTitle, { color: color }]}>{title}</Text>
                
                <Text style={{ color: theme.colors.onSurface, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
                    {message}
                </Text>
            </View>
        </Card.Content>
    </Card>
  );
};


export default function TransactionStatusScreen() {
    const theme = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams();

    // Initial state from params
    const initialTxnId = params.txnId as string;
    const initialStatus = (params.status as 'pending' | 'succeeded' | 'denied') || 'pending';
    const initialAmount = parseFloat(params.amount as string) || 0;

    const [currentStatus, setCurrentStatus] = useState<'pending' | 'succeeded' | 'denied'>(initialStatus);
    const [txnAmount, setTxnAmount] = useState<number>(initialAmount);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '', isError: false });

    // --- Real-time listener for the specific transaction ID ---
    useEffect(() => {
        if (!initialTxnId) {
            setLoading(false);
            return;
        }

        // ⭐ FIX: If this is the placeholder ID, do NOT fetch from Firestore.
        // We simply trust the data passed via params and show the Success UI.
        if (initialTxnId === 'online_success_pending_webhook') {
            setCurrentStatus('succeeded');
            setLoading(false);
            return; 
        }

        // Only run this logic for REAL IDs (Manual uploads or History items)
        const txnRef = doc(db, 'transactions', initialTxnId);
        
        const unsubscribe = onSnapshot(txnRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const newStatus = (data.status as 'pending' | 'succeeded' | 'denied');

                // ⭐ REMOVED: The logic that showed the "Transaction SUCCEEDED!" snackbar
                
                setCurrentStatus(newStatus);
                setTxnAmount(data.amount || initialAmount);
            } else {
                setSnackbar({ visible: true, message: "Transaction record not found.", isError: true });
            }
            setLoading(false);
        }, (error) => {
            console.error("Status listener error:", error);
            // Don't show error for permission issues if it's just a lag
            if (!error.message.includes('permission')) {
                 setSnackbar({ visible: true, message: "Failed to track status.", isError: true });
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [initialTxnId, initialAmount]);

    if (loading) {
        return (
            <LinearGradient
                colors={(theme.colors as any).gradientColors || ["#6a11cb", "#2575fc"]}
                style={styles.container}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <SafeAreaView style={styles.centeredContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.primary, marginTop: 15 }}>Loading transaction status...</Text>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient
            colors={(theme.colors as any).gradientColors || ["#6a11cb", "#2575fc"]}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <SafeAreaView style={styles.contentContainer}>
                
                <Text style={[styles.mainHeader, { color: theme.colors.primary, marginBottom: 40 }]}>
                    Payment Status
                </Text>

                <StatusIndicator 
                    status={currentStatus} 
                    theme={theme} 
                    amount={txnAmount} 
                    txnId={initialTxnId} 
                />

                <Button
                    mode="contained"
                    onPress={() => router.replace('/')}
                    style={styles.button}
                    buttonColor={theme.colors.primary}
                    textColor={theme.colors.onPrimary}
                    // ⭐ ADDED: Disable button if pending
                    disabled={currentStatus === 'pending'}
                >
                    Return to Home
                </Button>

            </SafeAreaView>
            
            {/* Universal Snackbar (Kept for errors like "Record not found", but removed for status updates) */}
            <Snackbar
                visible={snackbar.visible}
                onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
                duration={3000}
                style={{ backgroundColor: snackbar.isError ? theme.colors.error : theme.colors.primary }}
                theme={{ colors: { inverseOnSurface: theme.colors.onPrimary } }}
            >
                <Text style={{ color: theme.colors.onPrimary }}>{snackbar.message}</Text>
            </Snackbar>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1 
    },
    centeredContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    contentContainer: { 
        flex: 1, 
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainHeader: { 
        fontSize: 28, 
        fontWeight: "bold", 
        textAlign: "center" 
    },
    // Status Card Styles
    statusCard: {
        borderRadius: 15,
        borderLeftWidth: 8, 
        padding: 0,
        elevation: 5,
        width: '100%',
        maxWidth: 400,
    },
    statusContent: {
        alignItems: 'center',
        paddingVertical: 30,
        paddingHorizontal: 20,
    },
    statusTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    button: {
        marginTop: 40,
        width: '100%',
        maxWidth: 300,
        borderRadius: 10,
    },
    textButton: {
        marginTop: 15,
        width: '100%',
        maxWidth: 300,
    }
});