/**
 * Response Formatter Configuration
 * 
 * This module contains the configurable settings for the message formatting system.
 * Dashboard changes will modify these settings to affect application behavior.
 */

// Settings type for SMS channel
export interface SmsSettings {
  maxLength: number;
  includeEmoji: boolean;
  includeBranding: boolean;
}

// Settings type for Web channel
export interface WebSettings {
  includeEmoji: boolean;
  includeRichContent: boolean;
  includeBranding: boolean;
}

// Settings type for Email channel
export interface EmailSettings {
  formalTone: boolean;
  includeBranding: boolean;
  includeDetailedSignature: boolean;
}

// Combined settings interface for all channels
export interface FormatterSettings {
  sms: SmsSettings;
  web: WebSettings;
  email: EmailSettings;
}

// Default configuration values
const defaultSettings: FormatterSettings = {
  sms: {
    maxLength: 320,
    includeEmoji: false,
    includeBranding: false
  },
  web: {
    includeEmoji: true,
    includeRichContent: true,
    includeBranding: true
  },
  email: {
    formalTone: true,
    includeBranding: true,
    includeDetailedSignature: true
  }
};

// Singleton instance of current settings
let currentSettings: FormatterSettings = { ...defaultSettings };

/**
 * Get the current formatter settings
 */
export function getFormatterSettings(): FormatterSettings {
  return { ...currentSettings };
}

/**
 * Update the formatter settings
 */
export function updateFormatterSettings(newSettings: FormatterSettings): void {
  if (!newSettings || !newSettings.sms || !newSettings.web || !newSettings.email) {
    console.error('Invalid settings format provided');
    return;
  }

  currentSettings = {
    sms: {
      maxLength: newSettings.sms.maxLength || defaultSettings.sms.maxLength,
      includeEmoji: !!newSettings.sms.includeEmoji,
      includeBranding: !!newSettings.sms.includeBranding
    },
    web: {
      includeEmoji: !!newSettings.web.includeEmoji,
      includeRichContent: !!newSettings.web.includeRichContent,
      includeBranding: !!newSettings.web.includeBranding
    },
    email: {
      formalTone: !!newSettings.email.formalTone,
      includeBranding: !!newSettings.email.includeBranding,
      includeDetailedSignature: !!newSettings.email.includeDetailedSignature
    }
  };

  console.log('Formatter settings updated:', currentSettings);
}

/**
 * Reset formatter settings to defaults
 */
export function resetFormatterSettings(): void {
  currentSettings = { ...defaultSettings };
  console.log('Formatter settings reset to defaults');
}

export const SMS_OPT_OUT_MESSAGE = "\nReply 'STOP' to opt-out of sms notifications";
export const SMS_FIRST_MESSAGE_LEGAL = "\nMsg&data rates may apply. By continuing, you consent to receive SMS notifications.";

export function shouldAddLegalMessage(isFirstMessage: boolean = false): boolean {
  return isFirstMessage;
}