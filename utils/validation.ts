export interface ValidationErrors {
  [key: string]: string;
}

export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string; // username only, without @cvsu.edu.ph
  password: string;
  confirmPassword: string;
  studentId: string;
  mobileNumber?: string;
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
