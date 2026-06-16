import { useState } from 'react';
import { Hexagon } from 'lucide-react';
import './AmirTemurSection.css';
import temurBg from '@/assets/design/temur-bg.webp';
import temurBook1 from '@/assets/design/temur-book1.webp';
import temurBook2 from '@/assets/design/temur-book2.webp';
import temurBook3 from '@/assets/design/temur-book3.webp';

// ── Configuration ─────────────────────────────────────────────────────────────
const CONFIG = {
    // To use a custom background picture with a blur effect, set this to true
    // and enter your image URL below (e.g., "/images/samarqand-war.jpg")
    useImageBackground: true,
    backgroundImageUrl: temurBg,

    // 🎛️ CONTROLS: Tweak these values to test what works best!
    imageBlurPx: 1,                      // How blurry the background picture is (default: 12)
    imageOpacity: 5.8,                   // How bright/visible the picture is (0.0 to 1.0)
    overlayColor: "rgba(10, 15, 30, 0.5)",              // e.g "rgba(10, 15, 30, 0.5)" (or "initial" to use CSS defaults)
}

const BOOKS = [
    {
        id: 1,
        name: "Yildirim Boyazid",
        cyrillic: "YILDIRIM BOYAZID",
        dotColor: "#4a9a4a",
        gradStart: "#2e6030",
        gradEnd: "#0f2210",
        bandColor: "#1e5020",
        roman: "I",
        width: 200,
        height: 300,
        coverUrl: temurBook1,
    },
    {
        id: 2,
        name: "Safar Gulxanlari",
        cyrillic: "SAFAR GULXANLARI",
        dotColor: "#b84040",
        gradStart: "#7a2828",
        gradEnd: "#2a0c0c",
        bandColor: "#641414",
        roman: "II",
        width: 214,
        height: 321,
        coverUrl: temurBook2,
    },
    {
        id: 3,
        name: "Amir Temur",
        cyrillic: "AMIR TEMUR",
        dotColor: "#4878c8",
        gradStart: "#1e4888",
        gradEnd: "#071830",
        bandColor: "#143478",
        roman: "III",
        width: 200,
        height: 300,
        coverUrl: temurBook3,
    }
];

const AmirTemurSection = () => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const getBookState = (index: number) => {
        if (hoveredIndex === null) return "default";
        return hoveredIndex === index ? "hovered" : "dimmed";
    };

    return (
        <section className="at-section">
            {CONFIG.useImageBackground && CONFIG.backgroundImageUrl ? (
                <>
                    <div
                        className="at-bg-image-layer"
                        style={{
                            backgroundImage: `url(${CONFIG.backgroundImageUrl})`,
                            filter: `blur(${CONFIG.imageBlurPx}px)`,
                            opacity: CONFIG.imageOpacity
                        }}
                    />
                    <div
                        className="at-bg-image-overlay"
                        style={CONFIG.overlayColor !== "initial" ? { backgroundColor: CONFIG.overlayColor } : {}}
                    />
                </>
            ) : (
                <div className="at-bg-layer" />
            )}
            <div className="at-noise-overlay" />
            <div className="at-grid-overlay" />

            <div className="at-content-wrapper">
                {/* LEFT COLUMN */}
                <div className="at-left-col">
                    <div className="at-eyebrow">
                        <div className="at-eyebrow-line" />
                        <span className="at-eyebrow-text">KITOB SERIYASI</span>
                    </div>

                    <h2 className="at-title-1">AMIR</h2>
                    <h2 className="at-title-1">TEMUR</h2>

                    <div className="at-subtitle">Samarqand osmonidagi yulduzlar</div>

                    <div className="at-gold-divider" />

                    <p className="at-desc">
                        Amir Temur hayoti va uning harbiy yurishlari haqida mukammal tarixiy asarlar to'plami. Buyuk sarkarda va uning davlat boshqaruvi sirlari bilan tanishing.
                    </p>

                    <div className="at-list">
                        {BOOKS.map((book, idx) => (
                            <div
                                key={book.id}
                                className="at-list-item"
                                data-active={hoveredIndex === idx}
                                onMouseEnter={() => setHoveredIndex(idx)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <div className="at-list-roman">{book.roman}</div>
                                <div className="at-list-dot" style={{ backgroundColor: book.dotColor }} />
                                <div className="at-list-text">{book.name}</div>
                            </div>
                        ))}
                    </div>

                    <div className="at-actions">
                        <button className="at-btn-primary">Buyurtma qilish</button>
                        <button className="at-btn-secondary">Seriyani ko'rish &rarr;</button>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="at-right-col">
                    <div className="at-badge-container">
                        <div className="at-badge-gold">Yangi nashr</div>
                        <div className="at-badge-faint">3 ta kitob mavjud</div>
                    </div>

                    <div className="at-shelf">
                        {BOOKS.map((book, idx) => (
                            <div
                                key={book.id}
                                className="at-book-wrapper"
                                data-state={getBookState(idx)}
                                onMouseEnter={() => setHoveredIndex(idx)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                style={{ zIndex: hoveredIndex === idx ? 10 : 5 - Math.abs(1 - idx) }}
                            >
                                <div
                                    className="at-book"
                                    style={{
                                        width: `${book.width}px`,
                                        height: `${book.height}px`,
                                        background: `linear-gradient(to bottom, ${book.gradStart}, ${book.gradEnd})`
                                    }}
                                >
                                    {book.coverUrl ? (
                                        <img src={book.coverUrl} alt={book.name} className="at-book-cover-img-real" />
                                    ) : (
                                        <div className="at-book-content">
                                            <div className="at-book-top">
                                                <div className="at-book-author">Sergey Borodin</div>
                                            </div>

                                            <div className="at-book-center">
                                                <Hexagon className="at-book-icon" color="white" strokeWidth={1} />
                                            </div>

                                            <div className="at-book-band" style={{ backgroundColor: book.bandColor }}>
                                                <div className="at-book-series-name">Amir Temur</div>
                                                <div className="at-book-title">{book.cyrillic}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Roman numeral floats above either image or CSS gradient */}
                                    <div className="at-book-roman">{book.roman}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Shelf Footer */}
                    <div className="at-shelf-footer">
                        {/* Badge: desktop only — hidden on mobile via CSS */}
                        <div className="at-shelf-footer-badge">
                            <div className="at-badge-gold">Yangi nashr</div>
                            <div className="at-badge-faint">3 ta kitob mavjud</div>
                        </div>
                        <div className="at-shelf-line" />
                        <div className="at-shelf-meta">
                            <span>Muallif: Sergey Borodin</span>
                            <span>Booktopia nashriyoti &middot; 2024</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AmirTemurSection;
