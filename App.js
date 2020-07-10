import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Permissions from 'expo-permissions';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const createTwoButtonAlert = (message) =>
  Alert.alert(
    "Advertencia de geofencing",
    message,
    [
      {
        text: "Cancel",
        onPress: () => console.log("Cancel Pressed"),
        style: "cancel"
      },
      { text: "OK", onPress: () => console.log("OK Pressed") }
    ],
    { cancelable: false }
);

let globalToken = "ExponentPushToken[-lGL3aDx_Agz4yw9WreaO3]";

// Can use this function below, OR use Expo's Push Notification Tool-> https://expo.io/dashboard/notifications
async function sendPushNotification(expoPushToken, region) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: `Estas cerca de ${region.identifier}`,
    body: `Nos alegramos que te interese visitar ${region.identifier}`,
    data: { data: 'goes here' },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

TaskManager.defineTask('GEOFENCE_TRACKING', ({ data: { eventType, region }, error }) => {
  if (error) {
    console.log(error);
    
    return;
  }
  if (eventType === Location.GeofencingEventType.Enter) {
    
    //createTwoButtonAlert("You've entered region: "+region.identifier);
    sendPushNotification(globalToken, region)
      .then(() => console.log("successfull"))
      .catch(err => console.log(err));
    console.log("You've entered region:", region);
    console.log(globalToken);
  } 
  else if (eventType === Location.GeofencingEventType.Exit) {
    //createTwoButtonAlert("You've left region: "+region.identifier);
    console.log("You've left region:", region);
  }
});

//Registering locations
Location.startGeofencingAsync('GEOFENCE_TRACKING', [
  {
    identifier: "Iglesia Catolica Corazon de Maria",
    latitude: 15.5491,
    longitude: -88.0006,
    radius: 100,
    notifyOnEnter: true,
    notifyOnExit: false,
  },
  {
    identifier: "Iglesia GERIZIM",
    latitude: 15.5474,
    longitude: -88.0003,
    radius: 100,
    notifyOnEnter: true,
    notifyOnExit: false,
  }
]);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  //for location
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  //for notifications
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);

  //for location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  });

  //for notifications
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      globalToken = token;
    });
    Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      Notifications.removeAllNotificationListeners();
    };
  }, []);

  let text = 'Waiting..';
  if (errorMsg) {
    text = errorMsg;
  } else if (location) {
    text = JSON.stringify(location);
  }

  return (
    <View style={styles.container}>
      <Text>{text}</Text>
    </View>
  );
}

async function registerForPushNotificationsAsync() {
  let token;
  if (Constants.isDevice) {
    const { status: existingStatus } = await Permissions.getAsync(Permissions.NOTIFICATIONS);
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Permissions.askAsync(Permissions.NOTIFICATIONS);
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log(token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
});
