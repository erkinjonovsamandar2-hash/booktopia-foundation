import { useState } from "react";
import { toast } from "sonner";
import { useData } from "@/context/DataContext";
import type { Partner, PartnerMapEntry, PartnerWebsiteEntry } from "@/context/DataContext";
import { Plus, Pencil, Trash2, X, ArrowUp, ArrowDown, Handshake } from "lucide-react";
import ImageCropper from "@/components/admin/ImageCropper";

// ── Shared field ──────────────────────────────────────────────────────────────
const Field = ({
    label, value, onChange, type = "text", placeholder, multiline = false,
}: {
    label: string; value: string; onChange: (v: string) => void;
    type?: string; placeholder?: string; multiline?: boolean;
}) => (
    <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">{label}</label>
        {multiline ? (
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none"
            />
        ) : (
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
            />
        )}
    </div>
);

// ── Empty form state ──────────────────────────────────────────────────────────
const emptyPartner: Omit<Partner, "id" | "created_at"> = {
    name: "",
    type: "Rasmiy hamkor",
    bio: null,
    location: null,
    branches: null,
    phone: null,
    website: null,
    websites: [],
    maps_url: null,
    maps_urls: [],
    image_url: null,
    accent_color: "#c8973a",
    sort_order: 0,
};

// ── Form state type ───────────────────────────────────────────────────────────
type FormState = {
    name: string;
    type: "Rasmiy hamkor" | "Onlayn hamkor";
    bio: string;
    location: string;
    branches: string;
    phone: string;
    website: string;
    websites: PartnerWebsiteEntry[];
    maps_url: string;
    maps_urls: PartnerMapEntry[];
    image_url: string | null;
    accent_color: string;
    sort_order: number;
};

function toFormState(p: Omit<Partner, "id" | "created_at">): FormState {
    return {
        name: p.name,
        type: p.type,
        bio: p.bio ?? "",
        location: p.location ?? "",
        branches: p.branches !== null ? String(p.branches) : "",
        phone: p.phone ?? "",
        website: p.website ?? "",
        websites: p.websites ?? [],
        maps_url: p.maps_url ?? "",
        maps_urls: p.maps_urls ?? [],
        image_url: p.image_url,
        accent_color: p.accent_color,
        sort_order: p.sort_order,
    };
}

function fromFormState(f: FormState): Omit<Partner, "id" | "created_at"> {
    return {
        name: f.name.trim(),
        type: f.type,
        bio: f.bio.trim() || null,
        location: f.location.trim() || null,
        branches: f.branches.trim() !== "" ? parseInt(f.branches, 10) : null,
        phone: f.phone.trim() || null,
        website: f.website.trim() || null,
        websites: f.websites.filter((e) => e.url.trim()),
        maps_url: f.maps_url.trim() || null,
        maps_urls: f.maps_urls.filter((e) => e.url.trim()),
        image_url: f.image_url || null,
        accent_color: f.accent_color || "#c8973a",
        sort_order: f.sort_order,
    };
}

const emptyForm: FormState = toFormState(emptyPartner);

