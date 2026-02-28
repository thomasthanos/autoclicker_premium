import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceId } from './useDeviceId';
import type { MouseButton } from '@/components/AutoClicker/MouseButtonSelect';
import type { ClickType } from '@/components/AutoClicker/ClickTypeSelect';
import type { RepeatMode } from '@/components/AutoClicker/RepeatSettings';
import type { LocationMode } from '@/components/AutoClicker/LocationSettings';
import type { Json } from '@/integrations/supabase/types';

export interface AppSettings {
  // Interval
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  // Random interval
  randomEnabled: boolean;
  randomMin: number;
  randomMax: number;
  // Mouse
  mouseButton: MouseButton;
  clickType: ClickType;
  // Repeat
  repeatMode: RepeatMode;
  repeatCount: number;
  // Location
  locationMode: LocationMode;
  clicksPerPosition: number;
  // Hotkeys
  startStopKey: string;
  emergencyStopKey: string;
}

const defaultSettings: AppSettings = {
  hours: 0,
  minutes: 0,
  seconds: 0,
  milliseconds: 200,
  randomEnabled: false,
  randomMin: 0.1,
  randomMax: 0.2,
  mouseButton: 'left',
  clickType: 'single',
  repeatMode: 'until_stopped',
  repeatCount: 100,
  locationMode: 'current',
  clicksPerPosition: 1,
  startStopKey: 'F6',
  emergencyStopKey: 'F7',
};

export const useAppSettings = () => {
  const deviceId = useDeviceId();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Fetch settings from cloud
  const fetchSettings = useCallback(async () => {
    if (!deviceId) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('settings')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (error) throw error;
      
      if (data?.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
        const cloudSettings = data.settings as Record<string, Json>;
        setSettings(prev => ({
          ...prev,
          ...(cloudSettings as unknown as Partial<AppSettings>),
        }));
      }
      
      isInitializedRef.current = true;
    } catch (err) {
      console.error('Error fetching settings:', err);
      isInitializedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // Save settings to cloud (debounced)
  const syncSettings = useCallback(async (newSettings: AppSettings) => {
    if (!deviceId || !isInitializedRef.current) return;
    
    setSyncing(true);
    
    try {
      // First check if a record exists
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('app_settings')
          .update({
            settings: newSettings as unknown as Json,
          })
          .eq('device_id', deviceId);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('app_settings')
          .insert({
            device_id: deviceId,
            settings: newSettings as unknown as Json,
          });

        if (error) throw error;
      }
    } catch (err) {
      console.error('Error syncing settings:', err);
    } finally {
      setSyncing(false);
    }
  }, [deviceId]);

  // Update settings with debounced sync
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      
      // Debounce the sync
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        syncSettings(newSettings);
      }, 1000); // Sync after 1 second of no changes
      
      return newSettings;
    });
  }, [syncSettings]);

  // Fetch settings on mount
  useEffect(() => {
    if (deviceId) {
      fetchSettings();
    }
  }, [deviceId, fetchSettings]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    settings,
    loading,
    syncing,
    updateSettings,
    refreshSettings: fetchSettings,
  };
};
