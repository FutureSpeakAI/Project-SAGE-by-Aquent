import { useState, useEffect } from 'react';
import { SessionContext, SessionContextManager, getContextForPrompt } from '@shared/session-context';

export function useSessionContext() {
  const [context, setContext] = useState<SessionContext | null>(null);
  const contextManager = SessionContextManager.getInstance();

  useEffect(() => {
    // Load context from localStorage on mount
    contextManager.loadFromLocalStorage();
    setContext(contextManager.getCurrentContext());

    // Subscribe to context changes
    const unsubscribe = contextManager.subscribe((newContext) => {
      setContext(newContext);
    });

    return unsubscribe;
  }, []);

  const createSession = (projectName: string, brand: string, industry: string) => {
    return contextManager.createNewSession(projectName, brand, industry);
  };

  const updateContext = (updates: Partial<SessionContext>) => {
    contextManager.updateContext(updates);
  };

  const addResearch = (research: any) => {
    contextManager.addResearchData(research);
  };

  const addContent = (content: any) => {
    contextManager.addGeneratedContent(content);
  };

  const addVisualAsset = (asset: any) => {
    contextManager.addVisualAsset(asset);
  };

  const updateBriefing = (briefing: any) => {
    contextManager.updateBriefingData(briefing);
  };

  const clearSession = () => {
    contextManager.clearSession();
  };

  const getPromptContext = () => {
    return getContextForPrompt(context);
  };

  const exportSession = () => {
    return contextManager.exportSession();
  };

  return {
    context,
    createSession,
    updateContext,
    addResearch,
    addContent,
    addVisualAsset,
    updateBriefing,
    clearSession,
    getPromptContext,
    exportSession
  };
}