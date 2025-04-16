import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        <TabsList className="grid grid-cols-2 w-full relative overflow-hidden">
          <TabsTrigger
            value={AppTab.BRIEFING}
            className="data-[state=active]:bg-[#F15A22] data-[state=active]:text-white flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Briefing</span>
          </TabsTrigger>
          <TabsTrigger
            value={AppTab.CONTENT}
            className="data-[state=active]:bg-[#F15A22] data-[state=active]:text-white flex items-center justify-center gap-2"
          >
            <FileText className="h-4 w-4" />
            <span>Content</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}