import { useRouter } from "expo-router";
import { getAuth, sendPasswordResetEmail } from "firebase/auth"; 
import React, { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Image,
  TextInput as RNTextInput,
  TouchableOpacity
} from "react-native";
import {
  ActivityIndicator,
  Text,
  Snackbar,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

// --- HARDCODED COLORS (MATCHING SYSTEM) ---
const COLORS = {
  gradient: ["#03040D", "#172647", "#172647", "#38466D", "#38466D"],
  background: "#172647",    // Surface color
  text: "#FFFFFF",          // Main text
  subText: "#adb5bd",       // Hints
  placeholders: "#adb5bd",  // Placeholders
  primary: "#38466D",       // Button color
  secondary: "#FDAE37",     // Secondary/Orange
  error: "#E07A5F",         // Error Red
  inputText: "#172647",     // Black text for inputs
  inputBg: "#FFFFFF",       // White background for inputs
  white: "#FFFFFF",
};

// --- CUSTOM INPUT COMPONENT ---
const CustomInput = ({ 
  label, value, onChangeText, error, onBlur, onFocus, 
  keyboardType, placeholder, suffix 
}: any) => {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ 
        color: COLORS.subText,
        fontSize: 12, 
        fontWeight: "700", 
        marginBottom: 6,
        marginLeft: 4,
        textTransform: 'uppercase',
        opacity: 0.9
      }}>
        {label}
      </Text>
      <View style={[
        styles.inputContainer,
        { backgroundColor: COLORS.inputBg },
        error && { borderColor: COLORS.error, borderWidth: 1 }
      ]}>
        <RNTextInput
          style={[styles.inputField, { color: COLORS.inputText }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholders}
          onBlur={onBlur}
          onFocus={onFocus}
          keyboardType={keyboardType}
          autoCapitalize="none"
        />
        {suffix && <Text style={{ color: COLORS.subText, marginRight: 10 }}>{suffix}</Text>}
      </View>
      {error ? (
        <Text style={{ color: COLORS.error, fontSize: 11, marginLeft: 4, marginTop: 4 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const auth = getAuth();

export default function PasswordReset() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Snackbar State ---
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarColor, setSnackbarColor] = useState(COLORS.primary);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  // --- Helpers ---
  const showMessage = (message: string, isError: boolean = true) => {
    setSnackbarMessage(message);
    setSnackbarColor(isError ? COLORS.error : "#4CAF50");
    setSnackbarVisible(true);
  };

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      showMessage("Please enter your email address", true);
      return;
    }

    setLoading(true);
    try {
      // 1. Construct the full email
      const fullEmail = `${email.trim().toLowerCase()}@cvsu.edu.ph`;

      // 2. CHECK WITH BACKEND FIRST
      const checkRes = await fetch(`${API_URL}/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fullEmail }),
      });

      if (!checkRes.ok) {
        throw new Error("This email is not registered in our system.");
      }
      
      // 3. If Backend passed, NOW send the Firebase email
      await sendPasswordResetEmail(auth, fullEmail);
      
      showMessage("Password reset link sent! Check your inbox.", false);
      setEmail(""); // Clear input on success
      setTimeout(() => router.back(), 3000); // Auto go back after success

    } catch (e: any) {
      console.log(e);
      let msg = e.message || "Failed to send reset email.";
      if (e.code === 'auth/user-not-found') msg = "No user found with this email.";
      if (e.code === 'auth/invalid-email') msg = "Invalid email format.";
      showMessage(msg, true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={COLORS.gradient as any}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Top Back Button */}
        <TouchableOpacity style={styles.topBackButton} onPress={() => router.back()}>
           <Ionicons name="arrow-back" size={28} color={COLORS.white} />
        </TouchableOpacity>

        <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled"
        >
          
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <Image
              source={require("../../assets/images/white-logo.png")}
              resizeMode="contain"
              style={styles.logo}
            />
            <Text style={[styles.headerSubtitle, { color: COLORS.text }]}>
              Reset your password
            </Text>
          </View>

          {/* Card Section */}
          <View style={[styles.card, { backgroundColor: COLORS.background }]}>
            
            <Text style={{ color: COLORS.subText, marginBottom: 24, textAlign: 'center', lineHeight: 22 }}>
               Enter your CVSU email below. We'll check if the account exists and send a reset link to your email.
            </Text>

            <CustomInput
               label="CVSU Email"
               value={email}
               onChangeText={(text: string) => setEmail(text.replace(/@.*/, ""))}
               suffix="@cvsu.edu.ph"
               keyboardType="email-address"
               placeholder="username"
            />

            {loading ? (
              <ActivityIndicator animating={true} color={COLORS.secondary} size="large" style={{ marginTop: 20 }} />
            ) : (
              <View style={{ marginTop: 10 }}>
                {/* Primary Action */}
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: COLORS.text }]}
                  onPress={handleSendResetEmail}
                >
                  <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                </TouchableOpacity>

                {/* Secondary Action */}
                <TouchableOpacity onPress={() => router.back()} style={styles.secondaryButton}>
                  <Text style={[styles.secondaryButtonText, { color: COLORS.secondary }]}>
                    Remembered it? <Text style={{fontWeight: 'bold'}}>Login</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </ScrollView>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={{ backgroundColor: snackbarColor, borderRadius: 12, marginBottom: 30 }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>{snackbarMessage}</Text>
        </Snackbar>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  topBackButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  card: {
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1.5,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  primaryButton: {
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#172647',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
  },
});