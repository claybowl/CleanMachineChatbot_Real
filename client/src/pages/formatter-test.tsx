import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Updated interface to include all response types
interface FormattedResponses {
  sms: string;
  web: string;
  email: string;
  smsAppointment: string;
  webAppointment: string;
  emailAppointment: string;
  smsService: string;
  webService: string;
  emailService: string;
}

// Formatting settings interface
interface FormattingSettings {
  sms: {
    maxLength: number;
    includeEmoji: boolean;
    includeBranding: boolean;
  };
  web: {
    includeEmoji: boolean;
    includeRichContent: boolean;
    includeBranding: boolean;
  };
  email: {
    formalTone: boolean;
    includeBranding: boolean;
    includeDetailedSignature: boolean;
  };
  // Base message to format
  baseMessage: string;
}

export default function FormatterTest() {
  const [responses, setResponses] = useState<FormattedResponses | null>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<FormattingSettings>({
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
    },
    baseMessage: "Thanks for contacting Clean Machine Auto Detail. We offer Full Detail services starting at $150. Our business hours are Monday-Friday 9am-5pm. Would you like to schedule an appointment?"
  });
  const [isSaved, setIsSaved] = useState(true);
  const [systemImpact, setSystemImpact] = useState(false);

  // Custom formatter that sends the user's settings to the backend
  const testCustomFormatter = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-formatting-custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      setResponses(data);
      setIsSaved(true);
      
      // Check if configuration was applied system-wide
      if (data.configurationSaved) {
        setSystemImpact(true);
        
        // Reset the impact indicator after a few seconds
        setTimeout(() => {
          setSystemImpact(false);
        }, 5000);
      }
    } catch (error) {
      console.error('Error testing custom formatter:', error);
    } finally {
      setLoading(false);
    }
  };

  // Standard formatter without custom settings
  const testStandardFormatter = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-formatting');
      const data = await response.json();
      setResponses(data);
    } catch (error) {
      console.error('Error testing formatter:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update settings when any field changes
  const handleSettingChange = (
    channel: 'sms' | 'web' | 'email', 
    setting: string, 
    value: boolean | number | string
  ) => {
    setSettings(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [setting]: value
      }
    }));
    setIsSaved(false);
  };

  // Update base message
  const handleMessageChange = (message: string) => {
    setSettings(prev => ({
      ...prev,
      baseMessage: message
    }));
    setIsSaved(false);
  };

  // Apply the custom formatting settings
  const applySettings = () => {
    testCustomFormatter();
  };

  // Load the standard formatting
  useEffect(() => {
    testStandardFormatter();
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-2">Response Formatter Configuration</h1>
      <p className="text-gray-600 mb-6">
        This dashboard allows you to customize how messages are formatted differently based on the communication channel.
        Any changes made here will affect how the application communicates with your customers.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="col-span-1 md:col-span-4">
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h3 className="text-lg font-semibold mb-2">Base Message</h3>
            <p className="text-xs text-gray-500 mb-2">
              This is the source message that will be formatted for each channel
            </p>
            <textarea 
              value={settings.baseMessage} 
              onChange={(e) => handleMessageChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md h-32"
            />
          </div>
        </div>
        
        <div className="col-span-1">
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200 h-full">
            <h3 className="text-lg font-semibold mb-2">SMS Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Maximum Length</label>
                <input 
                  type="number" 
                  value={settings.sms.maxLength} 
                  onChange={(e) => handleSettingChange('sms', 'maxLength', parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Standard SMS is 160 chars, but carriers often support concatenated messages</p>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="smsEmoji" 
                  checked={settings.sms.includeEmoji} 
                  onChange={(e) => handleSettingChange('sms', 'includeEmoji', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="smsEmoji" className="text-sm">Include Emoji</label>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="smsBranding" 
                  checked={settings.sms.includeBranding} 
                  onChange={(e) => handleSettingChange('sms', 'includeBranding', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="smsBranding" className="text-sm">Include Branding</label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-span-1">
          <div className="bg-green-50 p-4 rounded-md border border-green-200 h-full">
            <h3 className="text-lg font-semibold mb-2">Web App Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="webEmoji" 
                  checked={settings.web.includeEmoji} 
                  onChange={(e) => handleSettingChange('web', 'includeEmoji', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="webEmoji" className="text-sm">Include Emoji</label>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="webRichContent" 
                  checked={settings.web.includeRichContent} 
                  onChange={(e) => handleSettingChange('web', 'includeRichContent', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="webRichContent" className="text-sm">Include Rich Content</label>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="webBranding" 
                  checked={settings.web.includeBranding} 
                  onChange={(e) => handleSettingChange('web', 'includeBranding', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="webBranding" className="text-sm">Include Branding</label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-span-1">
          <div className="bg-purple-50 p-4 rounded-md border border-purple-200 h-full">
            <h3 className="text-lg font-semibold mb-2">Email Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="emailFormalTone" 
                  checked={settings.email.formalTone} 
                  onChange={(e) => handleSettingChange('email', 'formalTone', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="emailFormalTone" className="text-sm">Use Formal Tone</label>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="emailBranding" 
                  checked={settings.email.includeBranding} 
                  onChange={(e) => handleSettingChange('email', 'includeBranding', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="emailBranding" className="text-sm">Include Branding</label>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="emailSignature" 
                  checked={settings.email.includeDetailedSignature} 
                  onChange={(e) => handleSettingChange('email', 'includeDetailedSignature', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="emailSignature" className="text-sm">Include Detailed Signature</label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-span-1">
          <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 h-full">
            <h3 className="text-lg font-semibold mb-2">Actions</h3>
            <div className="space-y-4">
              <Button 
                onClick={applySettings} 
                disabled={loading}
                className="w-full"
                variant={isSaved ? "outline" : "default"}
              >
                {loading ? 'Applying...' : isSaved ? 'Settings Applied' : 'Apply Settings'}
              </Button>
              
              <Button 
                onClick={testStandardFormatter} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Reset to Defaults
              </Button>
              
              <p className="text-xs text-gray-500 mt-2">
                {isSaved ? 'All changes are applied.' : 'You have unsaved changes.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {systemImpact && (
        <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-md">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-green-800">Changes Applied System-wide</h3>
              <p className="text-sm text-green-700">Your formatting settings have been saved and will affect all messages sent from the application.</p>
            </div>
          </div>
        </div>
      )}
      
      {responses && (
        <Tabs defaultValue="standard">
          <TabsList className="mb-4">
            <TabsTrigger value="standard">Standard Responses</TabsTrigger>
            <TabsTrigger value="appointment">Appointment Responses</TabsTrigger>
            <TabsTrigger value="service">Service Information</TabsTrigger>
          </TabsList>
          
          {/* Standard Responses Tab */}
          <TabsContent value="standard">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="bg-blue-50">
                  <CardTitle>SMS Response</CardTitle>
                  <p className="text-xs text-gray-500">
                    Concise, text-only, character limited
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 p-4 rounded-md text-sm font-mono">
                    <p>{responses.sms}</p>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    <p>Character count: {responses.sms.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-green-50">
                  <CardTitle>Web App Response</CardTitle>
                  <p className="text-xs text-gray-500">
                    Rich content, detailed explanations, interactive elements
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap text-sm">
                    <p dangerouslySetInnerHTML={{ __html: responses.web.replace(/\*([^*]+)\*/g, '<strong>$1</strong>') }}></p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="bg-purple-50">
                  <CardTitle>Email Response</CardTitle>
                  <p className="text-xs text-gray-500">
                    Formal tone, comprehensive information, proper structure
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap text-sm">
                    <p>{responses.email}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Appointment Responses Tab */}
          <TabsContent value="appointment">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="bg-blue-50">
                  <CardTitle>SMS Appointment</CardTitle>
                  <p className="text-xs text-gray-500">
                    Quick booking conversation
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 p-4 rounded-md text-sm font-mono">
                    <p>{responses.smsAppointment}</p>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    <p>Character count: {responses.smsAppointment.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-green-50">
                  <CardTitle>Web Appointment</CardTitle>
                  <p className="text-xs text-gray-500">
                    Interactive booking system references
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap text-sm">
                    <p dangerouslySetInnerHTML={{ __html: responses.webAppointment.replace(/\*([^*]+)\*/g, '<strong>$1</strong>') }}></p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="bg-purple-50">
                  <CardTitle>Email Appointment</CardTitle>
                  <p className="text-xs text-gray-500">
                    Formal booking options and instructions
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap text-sm">
                    <p>{responses.emailAppointment}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Service Information Tab */}
          <TabsContent value="service">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="bg-blue-50">
                  <CardTitle>SMS Service Info</CardTitle>
                  <p className="text-xs text-gray-500">
                    Essential service details only
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 p-4 rounded-md text-sm font-mono">
                    <p>{responses.smsService}</p>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    <p>Character count: {responses.smsService.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="bg-green-50">
                  <CardTitle>Web Service Info</CardTitle>
                  <p className="text-xs text-gray-500">
                    Rich service descriptions with callouts
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap text-sm">
                    <p dangerouslySetInnerHTML={{ __html: responses.webService.replace(/\*([^*]+)\*/g, '<strong>$1</strong>') }}></p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="bg-purple-50">
                  <CardTitle>Email Service Info</CardTitle>
                  <p className="text-xs text-gray-500">
                    Formal service descriptions with complete details
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap text-sm">
                    <p>{responses.emailService}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}