// app/(auth)/login.tsx
import { useRouter } from "expo-router";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from "firebase/auth";
import React, { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Alert
} from "react-native";
import {
  ActivityIndicator,
  Button,
  HelperText,
  Icon,
  IconButton,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { auth } from "../../config/firebaseConfig";

export default function Login() {
  const theme = useTheme();
  const router = useRouter();

  // --- Form State ---
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // --- Forgot Password State ---
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const forgotAnim = useState(new Animated.Value(0))[0];
  const [forgotLoading, setForgotLoading] = useState(false);

  // --- Snackbar State (The "Fancy" Alternative to Alerts) ---
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarColor, setSnackbarColor] = useState(theme.colors.primary);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  
  // --- Helper: Show Fancy Message ---
  const showMessage = (message: string, isError: boolean = true) => {
    setSnackbarMessage(message);
    setSnackbarColor(isError ? theme.colors.error : theme.colors.primary);
    setSnackbarVisible(true);
  };

  const getFriendlyErrorMessage = (code: string) => {
    switch (code) {
      case "auth/invalid-email": return "Invalid email format.";
      case "auth/user-disabled": return "This account has been disabled.";
      case "auth/wrong-password":
      case "auth/invalid-credential":
      case "auth/user-not-found": return "Incorrect email or password.";
      case "auth/too-many-requests": return "Too many attempts. Please wait a moment.";
      case "auth/network-request-failed": return "Network connection failed.";
      default: return "Something went wrong. Please try again.";
    }
  };

  // --- Effects ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Force refresh token to ensure backend recognizes new user
          const idToken = await user.getIdToken(true);

          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${idToken}` },
          });

          if (!res.ok) throw new Error("Backend unavailable");

          router.replace("/(tabs)");
        } catch (err) {
          // REPLACED CONSOLE LOG: Show user that session is invalid
          await signOut(auth); 
          setCheckingAuth(false);
          showMessage("Session expired. Please login again.", true);
        }
      } else {
        setCheckingAuth(false);
      }
    });

    return unsubscribe;
  }, []);

  // --- Handlers ---
  const handleLogin = async () => {
    let valid = true;
    if (!email.trim()) { setEmailError("Email is required"); valid = false; }
    else setEmailError("");
    if (!password.trim()) { setPasswordError("Password is required"); valid = false; }
    else setPasswordError("");
    if (!valid) return;

    setLoading(true);
    try {
      // 1️⃣ Sign in via Firebase
      const fullEmail = `${email.trim().toLowerCase()}@cvsu.edu.ph`;
      const userCredential = await signInWithEmailAndPassword(auth, fullEmail, password);
      const user = userCredential.user;

      // 2️⃣ Check if email verified
      if (!user.emailVerified) {
        await signOut(auth); // immediately log out
        
        // Note: We keep Alert here specifically because we need the "Resend" button action,
        // which Snackbar doesn't handle as easily for complex flows.
        Alert.alert(
          "Email not verified",
          "Please verify your email to continue.",
          [
            {
              text: "Resend Verification",
              onPress: async () => {
                try {
                  await sendEmailVerification(user);
                  showMessage("Verification email sent! Check your inbox.", false);
                } catch (e: any) {
                  showMessage(getFriendlyErrorMessage(e.code), true);
                }
              },
            },
            { text: "OK" },
          ]
        );
        return; 
      }

      // 3️⃣ If verified, get token
      const idToken = await user.getIdToken(true);

      // 4️⃣ Backend validation
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        await signOut(auth);
        throw new Error("Backend unavailable or unauthorized");
      }

      // 5️⃣ Success
      router.replace("/(tabs)");
    } catch (e: any) {
      // REPLACED CONSOLE ERROR: Use Snackbar
      const msg = e.code ? getFriendlyErrorMessage(e.code) : (e.message || "Login failed");
      showMessage(msg, true);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      // REPLACED INLINE ERROR: Use Snackbar
      showMessage("Please enter your email to reset password", true);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(forgotEmail)) {
      // REPLACED INLINE ERROR: Use Snackbar
      showMessage("Enter a valid email address", true);
      return;
    }

    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      // setForgotError(""); // No longer needed
      setForgotEmail("");
      setForgotOpen(false);
      
      // REPLACED STATE: Use Helper
      showMessage("Password reset link sent! Check your inbox.", false);
    } catch (e: any) {
      // REPLACED CONSOLE/STATE: Use Helper
      const msg = getFriendlyErrorMessage(e.code ?? "");
      // setForgotError(msg); // Removed inline error since we are using Snackbar
      showMessage(msg, true); // Show snackbar for visibility
    } finally {
      setForgotLoading(false);
    }
  };

  const toggleForgot = () => {
    setForgotOpen((prev) => !prev);
    Animated.timing(forgotAnim, {
      toValue: forgotOpen ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  if (checkingAuth) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <Image
              source={require("../../assets/images/white-logo.png")}
              resizeMode="contain"
              style={styles.logo}
            />
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
              Powerbank Rental
            </Text>

            <View style={styles.emailContainer}>
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={(text) => {
                  const clean = text.replace(/@.*/, "");
                  setEmail(clean);
                  if (emailError) setEmailError("");
                }}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                error={!!emailError}
                style={{ flex: 1 }}
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
              <Text style={styles.emailSuffix}>@cvsu.edu.ph</Text>
            </View>
            {emailError ? <HelperText type="error">{emailError}</HelperText> : null}

            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={(t) => { setPassword(t); if (passwordError) setPasswordError(""); }}
              onFocus={() => setPasswordError("")}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} color={theme.colors.onSurface} />}
              style={styles.input}
              theme={{ colors: { primary: theme.colors.onSurface, text: theme.colors.onSurface, placeholder: theme.colors.onSurface, background: "transparent", onSurfaceVariant: "#FFFFFF", outline: "#FFFFFF" }, roundness: 15 }}
            />
            {passwordError ? <HelperText type="error" visible>{passwordError}</HelperText> : null}

            <Button mode="text" onPress={toggleForgot} style={styles.linkButton} labelStyle={{ color: theme.colors.onSurface }}>Forgot Password?</Button>

            <Animated.View style={{ opacity: forgotAnim, transform: [{ scaleY: forgotAnim }] }}>
              {forgotOpen && (
                <View style={styles.forgotContainer}>
                  <TextInput
                    placeholder="Enter your email"
                    value={forgotEmail}
                    editable={!forgotLoading}
                    onChangeText={(t) => { setForgotEmail(t); if (forgotError) setForgotError(""); }}
                    onFocus={() => setForgotError("")}
                    mode="outlined"
                    keyboardType="email-address"
                    style={[styles.input, { flex: 1 }]}
                    theme={{ colors: { primary: theme.colors.onSurface, text: theme.colors.onSurface, placeholder: theme.colors.onSurface, background: "transparent", onSurfaceVariant: "#FFFFFF", outline: "#FFFFFF" }, roundness: 15 }}
                  />
                  <View style={{ width: 48, alignItems: "center", justifyContent: "center" }}>
                    {forgotLoading ? <ActivityIndicator size="small" color={theme.colors.primary} /> :
                      <IconButton icon="send" size={25} iconColor={theme.colors.onSurface} onPress={handleForgotPassword} />}
                  </View>
                  {forgotError && <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                    <Icon source="close-circle" size={18} color={theme.colors.error} />
                    <Text style={{ marginLeft: 6, color: theme.colors.error }}>{forgotError}</Text>
                  </View>}
                </View>
              )}
            </Animated.View>

            {loading ? <ActivityIndicator animating size="large" color={theme.colors.primary} /> : <>
              <Button mode="contained" onPress={handleLogin} style={styles.button} buttonColor={theme.colors.primary} textColor={theme.colors.onPrimary}>Login</Button>
              <Button mode="contained" onPress={() => router.push("/signup")} style={styles.button} buttonColor={theme.colors.secondary} textColor={theme.colors.onPrimary}>Sign Up</Button>
            </>}
          </View>
        </ScrollView>

        {/* --- Fancy Snackbar Component --- */}
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={{ 
            backgroundColor: snackbarColor, 
            borderRadius: 10, 
            margin: 16,
            marginBottom: 20
          }}
          action={{
            label: 'Close',
            onPress: () => setSnackbarVisible(false),
            textColor: theme.colors.onPrimary,
          }}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>
            {snackbarMessage}
          </Text>
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
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    marginTop: -110,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    textAlign: "center",
    marginBottom: 30,
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  emailSuffix: {
    marginLeft: 8,
    fontSize: 16,
    color: "#ccc",
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginTop: 12,
    borderRadius: 15,
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  linkButton: {
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  forgotContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
});