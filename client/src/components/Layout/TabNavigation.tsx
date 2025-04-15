import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { FileText, MessageSquare } from "lucide-react";
import { AppTab } from "@/App";

interface TabNavigationProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
}

export function TabNavigation({ activeTab, onChangeTab }: TabNavigationProps) {
  return (
    <div className="flex justify-center">
      <Tabs
        value={activeTab}
        onValueChange={(value) => onChangeTab(value as AppTab)}
        className="w-full max-w-md"
      >
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger
            value={AppTab.CONTENT}
            className="data-[state=active]:bg-[#F15A22] data-[state=active]:text-white flex items-center justify-center gap-2"
          >
            <FileText className="h-4 w-4" />
            <span>Content</span>
            {activeTab === AppTab.CONTENT && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F15A22]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </TabsTrigger>
          <TabsTrigger
            value={AppTab.BRIEFING}
            className="data-[state=active]:bg-[#F15A22] data-[state=active]:text-white flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Briefing</span>
            {activeTab === AppTab.BRIEFING && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F15A22]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}