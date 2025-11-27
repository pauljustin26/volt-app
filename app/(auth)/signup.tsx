import { useRouter } from "expo-router";
import Checkbox from "expo-checkbox";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import React, { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Image,
  Alert,
  Linking
} from "react-native";
import { ActivityIndicator, Button, HelperText, Text, TextInput, useTheme, Snackbar } from "react-native-paper";
import { auth } from "../../config/firebaseConfig";
import { useAppTheme } from "../_layout";

// --- MOVED INTERFACES & VALIDATION HERE FOR CLARITY ---

export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string; // username only, without @cvsu.edu.ph
  password: string;
  confirmPassword: string;
  studentId: string;
  mobileNumber: string; // Changed from optional to required
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
        // Validates PH numbers: 09xxxxxxxxx or +639xxxxxxxxx
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
  
  // New state for signup success snackbar
  const [signupSuccessSnackbar, setSignupSuccessSnackbar] = useState(false);

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const { isDark } = useAppTheme();

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
      return;
    }

    // 2. Check terms agreement
    if (!agreed) {
      Alert.alert("Agreement Required", "Please agree to the Terms & Conditions to continue.");
      return;
    }

    setLoading(true);
    setErrors({});
    setSignupSuccessSnackbar(false);

    try {
      const fullEmail = `${formData.email.trim().toLowerCase()}@cvsu.edu.ph`;

      // 3. Check if student ID is already registered
      const checkRes = await fetch(`${API_URL}/auth/check-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: formData.studentId.trim() }),
      });

      if (!checkRes.ok) {
        const data = await checkRes.json().catch(() => ({}));
        throw new Error(data.message || "Student ID is already registered.");
      }

      // 4. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        fullEmail,
        formData.password
      );
      const user = userCredential.user;

      // 5. Send verification email
      await sendEmailVerification(user);

      // 6. Save user info to backend
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
          mobileNumber: formData.mobileNumber.trim(), // Added to backend payload
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to save user info.");
      }

      // 7. Notify user using Snackbar instead of Alert.alert
      setSignupSuccessSnackbar(true);

      // 8. Log out until verified, navigate after the snackbar has had a chance to show
      await auth.signOut();
      setTimeout(() => {
        router.replace("/login");
      }, 3000); // 3 seconds delay to show the success message

    } catch (err: any) {
      let message = err.message || "Signup failed. Please try again.";
      if (err.code === "auth/email-already-in-use") message = "This email is already registered.";
      else if (err.code === "auth/invalid-email") message = "Invalid email format.";
      else if (err.code === "auth/weak-password") message = "Password is too weak (min 6 characters).";

      setErrors({ submit: message });
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

            {/* Mobile Number - NEW FIELD */}
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

            {/* CvSU Email (username only input) */}
            <View style={styles.emailContainer}>
              <TextInput
                placeholder="CvSU Username"
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
                style={{ flex: 1 }}
                theme={commonInputTheme}
              />
              <Text style={styles.emailSuffix}>@cvsu.edu.ph</Text>
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

            {/* Submit Errors */}
            {errors.submit && (
              <HelperText type="error" visible={true} style={{ textAlign: "center" }}>
                {errors.submit}
              </HelperText>
            )}

            {/* Terms & Conditions */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 12, marginLeft: 6 }}>
              <Checkbox value={agreed} onValueChange={setAgreed} color={agreed ? theme.colors.primary : undefined} />
              <Text style={{ marginLeft: 8, flex: 1 }}>
                I agree to the{" "}
                <Text
                  style={{ color: theme.colors.primary, textDecorationLine: "underline" }}
                  onPress={() => router.push("/terms")}
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
                  style={styles.button}
                  disabled={loading}
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

      {/* Signup Success Snackbar (Replaces Alert) */}
      <Snackbar visible={signupSuccessSnackbar} onDismiss={() => setSignupSuccessSnackbar(false)} duration={3000} style={{ backgroundColor: theme.colors.primary }}>
        Registration complete! A verification link has been sent to your email.
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
});