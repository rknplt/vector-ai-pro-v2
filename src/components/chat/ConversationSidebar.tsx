import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  FileText,
  Download,
  FileJson,
  Database,
} from "lucide-react";
import { format } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/hooks/useConversations";
import { useMessageSearch, SearchResult } from "@/hooks/useMessageSearch";
import { useExportChat } from "@/hooks/useExportChat";
import { useLanguage } from "@/contexts/LanguageContext";
import KnowledgeBaseManager from "@/components/chat/KnowledgeBaseManager";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  isLoading?: boolean;
}

const ConversationSidebar = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onUpdateTitle,
  isLoading,
}: ConversationSidebarProps) => {
  const { t, language } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const {
    results: messageResults,
    isSearching,
    searchMessages,
    clearSearch,
  } = useMessageSearch();
  const { exportAsJSON, exportAsText } = useExportChat();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      searchMessages(debouncedQuery);
    } else {
      clearSearch();
    }
  }, [debouncedQuery, searchMessages, clearSearch]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) =>
      conv.title.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const handleStartEdit = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim()) {
      onUpdateTitle(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleSelectResult = (result: SearchResult) => {
    onSelectConversation(result.conversation_id);
    setSearchQuery("");
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="rounded bg-primary/30 px-0.5 text-foreground">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const truncateContent = (content: string, maxLength = 80) => {
    if (content.length <= maxLength) return content;
    return `${content.substring(0, maxLength)}...`;
  };

  const showMessageResults =
    debouncedQuery.trim().length >= 2 &&
    (messageResults.length > 0 || isSearching);

  if (isCollapsed) {
    return (
      <div className="flex w-12 flex-col items-center gap-2 border-r border-border/30 bg-secondary/30 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="mb-2"
          title={t("sidebar.expand") || "Expand Sidebar"}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCreateConversation}
          title={t("sidebar.newChat")}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        {conversations.slice(0, 5).map((conv) => (
          <Button
            key={conv.id}
            variant={activeConversationId === conv.id ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onSelectConversation(conv.id)}
            title={conv.title}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-border/30 bg-secondary/30">
      <div className="flex items-center justify-between border-b border-border/30 p-3">
        <h3 className="text-sm font-semibold">{t("sidebar.chats")}</h3>
        <div className="flex items-center gap-1">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={t("sidebar.knowledgeBase")}
              >
                <Database className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>{t("sidebar.knowledgeBase")}</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <KnowledgeBaseManager />
              </div>
            </SheetContent>
          </Sheet>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onCreateConversation}
            title={t("sidebar.newChat")}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsCollapsed(true)}
            title={t("sidebar.collapse") || "Collapse"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-b border-border/30 p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("sidebar.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
          {isSearching && (
            <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {showMessageResults && (
        <div className="border-b border-border/30">
          <div className="bg-muted/30 px-3 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("sidebar.messageResults")} ({messageResults.length})
            </span>
          </div>
          <ScrollArea className="max-h-48">
            <div className="space-y-0.5 p-1">
              {isSearching ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("sidebar.searching")}
                </div>
              ) : (
                messageResults.map((result) => (
                  <button
                    key={result.id}
                    className="w-full rounded-md p-2 text-left transition-colors hover:bg-secondary/50"
                    onClick={() => handleSelectResult(result)}
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-primary">
                          {result.conversation_title}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {highlightMatch(
                            truncateContent(result.content),
                            debouncedQuery
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              {t("sidebar.loading")}
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>{t("sidebar.noChats")}</p>
              <Button
                variant="link"
                size="sm"
                onClick={onCreateConversation}
                className="mt-2"
              >
                {t("sidebar.startNew")}
              </Button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Search className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>{t("sidebar.noResults")}</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group/conv relative mr-3 rounded-lg transition-colors",
                  activeConversationId === conversation.id
                    ? "bg-primary/10"
                    : "hover:bg-secondary/50"
                )}
              >
                {editingId === conversation.id ? (
                  <div className="flex items-center gap-1 p-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit();
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={handleSaveEdit}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-[minmax(0,1fr)_84px] items-center gap-1 p-2">
                    <button
                      className="flex min-w-0 items-start gap-2 text-left"
                      onClick={() => onSelectConversation(conversation.id)}
                    >
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate pr-1 text-sm font-medium">
                          {conversation.title === "Yeni Sohbet" ||
                          conversation.title === "New Chat"
                            ? t("sidebar.newChat")
                            : conversation.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(
                            new Date(conversation.updated_at),
                            "d MMM, HH:mm",
                            {
                              locale: language === "tr" ? tr : enUS,
                            }
                          )}
                        </p>
                      </div>
                    </button>

                    <div className="pointer-events-none z-10 flex w-[84px] items-center justify-end gap-0.5 rounded-md bg-secondary/90 px-1 py-0.5 opacity-0 transition-opacity group-hover/conv:pointer-events-auto group-hover/conv:opacity-100 group-focus-within/conv:pointer-events-auto group-focus-within/conv:opacity-100">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() =>
                              exportAsText(conversation.id, conversation.title)
                            }
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            {t("sidebar.textFile")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              exportAsJSON(conversation.id, conversation.title)
                            }
                          >
                            <FileJson className="mr-2 h-4 w-4" />
                            JSON (.json)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(conversation);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conversation.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationSidebar;
