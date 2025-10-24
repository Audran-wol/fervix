import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FvButton, FvCard } from '../../components';
import { useTheme } from '../../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';

export const SupportScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.surface : '#FFFFFF',
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      marginTop: 20,
      marginBottom: 20,
      textAlign: 'center',
      color: '#6B7280',
    },
    socialIconsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 30,
      gap: 20,
    },
    socialIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#E01919',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    card: {
      marginBottom: 20,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 12,
      color: '#6B7280',
    },
    cardText: {
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 16,
      color: colors.textMuted,
    },
    button: {
      marginTop: 8,
    },
    roundedButton: {
      borderRadius: 12,
      paddingVertical: 16,
      shadowColor: '#E01919',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    // FAQ Styles (copied from InfoScreen)
    faqSection: {
      marginBottom: 32,
    },
    faqHeader: {
      marginBottom: 24,
      alignItems: 'center',
    },
    faqTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#6B7280',
      marginBottom: 8,
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    faqSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      fontWeight: '500',
    },
    faqContainer: {
      gap: 12,
    },
    faqItem: {
      backgroundColor: colors.card,
      borderRadius: 24,
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 0,
    },
    faqItemExpanded: {
      backgroundColor: colors['primary-100'],
      shadowOpacity: 0.10,
      shadowRadius: 12,
      elevation: 4,
    },
    faqQuestionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 24,
    },
    faqQuestionContainer: {
      flex: 1,
      marginRight: 16,
    },
    faqQuestion: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      lineHeight: 22,
    },
    faqQuestionExpanded: {
      color: colors.primary,
      fontWeight: '700',
    },
    faqChevron: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
    },
    faqDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 24,
    },
    faqAnswerContainer: {
      paddingHorizontal: 24,
      paddingVertical: 20,
    },
    faqAnswer: {
      fontSize: 15,
      color: colors.textMuted,
      lineHeight: 24,
      fontWeight: '400',
    },

    bottomSpacing: {
      height: 80,
    },
  });

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const faqItems = [
    { 
      q: t('support.faq1.question'), 
      a: t('support.faq1.answer') 
    },
    { 
      q: t('support.faq2.question'), 
      a: t('support.faq2.answer') 
    },
    { 
      q: t('support.faq3.question'), 
      a: t('support.faq3.answer') 
    },
    { 
      q: t('support.faq4.question'), 
      a: t('support.faq4.answer') 
    },
    { 
      q: t('support.faq5.question'), 
      a: t('support.faq5.answer') 
    },
    { 
      q: t('support.faq6.question'), 
      a: t('support.faq6.answer') 
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('support.title')}</Text>
        
        {/* Social Media Icons */}
        <View style={styles.socialIconsContainer}>
          <TouchableOpacity style={styles.socialIcon}>
            <Ionicons name="logo-instagram" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialIcon}>
            <Ionicons name="logo-facebook" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialIcon}>
            <Ionicons name="logo-youtube" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <FvCard style={styles.card}>
          <Text style={styles.cardTitle}>{t('support.contactSupport')}</Text>
          <Text style={styles.cardText}>
            {t('support.contactDescription')}
          </Text>
          <FvButton
            title={t('support.contactUs')}
            onPress={() => {
              // Open contact form or email
            }}
            style={[styles.button, styles.roundedButton, { backgroundColor: colors.primary }]}
          />
        </FvCard>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <View style={styles.faqHeader}>
            <Text style={styles.faqTitle}>FAQ</Text>
            <Text style={styles.faqSubtitle}>Frequently Asked Questions</Text>
          </View>
          
          <View style={styles.faqContainer}>
            {faqItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.faqItem,
                  expandedFaq === index && styles.faqItemExpanded
                ]}
                onPress={() => toggleFaq(index)}
                activeOpacity={0.8}
              >
                <View style={styles.faqQuestionRow}>
                  <View style={styles.faqQuestionContainer}>
                    <Text 
                      style={[
                        styles.faqQuestion,
                        expandedFaq === index && styles.faqQuestionExpanded
                      ]} 
                      numberOfLines={2}
                    >
                      {item.q}
                    </Text>
                  </View>
                  <View style={[
                    styles.faqChevron,
                    { backgroundColor: expandedFaq === index ? colors.primary : colors['primary-100'] }
                  ]}>
                    <Ionicons
                      name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={expandedFaq === index ? '#FFFFFF' : colors.primary}
                    />
                  </View>
                </View>
                
                {expandedFaq === index && (
                  <>
                    <View style={styles.faqDivider} />
                    <View style={styles.faqAnswerContainer}>
                      <Text style={styles.faqAnswer}>{item.a}</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


export default SupportScreen;
