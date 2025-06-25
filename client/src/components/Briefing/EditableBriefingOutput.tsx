import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Maximize2, 
  Minimize2, 
  Edit3, 
  Save, 
  Undo, 
  Redo, 
  Type, 
  Palette, 
  Download,
  Send,
  Sparkles,
  CheckCircle,
  Confetti
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EditableBriefingOutputProps {
  briefingContent: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onSave: () => Promise<void>;
  title?: string;
}

interface EditSelection {
  text: string;
  start: number;
  end: number;
}

export const EditableBriefingOutput: React.FC<EditableBriefingOutputProps> = ({
  briefingContent,
  isExpanded,
  onToggleExpanded,
  onSave,
  title = "Strategic Marketing Brief"
}) => {
  const [content, setContent] = useState(briefingContent);
  const [isEditing, setIsEditing] = useState(false);
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState<EditSelection | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Update content when briefingContent prop changes
  useEffect(() => {
    if (briefingContent !== content) {
      setContent(briefingContent);
      // Add to history
      setEditHistory(prev => [...prev, briefingContent]);
      setHistoryIndex(prev => prev + 1);
    }
  }, [briefingContent]);

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString();
      const range = selection.getRangeAt(0);
      
      setSelectedText({
        text,
        start: range.startOffset,
        end: range.endOffset
      });
      
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    }
  };

  // Close context menu
  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Add to edit history
  const addToHistory = (newContent: string) => {
    const newHistory = editHistory.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    setEditHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setContent(newContent);
  };

  // Undo/Redo functionality
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setContent(editHistory[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < editHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setContent(editHistory[historyIndex + 1]);
    }
  };

  // Text editing functions
  const makeTextBold = () => {
    if (selectedText) {
      const before = content.substring(0, selectedText.start);
      const after = content.substring(selectedText.end);
      const newContent = `${before}<strong>${selectedText.text}</strong>${after}`;
      addToHistory(newContent);
    }
    setShowContextMenu(false);
  };

  const makeTextItalic = () => {
    if (selectedText) {
      const before = content.substring(0, selectedText.start);
      const after = content.substring(selectedText.end);
      const newContent = `${before}<em>${selectedText.text}</em>${after}`;
      addToHistory(newContent);
    }
    setShowContextMenu(false);
  };

  const improveText = async () => {
    if (selectedText) {
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o',
            systemPrompt: "You are a professional marketing copy editor. Improve the provided text to be more engaging, clear, and persuasive while maintaining the original meaning and tone. Return only the improved text without any explanations or quotes.",
            userPrompt: `Improve this text: "${selectedText.text}"`,
            temperature: 0.7
          })
        });

        const data = await response.json();
        const improvedText = data.content.trim();
        
        const before = content.substring(0, selectedText.start);
        const after = content.substring(selectedText.end);
        const newContent = `${before}${improvedText}${after}`;
        addToHistory(newContent);
        
        toast({
          title: "Text Improved",
          description: "Selected text has been enhanced for better impact."
        });
      } catch (error) {
        toast({
          title: "Improvement Failed",
          description: "Unable to improve text. Please try again.",
          variant: "destructive"
        });
      }
    }
    setShowContextMenu(false);
  };

  // Save with celebration animation
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      setShowCelebration(true);
      
      toast({
        title: "🎉 Brief Sent to Aquent Marketers!",
        description: "Your creative brief has been successfully delivered to our expert marketing team.",
      });

      // Hide celebration after 3 seconds
      setTimeout(() => setShowCelebration(false), 3000);
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Unable to save briefing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle editing mode
  const toggleEdit = () => {
    if (isEditing) {
      // Save current content to history when exiting edit mode
      addToHistory(content);
    }
    setIsEditing(!isEditing);
  };

  return (
    <div className={`transition-all duration-500 ${
      isExpanded 
        ? "fixed inset-4 z-50 bg-white rounded-2xl shadow-2xl p-6 overflow-y-auto" 
        : "w-full"
    }`}>
      <Card className="h-full border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              {isEditing ? (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-xl font-semibold border-none p-0 h-auto bg-transparent"
                />
              ) : (
                <span>{editTitle}</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Editing Tools */}
              {briefingContent && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    title="Undo"
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={redo}
                    disabled={historyIndex >= editHistory.length - 1}
                    title="Redo"
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleEdit}
                    className={isEditing ? "bg-blue-100 text-blue-700" : ""}
                    title={isEditing ? "Exit Edit Mode" : "Edit Mode"}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleExpanded}
                title={isExpanded ? "Minimize" : "Maximize"}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              
              {briefingContent && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
                >
                  {isSaving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-2"
                      >
                        <Save className="h-4 w-4" />
                      </motion.div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send to Marketers
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardTitle>
          <p className="text-gray-600 mt-1">Your comprehensive marketing strategy document</p>
        </CardHeader>

        <CardContent>
          {content ? (
            <div className={`${isExpanded ? "h-[calc(100vh-300px)]" : "h-[500px]"} overflow-y-auto border-2 border-gray-100 rounded-xl bg-gradient-to-br from-gray-50 to-white`}>
              {isEditing ? (
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full p-6 border-none resize-none bg-transparent text-base leading-relaxed"
                  placeholder="Edit your briefing content..."
                />
              ) : (
                <div
                  ref={contentRef}
                  className="prose max-w-none p-6 cursor-text"
                  contentEditable={false}
                  onContextMenu={handleContextMenu}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}
            </div>
          ) : (
            <div className={`${isExpanded ? "h-[calc(100vh-300px)]" : "h-[500px]"} flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white`}>
              <div className="text-center max-w-sm">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl mb-6">
                  <Sparkles className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Brief Awaits</h3>
                <p className="text-gray-500 mb-4">Once you share your project details, SAGE will create a comprehensive marketing brief tailored to your goals.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Strategy Analysis
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Audience Insights
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Action Plan
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right-Click Context Menu */}
      <AnimatePresence>
        {showContextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed z-[100] bg-white rounded-lg shadow-xl border p-2 min-w-[200px]"
            style={{
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={makeTextBold}
              className="w-full justify-start"
            >
              <Type className="h-4 w-4 mr-2" />
              Make Bold
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={makeTextItalic}
              className="w-full justify-start"
            >
              <Type className="h-4 w-4 mr-2" />
              Make Italic
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={improveText}
              className="w-full justify-start"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Improve with AI
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              className="bg-green-500 text-white p-8 rounded-2xl shadow-2xl"
            >
              <div className="text-center">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ 
                    duration: 0.6, 
                    repeat: 2,
                    ease: "easeInOut"
                  }}
                  className="mb-4"
                >
                  <CheckCircle className="h-16 w-16 mx-auto" />
                </motion.div>
                <h3 className="text-2xl font-bold mb-2">Brief Sent!</h3>
                <p className="text-green-100">Delivered to Aquent's marketing experts</p>
              </div>
            </motion.div>

            {/* Confetti Effect */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * window.innerWidth,
                  y: -20,
                  rotate: 0,
                  scale: Math.random() * 0.5 + 0.5
                }}
                animate={{ 
                  y: window.innerHeight + 20,
                  rotate: Math.random() * 360,
                  x: Math.random() * window.innerWidth
                }}
                transition={{ 
                  duration: Math.random() * 2 + 2,
                  ease: "easeOut"
                }}
                className={`absolute w-4 h-4 ${
                  Math.random() > 0.5 ? 'bg-yellow-400' : 
                  Math.random() > 0.5 ? 'bg-pink-400' : 'bg-blue-400'
                } rounded-full`}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};