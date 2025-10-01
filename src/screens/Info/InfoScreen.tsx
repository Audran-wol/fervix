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
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const InfoScreen: React.FC = () => {
  const { t } = useTranslation();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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
                <Text style={styles.stepTitle}>{t('info.steps.heating')}</Text>
                <Text style={styles.stepDescription}>{t('info.steps.heatingDescription')}</Text>
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
                <Text style={styles.stepTitle}>{t('info.steps.application')}</Text>
                <Text style={styles.stepDescription}>{t('info.steps.applicationDescription')}</Text>
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
                <Text style={styles.stepTitle}>{t('info.steps.cooling')}</Text>
                <Text style={styles.stepDescription}>{t('info.steps.coolingDescription')}</Text>
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
                <Image 
                  source={require('../../assets/images/socials/instagram.png')}
                  style={[styles.socialIcon, styles.socialIconLarge]}
                  resizeMode="contain"
                />
                <Text style={styles.socialLabel}>
                  {t('info.social.instagram')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.socialCard, styles.socialYoutube]}
                onPress={() => handleSocialPress('youtube')}
                activeOpacity={0.7}
              >
                <Image 
                  source={require('../../assets/images/socials/youtube.png')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
                <Text style={styles.socialLabel}>
                  {t('info.social.youtube')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.socialCard, styles.socialSupport]}
                onPress={() => handleSocialPress('support')}
                activeOpacity={0.7}
              >
                <Image 
                  source={require('../../assets/images/nav/support.png')}
                  style={styles.socialIcon}
                  resizeMode="contain"
                />
                <Text style={styles.socialLabel}>
                  {t('info.social.support')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FAQ Section */}
          <View style={styles.faqSection}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqTitle}>{t('info.faq.title')}</Text>
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
                      <Text style={styles.faqQuestion} numberOfLines={2}>
                        {item.q}
                      </Text>
                    </View>
                    <View style={styles.faqChevron}>
                      <Ionicons
                        name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.primary}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
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
    borderRadius: 24,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: 0.5,
  },

  // Steps
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 100,
  },
  stepIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stepIconImage: {
    width: 36,
    height: 36,
  },
  heatingIcon: {
    backgroundColor: '#FFE5E5',
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
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 4,
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
    color: colors.textPrimary,
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
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  socialIcon: {
    width: 48,
    height: 48,
    marginBottom: 12,
  },
  socialIconLarge: {
    width: 52,
    height: 52,
  },
  socialLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  socialInstagram: {},
  socialYoutube: {},
  socialSupport: {},

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
    color: colors.textPrimary,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  faqItemExpanded: {
    borderColor: colors.primary,
    borderWidth: 2,
    shadowOpacity: 0.12,
    transform: [{ scale: 1.02 }],
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
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  faqChevron: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#FFF0F0',
  },
  faqDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
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
    height: 24,
  },
});

export default InfoScreen;