import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error loading conversations:", error);
        return;
      }

      setConversations(data || []);
      
      // Set active conversation to most recent if none selected
      if (data && data.length > 0 && !activeConversationId) {
        setActiveConversationId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId]);

  useEffect(() => {
    loadConversations();
  }, []);

  // Create new conversation
  const createConversation = useCallback(async (title?: string): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      toast({
        variant: "destructive",
        title: "Session Required",
        description: "Sign in to create a new chat.",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          user_id: session.user.id,
          title: title || ((localStorage.getItem("vector-lang") || "tr") === "en" ? "New Chat" : "Yeni Sohbet"),
        })
        .select()
        .single();

      if (error) throw error;

      setConversations(prev => [data, ...prev]);
      setActiveConversationId(data.id);
      
      return data.id;
    } catch (err) {
      console.error("Failed to create conversation:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create chat.",
      });
      return null;
    }
  }, []);

  // Update conversation title
  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ title })
        .eq("id", conversationId);

      if (error) throw error;

      setConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, title } : c)
      );
    } catch (err) {
      console.error("Failed to update conversation:", err);
    }
  }, []);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      // If deleted conversation was active, switch to another
      if (activeConversationId === conversationId) {
        const remaining = conversations.filter(c => c.id !== conversationId);
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      }

      toast({
        title: "Chat Deleted",
        description: "Chat successfully deleted.",
      });
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete chat.",
      });
    }
  }, [activeConversationId, conversations]);

  // Select conversation
  const selectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  return {
    conversations,
    activeConversationId,
    isLoading,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    selectConversation,
    refreshConversations: loadConversations,
  };
};
