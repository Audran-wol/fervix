import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { FvCard } from '../../components';

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
];

export const LanguagePickerScreen: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = React.useState('en');

  const renderLanguageItem = ({ item }: { item: Language }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        selectedLanguage === item.code && styles.selectedLanguage,
      ]}
      onPress={() => setSelectedLanguage(item.code)}
    >
      <Text style={[
        styles.languageName,
        selectedLanguage === item.code && styles.selectedLanguageText,
      ]}>
        {item.nativeName}
      </Text>
      <Text style={[
        styles.languageCode,
        selectedLanguage === item.code && styles.selectedLanguageText,
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('languagePicker.title')}</Text>
        
        <FvCard style={styles.card}>
          <FlatList
            data={languages}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
          />
        </FvCard>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  selectedLanguage: {
    backgroundColor: '#E3F2FD',
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
  },
  languageCode: {
    fontSize: 14,
    color: '#666',
  },
  selectedLanguageText: {
    color: '#007AFF',
  },
});

export default LanguagePickerScreen;
