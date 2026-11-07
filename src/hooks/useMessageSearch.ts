import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SearchResult {
  id: string;
  content: string;
  role: string;
  conversation_id: string;
  conversation_title: string;
  created_at: string;
}

export const useMessageSearch = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchMessages = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setResults([]);
        return;
      }

      // Search messages with conversation info
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`
          id,
          content,
          role,
          conversation_id,
          created_at,
          conversations!inner(title)
        `)
        .eq("user_id", session.user.id)
        .ilike("content", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Search error:", error);
        setResults([]);
        return;
      }

      const searchResults: SearchResult[] = (data || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        conversation_id: msg.conversation_id,
        conversation_title: msg.conversations?.title || "Sohbet",
        created_at: msg.created_at,
      }));

      setResults(searchResults);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    isSearching,
    searchMessages,
    clearSearch,
  };
};
