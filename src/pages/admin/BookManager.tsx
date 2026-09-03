import { useState } from "react";
import { toast } from "sonner";
import { useData } from "@/context/DataContext";
import type { Book } from "@/context/DataContext";
import { Plus, Pencil, Trash2, X, BookOpen } from "lucide-react";
import ImageCropper from "@/components/admin/ImageCropper";
import PdfUploader from "@/components/admin/PdfUploader";
import { GENRE_KEYS, LIBRARY_FILTER_MAP } from "@/lib/constants";

const getImageUrl = (url: string | null | undefined): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/storage/v1/object/public/${url}`;
};

const bgColorOptions = [
  { label: "Ko'k (qorong'u)", value: "210 60% 15%" },
  { label: "Yashil (qorong'u)", value: "120 40% 12%" },
  { label: "Qizil (qorong'u)", value: "0 30% 14%" },
  { label: "Sariq (qorong'u)", value: "35 50% 13%" },
  { label: "Binafsha", value: "270 40% 14%" },
  { label: "Zangori", value: "180 30% 12%" },
  { label: "Ko'k (o'rta)", value: "200 40% 14%" },
  { label: "Yashil (to'q)", value: "150 30% 10%" },
  { label: "Moviy (to'q)", value: "220 50% 12%" },
  { label: "Jigarrang", value: "45 30% 12%" },
];

// category defaults to a genre. It used to default to "new", which quietly
// filed every new book under a lifecycle value instead of a genre.
const emptyBook: Omit<Book, "id" | "created_at" | "updated_at"> = {
  title: "",
  slug: "",
  title_en: null,
  title_ru: null,
  author: "",
  author_en: null,
  author_ru: null,
  description: null,
  description_en: null,
  description_ru: null,
  cover_url: null,
  bg_color: "210 60% 15%",
  category: "jahon",
  price: null,
  enable_3d_flip: false,
  is_new: false,
  coming_soon: false,
  featured: false,
  sort_order: 0,
  img_focus_x: 50,
  img_focus_y: 20,
  excerpt_url: null,
};

const BookManager = () => {
  const { books, addBook, updateBook, deleteBook } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Book, "id" | "created_at" | "updated_at">>(emptyBook);
  const [saving, setSaving] = useState(false);

  const nextSortOrder = books.length > 0
    ? Math.max(...books.map((b) => b.sort_order ?? 0)) + 1
    : 1;

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyBook, sort_order: nextSortOrder });
    setModalOpen(true);
  };

  const openEdit = (book: Book) => {
    setEditId(book.id);
    // Omit read-only fields from the form
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = book;
    setForm(rest);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) await updateBook(editId, form);
      else await addBook(form);
      setModalOpen(false);
      toast.success(editId ? "Kitob yangilandi!" : "Kitob qo'shildi!");
    } catch (err: any) {
      alert("Saqlashda xatolik yuz berdi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Kitoblar</h1>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Yangi kitob
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-foreground/70">Muqova</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground/70">Nomi</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground/70 hidden sm:table-cell">Muallif</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground/70 hidden md:table-cell">Kategoriya</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground/70 hidden lg:table-cell">Holat</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground/70">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {books.map((book) => (
                <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    {book.cover_url ? (
                      <img
                        src={getImageUrl(book.cover_url)}
                        alt={book.title}
                        className="h-12 w-8 rounded object-cover"
                      />
                    ) : (
                      <div
                        className="h-12 w-8 rounded flex items-center justify-center"
                        style={{ background: `hsl(${book.bg_color ?? "210 60% 15%"})` }}
                      >
                        <BookOpen className="h-3 w-3 text-white/60" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    <span className="truncate max-w-[150px] block">{book.title}</span>
                    <span className="text-xs text-muted-foreground/80 sm:hidden">{book.author}</span>
                  </td>
                  <td className="px-4 py-3 text-foreground/70 hidden sm:table-cell">{book.author}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {/* Display the translated label for the raw DB key */}
                    <span className="inline-block rounded-full bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary/90">
                      {LIBRARY_FILTER_MAP[book.category as keyof typeof LIBRARY_FILTER_MAP] ?? book.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1.5 flex-wrap">
                      {book.featured && <span className="text-xs bg-primary/10 text-primary/90 rounded px-1.5 py-0.5">Hero</span>}
                      {book.enable_3d_flip && <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">3D</span>}
                      {book.excerpt_url && <span className="text-xs bg-green-100 text-green-700 rounded px-1.5 py-0.5">Parcha</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => openEdit(book)} className="p-1.5 rounded-lg text-muted-foreground/80 hover:text-primary hover:bg-primary/5 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm("Haqiqatan ham bu kitobni o'chirmoqchimisiz?")) {
                            try {
                              await deleteBook(book.id, book.cover_url);
                            } catch (err: any) {
                              alert("O'chirishda xatolik: " + err.message);
                            }
                          }
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground/80 hover:text-red-600 hover:bg-red-50 transition-colors"
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

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-foreground">
                {editId ? "Kitobni tahrirlash" : "Yangi kitob"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-muted-foreground/80" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <ImageCropper
                currentUrl={form.cover_url ?? ""}
                onImageSaved={(url) => setForm({ ...form, cover_url: url })}
                aspectRatio={2 / 3}
                label="Muqova rasmi (2:3)"
                bucket="books"
              />

              {/* ── Focal point sliders ── */}
              {form.cover_url && (
                <div className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50">
                  <p className="text-sm font-semibold text-foreground/80">Rasm markazlash nuqtasi</p>

                  {/* Live preview */}
                  <div
                    className="relative w-full rounded-lg overflow-hidden bg-gray-200"
                    style={{ aspectRatio: "16/9" }}
                  >
                    <img
                      src={getImageUrl(form.cover_url)}
                      alt="preview"
                      className="w-full h-full object-cover"
                      style={{
                        objectPosition: `${form.img_focus_x ?? 50}% ${form.img_focus_y ?? 20}%`,
                      }}
                    />
                    {/* crosshair dot */}
                    <div
                      className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md bg-amber-400/80 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        left: `${form.img_focus_x ?? 50}%`,
                        top: `${form.img_focus_y ?? 20}%`,
                      }}
                    />
                  </div>

                  {/* X slider */}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Gorizontal (X)</span>
                      <span className="font-mono">{form.img_focus_x ?? 50}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={form.img_focus_x ?? 50}
                      onChange={(e) => setForm({ ...form, img_focus_x: Number(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  {/* Y slider */}
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Vertikal (Y)</span>
                      <span className="font-mono">{form.img_focus_y ?? 20}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={form.img_focus_y ?? 20}
                      onChange={(e) => setForm({ ...form, img_focus_y: Number(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* ── PDF Excerpt Uploader ── */}
              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <PdfUploader
                  currentUrl={form.excerpt_url ?? null}
                  bookId={editId}
                  onPdfSaved={(url) => setForm({ ...form, excerpt_url: url })}
                />
              </div>

              <Field label="Nomi (UZ)" value={form.title ?? ""} onChange={(v) => setForm({ ...form, title: v })} />
              <Field label="Nomi (EN)" value={form.title_en ?? ""} onChange={(v) => setForm({ ...form, title_en: v || null })} />
              <Field label="Nomi (RU)" value={form.title_ru ?? ""} onChange={(v) => setForm({ ...form, title_ru: v || null })} />
              <Field label="Muallif (UZ)" value={form.author ?? ""} onChange={(v) => setForm({ ...form, author: v })} />
              <Field label="Muallif (EN)" value={form.author_en ?? ""} onChange={(v) => setForm({ ...form, author_en: v || null })} />
              <Field label="Muallif (RU)" value={form.author_ru ?? ""} onChange={(v) => setForm({ ...form, author_ru: v || null })} />
              <Field label="Tavsif" value={form.description ?? ""} onChange={(v) => setForm({ ...form, description: v || null })} textarea />

              {/* Category — value is always a raw DB key */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Kategoriya</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none bg-white"
                >
                  {GENRE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {LIBRARY_FILTER_MAP[key]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Background color */}
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Fon rangi</label>
                <select
                  value={form.bg_color ?? "210 60% 15%"}
                  onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none bg-white"
                >
                  {bgColorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Lifecycle. Separate from the genre above on purpose: a book can
                  be a new release AND world literature, and the old single
                  field forced a choice between the two. */}
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_new ?? false}
                    onChange={(e) => setForm({ ...form, is_new: e.target.checked })}
                    className="rounded border-gray-300 text-accent focus:ring-amber-200"
                  />
                  Yangi nashr
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.coming_soon ?? false}
                    onChange={(e) => setForm({ ...form, coming_soon: e.target.checked })}
                    className="rounded border-gray-300 text-accent focus:ring-amber-200"
                  />
                  Tez kunda
                </label>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.enable_3d_flip ?? false}
                    onChange={(e) => setForm({ ...form, enable_3d_flip: e.target.checked })}
                    className="rounded border-gray-300 text-accent focus:ring-amber-200"
                  />
                  3D Page-Flip
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured ?? false}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="rounded border-gray-300 text-accent focus:ring-amber-200"
                  />
                  Hero karuselda ko'rsatish
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-gray-100 rounded-lg transition-colors">
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
};

const Field = ({
  label, value, onChange, type = "text", textarea, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
  placeholder?: string;
}) => (
  <div>
    <label className="block text-sm font-medium text-foreground/80 mb-1">{label}</label>
    {textarea ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={placeholder}
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

export default BookManager;