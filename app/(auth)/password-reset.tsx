import React, { useState } from "react";
import { useRouter } from "expo-router";
// import { sendPasswordResetEmail } from "firebase/auth"; // <--- DELETE THIS
import { LinearGradient } from "expo-linear-gradient";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Snackbar,
  Text,
  TextInput,
  useTheme,
  IconButton,
} from "react-native-paper";

// Define your backend URL (Ensure this points to your NestJS server)
const API_URL = process.env.EXPO_PUBLIC_API_URL; 

export default function PasswordReset() {
  const theme = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Snackbar State ---
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarColor, setSnackbarColor] = useState(theme.colors.primary);

  // --- Helpers ---
  const showMessage = (message: string, isError: boolean = true) => {
    setSnackbarMessage(message);
    setSnackbarColor(isError ? theme.colors.error : theme.colors.primary);
    setSnackbarVisible(true);
  };

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      showMessage("Please enter your email address", true);
      return;
    }

    setLoading(true);
    try {
      // Construct the full email with the domain suffix
      const fullEmail = `${email.trim().toLowerCase()}@cvsu.edu.ph`;
      
      // --- NEW: Call NestJS Backend ---
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: fullEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset email.");
      }
      
      showMessage("Password reset link sent! Check your inbox.", false);
      
      // Optional: Clear input on success
      setEmail("");

    } catch (e: any) {
      // Since we are now getting errors from our backend, 
      // we might get simple strings or objects.
      const msg = e.message || "Network request failed.";
      showMessage(msg, true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors || ['#4c669f', '#3b5998', '#192f6a']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Back Button */}
        <View style={styles.header}>
            <IconButton 
                icon="arrow-left" 
                iconColor="#FFFFFF" 
                size={28} 
                onPress={() => router.push("/login")} 
            />
        </View>

        <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inner}>
            
            <Text variant="headlineMedium" style={[styles.title, { color: "#FFFFFF" }]}>
              Reset your password
            </Text>

            <Text variant="bodyLarge" style={[styles.description, { color: "#FFFFFF" }]}>
              Enter your user account's verified email address and we will send you a customized password reset link.
            </Text>

            {/* Email Input with Suffix Overlay */}
            <View style={{ position: "relative", width: "100%", marginTop: 20 }}>
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={(text) => {
                  const clean = text.replace(/@.*/, "");
                  setEmail(clean);
                }}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                theme={{
                  colors: {
                    primary: theme.colors.onSurface,
                    text: theme.colors.onSurface,
                    placeholder: theme.colors.onSurface,
                    background: "transparent",
                    onSurfaceVariant: "#FFFFFF",
                    outline: "#FFFFFF",
                  },
                  roundness: 15,
                }}
              />
              <Text
                style={{
                  position: "absolute",
                  right: 15,
                  top: 20, 
                  color: "#FFFFFF",
                  opacity: 0.8,
                  fontSize: 16,
                }}
              >
                @cvsu.edu.ph
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator animating size="large" color="#FFFFFF" style={{ marginTop: 20 }} />
            ) : (
              <Button
                mode="contained"
                onPress={handleSendResetEmail}
                style={styles.button}
                buttonColor={theme.colors.secondary}
                textColor={theme.colors.onPrimary}
              >
                Send password reset email
              </Button>
            )}

          </View>
        </ScrollView>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={{
            backgroundColor: snackbarColor,
            borderRadius: 10,
            margin: 16,
            marginBottom: 20,
          }}
          action={{
            label: "Close",
            onPress: () => setSnackbarVisible(false),
            textColor: theme.colors.onPrimary,
          }}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: "bold" }}>
            {snackbarMessage}
          </Text>
        </Snackbar>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: { paddingTop: 50, paddingHorizontal: 10 },
  scrollContent: { flexGrow: 1, padding: 20 },
  inner: { flex: 1, justifyContent: "center", marginTop: -80 },
  title: { textAlign: "left", marginBottom: 10, fontWeight: "bold" },
  description: { textAlign: "left", marginBottom: 10, opacity: 0.9, lineHeight: 24 },
  input: { marginBottom: 10 },
  button: { marginTop: 20, borderRadius: 15, paddingVertical: 6, elevation: 4 },
});