export default function PartnerManager() {
    const { partners, partnersLoading, partnersTableReady, addPartner, updatePartner, deletePartner } = useData();
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);

    const nextSort = partners.length > 0
        ? Math.max(...partners.map((p) => p.sort_order)) + 1
        : 1;

    const openAdd = () => {
        setEditId(null);
        setForm({ ...emptyForm, sort_order: nextSort });
        setModalOpen(true);
    };

    const openEdit = (p: Partner) => {
        setEditId(p.id);
        setForm(toFormState(p));
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error("Do'kon nomi majburiy!");
            return;
        }
        setSaving(true);
        try {
            const data = fromFormState(form);
            if (editId) {
                await updatePartner(editId, data);
                toast.success("Hamkor yangilandi!");
            } else {
                await addPartner(data);
                toast.success("Hamkor qo'shildi!");
            }
            setModalOpen(false);
        } catch (err: any) {
            toast.error("Xatolik: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (p: Partner) => {
        if (!window.confirm(`"${p.name}" ni o'chirmoqchimisiz?`)) return;
        try {
            await deletePartner(p.id, p.image_url);
            toast.success("O'chirildi.");
        } catch (err: any) {
            toast.error("Xatolik: " + err.message);
        }
    };

    const handleMove = async (p: Partner, direction: "up" | "down") => {
        const idx = partners.findIndex((x) => x.id === p.id);
        if (direction === "up" && idx === 0) return;
        if (direction === "down" && idx === partners.length - 1) return;

        const arr = [...partners];
        const target = direction === "up" ? idx - 1 : idx + 1;
        [arr[idx], arr[target]] = [arr[target], arr[idx]];

        const promises = arr.map((item, i) => {
            const newOrder = i + 1;
            if (item.sort_order !== newOrder) return updatePartner(item.id, { sort_order: newOrder });
            return Promise.resolve();
        });
        toast.promise(Promise.all(promises), {
            loading: "Tartib o'zgartirilmoqda...",
            success: "Tartib saqlandi",
            error: (err: any) => `Xatolik: ${err.message}`,
        });
    };

    const set = (field: keyof FormState) => (v: string) =>
        setForm((f) => ({ ...f, [field]: v }));

    const handleSeedDefaults = async () => {
        if (!window.confirm("6 ta boshlang'ich hamkorni bazaga qo'shmoqchimisiz?")) return;
        setSeeding(true);
        const defaults: Omit<Partner, "id" | "created_at">[] = [
            { name: "Golden Books", type: "Rasmiy hamkor", bio: "Toshkentning eng yirik kitob tarmog'i. Bolalar va kattalar adabiyotining keng assortimenti.", location: "Toshkent shahri", branches: 12, phone: null, website: null, maps_url: null, maps_urls: [], websites: [], image_url: null, accent_color: "#c8973a", sort_order: 1 },
            { name: "Bookmark", type: "Rasmiy hamkor", bio: "Zamonaviy kitobsevarlar uchun maxsus tanlangan kolleksiya. Premium xizmat va atmosfera.", location: "Toshkent shahri", branches: 3, phone: null, website: null, websites: [], maps_url: null, maps_urls: [], image_url: null, accent_color: "#3a567a", sort_order: 2 },
            { name: "Kitob House", type: "Rasmiy hamkor", bio: "Bolalar va yoshlar adabiyotiga ixtisoslashgan do'kon tarmog'i. Sifatli kitob — yorqin kelajak.", location: "Toshkent, Chirchiq", branches: 5, phone: null, website: null, websites: [], maps_url: null, maps_urls: [], image_url: null, accent_color: "#1a6fba", sort_order: 3 },
            { name: "Plato Books", type: "Rasmiy hamkor", bio: "Falsafa, ilm-fan va badiiy adabiyot bo'yicha O'zbekistondagi eng yirik ixtisoslashgan do'kon.", location: "Toshkent shahri", branches: 2, phone: null, website: null, websites: [], maps_url: null, maps_urls: [], image_url: null, accent_color: "#4a9a4a", sort_order: 4 },
            { name: "Asaxiy", type: "Onlayn hamkor", bio: "O'zbekistonning eng yirik onlayn savdo platformasi. Kitoblarimiz butun mamlakat bo'ylab yetkazib beriladi.", location: "Online — butun O'zbekiston", branches: null, phone: null, website: "asaxiy.uz", websites: [], maps_url: null, maps_urls: [], image_url: null, accent_color: "#c8973a", sort_order: 5 },
            { name: "Qamar", type: "Rasmiy hamkor", bio: "Adabiy va badiiy kitoblarga ixtisoslashgan premium do'kon. Kitobsevarlar uchun maxsus muhit.", location: "Toshkent shahri", branches: 1, phone: null, website: null, websites: [], maps_url: null, maps_urls: [], image_url: null, accent_color: "#8a3a8a", sort_order: 6 },
        ];
        try {
            for (const p of defaults) await addPartner(p);
            toast.success("6 ta hamkor qo'shildi!");
        } catch (err: any) {
            toast.error("Xatolik: " + err.message);
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Handshake className="h-5 w-5 text-amber-500" />
                        Hamkorlar
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Hamkorlar sahifasida ko'rinadigan do'konlar
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {partnersTableReady && partners.length === 0 && (
                        <button
                            onClick={handleSeedDefaults}
                            disabled={seeding}
                            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
                        >
                            {seeding ? "Yuklanmoqda..." : "⬇ Boshlang'ich ma'lumotlar"}
                        </button>
                    )}
                    <button
                        onClick={openAdd}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="h-4 w-4" /> Yangi hamkor
                    </button>
                </div>
            </div>

            {/* SQL reminder — only when table genuinely missing */}
            {!partnersLoading && !partnersTableReady && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800 mb-1">Jadval yaratilmagan</p>
                    <p className="text-xs text-amber-700 mb-2">
                        Supabase SQL Editorida quyidagi migratsiyani ishga tushiring:
                    </p>
                    <pre className="text-[11px] bg-white border border-amber-200 rounded-lg p-3 overflow-x-auto text-amber-900 leading-relaxed whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS partners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'Rasmiy hamkor',
  bio text,
  location text,
  branches integer,
  phone text,
  website text,
  maps_url text,
  image_url text,
  accent_color text DEFAULT '#c8973a',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON partners FOR SELECT USING (true);
CREATE POLICY "Admin write" ON partners FOR ALL USING (auth.role() = 'authenticated');`}
                    </pre>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-foreground/70">Rasm</th>
                                <th className="text-left px-4 py-3 font-semibold text-foreground/70">Do'kon nomi</th>
                                <th className="text-left px-4 py-3 font-semibold text-foreground/70 hidden sm:table-cell">Turi</th>
                                <th className="text-left px-4 py-3 font-semibold text-foreground/70 hidden md:table-cell">Manzil</th>
                                <th className="text-left px-4 py-3 font-semibold text-foreground/70 hidden md:table-cell">Filiallar</th>
                                <th className="text-right px-4 py-3 font-semibold text-foreground/70">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {partners.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">
                                        Hozircha hamkor yo'q. Yangi hamkor qo'shing.
                                    </td>
                                </tr>
                            )}
                            {partners.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        {p.image_url ? (
                                            <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-lg object-cover border border-gray-200" />
                                        ) : (
                                            <div
                                                className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold font-heading"
                                                style={{ backgroundColor: p.accent_color + "33", border: `1px solid ${p.accent_color}44`, color: p.accent_color }}
                                            >
                                                {p.name.charAt(0)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-foreground">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: p.accent_color }}
                                            />
                                            {p.name}
                                        </div>
                                        <span className="text-xs text-muted-foreground/80 sm:hidden">{p.type}</span>
                                    </td>
                                    <td className="px-4 py-3 text-foreground/70 hidden sm:table-cell">
                                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.type === "Rasmiy hamkor" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                                            {p.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-foreground/60 text-xs hidden md:table-cell truncate max-w-[140px]">
                                        {p.location ?? "—"}
                                    </td>
                                    <td className="px-4 py-3 text-foreground/60 text-xs hidden md:table-cell">
                                        {p.branches !== null ? `${p.branches} ta` : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="inline-flex items-center gap-1">
                                            <button
                                                onClick={() => handleMove(p, "up")}
                                                disabled={partners.findIndex((x) => x.id === p.id) === 0}
                                                className="p-1.5 rounded-lg text-muted-foreground/80 hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-30"
                                                title="Yuqoriga"
                                            >
                                                <ArrowUp className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleMove(p, "down")}
                                                disabled={partners.findIndex((x) => x.id === p.id) === partners.length - 1}
                                                className="p-1.5 rounded-lg text-muted-foreground/80 hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-30"
                                                title="Pastga"
                                            >
                                                <ArrowDown className="h-4 w-4" />
                                            </button>
                                            <span className="w-px h-4 bg-gray-200 mx-1" />
                                            <button
                                                onClick={() => openEdit(p)}
                                                className="p-1.5 rounded-lg text-muted-foreground/80 hover:text-primary hover:bg-primary/5 transition-colors"
                                                title="Tahrirlash"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p)}
                                                className="p-1.5 rounded-lg text-muted-foreground/80 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                title="O'chirish"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── MODAL ─────────────────────────────────────────────────────────── */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-foreground">
                                {editId ? "Hamkorni tahrirlash" : "Yangi hamkor"}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                                <X className="h-5 w-5 text-muted-foreground/80" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Photo upload */}
                            <ImageCropper
                                currentUrl={form.image_url ?? ""}
                                onImageSaved={(url) => setForm((f) => ({ ...f, image_url: url || null }))}
                                aspectRatio={1}
                                label="Do'kon rasmi (1:1)"
                                bucket="books"
                            />

                            <Field label="Do'kon nomi *" value={form.name} onChange={set("name")} placeholder="Golden Books" />

                            {/* Type selector */}
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Hamkor turi</label>
                                <select
                                    value={form.type}
                                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "Rasmiy hamkor" | "Onlayn hamkor" }))}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                                >
                                    <option value="Rasmiy hamkor">Rasmiy hamkor</option>
                                    <option value="Onlayn hamkor">Onlayn hamkor</option>
                                </select>
                            </div>

                            <Field label="Tavsif" value={form.bio} onChange={set("bio")} placeholder="Do'kon haqida qisqacha..." multiline />
                            <Field label="Manzil" value={form.location} onChange={set("location")} placeholder="Toshkent shahri" />
                            {/* Multiple map links */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-foreground/80">Xarita havolalari</label>
                                    <button
                                        type="button"
                                        onClick={() => setForm((f) => ({ ...f, maps_urls: [...f.maps_urls, { label: "", url: "" }] }))}
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                                    >
                                        <Plus className="h-3 w-3" /> Filial qo'shish
                                    </button>
                                </div>
                                {form.maps_urls.length === 0 && (
                                    <p className="text-xs text-muted-foreground/60 mb-1">Hali havola qo'shilmagan.</p>
                                )}
                                {form.maps_urls.map((entry, i) => (
                                    <div key={i} className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={entry.label}
                                            onChange={(e) => setForm((f) => {
                                                const updated = [...f.maps_urls];
                                                updated[i] = { ...updated[i], label: e.target.value };
                                                return { ...f, maps_urls: updated };
                                            })}
                                            placeholder="Filial 1"
                                            className="w-1/3 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={entry.url}
                                            onChange={(e) => setForm((f) => {
                                                const updated = [...f.maps_urls];
                                                updated[i] = { ...updated[i], url: e.target.value };
                                                return { ...f, maps_urls: updated };
                                            })}
                                            placeholder="https://maps.google.com/..."
                                            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setForm((f) => ({ ...f, maps_urls: f.maps_urls.filter((_, j) => j !== i) }))}
                                            className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                <p className="text-xs text-muted-foreground/60">Har bir filial uchun nom va Google Maps havola.</p>
                            </div>
                            <Field label="Filiallar soni" value={form.branches} onChange={set("branches")} type="number" placeholder="12" />
                            <Field label="Telefon" value={form.phone} onChange={set("phone")} placeholder="+998 90 000 00 00" />
                            {/* Multiple websites / social links */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-foreground/80">Veb-sayt / Ijtimoiy tarmoqlar</label>
                                    <button
                                        type="button"
                                        onClick={() => setForm((f) => ({ ...f, websites: [...f.websites, { label: "", url: "" }] }))}
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                                    >
                                        <Plus className="h-3 w-3" /> Qo'shish
                                    </button>
                                </div>
                                {form.websites.length === 0 && (
                                    <p className="text-xs text-muted-foreground/60 mb-1">Hali havola qo'shilmagan.</p>
                                )}
                                {form.websites.map((entry, i) => (
                                    <div key={i} className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={entry.label}
                                            onChange={(e) => setForm((f) => {
                                                const updated = [...f.websites];
                                                updated[i] = { ...updated[i], label: e.target.value };
                                                return { ...f, websites: updated };
                                            })}
                                            placeholder="Instagram"
                                            className="w-1/3 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={entry.url}
                                            onChange={(e) => setForm((f) => {
                                                const updated = [...f.websites];
                                                updated[i] = { ...updated[i], url: e.target.value };
                                                return { ...f, websites: updated };
                                            })}
                                            placeholder="https://instagram.com/..."
                                            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setForm((f) => ({ ...f, websites: f.websites.filter((_, j) => j !== i) }))}
                                            className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                <p className="text-xs text-muted-foreground/60">Har bir havola uchun nom (Instagram, Telegram...) va URL.</p>
                            </div>

                            {/* Accent color */}
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Brand rangi</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={form.accent_color}
                                        onChange={(e) => setForm((f) => ({ ...f, accent_color: e.target.value }))}
                                        className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                                    />
                                    <input
                                        type="text"
                                        value={form.accent_color}
                                        onChange={(e) => setForm((f) => ({ ...f, accent_color: e.target.value }))}
                                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                                        placeholder="#c8973a"
                                    />
                                </div>
                            </div>

                            {/* Sort order */}
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Tartib raqami</label>
                                <input
                                    type="number"
                                    value={form.sort_order}
                                    onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg transition-colors"
                            >
                                {saving ? "Saqlanmoqda..." : "Saqlash"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
