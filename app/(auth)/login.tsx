import { useRouter } from "expo-router";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification
} from "firebase/auth";
import React, { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  HelperText,
  Snackbar,
  Text,
  TextInput,
  useTheme,
  Portal,   // <--- Added
  Dialog,   // <--- Added
  Paragraph // <--- Added
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

  // --- Verification Dialog State (For Web Support) ---
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [resendLoading, setResendLoading] = useState(false);

  // --- Snackbar State ---
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
      // If user is logged in AND verified, navigate.
      if (user && user.emailVerified) {
        try {
          const idToken = await user.getIdToken(true);
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${idToken}` },
          });

          if (!res.ok) throw new Error("Backend unavailable");
          router.replace("/(tabs)");
        } catch (err) {
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

  // 1. Logic to Resend Email (Called from Dialog)
  const handleResendVerification = async () => {
    if (!pendingUser) return;
    setResendLoading(true);
    try {
      await sendEmailVerification(pendingUser);
      showMessage("Verification email sent! Check your inbox.", false);
      setShowVerifyDialog(false);
      await signOut(auth); // Sign out after sending
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        showMessage("Too many requests. Please wait a moment.", true);
      } else {
        showMessage("Failed to send email. Try again later.", true);
      }
      setShowVerifyDialog(false);
      await signOut(auth);
    } finally {
      setResendLoading(false);
      setPendingUser(null);
    }
  };

  // 2. Logic to Cancel/Close Dialog
  const handleDismissDialog = async () => {
    setShowVerifyDialog(false);
    setPendingUser(null);
    await signOut(auth);
  };

  // 3. Login Logic
  const handleLogin = async () => {
    let valid = true;
    if (!email.trim()) { setEmailError("Email is required"); valid = false; }
    else setEmailError("");
    if (!password.trim()) { setPasswordError("Password is required"); valid = false; }
    else setPasswordError("");
    if (!valid) return;

    setLoading(true);
    try {
      // Sign in via Firebase
      const fullEmail = `${email.trim().toLowerCase()}@cvsu.edu.ph`;
      const userCredential = await signInWithEmailAndPassword(auth, fullEmail, password);
      const user = userCredential.user;

      // Force Reload to get latest status
      await user.reload();

      // Check Verification
      if (!user.emailVerified) {
        setLoading(false); 
        setPendingUser(user); // Save user for the dialog actions
        setShowVerifyDialog(true); // <--- Trigger the Web-Compatible Dialog
        return; 
      }

      // If verified, proceed
      const idToken = await user.getIdToken(true);
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!res.ok) {
        await signOut(auth);
        throw new Error("Backend unavailable or unauthorized");
      }

      router.replace("/(tabs)");
    } catch (e: any) {
      const msg = e.code ? getFriendlyErrorMessage(e.code) : (e.message || "Login failed");
      showMessage(msg, true);
    } finally {
      setLoading(false);
    }
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

            <View style={{ position: "relative", width: "100%" }}>
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
                }}
              >
                @cvsu.edu.ph
              </Text>
            </View>

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

            <Button 
                mode="text" 
                onPress={() => router.push("/password-reset")} 
                style={styles.linkButton} 
                labelStyle={{ color: theme.colors.onSurface }}
            >
                Forgot Password?
            </Button>

            {loading ? <ActivityIndicator animating size="large" color={theme.colors.primary} /> : <>
              <Button mode="contained" onPress={handleLogin} style={styles.button} buttonColor={theme.colors.primary} textColor={theme.colors.onPrimary}>Login</Button>
              <Button mode="contained" onPress={() => router.push("/signup")} style={styles.button} buttonColor={theme.colors.secondary} textColor={theme.colors.onPrimary}>Sign Up</Button>
            </>}
          </View>
        </ScrollView>

        {/* --- WEB COMPATIBLE DIALOG FOR VERIFICATION --- */}
        <Portal>
          <Dialog visible={showVerifyDialog} onDismiss={handleDismissDialog}>
            <Dialog.Title>Email Not Verified</Dialog.Title>
            <Dialog.Content>
              <Paragraph>
                You must verify your email before logging in. Please check your inbox (and spam folder).
              </Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={handleDismissDialog} textColor={theme.colors.error}>Cancel</Button>
              <Button onPress={handleResendVerification} loading={resendLoading} disabled={resendLoading}>
                Resend Email
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

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
});