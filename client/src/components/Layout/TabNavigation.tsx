import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, MessageSquare, Image, MessageCircle, Target } from "lucide-react";
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
        <TabsList className="grid grid-cols-5 w-full relative overflow-hidden">
          <TabsTrigger
            value={AppTab.FREE_PROMPT}
            className="data-[state=active]:bg-[#F15A22] data-[state=active]:text-white flex items-center justify-center"
          >
            SAGE
          </TabsTrigger>
          <TabsTrigger
            value={AppTab.CAMPAIGN}
            className="data-[state=active]:bg-[#F15A22] data-[state=active]:text-white flex items-center justify-center"
          >
            Campaign
          </TabsTrigger>
          <TabsTrigger
            value={AppTab.BRIEFING}
            className="data-[state=active]:bg-[#F15A22] data-[state=active]:text-white flex items-center justify-center"
          >
            Briefing
          </TabsTrigger>
          <TabsTrigger
            value={AppTab.CONTENT}
            className="data-[state=active]:bg-[#F15A22] data-[state=active]:text-white flex items-center justify-center"
          >
            Content
          </TabsTrigger>
          <TabsTrigger
            value={AppTab.VISUAL}
            className="data-[state=active]:bg-[#F15A22] data-[state=active]:text-white flex items-center justify-center"
          >
            Visual
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}