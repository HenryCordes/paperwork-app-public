import { useCallback, useEffect, useState } from 'react';
import { BiometricsService } from './biometrics.service';
import { 
  BiometricAuthOptions, 
  BiometricAvailability, 
  BiometricCredentials, 
  BiometricType,
  UseBiometrics 
} from './biometrics.types';

// Singleton instance of the BiometricsService
const biometricsService = new BiometricsService();

export const useBiometrics = (): UseBiometrics => {
  const [, setAvailability] = useState<BiometricAvailability>({
    isAvailable: false,
    biometryType: BiometricType.NONE
  });

  // Check biometric availability on mount
  useEffect(() => {
    const checkBiometryAvailability = async () => {
      try {
        const result = await biometricsService.checkAvailability();
        setAvailability(result);
      } catch (error) {
        console.error('[useBiometrics] Error checking biometry availability:', error);
        setAvailability({
          isAvailable: false,
          biometryType: BiometricType.NONE,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
    
    checkBiometryAvailability();
  }, []);

  // Authenticate with biometrics
  const authenticate = useCallback(async (options: BiometricAuthOptions): Promise<boolean> => {
    return await biometricsService.authenticate(options);
  }, []);

  // Save credentials securely
  const saveCredentials = useCallback(async (credentials: BiometricCredentials): Promise<boolean> => {
    return await biometricsService.saveCredentials(credentials);
  }, []);

  // Get stored credentials
  const getCredentials = useCallback(async (): Promise<BiometricCredentials | null> => {
    return await biometricsService.getCredentials();
  }, []);

  // Delete stored credentials
  const deleteCredentials = useCallback(async (): Promise<boolean> => {
    return await biometricsService.deleteCredentials();
  }, []);
  
  // Clear stored credentials (without affecting biometric settings)
  const clearCredentials = useCallback(async (): Promise<void> => {
    return await biometricsService.clearCredentials();
  }, []);

  // Check if biometrics is enabled in user preferences
  const isBiometricsEnabled = useCallback(async (): Promise<boolean> => {
    return await biometricsService.isBiometricsEnabled();
  }, []);

  // Set whether biometrics is enabled in user preferences
  const setBiometricsEnabled = useCallback(async (enabled: boolean): Promise<void> => {
    await biometricsService.setBiometricsEnabled(enabled);
  }, []);

  // Get the current biometric type
  const getBiometricType = useCallback(async (): Promise<BiometricType> => {
    return await biometricsService.getBiometricType();
  }, []);

  // Expose the public API that components can use
  return {
    checkAvailability: useCallback(async () => {
      const result = await biometricsService.checkAvailability();
      setAvailability(result);
      return result;
    }, []),
    authenticate,
    saveCredentials,
    getCredentials,
    deleteCredentials,
    clearCredentials,
    isBiometricsEnabled,
    setBiometricsEnabled,
    getBiometricType
  };
};
