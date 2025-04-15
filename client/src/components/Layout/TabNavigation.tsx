import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppTab } from "@/App";
import { motion } from "framer-motion";

interface TabNavigationProps {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
}

export function TabNavigation({ activeTab, onChangeTab }: TabNavigationProps) {
  return (
    <div className="w-full flex justify-center mb-6">
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => onChangeTab(value as AppTab)}
        className="w-full max-w-md"
      >
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger 
            value={AppTab.CONTENT}
            className="relative"
          >
            Content
            {activeTab === AppTab.CONTENT && (
              <motion.div 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F15A22]" 
                layoutId="tab-indicator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </TabsTrigger>
          <TabsTrigger 
            value={AppTab.BRIEFING}
            className="relative"
          >
            Briefing
            {activeTab === AppTab.BRIEFING && (
              <motion.div 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F15A22]" 
                layoutId="tab-indicator"
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