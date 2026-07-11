import { Button } from '@/components/ui/button';
import { Printer, FileText, Save } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ActionButtonsProps {
  onPrint: () => void;
  onClear: () => void;
  isSaving?: boolean;
}

const ActionButtons = ({ onPrint, onClear, isSaving = false }: ActionButtonsProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Button
        onClick={onPrint}
        className="bg-maroon hover:bg-maroon/90 text-white font-semibold px-8 py-6 text-lg"
      >
        <Printer className="h-5 w-5 mr-2" />
        Print Invoice
      </Button>

      <Button
        onClick={onPrint}
        variant="outline"
        className="border-2 border-saffron text-saffron hover:bg-saffron hover:text-white font-semibold px-8 py-6 text-lg"
      >
        <FileText className="h-5 w-5 mr-2" />
        Save as PDF
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-6 text-lg"
          >
            <Save className="h-5 w-5 mr-2" />
            {isSaving ? 'Saving...' : 'Save & Clear'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save and Clear Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will save the current invoice to the database canister and reset the billing form for your next invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onClear} className="bg-green-600 hover:bg-green-700 text-white">
              Save & Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActionButtons;
