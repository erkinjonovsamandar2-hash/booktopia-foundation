import { useState } from "react";
import { Megaphone, Send, AlertCircle, Loader2 } from "lucide-react";

const BotBroadcast = () => {
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("buyers");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success: number, fail: number, total: number} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBroadcast = async () => {
    if (!message.trim()) {
      setError("Xabar matnini kiriting!");
      return;
    }

    if (!confirm("Haqiqatan ham barcha tanlangan mijozlarga xabar yubormoqchimisiz?")) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include', // Send session cookies for auth
        body: JSON.stringify({ message, target })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Noma'lum xatolik yuz berdi");
      }

      setResult({
        success: data.successCount,
        fail: data.failCount,
        total: data.total
      });
      setMessage(""); // clear input on success

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Xabar yuborishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ommaviy Xabarnoma</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Botdan foydalangan barcha mijozlarga yangiliklar, chegirmalar va aksiyalar haqida xabar yuborish
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-5">
            
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">Xabar jo'natish auditoriyasi</label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${target === 'buyers' ? 'border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary/20' : 'border-gray-200 text-muted-foreground hover:bg-gray-50'}`}>
                  <input 
                    type="radio" 
                    name="target" 
                    value="buyers" 
                    checked={target === 'buyers'} 
                    onChange={() => setTarget('buyers')}
                    className="sr-only" 
                  />
                  Xarid qilgan mijozlar
                </label>
                <label className={`flex-1 flex items-center justify-center p-3 border rounded-lg cursor-not-allowed opacity-60 bg-gray-50 border-gray-200 text-muted-foreground`}>
                  <input type="radio" name="target" value="all" disabled className="sr-only" />
                  Barcha /start bosganlar (Tez orada)
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-sm font-semibold text-foreground">Xabar matni (HTML format qo'llab-quvvatlanadi)</label>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Masalan: 📣 Diqqat, yangi chegirmalar boshlandi!..."
                className="w-full h-48 p-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
              ></textarea>
              <p className="text-xs text-muted-foreground">
                Formatlash: <b>&lt;b&gt;Qalin&lt;/b&gt;</b>, <i>&lt;i&gt;Qiya&lt;/i&gt;</i>, yoki <a href="#" className="underline">&lt;a href="url"&gt;Havola&lt;/a&gt;</a>
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-green-50 text-green-700 text-sm p-4 rounded-lg border border-green-100 space-y-1">
                <p className="font-bold text-green-800">✅ Xabarnoma yakunlandi!</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1 mt-2">
                  <li>Umumiy mijozlar: <b>{result.total}</b> ta</li>
                  <li>Muvaffaqiyatli yuborildi: <b>{result.success}</b> ta</li>
                  {result.fail > 0 && <li className="text-red-600">Yuborilmadi (bloklaganlar): <b>{result.fail}</b> ta</li>}
                </ul>
              </div>
            )}

            <button
              onClick={handleBroadcast}
              disabled={loading || !message.trim()}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3.5 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Yuborilmoqda...</>
              ) : (
                <><Send className="h-5 w-5" /> Barchaga yuborish</>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-blue-900">Eslatma</h3>
            </div>
            <ul className="space-y-2 text-sm text-blue-800/80 list-disc list-inside">
              <li>Xabar faqat Telegram orqali ro'yxatdan o'tgan mijozlarga yuboriladi.</li>
              <li>Spam bo'lmasligi uchun xabarlar orasida 50ms pauza qilinadi. Katta bazalar uchun biroz vaqt talab qilinishi mumkin.</li>
              <li>Mijoz botni bloklagan bo'lsa, xabar yetib bormaydi.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BotBroadcast;
