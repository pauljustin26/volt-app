import React, { useState, useEffect } from "react";
import { StyleSheet, Image, View, TouchableOpacity, Share, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  Text, 
  TextInput, 
  Button, 
  Card, 
  useTheme, 
  ActivityIndicator, 
  Snackbar 
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "../../config/firebaseConfig"; 
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// QR images (These paths are assumed to be correct relative to the file)
const QR_IMAGES = {
  gcash: require("../../assets/images/gcash-qr.jpg"),
  maya: require("../../assets/images/maya-qr.jpg"),
};

// Hardcoded status colors for reliability and visual impact
const STATUS_COLORS = {
    succeeded: { color: '#1B8552', background: '#D6F5E3' }, // Green
    denied: { color: '#EB4747', background: '#FDE4E4' },     // Red
    pending: { color: '#FDAE37', background: '#FFF7E6' },    // Orange/Yellow
};

// --- Transaction Status Component (Defined Locally) ---
const StatusIndicator = ({ status, theme, transaction }: { status: 'pending' | 'succeeded' | 'denied' | null, theme: any, transaction: any }) => {
  if (!status || !transaction) return null;

  const { color, background } = STATUS_COLORS[status];
  const amountText = transaction.amount ? `₱${parseFloat(transaction.amount).toFixed(2)}` : 'N/A';
  
  let iconName: keyof typeof Ionicons.glyphMap;
  let message: string;

  switch (status) {
    case 'succeeded':
      iconName = 'checkmark-circle';
      message = `Top-up Approved! ${amountText} added to your wallet.`;
      break;
    case 'denied':
      iconName = 'close-circle';
      message = `Top-up Denied. The submitted receipt was deemed invalid.`;
      break;
    case 'pending':
    default:
      iconName = 'time';
      message = `Awaiting Admin Approval for ${amountText}. This may take up to 24 hours.`;
  }

  return (
    <Card style={[styles.statusCardAlert, { borderLeftColor: color, backgroundColor: background }]}>
        <Card.Content style={styles.statusContentAlert}>
            {status === 'pending' ? (
                <ActivityIndicator size="small" color={color} style={{ marginRight: 15 }} />
            ) : (
                <Ionicons name={iconName as any} size={24} color={color} style={{ marginRight: 15 }} />
            )}
            <View style={{ flex: 1 }}>
                <Text style={{ color, fontWeight: 'bold' }}>
                    {status.toUpperCase()}
                </Text>
                <Text style={{ color: theme.colors.onSurface, fontSize: 13, marginTop: 2 }}>
                    {message}
                </Text>
            </View>
        </Card.Content>
    </Card>
  );
};

// --- Main Component ---

export default function RechargeGcashScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "maya">("gcash");

  const [latestTxn, setLatestTxn] = useState<any | null>(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', isError: false });

  const authInstance = getAuth();
  const user = authInstance.currentUser;

  // --- Real-time listener for checking existing PENDING transaction ---
  useEffect(() => {
    let unsubscribe: Unsubscribe = () => {};
    
    if (user) {
        // Query for the user's latest PENDING top-up
        const q = query(
            collection(db, "transactions"),
            where("userId", "==", user.uid),
            where("type", "==", "topup"),
            where("status", "==", "pending"), // Filter specifically for pending
            orderBy("createdAt", "desc")
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const latest = snapshot.docs[0].data();
                setLatestTxn({ id: snapshot.docs[0].id, ...latest });
            } else {
                setLatestTxn(null);
            }
        }, (error) => {
            console.error("Pending transaction listener error:", error);
        });
    } else {
        setLatestTxn(null);
    }

    return () => unsubscribe();
  }, [user?.uid]);

  const showAlert = (message: string, isError = false) => {
    setSnackbar({ visible: true, message, isError });
  };

  const pickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return showAlert("Permission required to pick image", true);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true, 
    });

    if (!result.canceled) {
      const selectedAsset = result.assets[0];
      const fileName = selectedAsset.fileName || selectedAsset.uri.split('/').pop() || 'Selected';
      setReceipt({ ...selectedAsset, fileName });
    }
  };

  // Upload receipt
  const handleUpload = async () => {
    const amountValue = parseFloat(amount);
    if (!amountValue || amountValue <= 0) return showAlert("Please enter a valid amount (e.g., 100.00).", true);
    if (!receipt) return showAlert("Please select the payment receipt image.", true);
    
    // Check local state based on Firestore listener
    if (latestTxn) {
        return router.push({
            pathname: "/wallet/status",
            params: { txnId: latestTxn.id, status: latestTxn.status, amount: latestTxn.amount.toString() }
        });
    }

    setLoading(true);

    try {
      if (!user) throw new Error("Login first");

      const token = await user.getIdToken();

      const formData = new FormData();
      formData.append("amount", amountValue.toString());
      formData.append("userUID", user.uid);
      formData.append("method", `${paymentMethod}-manual`);
      
      const fileType = receipt.type === 'image' ? 'image/jpeg' : 'application/octet-stream';

      formData.append("receipt", {
        uri: receipt.uri,
        name: receipt.fileName || `receipt_${Date.now()}.jpg`,
        type: fileType,
      } as any);

      const response = await axios.post(`${API_URL}/wallet/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Assuming backend returns { transactionId: '...' }
      const { transactionId, amount } = response.data;

      // SUCCESS: Navigate immediately to the status screen
      router.replace({
        pathname: "/wallet/status",
        params: { txnId: transactionId, status: 'pending', amount: amount.toString() }
      });

    } catch (err: any) {
      console.error(err);
      showAlert(err?.response?.data?.message || err.message || "Submission failed. Please try again.", true);
    } finally {
      setLoading(false);
    }
  };

  // Download QR image
  const downloadQR = async () => {
    const url = Image.resolveAssetSource(QR_IMAGES[paymentMethod]).uri;
    try {
      await Share.share({
        url,
        message: `Scan this QR to pay via ${paymentMethod.toUpperCase()}. Save this image to your phone's gallery.`,
        title: `${paymentMethod.toUpperCase()} QR`,
      });
      showAlert(`QR code opened in share menu. Please select "Save/Download" if available.`, false);
    } catch (err) {
      console.error("Share failed", err);
      showAlert("Failed to share QR code.", true);
    }
  };
  
  const isFormDisabled = loading || !!latestTxn; // Disable if submitting or if a PENDING transaction exists

  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors || ["#6a11cb", "#2575fc"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 20 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Main Title */}
          <Text style={[styles.mainHeader, { color: theme.colors.primary }]}>
            Top-up Wallet
          </Text>

          {/* Alert if Pending Txn Exists */}
          {!!latestTxn && (
             <Card style={[styles.statusCardAlert, { borderColor: STATUS_COLORS.pending.color, backgroundColor: STATUS_COLORS.pending.background }]}>
                <Card.Content style={styles.statusContentAlert}>
                    <Ionicons name="alert-circle-outline" size={24} color={STATUS_COLORS.pending.color} style={{ marginRight: 15 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: STATUS_COLORS.pending.color, fontWeight: 'bold' }}>
                            PENDING TRANSACTION
                        </Text>
                        <Text style={{ color: theme.colors.onSurface, fontSize: 13, marginTop: 2 }}>
                            You have a transaction of ₱{latestTxn.amount.toFixed(2)} awaiting admin approval.
                        </Text>
                    </View>
                    <Button
                        mode="contained"
                        onPress={() => router.push({
                            pathname: "/wallet/status",
                            params: { txnId: latestTxn.id, status: latestTxn.status, amount: latestTxn.amount.toString() }
                        })}
                        labelStyle={{ fontSize: 12 }}
                        style={{ marginLeft: 10, backgroundColor: STATUS_COLORS.pending.color }}
                        textColor={theme.colors.onPrimary}
                    >
                        View Status
                    </Button>
                </Card.Content>
            </Card>
          )}

          {/* Top-up Form Card (Vertically Centered Content) */}
          <Card style={[styles.card, { backgroundColor: theme.colors.onPrimary, opacity: isFormDisabled ? 0.6 : 1, marginTop: latestTxn ? 20 : 0 }]}>
            <Card.Content>

              <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>1. Select Payment Method</Text>

              {/* Payment method selection (Segmented Buttons) */}
              <View style={styles.segmentedControlContainer}>
                <TouchableOpacity
                  onPress={() => setPaymentMethod('gcash')}
                  style={[
                    styles.segmentedButton,
                    { borderColor: theme.colors.primary, backgroundColor: paymentMethod === 'gcash' ? theme.colors.primary : theme.colors.surface },
                  ]}
                  disabled={isFormDisabled}
                >
                  <Text style={[styles.segmentText, { color: paymentMethod === 'gcash' ? theme.colors.onPrimary : theme.colors.primary }]}>
                    GCash
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPaymentMethod('maya')}
                  style={[
                    styles.segmentedButton,
                    { borderColor: theme.colors.primary, backgroundColor: paymentMethod === 'maya' ? theme.colors.primary : theme.colors.surface },
                  ]}
                  disabled={isFormDisabled}
                >
                  <Text style={[styles.segmentText, { color: paymentMethod === 'maya' ? theme.colors.onPrimary : theme.colors.primary }]}>
                    Maya
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.cardTitle, { color: theme.colors.primary, marginTop: 25 }]}>2. Scan QR Code</Text>

              {/* QR Image */}
              <TouchableOpacity 
                onPress={downloadQR} 
                style={styles.qrContainer}
                disabled={isFormDisabled}
              >
                <Image
                  source={QR_IMAGES[paymentMethod]}
                  style={styles.qr}
                  resizeMode="contain"
                />
                <Text style={{ textAlign: "center", marginTop: 5, color: theme.colors.primary, fontSize: 13 }}>
                  Tap QR to share/save to gallery
                </Text>
              </TouchableOpacity>

              <Text style={[styles.cardTitle, { color: theme.colors.primary, marginTop: 25 }]}>3. Enter Details & Upload Receipt</Text>

              {/* Amount Input */}
              <TextInput
                placeholder="Amount (₱)"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                style={styles.input}
                disabled={isFormDisabled}
                mode="outlined"
                theme={{ colors: { primary: theme.colors.primary, background: "transparent" } }}
              />

              {/* Receipt Upload */}
              <Button
                mode="outlined"
                onPress={pickReceipt}
                style={styles.uploadButton}
                icon={({ color, size }) => (
                    <Ionicons 
                        name={receipt ? "cloud-done-outline" : "cloud-upload-outline"} 
                        size={size} 
                        color={color} 
                    />
                )}
                disabled={isFormDisabled}
              >
                {receipt ? `Receipt: ${receipt.fileName.length > 30 ? receipt.fileName.substring(0, 27) + '...' : receipt.fileName}` : "Upload Payment Receipt"}
              </Button>

              <Button
                mode="contained"
                onPress={handleUpload}
                loading={loading}
                disabled={isFormDisabled || !amount || !receipt}
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
              >
                {loading ? 'Submitting...' : 'Submit Top-up Request'}
              </Button>
            
            </Card.Content>
          </Card>
          <View style={{ height: 50 }} />
        </ScrollView>
      </SafeAreaView>
      
      {/* Universal Snackbar */}
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
  container: { flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', // Vertically center the content 
    paddingVertical: 10,
  },
  mainHeader: { 
    fontSize: 28, 
    fontWeight: "bold", 
    marginBottom: 25, 
    textAlign: "center" 
  },
  card: { 
    borderRadius: 15, 
    elevation: 5,
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: "600", 
    marginBottom: 10 
  },
  
  // Segmented Control Styles
  segmentedControlContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    marginTop: 5,
  },
  segmentedButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  segmentText: {
    fontWeight: 'bold',
    fontSize: 16,
  },

  qrContainer: {
    padding: 10,
    backgroundColor: 'white', // Ensure QR code is readable
    borderRadius: 15,
    marginBottom: 10,
  },
  qr: { 
    width: "100%", 
    height: 200, 
    borderRadius: 12, 
    alignSelf: "center",
  },
  input: { 
    marginBottom: 15, 
    backgroundColor: "transparent",
  },
  uploadButton: {
    marginBottom: 15,
  },
  
  // Status Card Styles
  statusCardAlert: {
    borderRadius: 12,
    borderLeftWidth: 8, // Emphasize status visually
    padding: 0,
    elevation: 3,
  },
  statusContentAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
});