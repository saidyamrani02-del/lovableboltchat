export interface PermissionStatus {
  camera: boolean;
  microphone: boolean;
  notifications: boolean;
}

export const checkPermissions = async (): Promise<PermissionStatus> => {
  const status: PermissionStatus = {
    camera: false,
    microphone: false,
    notifications: false,
  };

  try {
    // Check camera and microphone
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    });
    status.camera = true;
    status.microphone = true;
    stream.getTracks().forEach(track => track.stop());
  } catch (error) {
    console.log("Camera/microphone not permitted:", error);
  }

  // Check notifications
  if ('Notification' in window) {
    status.notifications = Notification.permission === 'granted';
  }

  return status;
};

export const requestPermissions = async (): Promise<PermissionStatus> => {
  const status: PermissionStatus = {
    camera: false,
    microphone: false,
    notifications: false,
  };

  try {
    // Request camera and microphone
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    });
    status.camera = true;
    status.microphone = true;
    stream.getTracks().forEach(track => track.stop());
    console.log('[PERMISSIONS] Camera and microphone granted');
  } catch (error) {
    console.error("[PERMISSIONS] Failed to get camera/microphone permission:", error);
  }

  // Request notifications
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    status.notifications = permission === 'granted';
    console.log('[PERMISSIONS] Notification permission:', permission);
  } else if ('Notification' in window) {
    status.notifications = Notification.permission === 'granted';
  }

  return status;
};

export const showCallNotification = (callerName: string, onAccept: () => void) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification('Incoming Video Call', {
      body: `${callerName} is calling you`,
      icon: '/favicon.ico',
      tag: 'video-call',
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      onAccept();
      notification.close();
    };

    return notification;
  }
  return null;
};
