import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Linking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';

export const InfoScreen: React.FC = () => {
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
    
    // Header
    header: {
      alignItems: 'center',
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.primary,
      letterSpacing: 1,
    },

    // Section
    section: {
      backgroundColor: colors.card,
      borderRadius: 32,
      padding: 32,
      marginBottom: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
      elevation: 6,
      borderWidth: 0,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#6B7280',
      textAlign: 'center',
      marginBottom: 28,
      letterSpacing: 0.5,
    },

    // Steps
    stepsContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-around',
      paddingHorizontal: 16,
      marginTop: 16,
    },
    step: {
      flex: 1,
      alignItems: 'center',
      maxWidth: 110,
    },
    stepIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    stepIconImage: {
      width: 30,
      height: 30,
    },
    heatingIcon: {
      backgroundColor: colors['primary-100'],
    },
    applicationIcon: {
      backgroundColor: '#E5E7FF',
    },
    coolingIcon: {
      backgroundColor: '#E5F3FF',
    },
    stepTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 6,
      textAlign: 'center',
    },
    stepDescription: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 15,
      paddingHorizontal: 2,
      minHeight: 45,
    },

    // Connecting Lines
    connectingLine: {
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 12,
      marginTop: 35, // Align with center of step icons
    },
    line: {
      width: 30,
      height: 2,
      backgroundColor: colors.primary,
      borderRadius: 1,
    },

    // Tips
    tipsHeader: {
      marginBottom: 24,
    },
    tipsTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#6B7280',
      letterSpacing: 0.3,
    },
    tipsContainer: {
      marginBottom: 28,
    },
    tipItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    tipBullet: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginRight: 16,
      marginTop: 6,
    },
    tipText: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 22,
      fontWeight: '500',
    },

    // Social
    socialContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    socialCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 20,
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 0,
      minHeight: 100,
      justifyContent: 'center',
    },
    socialIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    socialLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
      alignSelf: 'stretch',
      lineHeight: 16,
      marginTop: 8,
    },

    // FAQ
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

  const handleSocialPress = (platform: string) => {
    // Handle social media links
    const urls = {
      instagram: 'https://instagram.com/fervix',
      youtube: 'https://youtube.com/fervix',
      support: 'mailto:support@fervix.com'
    };
    
    if (urls[platform as keyof typeof urls]) {
      Linking.openURL(urls[platform as keyof typeof urls]);
    }
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const faqItems = [
    { q: t('info.faq.question1'), a: t('info.faq.answer1') },
    { q: t('info.faq.question2'), a: t('info.faq.answer2') },
    { q: t('info.faq.question3'), a: t('info.faq.answer3') },
    { q: t('info.faq.question4'), a: t('info.faq.answer4') }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>FERVIX</Text>
          </View>

          {/* How it Works Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('info.howItWorks')}</Text>
            
            <View style={styles.stepsContainer}>
              {/* Step 1: Heating */}
              <View style={styles.step}>
                <View style={[styles.stepIcon, styles.heatingIcon]}>
                  <Image 
                    source={require('../../assets/images/icons/heating.png')}
                    style={styles.stepIconImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.stepTitle} numberOfLines={1}>{t('info.steps.heating')}</Text>
                <Text style={styles.stepDescription} numberOfLines={3}>{t('info.steps.heatingDescription')}</Text>
              </View>

              {/* Connecting Line */}
              <View style={styles.connectingLine}>
                <View style={styles.line} />
              </View>

              {/* Step 2: Application */}
              <View style={styles.step}>
                <View style={[styles.stepIcon, styles.applicationIcon]}>
                  <Image 
                    source={require('../../assets/images/icons/application.png')}
                    style={styles.stepIconImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.stepTitle} numberOfLines={1}>{t('info.steps.application')}</Text>
                <Text style={styles.stepDescription} numberOfLines={3}>{t('info.steps.applicationDescription')}</Text>
              </View>

              {/* Connecting Line */}
              <View style={styles.connectingLine}>
                <View style={styles.line} />
              </View>

              {/* Step 3: Cooling */}
              <View style={styles.step}>
                <View style={[styles.stepIcon, styles.coolingIcon]}>
                  <Image 
                    source={require('../../assets/images/icons/cooling.png')}
                    style={styles.stepIconImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.stepTitle} numberOfLines={1}>{t('info.steps.cooling')}</Text>
                <Text style={styles.stepDescription} numberOfLines={3}>{t('info.steps.coolingDescription')}</Text>
              </View>
            </View>
          </View>

          {/* Tips Section */}
          <View style={styles.section}>
            <View style={styles.tipsHeader}>
              <Text style={styles.tipsTitle}>{t('info.tips.title')}</Text>
            </View>
            
            <View style={styles.tipsContainer}>
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>{t('info.tips.tip1')}</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>{t('info.tips.tip2')}</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>{t('info.tips.tip3')}</Text>
              </View>
            </View>

            {/* Social Links */}
            <View style={styles.socialContainer}>
              <TouchableOpacity 
                style={[styles.socialCard, styles.socialInstagram]}
                onPress={() => handleSocialPress('instagram')}
                activeOpacity={0.7}
              >
                <View style={[styles.socialIconContainer, { backgroundColor: '#E4405F' }]}>
                  <Ionicons 
                    name="logo-instagram" 
                    size={24} 
                    color="#FFFFFF" 
                  />
                </View>
                <Text style={styles.socialLabel} numberOfLines={2}>
                  {t('info.social.instagram')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.socialCard, styles.socialYoutube]}
                onPress={() => handleSocialPress('youtube')}
                activeOpacity={0.7}
              >
                <View style={[styles.socialIconContainer, { backgroundColor: '#FF0000' }]}>
                  <Ionicons 
                    name="logo-youtube" 
                    size={24} 
                    color="#FFFFFF" 
                  />
                </View>
                <Text style={styles.socialLabel} numberOfLines={2}>
                  {t('info.social.youtube')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.socialCard, styles.socialSupport]}
                onPress={() => handleSocialPress('support')}
                activeOpacity={0.7}
              >
                <View style={[styles.socialIconContainer, { backgroundColor: colors.primary }]}>
                  <Ionicons 
                    name="help-circle" 
                    size={24} 
                    color="#FFFFFF" 
                  />
                </View>
                <Text style={styles.socialLabel} numberOfLines={2}>
                  {t('info.social.support')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FAQ Section */}
          <View style={styles.faqSection}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqTitle}>{t('info.faq.title')}</Text>
              <Text style={styles.faqSubtitle}>{t('info.faq.subtitle')}</Text>
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


export default InfoScreen;