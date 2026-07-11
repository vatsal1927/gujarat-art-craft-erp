import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare, Download, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { StockAlert } from '../utils/whatsapp';
import { sendWhatsAppBusinessAlert } from '../services/stockAlertService';

export function maskPhoneNumber(phone: string): string {
  if (phone.length <= 6) return '******';
  const visibleStart = 6;
  const visibleEnd = 2;
  const maskedLength = phone.length - visibleStart - visibleEnd;
  return phone.slice(0, visibleStart) + '*'.repeat(maskedLength > 0 ? maskedLength : 4) + phone.slice(-visibleEnd);
}

interface StockAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert: StockAlert | null;
  imageUrl: string;
  onSendAlert: (phone: string) => Promise<void>;
  onSendToAll: () => Promise<void>;
}

export const StockAlertModal: React.FC<StockAlertModalProps> = ({
  isOpen,
  onClose,
  alert,
  imageUrl,
  onSendAlert,
  onSendToAll
}) => {
  if (!alert) return null;

  const safeRecipients = alert && Array.isArray(alert.recipients) ? alert.recipients : [];

  // Validation console logs
  console.log('StockAlertModal: rendering product photo/image source:', imageUrl);
  console.log('StockAlertModal: alert details:', alert);
  console.log(`[WhatsAppAlert] recipients count: ${safeRecipients.length}`);

  const handleDownloadPhoto = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${alert.productName.toLowerCase().replace(/\s+/g, '-')}-photo.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success('Product photo downloaded successfully.');
    } catch (e) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.target = '_blank';
      link.download = `${alert.productName.toLowerCase().replace(/\s+/g, '-')}-photo.jpg`;
      link.click();
      toast.success('Product photo opened/downloaded.');
    }
  };

  const handleCopyPhoto = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.write) {
        toast.error('Copy to clipboard is not supported by this browser context. Please right-click the product image preview above and select "Copy Image".');
        return;
      }

      toast.info('Converting and copying image to clipboard...');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          toast.error('Could not get canvas context for image conversion.');
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (pngBlob) => {
          if (!pngBlob) {
            toast.error('Failed to convert image to PNG format.');
            return;
          }
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': pngBlob
              })
            ]);
            toast.success('Product photo copied to clipboard! Paste it directly in WhatsApp.');
          } catch (err: any) {
            console.error('Clipboard write error:', err);
            if (err.name === 'SecurityError' || err.message?.includes('tainted')) {
              toast.error('CORS security policy prevented automatic copying. Please right-click the product preview image above to copy.');
            } else {
              toast.error('Could not copy image automatically. Please right-click the preview image to copy.');
            }
          }
        }, 'image/png');
      };
      img.onerror = (e) => {
        console.error('Image load failed for copy:', e);
        toast.error('Failed to load image for copying automatically. Please download it or right-click the preview image to copy.');
      };
      img.src = imageUrl;
    } catch (err: any) {
      console.error('Copy photo exception:', err);
      toast.error('Failed to copy product photo: ' + err.message);
    }
  };

  const handleTriggerFutureAPI = async () => {
    // Requires WhatsApp Business Cloud API credentials and backend endpoint.
    toast.info('Triggering future WhatsApp Business Cloud API mode placeholder...');
    await sendWhatsAppBusinessAlert(alert.id);
    toast.warning('Future Auto Mode requires WhatsApp Business Cloud API credentials and backend endpoint configured.');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="border-2 border-gold shadow-lg w-[min(640px,calc(100vw-24px))] bg-[#FDFBF7] max-h-[92vh] overflow-y-auto p-6 text-slate-800">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-maroon text-xl font-bold font-serif flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-maroon" />
            <span>Send WhatsApp Alert</span>
          </DialogTitle>
          <DialogDescription className="text-slate-600 font-medium">
            Review the stock shortage alert, download/copy the product design photo, and dispatch notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 my-2">
          {/* Product Design Image Preview */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Product Photo:</span>
            <div className="border border-[#EBD9A6] rounded-xl overflow-hidden bg-white flex flex-col items-center p-3">
              <img 
                src={imageUrl} 
                alt={alert.productName} 
                className="max-w-full h-auto border rounded shadow-sm object-contain"
                style={{ maxHeight: '180px' }}
              />
              <div className="flex gap-3 mt-3 w-full justify-center">
                <Button
                  type="button"
                  onClick={handleDownloadPhoto}
                  variant="outline"
                  className="border-gold text-maroon text-xs h-9 px-4 font-semibold flex items-center gap-1 hover:bg-gold/10"
                >
                  <Download className="h-3.5 w-3.5" /> Download Product Photo
                </Button>
                <Button
                  type="button"
                  onClick={handleCopyPhoto}
                  variant="outline"
                  className="border-gold text-maroon text-xs h-9 px-4 font-semibold flex items-center gap-1 hover:bg-gold/10"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Product Photo
                </Button>
              </div>
            </div>
          </div>

          {/* Message Template Text Preview */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Auto-Generated Message Preview:</span>
            <pre className="bg-slate-50 dark:bg-slate-900 border border-[#EBD9A6] rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap leading-relaxed select-all">
              {alert.message}
            </pre>
          </div>

          {/* Instruction notice */}
          <div className="bg-amber-50 dark:bg-amber-955/20 border border-gold/30 rounded-xl p-3 text-[11px] text-slate-600 dark:text-slate-350 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-maroon flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>ℹ Instructions:</strong> WhatsApp Web link API does not support auto-attaching images. Please download or copy the product photo above, and paste/attach it manually in WhatsApp after opening the chat.
            </p>
          </div>

          {/* Targets List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Send WhatsApp Alert:</span>
            {safeRecipients.length === 0 ? (
              <div className="bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/50 rounded-xl p-3 text-xs text-red-800 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-650 flex-shrink-0" />
                <span>No valid WhatsApp numbers configured. Please update Settings.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {safeRecipients.map((phone, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-gold/20 rounded-xl p-3 shadow-sm">
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{phone}</span>
                    <Button
                      type="button"
                      onClick={() => onSendAlert(phone)}
                      className="bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold h-8 px-3 rounded-lg flex items-center gap-1 border-none"
                    >
                      Send Message
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-2 border-t pt-4 flex flex-col sm:flex-row sm:justify-between items-center gap-3">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              onClick={onSendToAll}
              className="bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold h-9 px-4 rounded-lg flex-1 sm:flex-initial"
            >
              Send to All Numbers
            </Button>
            <Button
              type="button"
              onClick={handleTriggerFutureAPI}
              variant="secondary"
              className="text-xs h-9 px-4 font-bold bg-slate-200 text-slate-800 hover:bg-slate-300 flex-1 sm:flex-initial"
            >
              Test Future API Mode
            </Button>
          </div>
          <Button 
            type="button" 
            onClick={onClose} 
            variant="outline" 
            className="border-gold text-maroon hover:bg-gold/10 text-xs h-9 px-4 w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
