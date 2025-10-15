import React from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, Mail, Settings } from "lucide-react";

export default function DashboardFormatter() {
  const [, setLocation] = useLocation();

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-blue-500/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="mr-2 h-5 w-5 text-blue-400" />
          Message Formatter
        </CardTitle>
        <CardDescription className="text-blue-200">
          Configure how your communications look and feel across all channels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          className="w-full py-6 bg-blue-600 hover:bg-blue-700 mb-6"
          onClick={() => setLocation('/formatter-test')}
        >
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold">Open Message Formatter Tool</span>
            <span className="text-xs mt-1 opacity-80">Customize SMS, web app, and email communications</span>
          </div>
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-700/30">
            <h3 className="font-semibold mb-2 flex items-center">
              <Phone className="h-4 w-4 mr-2 text-blue-400" />
              SMS Settings
            </h3>
            <ul className="text-xs text-blue-200 space-y-1 list-disc ml-5">
              <li>Character limits</li>
              <li>Emoji usage</li>
              <li>Branding options</li>
              <li>Mobile optimization</li>
            </ul>
          </div>
          
          <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-700/30">
            <h3 className="font-semibold mb-2 flex items-center">
              <MessageSquare className="h-4 w-4 mr-2 text-blue-400" />
              Web App Settings
            </h3>
            <ul className="text-xs text-blue-200 space-y-1 list-disc ml-5">
              <li>Rich formatting</li>
              <li>Interactive elements</li>
              <li>Detailed content</li>
              <li>Visual appearance</li>
            </ul>
          </div>
          
          <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-700/30">
            <h3 className="font-semibold mb-2 flex items-center">
              <Mail className="h-4 w-4 mr-2 text-blue-400" />
              Email Settings
            </h3>
            <ul className="text-xs text-blue-200 space-y-1 list-disc ml-5">
              <li>Formal tone controls</li>
              <li>Signature options</li>
              <li>Branding elements</li>
              <li>Professional layout</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}