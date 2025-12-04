import { useRouter } from "expo-router";
// Replaced expo-checkbox with react-native-paper Checkbox for the icon style
import { 
  createUserWithEmailAndPassword,
  sendEmailVerification // Added import
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
  Linking
} from "react-native";
import { 
  ActivityIndicator, 
  Button, 
  HelperText, 
  Text, 
  TextInput, 
  useTheme, 
  Snackbar,
  Checkbox 
} from "react-native-paper";
import { auth } from "../../config/firebaseConfig";
import { useAppTheme } from "../_layout";

// --- INTERFACES & VALIDATION ---

export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string; // username only, without @cvsu.edu.ph
  password: string;
  confirmPassword: string;
  studentId: string;
  mobileNumber: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

export const validateField = (
  name: keyof SignupFormData,
  value: string,
  password?: string
): string => {
  switch (name) {
    case "studentId":
      return !value.trim() ? "Student ID is required" : "";
    case "firstName":
      return !value.trim() ? "First name is required" : "";
    case "lastName":
      return !value.trim() ? "Last name is required" : "";
    case "mobileNumber":
      if (!value.trim()) return "Mobile number is required";
      if (!/^(09|\+639)\d{9}$/.test(value.trim()))
        return "Invalid format (e.g., 09123456789)";
      return "";
    case "email":
      if (!value.trim()) return "CvSU username is required";
      if (!/^[a-zA-Z0-9._%+-]+$/.test(value.trim()))
        return "Invalid CvSU username format";
      return "";
    case "password":
      if (!value) return "Password is required";
      if (value.length < 6) return "Password must be at least 6 characters long";
      return "";
    case "confirmPassword":
      if (!value) return "Please confirm your password";
      if (value !== password) return "Passwords do not match";
      return "";
    default:
      return "";
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

// --- MAIN COMPONENT ---

export default function Signup() {
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    studentId: "",
    mobileNumber: "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const [agreed, setAgreed] = useState(false);
  
  // --- Snackbar State ---
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarColor, setSnackbarColor] = useState(theme.colors.primary);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  const { isDark } = useAppTheme();

  // --- Helper: Show Fancy Message ---
  const showMessage = (message: string, isError: boolean = true) => {
    setSnackbarMessage(message);
    setSnackbarColor(isError ? theme.colors.error : theme.colors.primary);
    setSnackbarVisible(true);
  };

  // --- Computed: Check if all fields have values ---
  const isAllFieldsFilled = useMemo(() => {
    return Object.values(formData).every(val => val.trim() !== "");
  }, [formData]);

  const handleBlur = (fieldName: keyof SignupFormData) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(
      fieldName,
      formData[fieldName],
      fieldName === "confirmPassword" ? formData.password : undefined
    );
    if (error) {
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleFocus = (fieldName: keyof SignupFormData) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const handleSignup = async () => {
    // 1. Validate inputs
    const validationErrors = validateSignupForm(formData);
    if (!isFormValid(validationErrors)) {
      setErrors(validationErrors);
      showMessage("Please correct the errors in the form.", true);
      return;
    }

    // 2. Check terms agreement
    if (!agreed) {
      showMessage("Please agree to the Terms & Conditions to continue.", true);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const fullEmail = `${formData.email.trim().toLowerCase()}@cvsu.edu.ph`;

      // 3. Check if student ID is valid AND already registered
      const checkRes = await fetch(`${API_URL}/auth/check-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: formData.studentId.trim() }),
      });

      if (!checkRes.ok) {
        const data = await checkRes.json().catch(() => ({}));
        throw new Error(data.message || "Student ID check failed.");
      }

      // 4. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        fullEmail,
        formData.password
      );
      const user = userCredential.user;

      try {
        // 5. Save user info to backend
        const idToken = await user.getIdToken(true);
        const res = await fetch(`${API_URL}/auth/init`, {
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

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Failed to save user info.");
        }

        // 6. Verification Email
        await sendEmailVerification(user);

        // 7. Success Message
        showMessage("Registration complete! A verification link has been sent to your email.", false);

        // 8. Log out until verified
        await auth.signOut();
        
        setTimeout(() => {
          router.replace("/login");
        }, 2500);

      } catch (backendError: any) {
        // --- CRITICAL FIX: CLEANUP ---
        // If Backend Init fails, DELETE the Firebase Auth user so they aren't stuck
        // with an account but no Firestore data.
        if (auth.currentUser) {
           await auth.currentUser.delete().catch(e => console.log("Cleanup failed", e));
        }
        throw backendError; // Re-throw to be caught by outer catch
      }

    } catch (err: any) {
      let message = err.message || "Signup failed. Please try again.";
      if (err.code === "auth/email-already-in-use") message = "This email is already registered.";
      else if (err.code === "auth/invalid-email") message = "Invalid email format.";
      else if (err.code === "auth/weak-password") message = "Password is too weak (min 6 characters).";
      else if (err.code === "auth/network-request-failed") message = "Network error. Check your connection.";

      setErrors(prev => ({ ...prev, submit: message }));
      showMessage(message, true);
    } finally {
      setLoading(false);
    }
  };

  const commonInputTheme = {
    colors: {
      primary: theme.colors.onSurface,
      text: theme.colors.onSurface,
      placeholder: theme.colors.onSurface,
      background: "transparent",
      onSurfaceVariant: "#FFFFFF",
      outline: "#FFFFFF",
    },
    roundness: 15,
  };

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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.inner}>
            <Image
              source={
                isDark
                  ? require("../../assets/images/white-logo.png")
                  : require("../../assets/images/blue-logo.png")
              }
              resizeMode="contain"
              style={styles.logo}
            />
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
              Create Account
            </Text>

            {/* Student ID */}
            <TextInput
              placeholder="Student ID No."
              value={formData.studentId}
              onChangeText={text => setFormData({ ...formData, studentId: text })}
              mode="outlined"
              error={!!errors.studentId && touchedFields.studentId}
              onBlur={() => handleBlur("studentId")}
              onFocus={() => handleFocus("studentId")}
              theme={commonInputTheme}
              style={{ marginBottom: 0 }}
            />
            <HelperText type="error" visible={!!errors.studentId && touchedFields.studentId}>
              {errors.studentId}
            </HelperText>

            {/* First & Last Name */}
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  placeholder="First Name"
                  value={formData.firstName}
                  onChangeText={text => setFormData({ ...formData, firstName: text })}
                  mode="outlined"
                  error={!!errors.firstName && touchedFields.firstName}
                  onBlur={() => handleBlur("firstName")}
                  onFocus={() => handleFocus("firstName")}
                  theme={commonInputTheme}
                  style={{ marginBottom: 0 }}
                />
                <HelperText type="error" visible={!!errors.firstName && touchedFields.firstName}>
                  {errors.firstName}
                </HelperText>
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChangeText={text => setFormData({ ...formData, lastName: text })}
                  mode="outlined"
                  error={!!errors.lastName && touchedFields.lastName}
                  onBlur={() => handleBlur("lastName")}
                  onFocus={() => handleFocus("lastName")}
                  theme={commonInputTheme}
                  style={{ marginBottom: 0 }}
                />
                <HelperText type="error" visible={!!errors.lastName && touchedFields.lastName}>
                  {errors.lastName}
                </HelperText>
              </View>
            </View>

            {/* Mobile Number */}
            <TextInput
              placeholder="Contact No."
              value={formData.mobileNumber}
              onChangeText={text => setFormData({ ...formData, mobileNumber: text })}
              mode="outlined"
              keyboardType="phone-pad"
              maxLength={11}
              error={!!errors.mobileNumber && touchedFields.mobileNumber}
              onBlur={() => handleBlur("mobileNumber")}
              onFocus={() => handleFocus("mobileNumber")}
              theme={commonInputTheme}
              style={{ marginBottom: 0 }}
            />
            <HelperText type="error" visible={!!errors.mobileNumber && touchedFields.mobileNumber}>
              {errors.mobileNumber}
            </HelperText>

            {/* CvSU Email - UPDATED WITH OVERLAY STYLE */}
            <View style={{ position: "relative", width: "100%" }}>
              <TextInput
                placeholder="Email"
                value={formData.email}
                onChangeText={(text) => {
                  const clean = text.replace(/@.*/, "");
                  setFormData({ ...formData, email: clean });
                }}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                error={!!errors.email && touchedFields.email}
                onBlur={() => handleBlur("email")}
                onFocus={() => handleFocus("email")}
                style={{ marginBottom: 0 }}
                theme={commonInputTheme}
              />
              <Text
                style={{
                  position: "absolute",
                  right: 15,
                  top: 20, 
                  color: theme.colors.onSurface,
                  opacity: 0.7,
                  fontSize: 16,
                }}
              >
                @cvsu.edu.ph
              </Text>
            </View>
            <HelperText type="error" visible={!!errors.email && touchedFields.email}>
              {errors.email}
            </HelperText>

            {/* Password */}
            <TextInput
              placeholder="Password"
              value={formData.password}
              onChangeText={text => setFormData({ ...formData, password: text })}
              mode="outlined"
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off" : "eye"}
                  onPress={() => setShowPassword(!showPassword)}
                  color={theme.colors.onSurface}
                />
              }
              autoCapitalize="none"
              error={!!errors.password && touchedFields.password}
              onBlur={() => handleBlur("password")}
              onFocus={() => handleFocus("password")}
              theme={commonInputTheme}
              style={{ marginBottom: 0 }}
            />
            <HelperText type="error" visible={!!errors.password && touchedFields.password}>
              {errors.password}
            </HelperText>

            {/* Confirm Password */}
            <TextInput
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={text => setFormData({ ...formData, confirmPassword: text })}
              mode="outlined"
              secureTextEntry={!showConfirmPassword}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? "eye-off" : "eye"}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  color={theme.colors.onSurface}
                />
              }
              autoCapitalize="none"
              error={!!errors.confirmPassword && touchedFields.confirmPassword}
              onBlur={() => handleBlur("confirmPassword")}
              onFocus={() => handleFocus("confirmPassword")}
              theme={commonInputTheme}
              style={{ marginBottom: 0 }}
            />
            <HelperText
              type="error"
              visible={!!errors.confirmPassword && touchedFields.confirmPassword}
            >
              {errors.confirmPassword}
            </HelperText>

            {/* Terms & Conditions - Using Paper Checkbox for Icon Style */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 12 }}>
              <Checkbox
                status={agreed ? 'checked' : 'unchecked'}
                onPress={() => setAgreed(!agreed)}
                color={theme.colors.primary}
                uncheckedColor={theme.colors.onSurface}
              />
              <Text style={{ marginLeft: 2, flex: 1, color: theme.colors.onSurface }} onPress={() => setAgreed(!agreed)}>
                I agree to the{" "}
                <Text
                  style={{ color: theme.colors.primary, textDecorationLine: "underline" }}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push("/terms");
                  }}
                >
                  Terms & Conditions
                </Text>
              </Text>
            </View>

            {/* Actions */}
            {loading ? (
              <ActivityIndicator animating={true} color={theme.colors.primary} size="large" />
            ) : (
              <>
                <Button
                  mode="contained"
                  onPress={handleSignup}
                  style={[styles.button, (!isAllFieldsFilled || !agreed) && { opacity: 0.6 }]}
                  // Disable if: fields are empty OR terms not agreed OR loading
                  disabled={!isAllFieldsFilled || !agreed || loading}
                  buttonColor={theme.colors.primary}
                  textColor={theme.colors.onPrimary}
                >
                  {loading ? "Creating..." : "Create Account"}
                </Button>

                <Button
                  mode="contained"
                  onPress={() => router.push("/login")}
                  style={styles.button}
                  buttonColor={theme.colors.secondary}
                  textColor={theme.colors.onPrimary}
                >
                  Already have an account? Login
                </Button>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Unified Snackbar for Errors and Success */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: snackbarColor, borderRadius: 10, marginBottom: 20 }}
        action={{
          label: 'Close',
          onPress: () => setSnackbarVisible(false),
          textColor: theme.colors.onPrimary,
        }}
      >
        <Text style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>{snackbarMessage}</Text>
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
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 2,
  },
  button: {
    marginTop: 12,
    borderRadius: 15,
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
});