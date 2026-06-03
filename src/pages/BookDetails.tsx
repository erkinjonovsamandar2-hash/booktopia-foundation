import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLang, locField } from "@/context/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import type { Book } from "@/context/DataContext";
import { useData } from "@/context/DataContext";
import { motion, useScroll, useSpring } from "framer-motion";
import BookCover from "@/components/BookCover";
import ExcerptReader from "@/components/ExcerptReader";
import { useCart } from "@/context/CartContext";


function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-gold origin-left z-50 shadow-[0_0_10px_rgba(213,173,54,0.4)]"
      style={{ scaleX }}
    />
  );
}

const BookDetails = () => {
  const { id: slugParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lang } = useLang();
  const { books, newBooks } = useData();
  const { addItem, items, openMiniCart } = useCart();

  if (!slugParam) return null;

  // Find book locally to prevent loading flash and enable smooth layout transition
  const cachedBook = books.find(b => b.slug === slugParam || b.id === slugParam) || 
                     (newBooks as any[]).find((b: any) => b.slug === slugParam || b.id === slugParam);

  // Extract UUID from slug param — the slug may be "title-words-{uuid}" or a bare UUID.
  // Passing a non-UUID string to a UUID column causes a Supabase 400 error.
  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuidMatch = slugParam.match(UUID_RE);
  const bookId = uuidMatch ? uuidMatch[0] : null;

  // Fetch book from Supabase (runs in background if we have cachedBook)
  const { data: book, isLoading, error } = useQuery<Book>({
    queryKey: ["book", slugParam],
    queryFn: async () => {
      // 1. Try books table by slug
      let { data } = await (supabase as any).from("books").select("*").eq("slug", slugParam).maybeSingle();
      
      // 2. Try books table by id (fallback for old links — only if param looks like/contains a UUID)
      if (!data && bookId) {
        const { data: idData } = await (supabase as any).from("books").select("*").eq("id", bookId).maybeSingle();
        data = idData;
      }

      // 3. Try new_books table by slug
      if (!data) {
        const { data: newData } = await (supabase as any).from("new_books").select("*").eq("slug", slugParam).maybeSingle();
        data = newData;
      }

      // 4. Try new_books table by id
      if (!data && bookId) {
        const { data: newIdData } = await (supabase as any).from("new_books").select("*").eq("id", bookId).maybeSingle();
        data = newIdData;
      }

      if (!data) throw new Error("Kitob topilmadi");
      return data as Book;
    },
    initialData: cachedBook ? (cachedBook as Book) : undefined,
    enabled: !!slugParam,
  });

  if (isLoading && !book) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="section-padding pt-32 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground font-medium">Yuklanmoqda...</p>
            </div>
          </div>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  if (error || !book) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="section-padding pt-32 flex flex-col items-center justify-center gap-6">
            <h1 className="text-3xl font-heading font-black tracking-tight font-bold text-foreground">Kitob topilmadi</h1>
            <p className="text-muted-foreground">Ushbu kitob mavjud emas yoki o'chirilgan.</p>
            <button
              onClick={() => navigate("/library")}
              className="btn-glass px-12 py-4"
            >
              Kutubxonaga qaytish
            </button>
          </div>
          <Footer />
        </div>
      </PageTransition>
    );
  }

  // Dynamic shadow based on theme_color from DB
  const dynamicShadow = book.bg_color
    ? `20px 20px 60px hsl(${book.bg_color} / 0.4), -10px -10px 40px hsl(${book.bg_color} / 0.2)`
    : "20px 20px 50px rgba(0,0,0,0.5)";

  const categoryLabels: Record<string, string> = {
    "jahon": "Jahon adabiyoti durdonalari",
    "ilmiy": "Ilmiy-ommabop",
    "new": "Yangi nashrlar",
    "amir-temur": "Tarixiy",
    "erkin-millat": "Ijtimoiy-siyosiy",
    "bestseller": "Bestsellerlar"
  };
  const categoryDisplay = categoryLabels[book.category] || book.category || "Nashr";

  return (
    <PageTransition>
      <ScrollProgress />
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="section-padding pt-32 pb-16 bg-charcoal relative">
          <div className="mx-auto max-w-7xl">

            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="relative z-10 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-500 ease-out mb-12 font-sans text-[11px] tracking-wider uppercase font-bold"
            >
              <span className="transform transition-transform group-hover:-translate-x-1">&larr;</span> Kutubxonaga qaytish
            </button>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-12 lg:gap-20 items-start">

              {/* Left: Book Cover Showcase */}
              <motion.div
                layoutId={`book-cover-${book.id}`}
                className="w-[75vw] max-w-[280px] sm:max-w-[320px] lg:max-w-[380px] mx-auto md:mx-0 md:ml-auto flex justify-center md:justify-end"
              >
                <BookCover
                  src={book.cover_url}
                  alt={locField(book, "title", lang)}
                  className="w-full"
                  hover={false}
                  loading="eager"
                />
              </motion.div>

              {/* Right: Metadata & Actions */}
              <div className="flex flex-col pt-4">
                <h1 className="font-heading font-bold text-4xl md:text-5xl lg:text-8xl leading-[1.05] tracking-tight text-foreground mb-6 drop-shadow-md">
                  {locField(book, "title", lang)}
                </h1>
                <p className="font-sans text-[11px] sm:text-[13px] font-bold tracking-[0.3em] uppercase text-gold mb-10">
                  {locField(book, "author", lang)}
                </p>

                <div className="font-serif text-lg md:text-xl leading-loose text-muted-foreground mb-12 border-l-2 border-gold/30 pl-8">
                  {locField(book, "description", lang) ||
                    "Ushbu kitob haqida to'liq ma'lumot tez orada qo'shiladi. Booktopia kutubxonasini kuzatib boring."}
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-12 py-8 border-y border-border/50">
                  <div>
                    <p className="font-sans text-[10px] tracking-wider uppercase font-bold text-muted-foreground mb-2">
                      Muqova
                    </p>
                    <p className="font-serif text-lg text-foreground">Qattiq</p>
                  </div>
                  <div>
                    <p className="font-sans text-[10px] tracking-wider uppercase font-bold text-muted-foreground mb-2">
                      Kategoriya
                    </p>
                    <p className="font-serif text-lg text-foreground capitalize">
                      {categoryDisplay}
                    </p>
                  </div>
                  <div>
                    <p className="font-sans text-[10px] tracking-wider uppercase font-bold text-muted-foreground mb-2">
                      Narx
                    </p>
                    <p className="font-heading font-bold text-2xl text-gold">
                      {book.price ? `${book.price} so'm` : "Tez kunda"}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 mt-auto w-full">
                  {(() => {
                    const inCart = book ? items.find((i) => i.id === book.id) : null;
                    return (
                      <button
                        id="book-add-to-cart-btn"
                        className={`btn-add-to-cart px-10 py-4 sm:px-12 sm:py-5 w-full sm:w-auto justify-center${inCart ? " in-cart" : ""}`}
                        onClick={() => {
                          if (inCart) {
                            openMiniCart();
                          } else {
                            addItem(book!);
                          }
                        }}
                      >
                        {inCart ? (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              aria-hidden="true">
                              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                            Savatchada {inCart.qty} ta — ko'rish
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              aria-hidden="true">
                              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                            Savatchaga qo'shish
                          </>
                        )}
                      </button>
                    );
                  })()}
                  <ExcerptReader book={book} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default BookDetails;