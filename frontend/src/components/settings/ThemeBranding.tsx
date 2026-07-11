import { useState, useEffect } from 'react';
import { useSettings, useSaveSettings } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Palette, Upload, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ThemeBranding() {
  const { data: settings, isLoading } = useSettings();
  const { mutate: saveSettings, isPending: isSavingSettings } = useSaveSettings();

  const [companyLogo, setCompanyLogo] = useState('');
  const [companyNameState, setCompanyNameState] = useState('');
  const [themeColors, setThemeColors] = useState('maroon-saffron');
  const [sidebarStyle, setSidebarStyle] = useState('Minimalist');

  useEffect(() => {
    if (settings) {
      setCompanyLogo(settings.companyLogo || '');
      setCompanyNameState(settings.companyName || '');
      setThemeColors(settings.themeColors || 'maroon-saffron');
      setSidebarStyle(settings.sidebarStyle || 'Minimalist');
    }
  }, [settings]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('Logo file size must be less than 1.5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setCompanyLogo(base64String);
      toast.success('Logo uploaded and preview generated!');
    };
    reader.onerror = () => {
      toast.error('Failed to read logo file');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = () => {
    if (!companyNameState.trim()) {
      toast.error('Company Name is required');
      return;
    }

    saveSettings(
      {
        ...settings,
        companyLogo,
        companyName: companyNameState.trim(),
        themeColors,
        sidebarStyle,
      } as any,
      {
        onSuccess: () => {
          toast.success('Branding and Theme settings saved successfully!');
        },
        onError: (error) => {
          toast.error('Failed to save settings: ' + error.message);
        },
      }
    );
  };

  if (isLoading) {
    return <div className="py-8 text-center text-xs text-gray-500">Loading Branding Settings...</div>;
  }

  return (
    <Card className="border-2 border-gold shadow-md overflow-hidden bg-white/95 dark:bg-gray-950/95">
      <CardHeader className="bg-gradient-to-r from-maroon/5 via-saffron/5 to-maroon/5 border-b border-gold/20 py-5">
        <CardTitle className="text-maroon dark:text-saffron flex items-center gap-2">
          <Palette className="h-5 w-5" />
          <span>Theme & Branding Customization</span>
        </CardTitle>
        <CardDescription>Upload custom logos, select your ERP visual styles, and update company settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Company name */}
        <div className="space-y-2">
          <Label htmlFor="companyNameInput" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Company Name (Branding)</Label>
          <Input
            id="companyNameInput"
            value={companyNameState}
            onChange={(e) => setCompanyNameState(e.target.value)}
            placeholder="e.g. Gujarat Art & Crafts"
            className="border-gold focus:ring-saffron"
          />
        </div>

        {/* Logo upload */}
        <div className="space-y-2">
          <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Company Logo</Label>
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 border border-gold/20 rounded-xl bg-slate-50 dark:bg-gray-900/50">
            <div className="w-24 h-24 border border-gold/30 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 overflow-hidden relative">
              {companyLogo ? (
                <img src={companyLogo} alt="Preview" className="w-full h-full object-contain p-1" />
              ) : (
                <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <div className="space-y-3 flex-1 w-full">
              <div className="flex items-center justify-start gap-2">
                <Label
                  htmlFor="logoFile"
                  className="bg-maroon hover:bg-maroon/90 text-white font-bold px-4 py-2 rounded-lg cursor-pointer text-sm shadow-sm transition-all border border-gold/20 flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Image
                </Label>
                <input
                  id="logoFile"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {companyLogo && (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setCompanyLogo('')}
                    className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-950/30 dark:hover:bg-red-950/20 font-semibold"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500">Supports PNG, JPEG, GIF up to 1.5MB. Resized automatically for header integration.</p>
            </div>
          </div>
        </div>

        {/* Theme selection */}
        <div className="space-y-3">
          <Label className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider block">Visual Color Theme</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'maroon-saffron', name: 'Gujarat Royal (Maroon & Saffron)', primary: '#800000', secondary: '#FF9933' },
              { id: 'blue-gold', name: 'ERP Blue & Gold', primary: '#1e3a8a', secondary: '#d97706' },
              { id: 'emerald-mint', name: 'Craft Emerald & Mint', primary: '#064e3b', secondary: '#34d399' },
              { id: 'charcoal-rose', name: 'Modern Charcoal & Rose', primary: '#1f2937', secondary: '#f43f5e' },
            ].map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setThemeColors(theme.id)}
                className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                  themeColors === theme.id
                    ? 'border-gold bg-amber-50/10 dark:bg-amber-950/10 ring-2 ring-saffron'
                    : 'border-slate-200 dark:border-slate-800 hover:border-gold/50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.primary }} />
                  <span className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.secondary }} />
                </div>
                <span className="text-xs font-bold leading-tight">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Style */}
        <div className="space-y-2">
          <Label htmlFor="sidebarStyleSelect" className="text-maroon dark:text-saffron font-bold text-xs uppercase tracking-wider">Sidebar Layout Style</Label>
          <Select value={sidebarStyle} onValueChange={setSidebarStyle}>
            <SelectTrigger id="sidebarStyleSelect" className="border-gold bg-white dark:bg-gray-800 max-w-sm">
              <SelectValue placeholder="Select Sidebar Style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Minimalist">Minimalist (Clean White / Light Border)</SelectItem>
              <SelectItem value="Dark Sidebar">Professional Dark (Deep Slate / Saffron Accent)</SelectItem>
              <SelectItem value="Accent Accent">Traditional Theme Gradient (Maroon & Saffron)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end pt-4 border-t border-gold/10">
          <Button
            onClick={handleSaveBranding}
            disabled={isSavingSettings}
            className="bg-maroon hover:bg-maroon/90 text-white font-semibold border border-gold/30 shadow-sm"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Branding Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
