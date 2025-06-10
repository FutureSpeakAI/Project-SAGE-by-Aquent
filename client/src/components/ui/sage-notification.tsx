import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, MessageCircle, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface BriefSuggestion {
  title: string;
  description: string;
  simplified: string;
}

interface SageNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  onGoToSage: () => void;
  briefAnalysis: {
    isComplex: boolean;
    reason: string;
    project: string;
    suggestions: BriefSuggestion[];
    recommendation: string;
  } | null;
}

export function SageNotification({ isVisible, onClose, onGoToSage, briefAnalysis }: SageNotificationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible || !briefAnalysis?.isComplex) return null;

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'nested_deliverables':
        return <Badge variant="destructive">Nested Deliverables</Badge>;
      case 'multiple_channels':
        return <Badge variant="outline">Multiple Channels</Badge>;
      case 'detailed_specifications':
        return <Badge variant="secondary">Complex Specs</Badge>;
      default:
        return <Badge>Complex Brief</Badge>;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]"
      >
        <Card className="border-orange-200 bg-orange-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <CardTitle className="text-sm font-medium text-orange-900">
                    Complex Brief Detected
                  </CardTitle>
                  <CardDescription className="text-xs text-orange-700">
                    {briefAnalysis.project}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-6 w-6 p-0 text-orange-700 hover:bg-orange-100"
                >
                  <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-6 w-6 p-0 text-orange-700 hover:bg-orange-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {getReasonBadge(briefAnalysis.reason)}
              <span className="text-xs text-orange-600">
                {briefAnalysis.suggestions.length} suggestions
              </span>
            </div>
          </CardHeader>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <CardContent className="pt-0">
                  <p className="text-xs text-orange-800 mb-3">
                    {briefAnalysis.recommendation}
                  </p>
                  
                  <Separator className="mb-3" />
                  
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-orange-900">Suggested Breakdown:</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {briefAnalysis.suggestions.slice(0, 4).map((suggestion, index) => (
                        <div key={index} className="text-xs p-2 bg-white rounded border border-orange-100">
                          <div className="font-medium text-orange-900">{suggestion.title}</div>
                          <div className="text-orange-700">{suggestion.description}</div>
                        </div>
                      ))}
                      {briefAnalysis.suggestions.length > 4 && (
                        <div className="text-xs text-orange-600 italic">
                          +{briefAnalysis.suggestions.length - 4} more suggestions
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-3 pt-0">
            <Button
              onClick={onGoToSage}
              size="sm"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Talk to Sage
            </Button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}