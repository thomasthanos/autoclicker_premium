import { useState, useEffect } from 'react';

const DEVICE_ID_KEY = 'autoclicker_device_id';

// Generate a unique device ID
const generateDeviceId = (): string => {
  return 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 15);
};

export const useDeviceId = () => {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    // Try to get existing device ID from localStorage
    let id = localStorage.getItem(DEVICE_ID_KEY);
    
    if (!id) {
      // Generate new device ID if none exists
      id = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    
    setDeviceId(id);
  }, []);

  return deviceId;
};
