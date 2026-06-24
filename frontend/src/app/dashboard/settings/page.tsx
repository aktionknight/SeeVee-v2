"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Shield, CheckCircle2, XCircle, Loader2, Webhook } from "lucide-react";
import { integrationsApi } from "@/lib/integrations-api";

export default function SettingsPage() {
  const [apifyToken, setApifyToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [maskedKey, setMaskedKey] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await integrationsApi.getIntegrationStatus();
      const apifyStatus = data.find(i => i.platform === "apify");
      if (apifyStatus && apifyStatus.is_active) {
        setStatus("connected");
        setMaskedKey(apifyStatus.masked_key);
      } else {
        setStatus("disconnected");
      }
    } catch (error) {
      console.error(error);
      setStatus("disconnected");
    }
  };

  const handleSaveToken = async () => {
    if (!apifyToken) return;
    
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await integrationsApi.saveApifyToken(apifyToken);
      setStatus("connected");
      setMaskedKey(res.masked_key);
      setApifyToken("");
      setMessage({ type: "success", text: "Apify token saved securely." });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyToken = async () => {
    setIsVerifying(true);
    setMessage(null);
    try {
      const res = await integrationsApi.verifyApifyToken();
      setMessage({ type: "success", text: res.message });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeleteToken = async () => {
    setIsDeleting(true);
    setMessage(null);
    try {
      await integrationsApi.deleteApifyIntegration();
      setStatus("disconnected");
      setMaskedKey("");
      setMessage({ type: "success", text: "Apify integration removed." });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col p-8 md:p-24 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your API keys and integrations.</p>
      </div>

      <div className="grid gap-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              <CardTitle>Apify Integration</CardTitle>
            </div>
            <CardDescription>
              Connect your Apify account to enable web scraping and data extraction. 
              Your API token is encrypted at rest using AES-256-GCM and never stored in plaintext.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                message.type === 'success' ? 'bg-green-500/15 text-green-500' : 'bg-destructive/15 text-destructive'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            {status === "loading" ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : status === "connected" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500/20 p-2 rounded-full">
                      <Shield className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Apify Token</p>
                      <p className="text-sm text-muted-foreground">{maskedKey}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-500 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Connected
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Label htmlFor="apifyToken">API Token</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="apifyToken"
                      type="password"
                      placeholder="apify_api_..."
                      className="pl-9"
                      value={apifyToken}
                      onChange={(e) => setApifyToken(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSaveToken} disabled={isSaving || !apifyToken}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Connect
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can find your API token in your Apify Console under Settings &gt; Integrations.
                </p>
              </div>
            )}
          </CardContent>
          
          {status === "connected" && (
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <Button variant="outline" onClick={handleVerifyToken} disabled={isVerifying}>
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify Connection
              </Button>
              <Button variant="destructive" onClick={handleDeleteToken} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Disconnect
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
