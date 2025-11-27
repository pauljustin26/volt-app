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

const QR_IMAGES = {
  gcash: require("../../assets/images/gcash-qr.jpg"),
  maya: require("../../assets/images/maya-qr.jpg"),
};

const STATUS_COLORS = {
    succeeded: { color: '#1B8552', background: '#D6F5E3' },
    denied: { color: '#EB4747', background: '#FDE4E4' },
    pending: { color: '#FDAE37', background: '#FFF7E6' },
};

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

  useEffect(() => {
    let unsubscribe: Unsubscribe = () => {};
    
    if (user) {
        const q = query(
            collection(db, "transactions"),
            where("userId", "==", user.uid),
            where("type", "==", "topup"),
            where("status", "==", "pending"),
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

  const handleUpload = async () => {
    const amountValue = parseFloat(amount);
    if (!amountValue || amountValue <= 0) return showAlert("Please enter a valid amount (e.g., 100.00).", true);
    if (!receipt) return showAlert("Please select the payment receipt image.", true);
    
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

      const { transactionId, amount } = response.data;

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
  
  const isFormDisabled = loading || !!latestTxn;

  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors || ["#6a11cb", "#2575fc"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 20 }}>
        
        {/* --- NEW HEADER SECTION STARTS HERE --- */}
        <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => router.replace("/")} style={styles.backButton}>
                <Ionicons name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>
            
            <Text style={[styles.mainHeader, { color: "#fff" }]}>
                Top-up Wallet
            </Text>
            
            {/* Empty view to balance the flex layout and keep title centered */}
            <View style={styles.headerSpacer} />
        </View>
        {/* --- NEW HEADER SECTION ENDS HERE --- */}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
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

          <Card style={[styles.card, { backgroundColor: theme.colors.onPrimary, opacity: isFormDisabled ? 0.6 : 1, marginTop: latestTxn ? 20 : 0 }]}>
            <Card.Content>

              <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>1. Select Payment Method</Text>

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
  // --- NEW HEADER STYLES ---
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
  },
  backButton: {
    padding: 5,
    borderRadius: 20,
    width: 40, 
    alignItems: 'flex-start'
  },
  headerSpacer: {
    width: 40, // Should match backButton width to keep title centered
  },
  // -------------------------
  scrollContent: { 
    flexGrow: 1, 
    paddingVertical: 10,
  },
  mainHeader: { 
    fontSize: 24, // Slightly smaller to fit in row
    fontWeight: "bold", 
    textAlign: "center",
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
    backgroundColor: 'white',
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
  statusCardAlert: {
    borderRadius: 12,
    borderLeftWidth: 8,
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