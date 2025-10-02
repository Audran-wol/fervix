import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { changeLanguage } from '../../i18n';

interface LanguageOption {
  code: string;
  name: string;
  flag: any;
}

interface LanguageDropdownProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

const languages: LanguageOption[] = [
  { code: 'de', name: 'Deutsch', flag: require('../../assets/images/icons/flag_de.png') },
  { code: 'en', name: 'English', flag: require('../../assets/images/icons/flag_en.png') },
  { code: 'pt', name: 'Português', flag: require('../../assets/images/icons/flag_pt.png') },
];

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rotateValue] = useState(new Animated.Value(0));
  const { colors } = useTheme();

  const selectedLang = languages.find(lang => lang.code === selectedLanguage) || languages[0];

  const toggleDropdown = () => {
    const toValue = isOpen ? 0 : 1;
    setIsOpen(!isOpen);
    
    Animated.timing(rotateValue, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleLanguageSelect = (languageCode: string) => {
    onLanguageChange(languageCode);
    changeLanguage(languageCode);
    setIsOpen(false);
    
    Animated.timing(rotateValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: 32,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    flagIcon: {
      width: 32,
      height: 32,
      marginRight: 12,
      borderRadius: 16,
    },
    headerText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
    },
    chevron: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdown: {
      backgroundColor: colors.card,
      borderRadius: 32,
      marginTop: 8,
      overflow: 'hidden',
    },
    languageOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    lastOption: {
      // No special styling needed
    },
    selectedOption: {
      backgroundColor: colors['primary-100'],
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    optionFlag: {
      width: 32,
      height: 32,
      marginRight: 12,
      borderRadius: 16,
    },
    optionText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
    },
    selectedText: {
      color: colors.primary,
    },
    checkIcon: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={toggleDropdown} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Image source={selectedLang.flag} style={styles.flagIcon} resizeMode="contain" />
          <Text style={styles.headerText}>Select Language</Text>
        </View>
        <Animated.View style={[styles.chevron, { transform: [{ rotate }] }]}>
          <Ionicons name="chevron-down" size={20} color={colors.textPrimary} />
        </Animated.View>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdown}>
          {languages.map((language, index) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageOption,
                language.code === selectedLanguage && styles.selectedOption,
                index === languages.length - 1 && styles.lastOption,
              ]}
              onPress={() => handleLanguageSelect(language.code)}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <Image source={language.flag} style={styles.optionFlag} resizeMode="contain" />
                <Text
                  style={[
                    styles.optionText,
                    language.code === selectedLanguage && styles.selectedText,
                  ]}
                >
                  {language.name}
                </Text>
              </View>
              {language.code === selectedLanguage && (
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};
