import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  Animated,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';

const { width: screenWidth } = Dimensions.get('window');

export const InfoScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'quick' | 'guide' | 'safety' | 'versions'>('quick');
  const scrollViewRef = useRef<ScrollView>(null);
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set());

  const toggleAccordion = (id: string) => {
    const newExpanded = new Set(expandedAccordions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAccordions(newExpanded);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.surface : '#F9FAFB',
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    
    // Header
    header: {
      alignItems: 'center',
      marginBottom: 24,
      paddingTop: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1.5,
      textAlign: 'center',
    },

    // Chip Navigation
    chipContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: isDark ? colors.surface : '#F9FAFB',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.border : '#E5E7EB',
    },
    chipScrollView: {
      flexGrow: 0,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      marginRight: 8,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E5E7EB',
      backgroundColor: 'transparent',
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
    chipTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },

    // Content Sections
    section: {
      marginBottom: 32,
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 16,
      letterSpacing: 0.3,
    },
    sectionText: {
      fontSize: 15,
      color: colors.textMuted,
      lineHeight: 22,
      marginBottom: 16,
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? colors.border : '#E5E7EB',
      marginVertical: 20,
    },
    // Steps - Improved layout
    stepContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 24,
      paddingVertical: 4,
    },
    stepIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors['primary-100'],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
      marginTop: 2, // Fine-tune vertical alignment
      shadowColor: colors.primary,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 2,
    },
    stepContent: {
      flex: 1,
      paddingTop: 2, // Align text with icon center
    },
    stepText: {
      fontSize: 16,
      color: colors.textPrimary,
      lineHeight: 24,
      fontWeight: '500',
    },
    
    // Bullet Points
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

    // Callouts
    callout: {
      backgroundColor: isDark ? '#2D1B1B' : '#FEF2F2',
      borderLeftWidth: 3,
      borderLeftColor: '#EF4444',
      padding: 16,
      marginBottom: 16,
      borderRadius: 8,
    },
    calloutText: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
    },
    
    // Accordions
    accordion: {
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.border : '#E5E7EB',
    },
    accordionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    accordionTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
      flex: 1,
    },
    accordionChevron: {
      marginLeft: 12,
    },
    accordionContent: {
      paddingBottom: 16,
    },

    // Version List
    versionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.border : '#E5E7EB',
    },
    versionChip: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginRight: 12,
    },
    versionChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    versionInfo: {
      flex: 1,
    },
    versionDate: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 4,
    },
    versionChanges: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },

    bottomSpacing: {
      height: 40,
    },
    
    // Links
    link: {
      color: colors.primary,
      textDecorationLine: 'underline',
    },
  });

  const tabs = [
    { key: 'quick', label: t('support.quickStart.title') },
    { key: 'guide', label: t('support.userGuide.title') },
    { key: 'safety', label: t('support.safety.title') },
    { key: 'versions', label: t('support.versions.title') }
  ];


  const renderQuickStart = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionText}>
          {t('support.quickStart.intro')}
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.stepContainer}>
          <View style={styles.stepIcon}>
            <Ionicons name="usb" size={20} color={colors.primary} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>{t('support.quickStart.step1')}</Text>
          </View>
        </View>

        <View style={styles.stepContainer}>
          <View style={styles.stepIcon}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>{t('support.quickStart.step2')}</Text>
          </View>
        </View>

        <View style={styles.stepContainer}>
          <View style={styles.stepIcon}>
            <Ionicons name="play-circle" size={20} color={colors.primary} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>{t('support.quickStart.step3')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionText}>
          <Text style={styles.link}>Learn more</Text> {t('support.quickStart.learnMore')}
        </Text>
      </View>
    </>
  );

  const renderUserGuide = () => {
    const accordions = [
      {
        id: 'setup',
        title: t('support.userGuide.setup.title'),
        content: t('support.userGuide.setup.content', { returnObjects: true }) as string[]
      },
      {
        id: 'profiles',
        title: t('support.userGuide.profiles.title'),
        content: t('support.userGuide.profiles.content', { returnObjects: true }) as string[]
      },
      {
        id: 'timing',
        title: t('support.userGuide.timing.title'),
        content: t('support.userGuide.timing.content', { returnObjects: true }) as string[]
      },
      {
        id: 'cleaning',
        title: t('support.userGuide.cleaning.title'),
        content: t('support.userGuide.cleaning.content', { returnObjects: true }) as string[]
      }
    ];

    return (
      <>
        {accordions.map((accordion) => (
          <View key={accordion.id} style={styles.accordion}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleAccordion(accordion.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.accordionTitle}>{accordion.title}</Text>
              <Ionicons
                name={expandedAccordions.has(accordion.id) ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textMuted}
                style={styles.accordionChevron}
              />
            </TouchableOpacity>
            
            {expandedAccordions.has(accordion.id) && (
              <View style={styles.accordionContent}>
                {accordion.content.map((item, index) => (
                  <View key={index} style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </>
    );
  };

  const renderSafety = () => (
    <>
      <View style={styles.section}>
        <View style={styles.callout}>
          <Text style={styles.calloutText}>
            {t('support.safety.warning')}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>{t('support.safety.checklist')}</Text>
        
        {(t('support.safety.items', { returnObjects: true }) as string[]).map((item, index) => (
          <View key={index} style={styles.bulletPoint}>
            <View style={styles.bullet} />
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>
    </>
  );


  const renderVersions = () => {
    const versions = [
      {
        version: 'v1.2.0',
        date: t('support.versions.v1_2_0.date'),
        changes: t('support.versions.v1_2_0.changes')
      },
      {
        version: 'v1.1.5',
        date: t('support.versions.v1_1_5.date'),
        changes: t('support.versions.v1_1_5.changes')
      },
      {
        version: 'v1.1.0',
        date: t('support.versions.v1_1_0.date'),
        changes: t('support.versions.v1_1_0.changes')
      },
      {
        version: 'v1.0.0',
        date: t('support.versions.v1_0_0.date'),
        changes: t('support.versions.v1_0_0.changes')
      }
    ];

    return (
      <>
        <View style={styles.section}>
          <Text style={styles.sectionText}>
            {t('support.versions.intro')}
          </Text>
        </View>

        {versions.map((version, index) => (
          <View key={index} style={styles.versionItem}>
            <View style={styles.versionChip}>
              <Text style={styles.versionChipText}>{version.version}</Text>
            </View>
            <View style={styles.versionInfo}>
              <Text style={styles.versionDate}>{version.date}</Text>
              <Text style={styles.versionChanges}>{version.changes}</Text>
            </View>
          </View>
        ))}
      </>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'quick':
        return renderQuickStart();
      case 'guide':
        return renderUserGuide();
      case 'safety':
        return renderSafety();
      case 'versions':
        return renderVersions();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Info</Text>
      </View>

      {/* Sticky Chip Navigation */}
      <View style={styles.chipContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollView}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.chip,
                activeTab === tab.key && styles.chipActive
              ]}
              onPress={() => setActiveTab(tab.key as any)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  activeTab === tab.key && styles.chipTextActive
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {renderContent()}
          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


export default InfoScreen;