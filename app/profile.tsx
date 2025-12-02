import React, { useEffect, useState } from "react";
import { StyleSheet, View, TouchableOpacity, Alert } from "react-native";
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
  Snackbar, 
  Surface,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaContainer } from "../components/SafeAreaContainer";
import { auth, db } from "../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore"; 
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

// Directly define your backend API URL 
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // State related to Password Reset
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

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
    try {
      await auth.signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Function to open the password reset confirmation modal
  const handleChangePassword = () => {
    if (!userData?.email) return showAlert("User email not found.", true);
    setPasswordModalVisible(true);
  };

  // --- UPDATED: Use Backend API for Password Reset ---
  const handleSendPasswordReset = async () => {
      try {
        if (userData?.email) {
          // Call NestJS Backend API
          await axios.post(`${API_URL}/auth/reset-password`, { 
            email: userData.email 
          });
          
          showAlert("Password reset has been sent to your email!", false);
        } else {
          showAlert("User email not found.", true);
        }
      } catch (err: any) {
        // Handle Axios error structure
        const errorMessage = err.response?.data?.message || err.message || "Failed to send reset link.";
        showAlert(errorMessage, true);
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
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.header}>
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

            <View style={styles.infoBadgeContainer}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                ID: {userData?.studentId ?? "N/A"}
              </Text>
              <Text style={{ color: theme.colors.primary, marginHorizontal: 8, opacity: 0.5 }}>|</Text>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                {userData?.mobileNumber ?? "No Mobile"}
              </Text>
            </View>

        </View>

        {/* Settings */}
        <List.Section>
          <List.Subheader style={{ color: theme.colors.primary, fontWeight: "bold" }}>Settings</List.Subheader>
            <Surface style={[styles.cardSurface, { backgroundColor: theme.colors.onPrimary }]} elevation={1}>
              <List.Item
                title="Reset Password"
                description="Change your login password"
                titleStyle={{ color: theme.colors.primary, fontWeight: '600' }}
                descriptionStyle={{ color: theme.colors.primary, opacity: 0.7 }}
                left={(props) => <List.Icon {...props} icon="lock-reset" color={theme.colors.primary} />}
                right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.primary} />}
                onPress={handleChangePassword}
                style={styles.listItem}
              />
            </Surface>
        </List.Section>
            
        <List.Subheader style={{ color: theme.colors.primary, fontWeight: "bold" }}>Others</List.Subheader>
        <Surface style={[styles.cardSurface, { backgroundColor: theme.colors.onPrimary }]} elevation={1}>
          <List.Item
            title="Help & Support"
            description="FAQs and contact info"
            titleStyle={{ color: theme.colors.primary, fontWeight: '600' }}
            descriptionStyle={{ color: theme.colors.primary, opacity: 0.7 }}
            left={(props) => <List.Icon {...props} icon="help-circle-outline" color={theme.colors.primary} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.primary} />}
            onPress={() => router.push("/faq")}
            style={styles.listItem}
          />
          <Divider style={{ backgroundColor: theme.colors.primary, opacity: 0.1 }} />
          <List.Item
            title="Terms & Conditions"
            description="Review policies"
            titleStyle={{ color: theme.colors.primary, fontWeight: '600' }}
            descriptionStyle={{ color: theme.colors.primary, opacity: 0.7 }}
            left={(props) => <List.Icon {...props} icon="file-document-outline" color={theme.colors.primary} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" color={theme.colors.primary} />}
            onPress={() => router.push("/terms")}
            style={styles.listItem}
          />
        </Surface>

        <Button
          mode="outlined"
          onPress={handleLogout}
          icon="logout"
          style={[styles.logoutButton, { borderColor: theme.colors.error }]}
          textColor={theme.colors.error}
          contentStyle={{ height: 50 }}
          labelStyle={{ fontSize: 16, fontWeight: '600' }}
        >
          Log Out
        </Button>

        <Portal>
          <Modal
            visible={passwordModalVisible}
            onDismiss={() => setPasswordModalVisible(false)}
            contentContainerStyle={[
              styles.modal,
              { backgroundColor: theme.colors.onPrimary, borderColor: theme.colors.primary },
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
            <Text
              style={{
                color: theme.colors.primary,
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Send a password reset link to your email:
              {"\n"}
              {auth.currentUser?.email}
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
    marginLeft: 20,
    marginTop: 20,
    marginBottom: -20,
    padding: 5,
    borderRadius: 20,
    width: 40, 
    alignItems: 'flex-start'
  },
  name: { marginTop: 12, fontWeight: "bold" },
  logoutButton: { marginTop: 30, borderRadius: 8, width: "80%", alignSelf: "center" },
  modal: { 
    padding: 20, 
    marginHorizontal: 20, 
    borderRadius: 16, 
    alignSelf: "center", 
    width: "90%",
    maxHeight: '80%',
  },
  infoBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  cardSurface: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '90%',
    alignSelf: 'center',
  },
  listItem: {
    paddingVertical: 8
  },
});