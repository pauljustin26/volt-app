import React, { useEffect, useState } from "react";
import { StyleSheet, View, TextInput } from "react-native";
import {
  Avatar,
  Button,
  Divider,
  Text,
  useTheme,
  List,
  Modal,
  Portal,
  ActivityIndicator,
  Snackbar, // Import Snackbar
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaContainer } from "../components/SafeAreaContainer";
import { auth, db } from "../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore"; // Only keeping doc, getDoc
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useRouter } from "expo-router";
import axios from "axios";

// Directly define your backend API URL 
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false); // Unused, but kept

  // Keeping only state related to Password Reset
  const [passwordModalVisible, setPasswordModalVisible] = useState(false); // For Password Reset Confirmation

  // New state for universal Snackbar
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    isError: false,
  });

  const showAlert = (message: string, isError = false) => {
    setSnackbar({ visible: true, message, isError });
  };

  // helper to attach Firebase ID token to backend requests
  const getAuthHeaders = async () => {
    const token = await auth.currentUser?.getIdToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Fetch user data (from backend)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserData(null);
        setLoading(false);
        return;
      }
      try {
        // initialize backend user (if not existing)
        await axios.get(`${API_URL}/users/init`, await getAuthHeaders());

        // fetch user from backend
        const res = await axios.get(`${API_URL}/users/me`, await getAuthHeaders());
        if (res.data) {
          setUserData(res.data);
        } else {
          // fallback if backend empty (fetch from Firestore)
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) setUserData(userDoc.data());
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        showAlert("Failed to load profile data.", true);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    router.replace("/login");
  };

  // Function to open the password reset confirmation modal
  const handleChangePassword = () => {
    if (!userData?.email) return showAlert("User email not found.", true);
    setPasswordModalVisible(true);
  };

  // Function to send the password reset email
  const handleSendPasswordReset = async () => {
      try {
        if (userData?.email) {
          await sendPasswordResetEmail(auth, userData.email);
          showAlert("Password reset link sent to your email!", false);
        }
      } catch (err: any) {
        showAlert(err.message || "Failed to send reset link.", true);
      } finally {
        setPasswordModalVisible(false);
      }
  };

  // ✅ Show loading screen while fetching user
  if (loading) {
    return (
      <LinearGradient
        colors={(theme.colors as any).gradientColors}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaContainer
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "transparent",
          }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </SafeAreaContainer>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaContainer style={{ flex: 1, backgroundColor: "transparent", padding: 20 }}>
        {/* Header */}
        <View style={styles.header}>
          <Button
            icon="arrow-left"
            mode="text"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/");
              }
            }}
            contentStyle={{ padding: 0 }}
            style={styles.backButton}
            textColor={theme.colors.primary}
          >
            {""}
          </Button>

          <Avatar.Text
            size={72}
            label={
              (userData?.firstName?.[0] ?? "") + (userData?.lastName?.[0] ?? "U")
            }
            style={{ backgroundColor: theme.colors.primary }}
            color={theme.colors.onPrimary}
          />
          <Text variant="headlineMedium" style={[styles.name, { color: theme.colors.primary }]}>
            {userData?.firstName ?? ""} {userData?.lastName ?? ""}
          </Text>
          <Text style={{ color: theme.colors.primary }}>{userData?.email ?? ""}</Text>

          <Text style={{ color: theme.colors.primary, marginTop: 4 }}>
            Student ID: {userData?.studentId ?? "N/A"}
          </Text>
          <Text style={{ color: theme.colors.primary, marginTop: 2 }}>
            Mobile: {userData?.mobileNumber ?? "N/A"}
          </Text>

        </View>

        <Divider style={{ marginVertical: 20, backgroundColor: theme.colors.primary }} />

        {/* Settings */}
        <List.Section>
          <List.Subheader style={{ color: theme.colors.primary }}>Settings</List.Subheader>
          {/* Only keeping Reset Password */}
          <List.Item
            title="Reset Password"
            description="Send password reset email"
            titleStyle={{ color: theme.colors.primary }}
            descriptionStyle={{ color: theme.colors.primary }}
            left={(props) => <List.Icon {...props} icon="lock-reset" color={theme.colors.primary} />}
            onPress={handleChangePassword}
          />
        </List.Section>

        <Divider style={{ marginVertical: 20, backgroundColor: theme.colors.primary }} />

        <List.Section>
          <List.Subheader style={{ color: theme.colors.primary }}>Other</List.Subheader>
          <List.Item
            title="Help & Support"
            description="FAQs and contact support"
            titleStyle={{ color: theme.colors.primary }}
            descriptionStyle={{ color: theme.colors.primary }}
            left={(props) => <List.Icon {...props} icon="help-circle" color={theme.colors.primary} />}
            onPress={() => showAlert("Support page coming soon!", false)}
          />
          <List.Item
            title="Terms & Conditions"
            description="Service and policies"
            titleStyle={{ color: theme.colors.primary }}
            descriptionStyle={{ color: theme.colors.primary }}
            left={(props) => <List.Icon {...props} icon="file-document-outline" color={theme.colors.primary} />}
            onPress={() => router.push("/terms")}
          />
        </List.Section>

        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          buttonColor={theme.colors.error}
          textColor={theme.colors.onError}
        >
          Logout
        </Button>

        <Portal>
          {/* -------------------------------------- */}
          {/* Password Reset Confirmation Modal (MODAL) */}
          {/* -------------------------------------- */}
          <Modal
            visible={passwordModalVisible}
            onDismiss={() => setPasswordModalVisible(false)}
            contentContainerStyle={[
              styles.modal,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
            ]}
          >
            <Text
              variant="titleMedium"
              style={{
                marginBottom: 15,
                color: theme.colors.primary,
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              Reset Password
            </Text>
            <Text style={{ color: theme.colors.primary, marginBottom: 20, textAlign: "center" }}>
              Send a password reset link to your email ({auth.currentUser?.email})?
            </Text>

            <Button
              mode="contained"
              onPress={handleSendPasswordReset}
              buttonColor={theme.colors.primary}
              textColor={theme.colors.onPrimary}
              style={{ marginTop: 15, borderRadius: 8 }}
              contentStyle={{ paddingVertical: 5 }}
            >
              Send Link
            </Button>

            <Button
              mode="text"
              onPress={() => setPasswordModalVisible(false)}
              textColor={theme.colors.onSurfaceVariant}
              style={{ marginTop: 10 }}
            >
              Cancel
            </Button>
          </Modal>

        </Portal>
      </SafeAreaContainer>
      
      {/* -------------------------------------- */}
      {/* UNIVERSAL SNACKBAR (Replaces all alerts) */}
      {/* -------------------------------------- */}
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
  header: {
    alignItems: "center",
    marginTop: 30,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  name: { marginTop: 12, fontWeight: "bold" },
  logoutButton: { marginTop: 30, borderRadius: 8, width: "50%", alignSelf: "center" },
  modal: { 
    padding: 20, 
    marginHorizontal: 20, 
    borderRadius: 16, 
    alignSelf: "center", 
    width: "90%",
    maxHeight: '80%',
  },
  input: { 
    borderBottomWidth: 1, 
    paddingVertical: 8, 
    fontSize: 16,
    paddingHorizontal: 0,
  },
});