
import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function AlarmScreen() {
  const [sound, setSound] = useState(null);
  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [alarmTime, setAlarmTime] = useState(null);

  async function pickAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
      });
      
      if (result.type === 'success') {
        setAudioUri(result.uri);
      }
    } catch (err) {
      console.error('Error picking audio:', err);
    }
  }

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }

  async function stopRecording() {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setAudioUri(uri);
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  }

  async function playSound() {
    if (audioUri) {
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      setSound(sound);
      await sound.playAsync();
    }
  }

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.timeContainer}>
        <ThemedText style={styles.timeText}>
          {alarmTime ? alarmTime.toLocaleTimeString() : '00:00'}
        </ThemedText>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={recording ? stopRecording : startRecording}
        >
          <IconSymbol 
            name={recording ? "chevron.right" : "chevron.right"} 
            size={24} 
            color="#fff" 
          />
          <ThemedText style={styles.buttonText}>
            {recording ? 'Stop Recording' : 'Record Sound'}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={pickAudio}>
          <IconSymbol name="chevron.right" size={24} color="#fff" />
          <ThemedText style={styles.buttonText}>Upload Sound</ThemedText>
        </TouchableOpacity>

        {audioUri && (
          <TouchableOpacity style={styles.button} onPress={playSound}>
            <IconSymbol name="chevron.right" size={24} color="#fff" />
            <ThemedText style={styles.buttonText}>Test Sound</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151718',
    padding: 20,
  },
  timeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ECEDEE',
  },
  controlsContainer: {
    gap: 16,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#1D3D47',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ECEDEE',
    fontSize: 16,
    fontWeight: '500',
  },
});
