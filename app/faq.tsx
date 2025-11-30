import React, { useState } from "react";
import { ScrollView, StyleSheet, Pressable, View, Linking } from "react-native";
import { Text, useTheme, List, Divider, IconButton } from "react-native-paper";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function SupportScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Hardcoded version for display (usually fetched from Constants.manifest.version)
  const appVersion = "1.0.0"; 

  const handlePress = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const faqs = [
    {
      id: "1",
      question: "How do I rent a powerbank?",
      answer: "Go to the 'Rent' tab, select a nearby station on the map, choose your rental duration, and confirm payment. The station will release a powerbank for you."
    },
    {
      id: "2",
      question: "How do I return a powerbank?",
      answer: "Find any VoltVault station with an empty slot. Insert the powerbank until it clicks. The app will automatically detect the return and stop the timer."
    },
    {
      id: "3",
      question: "What happens if I'm late?",
      answer: "We offer a 5-minute grace period after your rental time expires. Beyond that, a penalty fee of ₱5.00 per minute will be deducted from your wallet."
    },
    {
      id: "4",
      question: "My wallet balance is insufficient.",
      answer: "You need a minimum balance of ₱100 to start a rental. Please navigate to the Wallet section to top up your account."
    },
    {
      id: "5",
      question: "What if the powerbank is defective?",
      answer: "Please return the powerbank immediately to the station (within the grace period) to avoid charges, and report the issue to our support team."
    },
    // ⭐ STANDARD ADDITION: Payment Methods
    {
      id: "6",
      question: "What payment methods are accepted?",
      answer: "We currently accept GCash, PayMaya, and major credit/debit cards via our secure payment gateway."
    },
    // ⭐ STANDARD ADDITION: Account Deletion (Required by App Stores)
    {
      id: "7",
      question: "How do I delete my account?",
      answer: "To request account deletion, please email support@voltvault.com with the subject 'Account Deletion Request'. We will process your data removal within 24-48 hours."
    }
  ];

  const openSocial = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          FAQs & Support
        </Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Support Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          Contact Us
        </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.onPrimary, borderRadius: 12 }]}>
          <Text style={[styles.paragraph, { color: theme.colors.primary }]}>
            Need help?
          </Text>
          
          <Pressable onPress={() => Linking.openURL('mailto:support@voltvault.com')} style={styles.contactRow}>
            <Ionicons name="mail" size={20} color={theme.colors.primary} />
            <Text style={[styles.linkText, { color: theme.colors.primary }]}>support@voltvault.com</Text>
          </Pressable>

          <Pressable onPress={() => Linking.openURL('tel:+639123456789')} style={styles.contactRow}>
            <Ionicons name="call" size={20} color={theme.colors.primary} />
            <Text style={[styles.linkText, { color: theme.colors.primary }]}>+63 912 345 6789</Text>
          </Pressable>
        </View>

        {/* ⭐ STANDARD ADDITION: Social Media */}
        <Text style={[styles.sectionTitle, { color: theme.colors.primary, marginTop: 20 }]}>
          Follow Us
        </Text>
        <View style={[styles.card, styles.socialRow, { backgroundColor: theme.colors.onPrimary, borderRadius: 12 }]}>
           <IconButton 
             icon={() => <Ionicons name="logo-facebook" size={28} color="#1877F2" />} 
             onPress={() => openSocial('https://facebook.com')}
           />
           <IconButton 
             icon={() => <Ionicons name="logo-twitter" size={28} color="#1DA1F2" />} 
             onPress={() => openSocial('https://twitter.com')}
           />
           <IconButton 
             icon={() => <Ionicons name="logo-instagram" size={28} color="#C13584" />} 
             onPress={() => openSocial('https://instagram.com')}
           />
        </View>

        {/* FAQs Section */}
        <Text style={[styles.sectionTitle, { color: theme.colors.primary, marginTop: 20 }]}>
          Frequently Asked Questions
        </Text>
        
        <View style={[styles.accordionGroup, { backgroundColor: theme.colors.onPrimary }]}>
          {faqs.map((item, index) => (
            <View key={item.id} style={{ borderBottomWidth: index === faqs.length - 1 ? 0 : 1, borderBottomColor: 'rgba(0,0,0,0.05)'}}>
              <List.Accordion
                title={item.question}
                id={item.id}
                expanded={expandedId === item.id}
                onPress={() => handlePress(item.id)}
                titleNumberOfLines={2}
                titleStyle={{ fontSize: 15, fontWeight: '600', color: theme.colors.onPrimary }}
                style={{ backgroundColor: 'transparent', paddingVertical: 0 }}
                theme={{ colors: { primary: theme.colors.primary } }}
              >
                <List.Item 
                  title={item.answer} 
                  titleNumberOfLines={10}
                  titleStyle={{ fontSize: 14, color: theme.colors.primary, lineHeight: 20 }}
                  style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 16, paddingTop: 16 }}
                />
              </List.Accordion>
            </View>
          ))}
        </View>

        {/* ⭐ STANDARD ADDITION: App Version Footer */}
        <View style={{ marginTop: 30, alignItems: 'center' }}>
          <Text style={{ color: theme.colors.onSurface, opacity: 0.5, fontSize: 12 }}>
            VoltVault App Version {appVersion}
          </Text>
          <Text style={{ color: theme.colors.onSurface, opacity: 0.5, fontSize: 12, marginTop: 2 }}>
            © 2025 VoltVault Inc. All rights reserved.
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      <Pressable
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.back()}
      >
        <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
          Go Back
        </Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerContainer: { marginTop: 50, marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: "bold" },
  scroll: { flex: 1, marginBottom: 20 },
  
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  paragraph: { fontSize: 14, marginBottom: 12, lineHeight: 20 },
  
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10
  },
  linkText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  accordionGroup: {
    borderRadius: 12,
    overflow: 'hidden',
  },

  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
    elevation: 2,
  },
  buttonText: { fontWeight: "bold", fontSize: 16 },
});