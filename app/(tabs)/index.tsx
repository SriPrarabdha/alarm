import { StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function HomeScreen() {
  const navigateToAlarm = () => {
    router.push('/alarm');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.contentContainer}>
        <ThemedView style={styles.headerContainer}>
          <ThemedText style={styles.title}>Smart Alarm</ThemedText>
          <ThemedText style={styles.subtitle}>
            Wake up to your favorite sounds
          </ThemedText>
        </ThemedView>

        <TouchableOpacity 
          style={styles.button} 
          onPress={navigateToAlarm}
        >
          <IconSymbol name="alarm" size={24} color="#fff" />
          <ThemedText style={styles.buttonText}>Set Your Alarm</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedText style={styles.footer}>
        Create personalized alarms with custom sounds
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151718',
    padding: 24,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 48,
  },
  headerContainer: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ECEDEE',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#9BA1A6',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2D6A4F',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#2D6A4F',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#ECEDEE',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    color: '#9BA1A6',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
});
