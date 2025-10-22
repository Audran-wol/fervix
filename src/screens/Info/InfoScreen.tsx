import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

export const InfoScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'quick' | 'manual' | 'important' | 'versions'>('quick');

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

    // Tab Navigation
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: isDark ? colors.card : '#F8F9FA',
      borderRadius: 20,
      padding: 6,
      marginBottom: 24,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
    },
    tabButtonActive: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 16,
    },
    tabTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },

    // Content Sections
    contentSection: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    sectionText: {
      fontSize: 15,
      color: colors.textMuted,
      lineHeight: 24,
      marginBottom: 16,
    },
    bulletPoint: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    bullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
      marginRight: 12,
      marginTop: 8,
    },
    bulletText: {
      flex: 1,
      fontSize: 15,
      color: colors.textMuted,
      lineHeight: 22,
    },

    // Feature Cards
    featureGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    featureCard: {
      width: (screenWidth - 64) / 2 - 8,
      backgroundColor: isDark ? colors.card : '#F8F9FA',
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E5E7EB',
      shadowColor: isDark ? '#000' : colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    featureIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors['primary-100'],
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    featureTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 4,
    },
    featureDescription: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 16,
    },

    // Version Info
    versionCard: {
      backgroundColor: isDark ? colors.card : '#F8F9FA',
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E5E7EB',
      shadowColor: isDark ? '#000' : colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    versionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    versionText: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },

    bottomSpacing: {
      height: 80,
    },
  });

  const tabs = [
    { key: 'quick', label: t('info.tabs.quickStart') },
    { key: 'manual', label: t('info.tabs.userManual') },
    { key: 'important', label: t('info.tabs.importantInfo') },
    { key: 'versions', label: t('info.tabs.appVersions') }
  ];


  const renderContent = () => {
    switch (activeTab) {
      case 'quick':
        return (
          <>
            <View style={styles.contentSection}>
              <Text style={styles.sectionTitle}>{t('info.quickStart.title')}</Text>
              <Text style={styles.sectionText}>{t('info.quickStart.description')}</Text>
              
              <View style={styles.featureGrid}>
                <View style={styles.featureCard}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="flash" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.featureTitle}>{t('info.quickStart.feature1.title')}</Text>
                  <Text style={styles.featureDescription}>{t('info.quickStart.feature1.description')}</Text>
                </View>
                
                <View style={styles.featureCard}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.featureTitle}>{t('info.quickStart.feature2.title')}</Text>
                  <Text style={styles.featureDescription}>{t('info.quickStart.feature2.description')}</Text>
                </View>
                
                <View style={styles.featureCard}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="timer" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.featureTitle}>{t('info.quickStart.feature3.title')}</Text>
                  <Text style={styles.featureDescription}>{t('info.quickStart.feature3.description')}</Text>
                </View>
                
                <View style={styles.featureCard}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="thermometer" size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.featureTitle}>{t('info.quickStart.feature4.title')}</Text>
                  <Text style={styles.featureDescription}>{t('info.quickStart.feature4.description')}</Text>
                </View>
              </View>
            </View>
          </>
        );

      case 'manual':
        return (
          <>
            <View style={styles.contentSection}>
              <Text style={styles.sectionTitle}>{t('info.manual.title')}</Text>
              <Text style={styles.sectionText}>{t('info.manual.description')}</Text>
              
              <View style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{t('info.manual.step1')}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{t('info.manual.step2')}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{t('info.manual.step3')}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{t('info.manual.step4')}</Text>
              </View>
            </View>
          </>
        );

      case 'important':
        return (
          <>
            <View style={styles.contentSection}>
              <Text style={styles.sectionTitle}>{t('info.important.title')}</Text>
              <Text style={styles.sectionText}>{t('info.important.description')}</Text>
              
              <View style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{t('info.important.warning1')}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{t('info.important.warning2')}</Text>
              </View>
              <View style={styles.bulletPoint}>
                <View style={styles.bullet} />
                <Text style={styles.bulletText}>{t('info.important.warning3')}</Text>
              </View>
            </View>
          </>
        );

      case 'versions':
        return (
          <>
            <View style={styles.contentSection}>
              <Text style={styles.sectionTitle}>{t('info.versions.title')}</Text>
              <Text style={styles.sectionText}>{t('info.versions.description')}</Text>
            </View>
            
            <View style={styles.versionCard}>
              <Text style={styles.versionTitle}>{t('info.versions.current.title')}</Text>
              <Text style={styles.versionText}>{t('info.versions.current.version')}</Text>
              <Text style={styles.versionText}>{t('info.versions.current.releaseDate')}</Text>
            </View>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>FERVIX</Text>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity 
                key={tab.key}
                style={[
                  styles.tabButton,
                  activeTab === tab.key && styles.tabButtonActive
                ]}
                onPress={() => setActiveTab(tab.key as any)}
                activeOpacity={0.7}
              >
                <Text 
                  style={[
                    styles.tabText,
                    activeTab === tab.key && styles.tabTextActive
                  ]}
                  numberOfLines={2}
                >
                  {tab.label}
                      </Text>
                </TouchableOpacity>
              ))}
          </View>

          {/* Dynamic Content */}
          {renderContent()}

          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


export default InfoScreen;