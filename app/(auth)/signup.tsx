import { useRouter } from "expo-router";
import { 
  createUserWithEmailAndPassword,
  sendEmailVerification 
} from "firebase/auth"; 
import React, { useState, useMemo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Image,
  TextInput as RNTextInput, 
  TouchableOpacity,
  Modal, 
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent
} from "react-native";
import { 
  ActivityIndicator, 
  Text, 
  Snackbar,
  Checkbox,
  Surface, 
  Divider, 
  Button 
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons"; 
import { auth } from "../../config/firebaseConfig";

// --- HARDCODED COLORS (Based on your DarkThemeCustom) ---
const COLORS = {
  gradient: ["#03040D", "#172647", "#172647", "#38466D", "#38466D"],
  background: "#172647",    // Surface color
  text: "#FFFFFF",          // Main text
  subText: "#adb5bd",       // Hints
  placeholders: "#172647",       // Placeholders
  primary: "#38466D",       // Button color
  secondary: "#FDAE37",     // Secondary/Orange
  error: "#E07A5F",         // Error Red
  inputText: "#172647",     // Black text for inputs
  inputBg: "#FFFFFF",       // Slightly lighter than bg for contrast
  inputBorder: "#38466D",   // Border color matching gradient tone
  white: "#FFFFFF",
  disabled: "#A0A0A0"       // Added for disabled state
};

// --- INTERFACES & VALIDATION ---
export interface SignupFormData {
  firstName: string; lastName: string; email: string; password: string; confirmPassword: string; studentId: string; mobileNumber: string;
}

export interface ValidationErrors { [key: string]: string; }

export const validateField = (name: keyof SignupFormData, value: string, password?: string): string => {
  switch (name) {
    case "studentId": return !value.trim() ? "Student ID is required" : "";
    case "firstName": return !value.trim() ? "First name is required" : "";
    case "lastName": return !value.trim() ? "Last name is required" : "";
    case "mobileNumber":
      if (!value.trim()) return "Mobile number is required";
      if (!/^(09|\+639)\d{9}$/.test(value.trim())) return "Invalid format";
      return "";
    case "email":
      if (!value.trim()) return "Username is required";
      if (!/^[a-zA-Z0-9._%+-]+$/.test(value.trim())) return "Invalid format";
      return "";
    case "password":
      if (!value) return "Password is required";
      if (value.length < 6) return "Min 6 characters";
      return "";
    case "confirmPassword":
      if (!value) return "Confirm password";
      if (value !== password) return "Password does not match";
      return "";
    default: return "";
  }
};

export const validateSignupForm = (formData: SignupFormData): ValidationErrors => {
  const errors: ValidationErrors = {};
  Object.keys(formData).forEach(key => {
    const fieldName = key as keyof SignupFormData;
    const error = validateField(fieldName, formData[fieldName], fieldName === "confirmPassword" ? formData.password : undefined);
    if (error) errors[fieldName] = error;
  });
  return errors;
};

export const isFormValid = (errors: ValidationErrors): boolean => Object.keys(errors).length === 0;

// --- CUSTOM INPUT COMPONENT (Hardcoded Styles) ---
const CustomInput = ({ 
  label, value, onChangeText, error, onBlur, onFocus, 
  secureTextEntry, rightIcon, keyboardType, placeholder, suffix 
}: any) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ 
        color: COLORS.subText, // Grayish label
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
        { 
          backgroundColor: COLORS.inputBg, // Dark Blue/Gray
        },
        error && { borderColor: COLORS.error, borderWidth: 1 }
      ]}>
        <RNTextInput
          style={[
            styles.inputField, 
            { color: COLORS.inputText },
            // @ts-ignore - 'outlineStyle' is a web-only valid prop
            Platform.OS === 'web' && { outlineStyle: 'none' } 
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholders}
          onBlur={() => { setIsFocused(false); onBlur?.(); }}
          onFocus={() => { setIsFocused(true); onFocus?.(); }}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
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

// --- HELPER COMPONENT FOR TERMS SECTIONS ---
const TermSection = ({ icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
  <View style={{ marginBottom: 24 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <Ionicons name={icon} size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
      <Text style={{ fontSize: 16, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: COLORS.primary }}>
        {title}
      </Text>
    </View>
    <Text style={{ fontSize: 14, lineHeight: 22, paddingLeft: 28, color: '#333' }}>
      {children}
    </Text>
  </View>
);

// --- MAIN COMPONENT ---

export default function Signup() {
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "", studentId: "", mobileNumber: "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  
  const [agreed, setAgreed] = useState(false);
  
  // --- Modal Visibility State ---
  const [showTermsModal, setShowTermsModal] = useState(false);
  // --- NEW: Scroll State for Terms ---
  const [termsScrolled, setTermsScrolled] = useState(false);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarColor, setSnackbarColor] = useState(COLORS.primary);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const showMessage = (message: string, isError: boolean = true) => {
    setSnackbarMessage(message);
    setSnackbarColor(isError ? COLORS.error : "#4CAF50");
    setSnackbarVisible(true);
  };

  const isAllFieldsFilled = useMemo(() => {
    return Object.values(formData).every(val => val.trim() !== "");
  }, [formData]);

  const handleBlur = (fieldName: keyof SignupFormData) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, formData[fieldName], fieldName === "confirmPassword" ? formData.password : undefined);
    if (error) setErrors(prev => ({ ...prev, [fieldName]: error }));
    else setErrors(prev => { const n = { ...prev }; delete n[fieldName]; return n; });
  };

  // --- LOGIC: Trigger Modal instead of Checkbox directly ---
  const handleCheckboxPress = () => {
    if (agreed) {
      // If already agreed, user can uncheck it freely
      setAgreed(false);
    } else {
      // If not agreed, force open modal and RESET scroll state
      setTermsScrolled(false);
      setShowTermsModal(true);
    }
  };

  // --- LOGIC: Handle Terms Agreement from Modal ---
  const handleAgreeFromModal = () => {
    if (termsScrolled) {
      setAgreed(true);
      setShowTermsModal(false);
    }
  };

  // --- LOGIC: Detect Scroll Position ---
  const handleTermsScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (termsScrolled) return; // Optimization: stop checking if already true

    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    
    // Calculate if close to bottom (20px buffer)
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;

    if (isCloseToBottom) {
      setTermsScrolled(true);
    }
  };

  const handleSignup = async () => {
    const validationErrors = validateSignupForm(formData);
    if (!isFormValid(validationErrors)) {
      setErrors(validationErrors);
      showMessage("Please correct the errors in the form.", true);
      return;
    }

    if (!agreed) {
      showMessage("Please agree to the Terms & Conditions.", true);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const fullEmail = `${formData.email.trim().toLowerCase()}@cvsu.edu.ph`;

      // 1. CHECK STUDENT ID
      const checkRes = await fetch(`${API_URL}/auth/check-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: formData.studentId.trim() }),
      });

      if (!checkRes.ok) {
        const errorData = await checkRes.json();
        throw new Error(errorData.message || "Invalid Student ID"); 
      }

      // 2. FIREBASE SIGNUP
      const userCredential = await createUserWithEmailAndPassword(auth, fullEmail, formData.password);
      const user = userCredential.user;
      
      const idToken = await user.getIdToken(true);

      // 3. INIT USER (SAVE TO DB)
      const initRes = await fetch(`${API_URL}/auth/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          studentId: formData.studentId.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
        }),
      });

      if (!initRes.ok) {
         const errorData = await initRes.json();
         throw new Error(errorData.message || "Failed to initialize account");
      }

      await sendEmailVerification(user);
      showMessage("Registration complete! Check your email.", false);
      await auth.signOut();
      setTimeout(() => router.replace("/login"), 2500);

    } catch (err: any) {
       let message = err.message || "Signup failed.";
       if(message.includes("auth/email-already-in-use")) {
         message = "This email is already registered.";
       }
       showMessage(message, true);
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <Image
              // Forcing white logo since background is dark
              source={require("../../assets/images/white-logo.png")}
              resizeMode="contain"
              style={styles.logo}
            />
            <Text style={[styles.headerSubtitle, { color: COLORS.text }]}>
              Create your account to get started
            </Text>
          </View>

          {/* Card Section */}
          <View style={[styles.card, { backgroundColor: COLORS.background }]}>
            
            <CustomInput
              label="Student ID *"
              value={formData.studentId}
              onChangeText={(t: string) => setFormData({ ...formData, studentId: t })}
              onBlur={() => handleBlur("studentId")}
              error={touchedFields.studentId && errors.studentId}
              placeholder="e.g. 202110123"
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <CustomInput
                  label="First Name *"
                  value={formData.firstName}
                  onChangeText={(t: string) => setFormData({ ...formData, firstName: t })}
                  onBlur={() => handleBlur("firstName")}
                  error={touchedFields.firstName && errors.firstName}
                  placeholder="John"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <CustomInput
                  label="Last Name *"
                  value={formData.lastName}
                  onChangeText={(t: string) => setFormData({ ...formData, lastName: t })}
                  onBlur={() => handleBlur("lastName")}
                  error={touchedFields.lastName && errors.lastName}
                  placeholder="Doe"
                />
              </View>
            </View>

            <CustomInput
              label="Mobile Number *"
              value={formData.mobileNumber}
              onChangeText={(t: string) => setFormData({ ...formData, mobileNumber: t })}
              onBlur={() => handleBlur("mobileNumber")}
              error={touchedFields.mobileNumber && errors.mobileNumber}
              keyboardType="phone-pad"
              placeholder="09123456789"
            />

            <CustomInput
              label="CVSU EMAIL *"
              value={formData.email}
              onChangeText={(t: string) => setFormData({ ...formData, email: t.replace(/@.*/, "") })}
              onBlur={() => handleBlur("email")}
              error={touchedFields.email && errors.email}
              suffix="@cvsu.edu.ph"
              keyboardType="email-address"
            />

            <CustomInput
              label="Password *"
              value={formData.password}
              onChangeText={(t: string) => {
                setFormData(prev => ({ ...prev, password: t }));
                if (formData.confirmPassword) {
                  const error = validateField("confirmPassword", formData.confirmPassword, t);
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    if (error) newErrors.confirmPassword = error;
                    else delete newErrors.confirmPassword;
                    return newErrors;
                  });
                }
              }}
              onBlur={() => handleBlur("password")}
              error={touchedFields.password && errors.password}
              secureTextEntry={!showPassword}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.placeholders} />
                </TouchableOpacity>
              }
            />

            <CustomInput
              label="Confirm Password *"
              value={formData.confirmPassword}
              onChangeText={(t: string) => {
                setFormData(prev => ({ ...prev, confirmPassword: t }));
                const error = validateField("confirmPassword", t, formData.password);
                setErrors(prev => {
                  const newErrors = { ...prev };
                  if (error) newErrors.confirmPassword = error;
                  else delete newErrors.confirmPassword;
                  return newErrors;
                });
              }}
              onBlur={() => handleBlur("confirmPassword")}
              error={errors.confirmPassword} 
              secureTextEntry={!showConfirmPassword}
              rightIcon={
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.placeholders} />
                </TouchableOpacity>
              }
            />

            {/* Terms */}
            <View style={styles.termsContainer}>
              <Checkbox.Android
                status={agreed ? 'checked' : 'unchecked'}
                onPress={handleCheckboxPress} 
                color={COLORS.secondary}
                uncheckedColor={COLORS.subText}
              />
              <Text style={styles.termsText} onPress={handleCheckboxPress}> 
                I agree to the <Text style={{ color: COLORS.secondary, fontWeight: 'bold', textDecorationLine: 'underline' }} onPress={() => { setTermsScrolled(false); setShowTermsModal(true); }}>Terms & Conditions</Text>
              </Text>
            </View>

            {/* Actions */}
            {loading ? (
              <ActivityIndicator animating={true} color={COLORS.secondary} size="large" style={{ marginTop: 20 }} />
            ) : (
              <View style={{ marginTop: 20 }}>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: COLORS.text }, (!isAllFieldsFilled || !agreed) && { opacity: 0.6 }]}
                  onPress={handleSignup}
                  disabled={!isAllFieldsFilled || !agreed || loading}
                >
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/login")} style={styles.secondaryButton}>
                  <Text style={[styles.secondaryButtonText, { color: COLORS.secondary }]}>
                    Already have an account? <Text style={{fontWeight: 'bold'}}>Login</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- TERMS AND CONDITIONS MODAL --- */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalSurface} elevation={4}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text variant="headlineSmall" style={{ fontWeight: "800", color: COLORS.primary }}>
                Terms & Conditions
              </Text>
            </View>

            <Divider />

            {/* Content - with SCROLL DETECTION */}
            <ScrollView 
              showsVerticalScrollIndicator={true} 
              contentContainerStyle={{ padding: 24 }}
              onScroll={handleTermsScroll}  // <--- ADDED LISTENER
              scrollEventThrottle={16}      // <--- ADDED THROTTLE (16ms = ~60fps)
            >
              <Text style={{ fontSize: 14, fontStyle: 'italic', textAlign: 'center', opacity: 0.8, color: '#333', marginBottom: 20 }}>
                Welcome to VoltVault. By using our powerbank rental service, you agree to the following terms.
              </Text>

              <TermSection icon="timer-outline" title="1. Rental Duration & Return">
                The maximum rental duration for any single session is <Text style={{fontWeight: 'bold', color: '#333'}}>3 hours</Text>. 
                You must return the powerbank to any active station before this time expires.
                {"\n"}{"\n"}
                We provide a <Text style={{fontWeight: 'bold', color: COLORS.secondary}}>5-minute grace period</Text> after your rental time ends to allow for return processing.
              </TermSection>

              <TermSection icon="alert-circle-outline" title="2. Fees & Penalties">
                <Text style={{fontWeight: 'bold', color: '#333'}}>Late Returns:</Text> If you fail to return the device within the grace period, a penalty fee of <Text style={{fontWeight: 'bold', color: COLORS.error}}>₱5.00 per minute</Text> will be automatically deducted from your wallet until the device is returned.
              {"\n"}{"\n"}
                <Text style={{fontWeight: 'bold', color: '#333'}}>Lost/Damaged:</Text> Unreturned devices after 24 hours or devices returned with significant damage will incur a full replacement fee of ₱1,500.00.
              </TermSection>

              <TermSection icon="wallet-outline" title="3. Wallet & Payments">
                A minimum wallet balance of <Text style={{fontWeight: 'bold', color: '#333'}}>₱100.00</Text> is required to initiate any rental.
                {"\n"}{"\n"}
                Wallet top-ups are final and <Text style={{fontWeight: 'bold', color: '#333'}}>non-refundable</Text>. Please ensure you verify amounts before topping up.
              </TermSection>

              <TermSection icon="location-outline" title="4. Usage & Vicinity">
                Powerbanks are equipped with anti-theft technology. They must remain within the <Text style={{fontWeight: 'bold', color: '#333'}}>designated campus/building vicinity</Text>.
                {"\n"}{"\n"}
                Taking the device outside the allowed area may trigger the built-in security alarm and lock the device.
              </TermSection>

              <TermSection icon="shield-checkmark-outline" title="5. User Responsibility">
                You are responsible for the device while it is in your possession. Do not attempt to dismantle, modify, or repair the powerbank.
              </TermSection>

              <View style={{ height: 20 }} />
              
              {/* Optional hint text at bottom */}
              {!termsScrolled && (
                 <Text style={{ textAlign: 'center', color: COLORS.error, fontStyle: 'italic', marginBottom: 10 }}>
                   Scroll to the bottom to agree
                 </Text>
              )}
            </ScrollView>

            <Divider />

            {/* Footer */}
            <View style={{ padding: 16 }}>
              <Button
                mode="contained"
                onPress={() => {
                  if (termsScrolled) {
                    handleAgreeFromModal();
                  }
                }}
                // FIX: Darker gray background (#E0E0E0) for the disabled state so it pops on white
                buttonColor={termsScrolled ? COLORS.primary : "#E0E0E0"} 
                // FIX: Dark text (#333333) so it's clearly readable
                textColor={termsScrolled ? COLORS.white : "#172647"}
                labelStyle={{ fontSize: 16, fontWeight: "bold" }}
                style={{ borderRadius: 12 }}
                // Optional: Remove shadow when it's "disabled" for a flatter look
                elevation={termsScrolled ? 2 : 0} 
              >
                {termsScrolled ? "Agree" : "Scroll to End"}
              </Button>
              <Button 
                onPress={() => setShowTermsModal(false)} 
                textColor={COLORS.error}
                style={{ marginTop: 8 }}
              >
                Cancel
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: snackbarColor, borderRadius: 12, marginBottom: 30 }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{snackbarMessage}</Text>
      </Snackbar>
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
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
    marginTop: 20,
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  card: {
    borderRadius: 24,
    padding: 24,
    // Soft Shadow for "Lifted" look
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, // Increased for dark mode visibility
    shadowRadius: 20,
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  termsText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
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

  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalSurface: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    height: '85%', // Takes up most of the screen like a page
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    alignItems: 'center',
  }
});