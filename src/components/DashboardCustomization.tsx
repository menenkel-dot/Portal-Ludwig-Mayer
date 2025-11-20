import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useState, useEffect } from "react";

interface WidgetOption {
  id: string;
  title: string;
  permission: string;
}

interface DashboardCustomizationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableWidgets: WidgetOption[];
  currentSelection: string[];
  onSave: (newSelection: string[]) => void;
  isSaving: boolean;
}

export const DashboardCustomization = ({
  open,
  onOpenChange,
  availableWidgets,
  currentSelection,
  onSave,
  isSaving,
}: DashboardCustomizationProps) => {
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(currentSelection);

  useEffect(() => {
    setSelectedWidgets(currentSelection);
  }, [currentSelection]);

  const handleCheckedChange = (widgetId: string, checked: boolean) => {
    setSelectedWidgets(prev =>
      checked ? [...prev, widgetId] : prev.filter(id => id !== widgetId)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dashboard anpassen</DialogTitle>
          <DialogDescription>
            Wähle die Widgets aus, die auf deinem Dashboard angezeigt werden sollen.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {availableWidgets.map(widget => (
            <div key={widget.id} className="flex items-center space-x-2">
              <Checkbox
                id={widget.id}
                checked={selectedWidgets.includes(widget.id)}
                onCheckedChange={(checked) => handleCheckedChange(widget.id, !!checked)}
              />
              <Label htmlFor={widget.id} className="font-normal">
                {widget.title}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={() => onSave(selectedWidgets)} disabled={isSaving}>
            {isSaving ? "Speichern..." : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};