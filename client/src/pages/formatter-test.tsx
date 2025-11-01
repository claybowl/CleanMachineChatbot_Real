
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, MessageSquare, Mail, Phone, RotateCcw, Save, Info } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  baseMessage: string;
  chatOpeningLine: string;
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
    baseMessage: "Thanks for contacting Clean Machine Auto Detail. We offer Full Detail services starting at $150. Our business hours are Monday-Friday 9am-5pm. Would you like to schedule an appointment?",
    chatOpeningLine: "👋 Hi! Welcome to Clean Machine Auto Detail. How can I help you today?"
  });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [activeTab, setActiveTab] = useState('settings');

  // Load saved settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Track changes to mark as unsaved
  useEffect(() => {
    if (saveStatus === 'saved') {
      setSaveStatus('unsaved');
    }
  }, [settings]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/formatter/settings');
      if (!response.ok) {
        console.error('Failed to load settings, using defaults');
        return;
      }
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings(prev => ({
          ...prev,
          ...data.settings,
          sms: data.settings.sms || prev.sms,
          web: data.settings.web || prev.web,
          email: data.settings.email || prev.email,
          baseMessage: data.settings.baseMessage || prev.baseMessage,
          chatOpeningLine: data.settings.chatOpeningLine || prev.chatOpeningLine
        }));
        setSaveStatus('saved');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Keep using default settings if load fails
    }
  };

  const saveSettings = async () => {
    setSaveStatus('saving');
    try {
      // Save settings to backend
      await fetch('/api/formatter/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });

      // Generate preview
      const response = await fetch('/api/test-formatting-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      setResponses(data);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('unsaved');
    }
  };

  const resetToDefaults = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/formatter/reset', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success && data.settings) {
        setSettings({
          ...data.settings,
          baseMessage: "Thanks for contacting Clean Machine Auto Detail. We offer Full Detail services starting at $150. Our business hours are Monday-Friday 9am-5pm. Would you like to schedule an appointment?",
          chatOpeningLine: "👋 Hi! Welcome to Clean Machine Auto Detail. How can I help you today?"
        });
        await saveSettings();
      }
    } catch (error) {
      console.error('Error resetting:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Response Formatter
        </h1>
        <p className="text-gray-600 text-lg">
          Customize how your AI communicates across different channels
        </p>
      </div>

      {/* Status Bar */}
      <Card className="mb-6 border-2">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {saveStatus === 'saved' ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">All changes saved</span>
                </div>
              ) : saveStatus === 'saving' ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                  <span className="font-semibold">Saving...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">You have unsaved changes</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={resetToDefaults} 
                variant="outline"
                disabled={loading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button 
                onClick={saveSettings} 
                disabled={loading || saveStatus === 'saved'}
                className={saveStatus === 'unsaved' ? 'bg-blue-600 hover:bg-blue-700 animate-pulse' : ''}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="settings" className="text-lg">Settings</TabsTrigger>
          <TabsTrigger value="preview" className="text-lg">Preview</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* Chat Opening Line */}
          <Card className="border-2 border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <MessageSquare className="h-5 w-5 mr-2" />
                Chat Bot Opening Line
              </CardTitle>
              <p className="text-sm text-green-700">
                This is the first message customers see when they open the chat widget
              </p>
            </CardHeader>
            <CardContent>
              <Input
                value={settings.chatOpeningLine}
                onChange={(e) => setSettings({...settings, chatOpeningLine: e.target.value})}
                className="text-lg p-4 bg-white"
                placeholder="Enter your chat opening message..."
              />
              <p className="text-xs text-gray-600 mt-2">
                💡 Tip: Use emojis and keep it friendly! This sets the tone for the conversation.
              </p>
            </CardContent>
          </Card>

          {/* Base Message Template */}
          <Card>
            <CardHeader>
              <CardTitle>Default Response Template</CardTitle>
              <Alert className="mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This template is used across all channels and formatted differently for SMS, web, and email. 
                  This is NOT the chat opening line (configured above).
                </AlertDescription>
              </Alert>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={settings.baseMessage} 
                onChange={(e) => setSettings({...settings, baseMessage: e.target.value})}
                className="min-h-[120px] text-base"
                placeholder="Enter your default message template..."
              />
              <div className="flex justify-between mt-2">
                <p className="text-xs text-gray-500">
                  Character count: {settings.baseMessage.length}
                </p>
                <p className="text-xs text-gray-500">
                  This will be formatted for each channel
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Channel Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SMS Settings */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-gradient-to-br from-blue-50 to-blue-100">
                <CardTitle className="flex items-center text-blue-900">
                  <Phone className="h-5 w-5 mr-2" />
                  SMS Messages
                </CardTitle>
                <p className="text-xs text-blue-700">Text message settings</p>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-semibold">Character Limit</Label>
                    <Badge variant="outline" className="text-sm font-mono">
                      {settings.sms.maxLength}
                    </Badge>
                  </div>
                  <Slider 
                    value={[settings.sms.maxLength]} 
                    onValueChange={(value) => setSettings({
                      ...settings,
                      sms: {...settings.sms, maxLength: value[0]}
                    })}
                    min={160}
                    max={500}
                    step={10}
                    className="mb-1"
                  />
                  <p className="text-xs text-gray-500">Standard: 320 characters</p>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Include Emoji</Label>
                    <p className="text-xs text-gray-600">Add contextual emojis</p>
                  </div>
                  <Switch 
                    checked={settings.sms.includeEmoji} 
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      sms: {...settings.sms, includeEmoji: checked}
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Include Branding</Label>
                    <p className="text-xs text-gray-600">Add business signature</p>
                  </div>
                  <Switch 
                    checked={settings.sms.includeBranding} 
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      sms: {...settings.sms, includeBranding: checked}
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Web Chat Settings */}
            <Card className="border-2 border-green-200">
              <CardHeader className="bg-gradient-to-br from-green-50 to-green-100">
                <CardTitle className="flex items-center text-green-900">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Web Chat
                </CardTitle>
                <p className="text-xs text-green-700">Live chat settings</p>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Include Emoji</Label>
                    <p className="text-xs text-gray-600">Friendlier tone</p>
                  </div>
                  <Switch 
                    checked={settings.web.includeEmoji} 
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      web: {...settings.web, includeEmoji: checked}
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Rich Content</Label>
                    <p className="text-xs text-gray-600">Formatting & links</p>
                  </div>
                  <Switch 
                    checked={settings.web.includeRichContent} 
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      web: {...settings.web, includeRichContent: checked}
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Include Branding</Label>
                    <p className="text-xs text-gray-600">Add business signature</p>
                  </div>
                  <Switch 
                    checked={settings.web.includeBranding} 
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      web: {...settings.web, includeBranding: checked}
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Email Settings */}
            <Card className="border-2 border-purple-200">
              <CardHeader className="bg-gradient-to-br from-purple-50 to-purple-100">
                <CardTitle className="flex items-center text-purple-900">
                  <Mail className="h-5 w-5 mr-2" />
                  Email
                </CardTitle>
                <p className="text-xs text-purple-700">Email communication settings</p>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Formal Tone</Label>
                    <p className="text-xs text-gray-600">Professional language</p>
                  </div>
                  <Switch 
                    checked={settings.email.formalTone} 
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      email: {...settings.email, formalTone: checked}
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Include Branding</Label>
                    <p className="text-xs text-gray-600">Add business signature</p>
                  </div>
                  <Switch 
                    checked={settings.email.includeBranding} 
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      email: {...settings.email, includeBranding: checked}
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="font-medium">Full Signature</Label>
                    <p className="text-xs text-gray-600">Include contact details</p>
                  </div>
                  <Switch 
                    checked={settings.email.includeDetailedSignature} 
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      email: {...settings.email, includeDetailedSignature: checked}
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          {!responses ? (
            <Card className="p-12 text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2">No Preview Available</h3>
              <p className="text-gray-600 mb-4">Save your settings to see how messages will look</p>
              <Button onClick={saveSettings} size="lg">
                Generate Preview
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* SMS Preview */}
                <Card className="border-2 border-blue-300 shadow-lg">
                  <CardHeader className="bg-gradient-to-br from-blue-100 to-blue-200 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-5 w-5 text-blue-700" />
                        <h3 className="font-bold text-blue-900">SMS</h3>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {responses.sms.length} chars
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="bg-white p-4 rounded-lg border-2 border-blue-200 text-sm font-mono whitespace-pre-wrap min-h-[120px]">
                      {responses.sms}
                    </div>
                  </CardContent>
                </Card>

                {/* Web Chat Preview */}
                <Card className="border-2 border-green-300 shadow-lg">
                  <CardHeader className="bg-gradient-to-br from-green-100 to-green-200 pb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-green-700" />
                      <h3 className="font-bold text-green-900">Web Chat</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="bg-white p-4 rounded-lg border-2 border-green-200 text-sm whitespace-pre-wrap min-h-[120px]">
                      <div dangerouslySetInnerHTML={{ __html: responses.web.replace(/\*([^*]+)\*/g, '<strong>$1</strong>') }} />
                    </div>
                  </CardContent>
                </Card>
                
                {/* Email Preview */}
                <Card className="border-2 border-purple-300 shadow-lg">
                  <CardHeader className="bg-gradient-to-br from-purple-100 to-purple-200 pb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-purple-700" />
                      <h3 className="font-bold text-purple-900">Email</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="bg-white p-4 rounded-lg border-2 border-purple-200 text-sm whitespace-pre-wrap min-h-[120px]">
                      {responses.email}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Previews */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="appointment">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="appointment">Appointment Messages</TabsTrigger>
                      <TabsTrigger value="service">Service Information</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="appointment" className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border rounded-lg p-4 bg-blue-50">
                          <h4 className="font-semibold text-blue-900 mb-2">SMS</h4>
                          <div className="bg-white p-3 rounded border text-sm font-mono whitespace-pre-wrap">
                            {responses.smsAppointment}
                          </div>
                        </div>
                        <div className="border rounded-lg p-4 bg-green-50">
                          <h4 className="font-semibold text-green-900 mb-2">Web Chat</h4>
                          <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                            <div dangerouslySetInnerHTML={{ __html: responses.webAppointment.replace(/\*([^*]+)\*/g, '<strong>$1</strong>') }} />
                          </div>
                        </div>
                        <div className="border rounded-lg p-4 bg-purple-50">
                          <h4 className="font-semibold text-purple-900 mb-2">Email</h4>
                          <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                            {responses.emailAppointment}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="service" className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border rounded-lg p-4 bg-blue-50">
                          <h4 className="font-semibold text-blue-900 mb-2">SMS</h4>
                          <div className="bg-white p-3 rounded border text-sm font-mono whitespace-pre-wrap">
                            {responses.smsService}
                          </div>
                        </div>
                        <div className="border rounded-lg p-4 bg-green-50">
                          <h4 className="font-semibold text-green-900 mb-2">Web Chat</h4>
                          <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                            <div dangerouslySetInnerHTML={{ __html: responses.webService.replace(/\*([^*]+)\*/g, '<strong>$1</strong>') }} />
                          </div>
                        </div>
                        <div className="border rounded-lg p-4 bg-purple-50">
                          <h4 className="font-semibold text-purple-900 mb-2">Email</h4>
                          <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                            {responses.emailService}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
