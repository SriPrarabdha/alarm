import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Platform, Modal, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Sound } from 'expo-av/build/Audio';
import { Recording } from 'expo-av/build/Audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const screenOptions = {
  title: 'Alarm',
};

interface Alarm {
  id: string;
  time: Date;
  days: string[];
  audioUri: string;
  isEnabled: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TabAlarmScreen: React.FC = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [sound, setSound] = useState<Sound | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [alarmTime, setAlarmTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  useEffect(() => {
    loadAlarms();
    registerForPushNotificationsAsync();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAlarms = async () => {
    try {
      const savedAlarms = await AsyncStorage.getItem('alarms');
      if (savedAlarms) {
        const parsedAlarms = JSON.parse(savedAlarms).map((alarm: any) => ({
          ...alarm,
          time: new Date(alarm.time)
        }));
        setAlarms(parsedAlarms);
      }
    } catch (error) {
      console.error('Error loading alarms:', error);
    }
  };

  const saveAlarms = async (newAlarms: Alarm[]) => {
    try {
      await AsyncStorage.setItem('alarms', JSON.stringify(newAlarms));
    } catch (error) {
      console.error('Error saving alarms:', error);
    }
  };

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
      
      if (!result.canceled && result.assets && result.assets[0]) {
        setAudioUri(result.assets[0].uri);
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
    if (!recording) return;
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) setAudioUri(uri);
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  }

  async function playSound() {
    if (audioUri) {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri });
        setSound(newSound);
        await newSound.playAsync();
      } catch (err) {
        console.error('Error playing sound:', err);
      }
    }
  }

  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      setAlarmTime(selectedDate);
    }
  };

  const showTimePicker = () => {
    if (Platform.OS === 'android') {
      setShowPicker(true);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const addNewAlarm = async () => {
    if (!audioUri) {
      alert('Please select or record an alarm sound first');
      return;
    }

    const newAlarm: Alarm = {
      id: Date.now().toString(),
      time: alarmTime,
      days: selectedDays,
      audioUri: audioUri,
      isEnabled: true
    };

    const updatedAlarms = [...alarms, newAlarm];
    setAlarms(updatedAlarms);
    await saveAlarms(updatedAlarms);

    // Schedule notifications for each selected day
    for (const day of selectedDays) {
      const dayIndex = WEEKDAYS.indexOf(day);
      const now = new Date();
      let triggerTime = new Date(alarmTime);
      
      triggerTime.setDate(now.getDate() + (dayIndex + 7 - now.getDay()) % 7);
      if (triggerTime <= now) {
        triggerTime.setDate(triggerTime.getDate() + 7);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Alarm',
          body: `Wake up! (${day})`,
          sound: audioUri,
        },
        trigger: {
          seconds: (triggerTime.getTime() - now.getTime()) / 1000,
          repeats: true,
        },
      });
    }

    setModalVisible(false);
    resetNewAlarmForm();
  };

  const resetNewAlarmForm = () => {
    setAudioUri(null);
    setAlarmTime(new Date());
    setSelectedDays([]);
  };

  const toggleAlarm = async (id: string) => {
    const updatedAlarms = alarms.map(alarm => 
      alarm.id === id ? { ...alarm, isEnabled: !alarm.isEnabled } : alarm
    );
    setAlarms(updatedAlarms);
    await saveAlarms(updatedAlarms);
  };

  const deleteAlarm = async (id: string) => {
    const updatedAlarms = alarms.filter(alarm => alarm.id !== id);
    setAlarms(updatedAlarms);
    await saveAlarms(updatedAlarms);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.alarmList}>
        {alarms.map(alarm => (
          <View key={alarm.id} style={styles.alarmItem}>
            <View style={styles.alarmInfo}>
              <ThemedText style={styles.alarmTime}>
                {new Date(alarm.time).toLocaleTimeString().slice(0, 5)}
              </ThemedText>
              <ThemedText style={styles.alarmDays}>
                {alarm.days.join(', ')}
              </ThemedText>
            </View>
            <View style={styles.alarmActions}>
              <TouchableOpacity onPress={() => toggleAlarm(alarm.id)}>
                <IconSymbol 
                  name={alarm.isEnabled ? "bell.fill" : "bell.slash.fill"} 
                  size={24} 
                  color={alarm.isEnabled ? '#2D6A4F' : '#9BA1A6'} 
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteAlarm(alarm.id)}>
                <IconSymbol name="trash.fill" size={24} color="#CF6679" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => setModalVisible(true)}
      >
        <IconSymbol name="plus" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.timeContainer}>
              {Platform.OS === 'android' ? (
                <>
                  <TouchableOpacity 
                    onPress={showTimePicker}
                    style={styles.timePickerButton}
                  >
                    <ThemedText style={styles.timeText}>
                      {alarmTime.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                      })}
                    </ThemedText>
                  </TouchableOpacity>
                  {showPicker && (
                    <DateTimePicker
                      testID="dateTimePicker"
                      value={alarmTime}
                      mode="time"
                      is24Hour={true}
                      display="default"
                      onChange={onTimeChange}
                      themeVariant="dark"
                    />
                  )}
                </>
              ) : (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={alarmTime}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={onTimeChange}
                  style={styles.iosPicker}
                />
              )}
            </View>

            <View style={styles.daysContainer}>
              {WEEKDAYS.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    selectedDays.includes(day) && styles.selectedDay,
                    Platform.OS === 'android' && styles.androidDayButton
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <ThemedText style={[
                    styles.dayText,
                    selectedDays.includes(day) && styles.selectedDayText
                  ]}>
                    {day}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.audioControls}>
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
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => {
                  setModalVisible(false);
                  resetNewAlarmForm();
                }}
              >
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.setButton]} 
                onPress={addNewAlarm}
              >
                <ThemedText style={styles.buttonText}>Save Alarm</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151718',
  },
  alarmList: {
    flex: 1,
    padding: 20,
  },
  androidDayButton: {
    elevation: 2,
    shadowColor: '#000',
    backgroundColor: '#1D3D47',
  },
  alarmItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1D3D47',
    borderRadius: 12,
    marginBottom: 12,
  },
  alarmInfo: {
    flex: 1,
  },
  alarmTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ECEDEE',
  },
  alarmDays: {
    color: '#9BA1A6',
    fontSize: 14,
  },
  alarmActions: {
    flexDirection: 'row',
    gap: 16,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2D6A4F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2D6A4F',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalContent: {
    backgroundColor: '#151718',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 32,
    gap: 24,
    minHeight: Platform.OS === 'android' ? '80%' : '70%',
  },
  timeContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 16 : 32,
  },
  timePickerButton: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#1D3D47',
    minWidth: 200,
    alignItems: 'center',
    ...Platform.select({
      android: {
        elevation: 4,
        shadowColor: '#000',
      }
    })
  },
  timeText: {
    fontSize: Platform.OS === 'android' ? 36 : 48,
    fontWeight: 'bold',
    color: '#ECEDEE',
    letterSpacing: 2,
  },
  dayButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#1D3D47',
    backgroundColor: '#151718',
    minWidth: 56,
    alignItems: 'center',
  },
  iosPickerContainer: {
    backgroundColor: '#1D3D47',
    borderRadius: 16,
    marginTop: 16,
    width: '100%',
    overflow: 'hidden',
  },
  iosPicker: {
    height: 200,
    width: '100%',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  
  selectedDay: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
  },
  dayText: {
    color: '#9BA1A6',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedDayText: {
    color: '#ECEDEE',
  },
  audioControls: {
    gap: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#1D3D47',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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

export default TabAlarmScreen;
