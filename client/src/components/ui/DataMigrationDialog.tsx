import { DataMigrationTool } from "@/components/ui/DataMigration";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DataMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataMigrationDialog({ open, onOpenChange }: DataMigrationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Data Migration</DialogTitle>
          <DialogDescription>
            Export your data to transfer between environments or import data from another environment.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <DataMigrationTool />
        </div>
      </DialogContent>
    </Dialog>
  );
}