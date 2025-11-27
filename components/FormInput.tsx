import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface FormInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  error?: string;
  secureTextEntry?: boolean;
  toggleSecureEntry?: () => void;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  isHalf?: boolean;
  onPress?: () => void;
  onBlur?: () => void;
  name?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  toggleSecureEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  isHalf = false,
  onPress,
  onBlur,
}) => {
  const inputStyles = [
    styles.input,
    isHalf && styles.halfInput,
    error && styles.inputError,
  ];

  if (onPress) {
    return (
      <View style={[styles.inputContainer, isHalf && styles.halfContainer]}>
        <TouchableOpacity style={inputStyles} onPress={onPress}>
          <Text style={value ? styles.inputText : styles.placeholder}>
            {value || placeholder}
          </Text>
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.inputContainer, isHalf && styles.halfContainer]}>
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <TextInput
          style={[styles.textInput, isHalf && styles.halfInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onBlur={onBlur}
        />
        {toggleSecureEntry && (
          <TouchableOpacity style={styles.eyeIcon} onPress={toggleSecureEntry}>
            <Ionicons
              name={secureTextEntry ? 'eye' : 'eye-off'}
              size={20}
              color="#333"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    width: '100%',
  },
  halfContainer: {
    flex: 1,
    marginRight: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  halfInput: {
    flex: 1,
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  eyeIcon: {
    paddingHorizontal: 12,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
  },
});
