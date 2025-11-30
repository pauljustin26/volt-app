import React, { useState, useEffect } from "react";
import { StyleSheet, Image, View, TouchableOpacity, Share, ScrollView, Linking, Platform, Modal } from "react-native"; 
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  Text, 
  TextInput, 
  Button, 
  Card, 
  useTheme, 
  ActivityIndicator, 
  Snackbar,
  SegmentedButtons
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import { getAuth } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "../../config/firebaseConfig"; 
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ExpoLinking from 'expo-linking';
// ⭐ Import WebView
import { WebView } from 'react-native-webview';

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
  
  // Modes: 'online' (PayMongo) or 'manual' (QR Upload)
  const [mode, setMode] = useState<"manual" | "online">("manual");
  
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "maya">("gcash");

  const [latestTxn, setLatestTxn] = useState<any | null>(null);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', isError: false });
  
  // ⭐ Lightbox State
  const [lightboxVisible, setLightboxVisible] = useState(false);

  // ⭐ PayMongo WebView State
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const authInstance = getAuth();
  const user = authInstance.currentUser;

  useEffect(() => {
    let unsubscribe: Unsubscribe = () => {};
    
    if (user) {
        // Only track manual pending transactions for blocking
        const q = query(
            collection(db, "transactions"),
            where("userId", "==", user.uid),
            where("type", "==", "topup"),
            where("status", "==", "pending"),
            where("method", "in", ["gcash_manual", "maya_manual"]), 
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
            // Ignore index errors
        });
    }

    return () => unsubscribe();
  }, [user?.uid]);

  const showAlert = (message: string, isError = false) => {
    setSnackbar({ visible: true, message, isError });
  };

  // ⭐ UPDATE THE WEB RETURN HANDLER
  useEffect(() => {
    if (Platform.OS === 'web') {
      // 1. Get the current URL
      const currentUrl = new URL(window.location.href);
      const params = new URLSearchParams(currentUrl.search);
      const status = params.get('status');

      // 2. Check for Cancel
      if (status === 'cancelled') {
         showAlert("Payment Cancelled", true);
         
         // Optional: Clean the URL so a refresh doesn't show the alert again
         window.history.replaceState({}, '', '/wallet/recharge');
      }
    }
  }, []);

  // --- ONLINE PAYMENT (PayMongo) ---
  const handlePayMongo = async () => {
    const amountValue = parseFloat(amount);
    if (!amountValue || amountValue < 100) return showAlert("Minimum recharge is ₱100.00", true);

    setLoading(true);
    try {
        const token = await user?.getIdToken();
        
        let redirectBaseUrl = "";
        
        if (Platform.OS === 'web') {
            // Web: Use the real browser URL (e.g. localhost:8081)
            redirectBaseUrl = window.location.origin; 
        } else {
            // ⭐ MOBILE FIX: Use a hardcoded HTTP URL.
            // We use this "dummy" URL so PayMongo accepts it.
            // The WebView will intercept this URL before it actually loads.
            redirectBaseUrl = "https://voltvault.com"; 
        }

        const res = await axios.post(
            `${API_URL}/wallet/topup-online`,
            { 
                amount: amountValue,
                redirectBaseUrl: redirectBaseUrl 
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.checkoutUrl) {
            if (Platform.OS === 'web') {
                window.location.href = res.data.checkoutUrl;
            } else {
                setPaymentUrl(res.data.checkoutUrl);
            }
        }
    } catch (err: any) {
        console.error(err);
        showAlert("Failed to initialize online payment.", true);
    } finally {
        setLoading(false);
    }
  };

  // ⭐ Handle WebView Navigation (Success/Cancel interception)
  const handleWebViewNavigation = (navState: any) => {
    const { url } = navState;
    if (!url) return;

    // 1. SUCCESS: Navigate to Status Screen
    if (url.includes('/wallet/status') && url.includes('succeeded')) { 
        setPaymentUrl(null); // Close WebView
        setAmount("");
        
        // Extract amount from URL safely using Regex
        const amountMatch = url.match(/amount=([^&]*)/);
        const extractedAmount = amountMatch ? amountMatch[1] : "0";

        // Navigate to Status Screen
        router.replace({
            pathname: "/wallet/status",
            params: { 
                status: 'succeeded', 
                amount: extractedAmount,
                // We use a placeholder ID because the real ID is created 
                // asynchronously by your Webhook.
                txnId: 'online_success_pending_webhook' 
            }
        });
    } 
    // 2. CANCEL: Stay on Recharge Screen
    else if (url.includes('/wallet/recharge') && url.includes('cancelled')) {
        setPaymentUrl(null); // Close WebView
        showAlert("Payment Cancelled", true);
    }
  };

  // --- MANUAL PAYMENT ---
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
    if (!amountValue || amountValue <= 0) return showAlert("Please enter a valid amount.", true);
    if (!receipt) return showAlert("Please select the receipt image.", true);
    
    if (latestTxn) {
        return router.push({
            pathname: "/wallet/status",
            params: { txnId: latestTxn.id, status: latestTxn.status, amount: latestTxn.amount.toString() }
        });
    }

    setLoading(true);

    try {
      const token = await user?.getIdToken();
      const formData = new FormData();
      formData.append("amount", amountValue.toString());
      formData.append("userUID", user?.uid || "");
      formData.append("method", paymentMethod); 
      
      const fileName = receipt.fileName || `receipt_${Date.now()}.jpg`;

      if (Platform.OS === 'web') {
        const res = await fetch(receipt.uri);
        const blob = await res.blob();
        formData.append("receipt", blob, fileName);
      } else {
        const fileType = receipt.type === 'image' ? 'image/jpeg' : 'application/octet-stream';
        formData.append("receipt", {
          uri: receipt.uri,
          name: fileName,
          type: fileType,
        } as any);
      }

      const response = await axios.post(`${API_URL}/wallet/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const { transactionId, amount: resAmount } = response.data;

      router.replace({
        pathname: "/wallet/status",
        params: { txnId: transactionId, status: 'pending', amount: resAmount.toString() }
      });

    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || err.message || "Submission failed. Please try again.";
      showAlert(msg, true);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = async () => {
    if (Platform.OS === 'web') {
       showAlert("Please save the image manually on web.", false);
       return;
    }
    
    const url = Image.resolveAssetSource(QR_IMAGES[paymentMethod]).uri;
    try {
      await Share.share({
        url,
        message: `Scan this QR to pay.`,
      });
    } catch (err) {}
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
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerContainer}>
              <Text style={[styles.mainHeader, { color: "#fff" }]}>Recharge Wallet</Text>
              <View style={styles.headerSpacer} />
          </View>
          
          {/* Mode Switcher */}
          <View style={styles.modeContainer}>
             <SegmentedButtons
                value={mode}
                onValueChange={val => {
                    setMode(val as "manual" | "online");
                    setAmount(""); 
                }}
                buttons={[
                  {
                    value: 'manual',
                    label: 'Manual',
                    icon: 'file-upload',
                    style: { backgroundColor: mode === 'manual' ? theme.colors.primary : theme.colors.onPrimary },
                    checkedColor: theme.colors.onPrimary,
                    uncheckedColor: theme.colors.primary
                  },
                  {
                    value: 'online',
                    label: 'Online',
                    icon: 'earth',
                    style: { backgroundColor: mode === 'online' ?theme.colors.primary : theme.colors.onPrimary },
                    checkedColor: theme.colors.onPrimary,
                    uncheckedColor: theme.colors.primary
                  },
                ]}
                style={{ marginBottom: 20 }}
              />
          </View>

          {/* Alert for Manual Pending */}
          {mode === 'manual' && !!latestTxn && (
             <Card style={[styles.statusCardAlert, { borderColor: STATUS_COLORS.pending.color, backgroundColor: STATUS_COLORS.pending.background, marginBottom: 20 }]}>
                <Card.Content style={styles.statusContentAlert}>
                    <Ionicons name="alert-circle-outline" size={24} color={STATUS_COLORS.pending.color} style={{ marginRight: 15 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: STATUS_COLORS.pending.color, fontWeight: 'bold' }}>PENDING</Text>
                        <Text style={{ color: theme.colors.onSurface, fontSize: 13 }}>Wait for admin approval.</Text>
                    </View>
                </Card.Content>
            </Card>
          )}

          {/* -------------- MANUAL MODE UI -------------- */}
          {mode === 'manual' ? (
            <Card style={[styles.card, { backgroundColor: theme.colors.onPrimary, opacity: isFormDisabled ? 0.6 : 1 }]}>
                <Card.Content>
                <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>1. Select Wallet</Text>
                
                <View style={styles.segmentedControlContainer}>
                    <TouchableOpacity
                    onPress={() => setPaymentMethod('gcash')}
                    style={[styles.segmentedButton, { borderColor: theme.colors.primary, backgroundColor: paymentMethod === 'gcash' ? theme.colors.primary : theme.colors.onPrimary }]}
                    disabled={isFormDisabled}
                    >
                    <Text style={[styles.segmentText, { color: paymentMethod === 'gcash' ? theme.colors.onPrimary : theme.colors.primary }]}>GCash</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                    onPress={() => setPaymentMethod('maya')}
                    style={[styles.segmentedButton, { borderColor: theme.colors.primary, backgroundColor: paymentMethod === 'maya' ? theme.colors.primary : theme.colors.onPrimary }]}
                    disabled={isFormDisabled}
                    >
                    <Text style={[styles.segmentText, { color: paymentMethod === 'maya' ? theme.colors.onPrimary : theme.colors.primary }]}>Maya</Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.cardTitle, { color: theme.colors.primary, marginTop: 20 }]}>2. Scan & Pay</Text>
                
                {/* ⭐ Lightbox Trigger */}
                <TouchableOpacity 
                    onPress={() => setLightboxVisible(true)} 
                    style={styles.qrContainer} 
                    disabled={isFormDisabled}
                >
                    <Image source={QR_IMAGES[paymentMethod]} style={styles.qr} resizeMode="contain" />
                    <Text style={{ textAlign: "center", marginTop: 5, color: theme.colors.primary, fontSize: 12 }}>
                        Tap to expand & share
                    </Text>
                </TouchableOpacity>

                <Text style={[styles.cardTitle, { color: theme.colors.primary, marginTop: 20 }]}>3. Upload Receipt</Text>
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
                    icon="cloud-upload"
                    disabled={isFormDisabled}
                >
                    {receipt ? "Receipt Uploaded" : "Upload Receipt"}
                </Button>
                <Button
                    mode="contained"
                    onPress={handleUpload}
                    loading={loading}
                    disabled={isFormDisabled || !amount || !receipt}
                    buttonColor={theme.colors.primary}
                    textColor={theme.colors.onPrimary}
                >
                    Submit
                </Button>
                </Card.Content>
            </Card>
          ) : (
            
            /* -------------- ONLINE MODE UI -------------- */
            <Card style={[styles.card, { backgroundColor: theme.colors.onPrimary }]}>
                <Card.Content>
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <Ionicons name="card-outline" size={60} color={theme.colors.primary} />
                        <Text style={{ textAlign: 'center', marginTop: 10, color: theme.colors.onSurfaceVariant }}>
                            Pay instantly using GCash, Maya, or Cards via PayMongo. Balance is updated automatically.
                        </Text>
                    </View>

                    <TextInput
                        label="Amount (₱)"
                        placeholder="Min. 100.00"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                        style={[styles.input, { marginBottom: 20 }]}
                        mode="outlined"
                        theme={{ colors: { primary: theme.colors.primary, background: "transparent" } }}
                    />

                    <Button
                        mode="contained"
                        onPress={handlePayMongo}
                        loading={loading}
                        disabled={loading || !amount || parseFloat(amount) < 100}
                        buttonColor={theme.colors.primary}
                        textColor={theme.colors.onPrimary}
                        contentStyle={{ height: 50 }}
                    >
                        Pay Online
                    </Button>
                </Card.Content>
            </Card>
          )}

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

      {/* ⭐ Lightbox Modal */}
      <Modal
        visible={lightboxVisible}
        transparent={true}
        onRequestClose={() => setLightboxVisible(false)}
        animationType="fade"
      >
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxBackground} onPress={() => setLightboxVisible(false)} />
          
          <View style={styles.lightboxContent}>
            <Image 
                source={QR_IMAGES[paymentMethod]} 
                style={styles.lightboxImage} 
                resizeMode="contain" 
            />
            
            <View style={styles.lightboxActions}>
                <Button 
                    mode="contained" 
                    icon="share-variant" 
                    onPress={downloadQR}
                    buttonColor="#fff"
                    textColor={theme.colors.primary}
                    style={{ marginBottom: 10, width: 200 }}
                >
                    Share QR
                </Button>
                
                <Button 
                    mode="text" 
                    textColor="#fff" 
                    onPress={() => setLightboxVisible(false)}
                >
                    Close
                </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ⭐ Payment WebView Modal (In-App Browser) */}
      <Modal
        visible={!!paymentUrl}
        animationType="slide"
        onRequestClose={() => setPaymentUrl(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            {/* Header with Close Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
                <TouchableOpacity onPress={() => setPaymentUrl(null)} style={{ padding: 10 }}>
                     <Ionicons name="close" size={30} color="#000" />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 10 }}>Secure Payment</Text>
            </View>

            {/* The Browser */}
            <WebView
                source={{ uri: paymentUrl || '' }}
                onNavigationStateChange={handleWebViewNavigation}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                )}
            />
        </SafeAreaView>
      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 10,
  },
  backButton: {
    marginTop: 20,
    marginBottom: -20,
    padding: 5,
    borderRadius: 20,
    width: 40, 
    alignItems: 'flex-start'
  },
  headerSpacer: { width: 40 },
  scrollContent: { flexGrow: 1, paddingVertical: 10,justifyContent: "center" },
  mainHeader: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  card: { borderRadius: 15, elevation: 5 },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  segmentedControlContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, marginTop: 5 },
  segmentedButton: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, marginHorizontal: 5, alignItems: 'center' },
  segmentText: { fontWeight: 'bold', fontSize: 16 },
  qrContainer: { padding: 10, backgroundColor: 'white', borderRadius: 15, marginBottom: 10 },
  qr: { width: "100%", height: 200, borderRadius: 12, alignSelf: "center" },
  input: { marginBottom: 15, backgroundColor: "transparent" },
  uploadButton: { marginBottom: 15 },
  statusCardAlert: { borderRadius: 12, borderLeftWidth: 8, padding: 0, elevation: 3 },
  statusContentAlert: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15 },
  modeContainer: { marginBottom: 5 },

  // Lightbox Styles
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  lightboxContent: {
    width: '90%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
    borderRadius: 10,
  },
  lightboxActions: {
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  }
});