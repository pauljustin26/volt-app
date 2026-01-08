import { useRouter } from "expo-router";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  setPersistence,
  browserSessionPersistence
} from "firebase/auth";
// 1. IMPORT FIRESTORE FUNCTIONS
import { doc, getDoc } from "firebase/firestore"; 
import React, { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  TextInput as RNTextInput,
  TouchableOpacity,
} from "react-native";
import {
  ActivityIndicator,
  Text,
  Snackbar,
  Portal,
  Dialog,
  Paragraph,
  Button as PaperButton
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
// 2. IMPORT DB
import { auth, db } from "../../config/firebaseConfig"; 

const COLORS = {
  gradient: ["#03040D", "#172647", "#172647", "#38466D", "#38466D"],
  background: "#172647",
  text: "#FFFFFF",
  subText: "#adb5bd",
  placeholders: "#172647",
  primary: "#38466D",
  secondary: "#FDAE37",
  error: "#E07A5F",
  inputText: "#172647",
  inputBg: "#FFFFFF",
  white: "#FFFFFF",
};

const CustomInput = ({ 
  label, value, onChangeText, error, onBlur, onFocus, 
  secureTextEntry, rightIcon, keyboardType, placeholder, suffix 
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
          style={[
            styles.inputField, 
            { color: COLORS.inputText },
            // @ts-ignore 
            Platform.OS === 'web' && { outlineStyle: 'none' } 
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholders}
          onBlur={onBlur}
          onFocus={onFocus}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
        />
        {suffix && <Text style={{ color: COLORS.placeholders, marginRight: 10 }}>{suffix}</Text>}
        {rightIcon}
      </View>
      {error ? (
        <Text style={{ color: COLORS.error, fontSize: 11, marginLeft: 4, marginTop: 4 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Dialog & Feedback State
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  
  // 3. BAN DIALOG STATE
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [banDetails, setBanDetails] = useState({ reason: "", date: "" });

  const [pendingUser, setPendingUser] = useState<any>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarColor, setSnackbarColor] = useState(COLORS.primary);

  const showMessage = (message: string, isError: boolean = true) => {
    setSnackbarMessage(message);
    setSnackbarColor(isError ? COLORS.error : "#4CAF50");
    setSnackbarVisible(true);
  };

  // --- MAIN AUTH LISTENER (Handles Redirects & Bans) ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // A. Check Ban Status First
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (userData.isBanned === true) {
              // PREVENT REDIRECT. Show Dialog instead.
              
              // Format Date
              let dateStr = "Unknown Date";
              if (userData.bannedAt) {
                // Handle Firestore Timestamp or standard JS Date
                const dateObj = typeof userData.bannedAt.toDate === 'function' 
                  ? userData.bannedAt.toDate() 
                  : new Date(userData.bannedAt);
                  
                dateStr = dateObj.toLocaleDateString('en-US', { 
                  year: 'numeric', month: 'long', day: 'numeric' 
                });
              }

              setBanDetails({
                reason: userData.banReason || "Violation of Terms",
                date: dateStr
              });
              
              setCheckingAuth(false);
              setLoading(false); // Stop any spinners
              setShowBanDialog(true);
              return; // STOP HERE. Do not check verification or redirect.
            }
          }

          // B. Check Verification
          await user.reload();
          if (user.emailVerified) {
            router.replace("/(tabs)");
          } else {
            // If not verified, stay here (handleLogin handles the trigger)
            setCheckingAuth(false);
          }

        } catch (err) {
          console.error("Auth check failed:", err);
          setCheckingAuth(false);
        }
      } else {
        setCheckingAuth(false);
      }
    });
    return unsubscribe;
  }, []);
  
  const handleEmailBlur = () => {
    if (email.includes("@")) {
      setEmail(email.replace(/@.*/, ""));
    }
  };

  const handleLogin = async () => {
    let valid = true;
    if (!email.trim()) { setEmailError("Email is required"); valid = false; }
    else setEmailError("");
    if (!password.trim()) { setPasswordError("Password is required"); valid = false; }
    else setPasswordError("");
    if (!valid) return;

    setLoading(true);
    try {
      const fullEmail = `${email.trim().toLowerCase()}@cvsu.edu.ph`;
      if (Platform.OS === 'web') {
        await setPersistence(auth, browserSessionPersistence);
      }
      
      // We just sign in here. 
      // The onAuthStateChanged listener above will handle the Ban Check & Redirect.
      const userCredential = await signInWithEmailAndPassword(auth, fullEmail, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setLoading(false); 
        setPendingUser(user);
        setShowVerifyDialog(true);
      }
      
      // If verified and not banned, the useEffect will redirect automatically.
      
    } catch (e: any) {
      let msg = "Login failed.";
      if (e.code === "auth/invalid-credential") msg = "Incorrect email or password.";
      if (e.code === "auth/user-not-found") msg = "User not found.";
      if (e.code === "auth/wrong-password") msg = "Incorrect password.";
      showMessage(msg, true);
      setLoading(false);
    }
  };

  // 4. Handle Closing the Ban Dialog (Signs out the user)
  const handleCloseBanDialog = async () => {
    setShowBanDialog(false);
    await signOut(auth); // Sign out ONLY after they acknowledge the message
  };

  const handleResendVerification = async () => {
    if (!pendingUser) return;
    setResendLoading(true);
    try {
      await sendEmailVerification(pendingUser);
      showMessage("Verification email sent!", false);
      setShowVerifyDialog(false);
      await signOut(auth);
    } catch (err) {
      showMessage("Failed to send email.", true);
    } finally {
      setResendLoading(false);
      setPendingUser(null);
    }
  };

  if (checkingAuth) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: COLORS.gradient[1] }]}>
        <ActivityIndicator animating size="large" color={COLORS.secondary} />
      </View>
    );
  }

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
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Image
              source={require("../../assets/images/white-logo.png")}
              resizeMode="contain"
              style={styles.logo}
            />
            <Text style={[styles.headerSubtitle, { color: COLORS.text }]}>
              Welcome to VoltVault
            </Text>
          </View>

          {/* Login Card */}
          <View style={[styles.card, { backgroundColor: COLORS.background }]}>
            
            <CustomInput
              label="CVSU Email"
              value={email}
              onChangeText={(text: string) => {
                setEmail(text); 
                if (emailError) setEmailError("");
              }}
              onBlur={handleEmailBlur} 
              error={emailError}
              suffix="@cvsu.edu.ph"
              keyboardType="email-address"
            />

            <CustomInput
              label="Password"
              value={password}
              onChangeText={(t: string) => { 
                setPassword(t); 
                if (passwordError) setPasswordError(""); 
              }}
              error={passwordError}
              secureTextEntry={!showPassword}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.placeholders} />
                </TouchableOpacity>
              }
            />

            <TouchableOpacity 
              onPress={() => router.push("/password-reset")} 
              style={{ alignSelf: 'flex-end', marginBottom: 24, marginTop: -8 }}
            >
              <Text style={{ color: COLORS.secondary, fontWeight: '600', fontSize: 13 }}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {loading ? (
              <ActivityIndicator animating={true} color={COLORS.secondary} size="large" style={{ marginTop: 10 }} />
            ) : (
              <View>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: COLORS.text }]}
                  onPress={handleLogin}
                >
                  <Text style={styles.primaryButtonText}>Login</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/signup")} style={styles.secondaryButton}>
                  <Text style={[styles.secondaryButtonText, { color: COLORS.secondary }]}>
                    Don't have an account? <Text style={{fontWeight: 'bold'}}>Sign Up</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Verification Dialog */}
        <Portal>
          <Dialog visible={showVerifyDialog} onDismiss={() => setShowVerifyDialog(false)} style={{ backgroundColor: COLORS.white }}>
            <Dialog.Title style={{ color: COLORS.inputText }}>Email Not Verified</Dialog.Title>
            <Dialog.Content>
              <Paragraph style={{ color: '#333' }}>
                You must verify your email before logging in.
              </Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <PaperButton onPress={() => setShowVerifyDialog(false)} textColor={COLORS.error}>Cancel</PaperButton>
              <PaperButton onPress={handleResendVerification} loading={resendLoading} textColor={COLORS.primary}>Resend Email</PaperButton>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* 5. SUSPENSION DIALOG (Detailed) */}
        <Portal>
          <Dialog 
            visible={showBanDialog} 
            onDismiss={handleCloseBanDialog} 
            style={{ backgroundColor: COLORS.white }}
          >
            <Dialog.Title style={{ color: COLORS.error, fontWeight: 'bold' }}>
              <Ionicons name="warning" size={24} color={COLORS.error} /> Account Suspended
            </Dialog.Title>
            <Dialog.Content>
              <Paragraph style={{ color: '#333', marginBottom: 15, fontSize: 15 }}>
                Your account has been suspended and you cannot access the application.
              </Paragraph>
              
              <View style={{ backgroundColor: '#FEF2F2', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
                {/* Reason */}
                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                  <Text style={{ fontWeight: 'bold', color: '#991B1B', width: 80 }}>Reason:</Text>
                  <Text style={{ color: '#7F1D1D', flex: 1 }}>{banDetails.reason}</Text>
                </View>

                {/* Date */}
                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                  <Text style={{ fontWeight: 'bold', color: '#991B1B', width: 80 }}>Date:</Text>
                  <Text style={{ color: '#7F1D1D', flex: 1 }}>{banDetails.date}</Text>
                </View>

                {/* Action By */}
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ fontWeight: 'bold', color: '#991B1B', width: 80 }}>Action By:</Text>
                  <Text style={{ color: '#7F1D1D', flex: 1, fontWeight: 'bold' }}>Admin</Text>
                </View>
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <PaperButton 
                onPress={handleCloseBanDialog} 
                textColor={COLORS.primary}
                labelStyle={{ fontWeight: 'bold' }}
              >
                Close & Sign Out
              </PaperButton>
            </Dialog.Actions>
          </Dialog>
        </Portal>

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
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,            
    justifyContent: "center", 
    padding: 24,
    marginBottom: 100,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 16,
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