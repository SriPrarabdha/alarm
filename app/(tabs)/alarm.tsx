
import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function AlarmScreen() {
  const [sound, setSound] = useState(null);
  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [alarmTime, setAlarmTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [isAlarmSet, setIsAlarmSet] = useState(false);

  useEffect(() => {
    registerForPushNotificationsAsync();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  async function registerForPushNotificationsAsync() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
  }

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

  const onTimeChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      setAlarmTime(selectedDate);
    }
  };

  const setAlarm = async () => {
    if (!audioUri) {
      alert('Please select or record an alarm sound first');
      return;
    }

    const now = new Date();
    let triggerTime = new Date(alarmTime);

    if (triggerTime <= now) {
      triggerTime.setDate(triggerTime.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Alarm',
        body: 'Wake up!',
        sound: audioUri,
      },
      trigger: {
        date: triggerTime,
      },
    });

    setIsAlarmSet(true);
    alert('Alarm set successfully!');
  };

  const cancelAlarm = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    setIsAlarmSet(false);
    alert('Alarm cancelled');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.timeContainer}>
        <TouchableOpacity onPress={() => setShowPicker(true)}>
          <ThemedText style={styles.timeText}>
            {alarmTime.toLocaleTimeString().slice(0, 5)}
          </ThemedText>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={alarmTime}
            mode="time"
            is24Hour={true}
            onChange={onTimeChange}
          />
        )}
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={recording ? stopRecording : startRecording}
        >
          <IconSymbol 
            name={recording ? "stop.fill" : "mic.fill"} 
            size={24} 
            color="#fff" 
          />
          <ThemedText style={styles.buttonText}>
            {recording ? 'Stop Recording' : 'Record Sound'}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={pickAudio}>
          <IconSymbol name="square.and.arrow.up.fill" size={24} color="#fff" />
          <ThemedText style={styles.buttonText}>Upload Sound</ThemedText>
        </TouchableOpacity>

        {audioUri && (
          <TouchableOpacity style={styles.button} onPress={playSound}>
            <IconSymbol name="play.fill" size={24} color="#fff" />
            <ThemedText style={styles.buttonText}>Test Sound</ThemedText>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.button, isAlarmSet ? styles.cancelButton : styles.setButton]} 
          onPress={isAlarmSet ? cancelAlarm : setAlarm}
        >
          <IconSymbol 
            name={isAlarmSet ? "bell.slash.fill" : "bell.fill"} 
            size={24} 
            color="#fff" 
          />
          <ThemedText style={styles.buttonText}>
            {isAlarmSet ? 'Cancel Alarm' : 'Set Alarm'}
          </ThemedText>
        </TouchableOpacity>
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
    fontSize: 64,
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
  setButton: {
    backgroundColor: '#2D6A4F',
  },
  cancelButton: {
    backgroundColor: '#CF6679',
  },
  buttonText: {
    color: '#ECEDEE',
    fontSize: 16,
    fontWeight: '500',
  },
});
