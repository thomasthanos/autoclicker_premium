import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceId } from './useDeviceId';
import type { ClickPosition, PositionCategory } from '@/components/AutoClicker/types';
import type { Json } from '@/integrations/supabase/types';

export interface SavedProfile {
  id: string;
  name: string;
  positions: ClickPosition[];
  categories?: PositionCategory[];
  created_at: string;
  updated_at: string;
}

interface ProfileData {
  positions?: ClickPosition[];
  categories?: PositionCategory[];
}

export const useSavedLocations = () => {
  const deviceId = useDeviceId();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all saved profiles for this device
  const fetchProfiles = useCallback(async () => {
    if (!deviceId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('saved_locations')
        .select('*')
        .eq('device_id', deviceId)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setProfiles((data || []).map(row => {
        // Parse positions - could be array of positions or object with categories
        const positionsData = row.positions as unknown as ProfileData | ClickPosition[];
        
        let positions: ClickPosition[] = [];
        let categories: PositionCategory[] | undefined = undefined;
        
        if (Array.isArray(positionsData)) {
          // Legacy format: just array of positions
          positions = positionsData;
        } else if (positionsData && typeof positionsData === 'object') {
          // New format: object with positions and categories
          positions = positionsData.positions || [];
          categories = positionsData.categories;
        }
        
        return {
          id: row.id,
          name: row.name,
          positions,
          categories,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      }));
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  // Save a new profile with categories support
  const saveProfile = useCallback(async (
    name: string, 
    positions: ClickPosition[], 
    categories?: PositionCategory[]
  ) => {
    if (!deviceId) return null;
    
    try {
      // Store both positions and categories in the positions JSON field
      const profileData: ProfileData = {
        positions,
        categories,
      };
      
      const { data, error: insertError } = await supabase
        .from('saved_locations')
        .insert({
          device_id: deviceId,
          name,
          positions: profileData as unknown as Json,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      await fetchProfiles();
      return data;
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
      return null;
    }
  }, [deviceId, fetchProfiles]);

  // Update an existing profile
  const updateProfile = useCallback(async (
    id: string, 
    name: string, 
    positions: ClickPosition[],
    categories?: PositionCategory[]
  ) => {
    if (!deviceId) return false;
    
    try {
      const profileData: ProfileData = {
        positions,
        categories,
      };
      
      const { error: updateError } = await supabase
        .from('saved_locations')
        .update({
          name,
          positions: profileData as unknown as Json,
        })
        .eq('id', id)
        .eq('device_id', deviceId);

      if (updateError) throw updateError;
      
      await fetchProfiles();
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      return false;
    }
  }, [deviceId, fetchProfiles]);

  // Delete a profile
  const deleteProfile = useCallback(async (id: string) => {
    if (!deviceId) return false;
    
    try {
      const { error: deleteError } = await supabase
        .from('saved_locations')
        .delete()
        .eq('id', id)
        .eq('device_id', deviceId);

      if (deleteError) throw deleteError;
      
      await fetchProfiles();
      return true;
    } catch (err) {
      console.error('Error deleting profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete profile');
      return false;
    }
  }, [deviceId, fetchProfiles]);

  // Fetch profiles when device ID is available
  useEffect(() => {
    if (deviceId) {
      fetchProfiles();
    }
  }, [deviceId, fetchProfiles]);

  return {
    profiles,
    loading,
    error,
    saveProfile,
    updateProfile,
    deleteProfile,
    refreshProfiles: fetchProfiles,
  };
};
