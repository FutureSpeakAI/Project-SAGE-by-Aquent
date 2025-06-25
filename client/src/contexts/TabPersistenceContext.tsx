import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Visual Tab State
interface VisualTabState {
  imagePrompt: string;
  generatedImageUrl: string | null;
  imageTitle: string;
  size: string;
  quality: string;
  background: string;
  isProcessingDialogOpen: boolean;
  variationPrompt: string | null;
  uploadedImages: { file: File; base64: string }[];
  selectedUploadedImage: string | null;
}

// Briefing Tab State
interface BriefingTabState {
  briefingContent: string;
  uploadedFiles: File[];
  processingStatus: string;
  generatedBrief: string;
  selectedTemplate: string;
}

// Content Tab State
interface ContentTabState {
  generatedContent: string;
  contentTitle: string;
  systemPrompt: string;
  userPrompt: string;
  selectedTemplate: string;
  isGenerating: boolean;
}

// Free Prompt Tab State
interface FreePromptTabState {
  messages: any[];
  systemPrompt: string;
  userPrompt: string;
  selectedPersona: string;
  contextSettings: any;
  routerConfig: any;
}

interface TabPersistenceState {
  visual: VisualTabState;
  briefing: BriefingTabState;
  content: ContentTabState;
  freePrompt: FreePromptTabState;
}

interface TabPersistenceContextType {
  tabState: TabPersistenceState;
  updateVisualTab: (updates: Partial<VisualTabState>) => void;
  updateBriefingTab: (updates: Partial<BriefingTabState>) => void;
  updateContentTab: (updates: Partial<ContentTabState>) => void;
  updateFreePromptTab: (updates: Partial<FreePromptTabState>) => void;
  clearTab: (tabName: keyof TabPersistenceState) => void;
  clearAllTabs: () => void;
  persistToStorage: () => void;
  loadFromStorage: () => void;
}

const defaultVisualState: VisualTabState = {
  imagePrompt: '',
  generatedImageUrl: null,
  imageTitle: '',
  size: '1024x1024',
  quality: 'high',
  background: 'auto',
  isProcessingDialogOpen: false,
  variationPrompt: null,
  uploadedImages: [],
  selectedUploadedImage: null,
};

const defaultBriefingState: BriefingTabState = {
  briefingContent: '',
  uploadedFiles: [],
  processingStatus: '',
  generatedBrief: '',
  selectedTemplate: '',
};

const defaultContentState: ContentTabState = {
  generatedContent: '',
  contentTitle: '',
  systemPrompt: '',
  userPrompt: '',
  selectedTemplate: '',
  isGenerating: false,
};

const defaultFreePromptState: FreePromptTabState = {
  messages: [],
  systemPrompt: '',
  userPrompt: '',
  selectedPersona: '',
  contextSettings: {},
  routerConfig: {},
};

const defaultTabState: TabPersistenceState = {
  visual: defaultVisualState,
  briefing: defaultBriefingState,
  content: defaultContentState,
  freePrompt: defaultFreePromptState,
};

const TabPersistenceContext = createContext<TabPersistenceContextType | undefined>(undefined);

export function TabPersistenceProvider({ children }: { children: ReactNode }) {
  const [tabState, setTabState] = useState<TabPersistenceState>(defaultTabState);

  // Load from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      persistToStorage();
    }, 1000); // Debounce saves by 1 second

    return () => clearTimeout(timeoutId);
  }, [tabState]);

  const updateVisualTab = (updates: Partial<VisualTabState>) => {
    setTabState(prev => ({
      ...prev,
      visual: { ...prev.visual, ...updates }
    }));
  };

  const updateBriefingTab = (updates: Partial<BriefingTabState>) => {
    setTabState(prev => ({
      ...prev,
      briefing: { ...prev.briefing, ...updates }
    }));
  };

  const updateContentTab = (updates: Partial<ContentTabState>) => {
    setTabState(prev => ({
      ...prev,
      content: { ...prev.content, ...updates }
    }));
  };

  const updateFreePromptTab = (updates: Partial<FreePromptTabState>) => {
    setTabState(prev => ({
      ...prev,
      freePrompt: { ...prev.freePrompt, ...updates }
    }));
  };

  const clearTab = (tabName: keyof TabPersistenceState) => {
    setTabState(prev => ({
      ...prev,
      [tabName]: defaultTabState[tabName]
    }));
  };

  const clearAllTabs = () => {
    setTabState(defaultTabState);
    localStorage.removeItem('sage-tab-persistence');
  };

  const persistToStorage = () => {
    try {
      // Only persist non-sensitive data
      const persistableState = {
        ...tabState,
        // Remove sensitive or large data that shouldn't persist
        briefing: {
          ...tabState.briefing,
          uploadedFiles: [], // Don't persist file objects
        },
        visual: {
          ...tabState.visual,
          uploadedImages: [], // Don't persist file objects, only URLs
        }
      };
      
      localStorage.setItem('sage-tab-persistence', JSON.stringify(persistableState));
      console.log('Tab state persisted to localStorage');
    } catch (error) {
      console.warn('Failed to persist tab state:', error);
    }
  };

  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('sage-tab-persistence');
      if (stored) {
        const parsedState = JSON.parse(stored);
        setTabState(prev => ({
          ...defaultTabState,
          ...parsedState,
          // Ensure all nested objects exist
          visual: { ...defaultVisualState, ...parsedState.visual },
          briefing: { ...defaultBriefingState, ...parsedState.briefing },
          content: { ...defaultContentState, ...parsedState.content },
          freePrompt: { ...defaultFreePromptState, ...parsedState.freePrompt },
        }));
        console.log('Tab state loaded from localStorage');
      }
    } catch (error) {
      console.warn('Failed to load tab state from localStorage:', error);
      setTabState(defaultTabState);
    }
  };

  const contextValue: TabPersistenceContextType = {
    tabState,
    updateVisualTab,
    updateBriefingTab,
    updateContentTab,
    updateFreePromptTab,
    clearTab,
    clearAllTabs,
    persistToStorage,
    loadFromStorage,
  };

  return (
    <TabPersistenceContext.Provider value={contextValue}>
      {children}
    </TabPersistenceContext.Provider>
  );
}

export function useTabPersistence() {
  const context = useContext(TabPersistenceContext);
  if (context === undefined) {
    throw new Error('useTabPersistence must be used within a TabPersistenceProvider');
  }
  return context;
}

// Convenience hooks for individual tabs
export function useVisualTabPersistence() {
  const { tabState, updateVisualTab, clearTab } = useTabPersistence();
  return {
    visualState: tabState.visual,
    updateVisualState: updateVisualTab,
    clearVisualTab: () => clearTab('visual'),
  };
}

export function useBriefingTabPersistence() {
  const { tabState, updateBriefingTab, clearTab } = useTabPersistence();
  return {
    briefingState: tabState.briefing,
    updateBriefingState: updateBriefingTab,
    clearBriefingTab: () => clearTab('briefing'),
  };
}

export function useContentTabPersistence() {
  const { tabState, updateContentTab, clearTab } = useTabPersistence();
  return {
    contentState: tabState.content,
    updateContentState: updateContentTab,
    clearContentTab: () => clearTab('content'),
  };
}

export function useFreePromptTabPersistence() {
  const { tabState, updateFreePromptTab, clearTab } = useTabPersistence();
  return {
    freePromptState: tabState.freePrompt,
    updateFreePromptState: updateFreePromptTab,
    clearFreePromptTab: () => clearTab('freePrompt'),
  };
}