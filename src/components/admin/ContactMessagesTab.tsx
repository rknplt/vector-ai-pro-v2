import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, MessageSquare, Clock, CheckCircle, Reply, Eye, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  user_id: string | null;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  replied_by: string | null;
  created_at: string;
}

const ContactMessagesTab = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && !error) setMessages(data as unknown as ContactMessage[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setReplying(true);

    const { error } = await supabase
      .from("contact_messages")
      .update({
        admin_reply: replyText,
        status: "replied",
        replied_at: new Date().toISOString(),
      } as never)
      .eq("id", selectedMessage.id);

    if (error) {
      toast({ title: "Hata", description: "Yanıt gönderilemedi.", variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Yanıt kaydedildi." });
      setSelectedMessage(null);
      setReplyText("");
      fetchMessages();
    }
    setReplying(false);
  };

  const handleMarkRead = async (id: string) => {
    await supabase
      .from("contact_messages")
      .update({ status: "read" } as never)
      .eq("id", id);
    fetchMessages();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("contact_messages").delete().eq("id", id);
    toast({ title: "Silindi", description: "Mesaj silindi." });
    fetchMessages();
  };

  const filtered = messages.filter((m) => {
    const matchSearch =
      !searchTerm ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  const statusBadge = (status: string) => {
    switch (status) {
      case "unread":
        return <Badge variant="destructive">Okunmadı</Badge>;
      case "read":
        return <Badge variant="secondary">Okundu</Badge>;
      case "replied":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Yanıtlandı</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="glass-card border-border/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Gelen Mesajlar
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">{unreadCount} yeni</Badge>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchMessages}>
            Yenile
          </Button>
        </div>
        <div className="flex gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="İsim, e-posta veya konu ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">Tümü</option>
            <option value="unread">Okunmadı</option>
            <option value="read">Okundu</option>
            <option value="replied">Yanıtlandı</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Henüz mesaj yok</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Durum</TableHead>
                <TableHead>İsim</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Konu</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((msg) => (
                <TableRow
                  key={msg.id}
                  className={msg.status === "unread" ? "bg-primary/5" : ""}
                >
                  <TableCell>{statusBadge(msg.status)}</TableCell>
                  <TableCell className="font-medium">{msg.name}</TableCell>
                  <TableCell className="text-muted-foreground">{msg.email}</TableCell>
                  <TableCell>{msg.subject}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(msg.created_at), "dd MMM yyyy HH:mm", { locale: tr })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMessage(msg);
                          setReplyText(msg.admin_reply || "");
                          if (msg.status === "unread") handleMarkRead(msg.id);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(msg.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Mesaj Detayı
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Gönderen:</span>
                  <p className="font-medium">{selectedMessage.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">E-posta:</span>
                  <p className="font-medium">{selectedMessage.email}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Konu:</span>
                  <p className="font-medium">{selectedMessage.subject}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(selectedMessage.created_at), "dd MMMM yyyy HH:mm", { locale: tr })}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              {selectedMessage.admin_reply && selectedMessage.status === "replied" && (
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Yanıtınız</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{selectedMessage.admin_reply}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Reply className="w-4 h-4" />
                  {selectedMessage.status === "replied" ? "Yanıtı Düzenle" : "Yanıt Yaz"}
                </label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Yanıtınızı buraya yazın..."
                  rows={4}
                />
                <Button onClick={handleReply} disabled={replying || !replyText.trim()} className="w-full">
                  <Reply className="w-4 h-4 mr-2" />
                  {replying ? "Gönderiliyor..." : "Yanıtla"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ContactMessagesTab;
