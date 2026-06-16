"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";

import akbarImg from "../assets/team/akbar.webp";

// ─── Data ──────────────────────────────────────────────────────────────────────
const TEAM_MEMBERS = [
    { id: 1, name: "Akbar Toshtemirov", role: "Muharrir", image: akbarImg },
    { id: 2, name: "Jamoa A'zosi", role: "Musahhih", image: "https://pngimg.com/d/businessman_PNG6565.png" },
    { id: 3, name: "Jamoa A'zosi", role: "Badiiy muharrir", image: "https://pngimg.com/d/businessman_PNG6571.png" },
    { id: 4, name: "Jamoa A'zosi", role: "Muqova Dizayneri", image: "https://pngimg.com/d/businessman_PNG6576.png" },
    { id: 5, name: "Jamoa A'zosi", role: "Sahifalovchi", image: "https://pngimg.com/d/businessman_PNG6565.png" },
    { id: 6, name: "Jamoa A'zosi", role: "Tarjimon", image: "https://pngimg.com/d/businessman_PNG6571.png" },
];

const N = TEAM_MEMBERS.length;
const VISIBLE = 3;
const RENDERED = VISIBLE + 2;

const PCT_NEUTRAL = -(100 / RENDERED);
const PCT_FORWARD = -(200 / RENDERED);

const SLIDE_MS = 600;
const SLIDE_EASE = "cubic-bezier(0.77, 0, 0.175, 1)";
const AUTO_MS = 4500;

// ─── Per-role placeholder config ───────────────────────────────────────────────
const ROLE_PALETTE: Record<string, { bg: string; stripe: string; glyph: string }> = {
    "Musahhih":        { bg: "#0e0c09", stripe: "#c8973a10", glyph: "М" },
    "Badiiy muharrir": { bg: "#090d0f", stripe: "#4a9ab510", glyph: "Б" },
    "Muqova Dizayneri":{ bg: "#0d0909", stripe: "#b5724a10", glyph: "Д" },
    "Sahifalovchi":    { bg: "#090e0c", stripe: "#4ab58010", glyph: "С" },
    "Tarjimon":        { bg: "#0c0910", stripe: "#8b6ab510", glyph: "Т" },
};

const ROLE_ACCENT: Record<string, string> = {
    "Musahhih":        "hsl(45 66% 52%)",
    "Badiiy muharrir": "#4a9ab5",
    "Muqova Dizayneri":"#b5724a",
    "Sahifalovchi":    "#4ab580",
    "Tarjimon":        "#8b6ab5",
};

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function Team() {
    /* Desktop carousel state */
    const [leftIdx, setLeftIdx] = useState(0);
    const [live, setLive] = useState(false);
    const [pct, setPct] = useState(PCT_NEUTRAL);
    const busy = useRef<boolean>(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /* Mobile slideshow state */
    const [mobileIdx, setMobileIdx] = useState(0);
    const [mobileFade, setMobileFade] = useState(true);
    const mobileTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    const queue = useMemo(() => {
        const stagedLeft = (leftIdx - 1 + N) % N;
        return Array.from({ length: RENDERED }, (_, i) => TEAM_MEMBERS[(stagedLeft + i) % N]);
    }, [leftIdx]);

    // ── Desktop slide ──────────────────────────────────────────────────────────
    const slide = useCallback((dir: number) => {
        if (busy.current) return;
        busy.current = true;
        setLive(true);
        setPct(dir > 0 ? PCT_FORWARD : 0);
        setTimeout(() => {
            setLive(false);
            setLeftIdx((prev) => (prev + dir + N) % N);
            setPct(PCT_NEUTRAL);
            requestAnimationFrame(() => requestAnimationFrame(() => { busy.current = false; }));
        }, SLIDE_MS + 16);
    }, []);

    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => slide(1), AUTO_MS);
    }, [slide]);

    useEffect(() => { startTimer(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, [startTimer]);

    const handleArrow = (dir: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        slide(dir);
        timerRef.current = setInterval(() => slide(1), AUTO_MS);
    };

    // ── Mobile auto-slideshow (cross-fade) ────────────────────────────────────
    useEffect(() => {
        mobileTimer.current = setInterval(() => {
            setMobileFade(false);
            setTimeout(() => {
                setMobileIdx((i) => (i + 1) % N);
                setMobileFade(true);
            }, 350);
        }, AUTO_MS);
        return () => { if (mobileTimer.current) clearInterval(mobileTimer.current); };
    }, []);

    const trackStyle: CSSProperties = {
        width: `${(RENDERED / VISIBLE) * 100}%`,
        transform: `translateZ(0) translateX(${pct}%)`,
        transition: live ? `transform ${SLIDE_MS}ms ${SLIDE_EASE}` : "none",
        willChange: "transform",
        backfaceVisibility: "hidden",
    };

    return (
        <section
            id="team"
            className="relative w-full overflow-hidden py-24 md:py-32 bg-background border-t border-border/50"
        >
            {/* Subtle editorial grain */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.025] dark:opacity-[0.06]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    backgroundSize: "200px",
                }}
            />

            <div className="relative z-10 container mx-auto px-6 lg:px-16">

                {/* ── Editorial Headline ── */}
                <div className="mb-14 md:mb-20 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div>
                        {/* Issue-style label */}
                        <div className="flex items-center gap-3 mb-5">
                            <span className="block w-10 h-px bg-gold/50" />
                            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-gold/80">
                                Booktopia
                            </p>
                        </div>

                        <h2 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight text-foreground">
                            Bizning
                            <br />
                            <span className="italic font-normal text-foreground/50">Jamoa</span>
                        </h2>
                    </div>

                    {/* Right-side editorial descriptor */}
                    <div className="md:text-right md:max-w-[260px] border-l border-border/40 md:border-l-0 md:border-r border-border/40 pl-5 md:pl-0 md:pr-5 py-1">
                        <p className="font-serif text-sm italic text-foreground/50 leading-relaxed">
                            Sohaning eng ilg&apos;or<br />mutaxassislari bilan
                        </p>
                        <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-foreground/25 mt-3">
                            {new Date().getFullYear()} &mdash; Nashriyot guruhi
                        </p>
                    </div>
                </div>

                {/* Thin rule */}
                <div className="w-full h-px bg-gradient-to-r from-gold/20 via-border/60 to-transparent mb-10 md:mb-14" />

                {/* ── Mobile: single-card auto-slideshow (< md) ── */}
                <div className="md:hidden flex flex-col items-center gap-6">
                    <div
                        className="w-full max-w-[320px] transition-opacity duration-300"
                        style={{ opacity: mobileFade ? 1 : 0, height: "420px" }}
                    >
                        <Card member={TEAM_MEMBERS[mobileIdx]} />
                    </div>

                    {/* Controls */}
                    <div className="flex justify-center items-center gap-6 w-full px-4 mt-2">
                        <button
                            aria-label="Previous Team Member"
                            onClick={() => {
                                if (mobileTimer.current) clearInterval(mobileTimer.current);
                                setMobileFade(false);
                                setTimeout(() => { setMobileIdx((prev) => (prev - 1 + N) % N); setMobileFade(true); }, 350);
                            }}
                            className="w-8 h-8 flex items-center justify-center text-foreground/30 hover:text-gold transition-colors duration-200"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-5 h-5"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>

                        {/* Dot indicators */}
                        <div className="flex items-center gap-2">
                            {TEAM_MEMBERS.map((_, i) => (
                                <button
                                    key={i}
                                    aria-label={`Slide ${i + 1}`}
                                    onClick={() => {
                                        if (mobileTimer.current) clearInterval(mobileTimer.current);
                                        setMobileFade(false);
                                        setTimeout(() => { setMobileIdx(i); setMobileFade(true); }, 350);
                                        mobileTimer.current = setInterval(() => {
                                            setMobileFade(false);
                                            setTimeout(() => { setMobileIdx((idx) => (idx + 1) % N); setMobileFade(true); }, 350);
                                        }, AUTO_MS);
                                    }}
                                    style={{
                                        width: i === mobileIdx ? "24px" : "6px",
                                        height: "2px",
                                        background: i === mobileIdx
                                            ? "hsl(var(--gold))"
                                            : "rgba(255,255,255,0.12)",
                                        borderRadius: "1px",
                                        transition: "all 0.4s ease",
                                    }}
                                />
                            ))}
                        </div>

                        <button
                            aria-label="Next Team Member"
                            onClick={() => {
                                if (mobileTimer.current) clearInterval(mobileTimer.current);
                                setMobileFade(false);
                                setTimeout(() => { setMobileIdx((prev) => (prev + 1) % N); setMobileFade(true); }, 350);
                            }}
                            className="w-8 h-8 flex items-center justify-center text-foreground/30 hover:text-gold transition-colors duration-200"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-5 h-5"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                    </div>
                </div>

                {/* ── Desktop: 3-card carousel (md+) ── */}
                <div className="relative hidden md:block">

                    {/* Left arrow */}
                    <button
                        onClick={() => handleArrow(-1)}
                        aria-label="Previous"
                        className="group absolute left-0 top-1/2 -translate-y-1/2 -translate-x-10 z-20 w-9 h-9 flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 border border-border/40 hover:border-gold/40 bg-background/80 backdrop-blur-sm transition-all duration-300 rounded-none"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4 text-foreground/30 group-hover:text-gold transition-colors duration-300">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>

                    {/* Right arrow */}
                    <button
                        onClick={() => handleArrow(1)}
                        aria-label="Next"
                        className="group absolute right-0 top-1/2 -translate-y-1/2 translate-x-10 z-20 w-9 h-9 flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 border border-border/40 hover:border-gold/40 bg-background/80 backdrop-blur-sm transition-all duration-300 rounded-none"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4 text-foreground/30 group-hover:text-gold transition-colors duration-300">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>

                    {/* Sliding track */}
                    <div className="overflow-hidden p-6 -m-6">
                        <div
                            className="flex"
                            style={{ ...trackStyle, height: "clamp(320px, 48vw, 480px)" }}
                        >
                            {queue.map((member, i) => (
                                <div
                                    key={`${member.id}-${i}`}
                                    className="flex-shrink-0"
                                    style={{ width: `${100 / RENDERED}%`, padding: "0 8px" }}
                                >
                                    <Card member={member} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Editorial progress indicators */}
                    <div className="flex items-center gap-4 mt-10">
                        <div className="flex items-center gap-1.5">
                            {TEAM_MEMBERS.map((_, i) => {
                                const active = i === leftIdx;
                                return (
                                    <div
                                        key={i}
                                        className="h-[2px] transition-all duration-500"
                                        style={{
                                            width: active ? "32px" : "10px",
                                            background: active
                                                ? "hsl(var(--gold))"
                                                : "rgba(255,255,255,0.1)",
                                            borderRadius: "1px",
                                        }}
                                    />
                                );
                            })}
                        </div>
                        <span className="font-mono text-[10px] text-foreground/20 tracking-widest">
                            {String(leftIdx + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}
                        </span>
                    </div>
                </div>

            </div>
        </section>
    );
}

// ─── Card ──────────────────────────────────────────────────────────────────────
function Card({ member }: { member: (typeof TEAM_MEMBERS)[0] }) {
    const isFounder = member.id === 1;
    const palette = ROLE_PALETTE[member.role];
    const accent = ROLE_ACCENT[member.role] ?? "hsl(45 66% 52%)";

    if (isFounder) {
        return (
            <div className="group relative w-full h-full overflow-hidden" style={{ background: "#0a0806" }}>
                {/* Amber corner accent — top left */}
                <div
                    className="absolute top-0 left-0 w-[180px] h-[180px] pointer-events-none"
                    style={{
                        background: "radial-gradient(ellipse at 0% 0%, hsl(45 66% 52% / 0.18) 0%, transparent 65%)",
                    }}
                />

                {/* Founder photo — proper object-cover portrait crop */}
                <div className="absolute inset-0 overflow-hidden">
                    <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    {/* Bottom gradient — text readability */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: "linear-gradient(to top, #0a0806 0%, #0a080699 40%, transparent 75%)",
                        }}
                    />
                    {/* Left edge vignette */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: "linear-gradient(to right, #0a080640 0%, transparent 40%)",
                        }}
                    />
                </div>

                {/* "ASOSCHI" badge — top right editorial stamp */}
                <div className="absolute top-5 right-5 z-10 flex items-center gap-2">
                    <span
                        className="font-sans text-[8px] font-bold uppercase tracking-[0.35em] px-2.5 py-1"
                        style={{
                            background: "hsl(45 66% 52%)",
                            color: "#0a0806",
                            letterSpacing: "0.3em",
                        }}
                    >
                        Asoschisi
                    </span>
                </div>

                {/* Issue number — top left */}
                <div className="absolute top-5 left-5 z-10">
                    <span className="font-mono text-[9px] text-gold/40 tracking-[0.2em]">№ 01</span>
                </div>

                {/* Editorial text block — bottom */}
                <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
                    {/* Gold rule */}
                    <div className="w-10 h-px bg-gold mb-4" style={{ boxShadow: "0 0 8px hsl(45 66% 52% / 0.6)" }} />

                    <p
                        className="font-sans text-[9px] font-bold uppercase tracking-[0.3em] mb-2"
                        style={{ color: "hsl(45 66% 52%)" }}
                    >
                        {member.role}
                    </p>

                    <h3
                        className="font-heading font-bold leading-[0.95] tracking-tight text-white"
                        style={{ fontSize: "clamp(1.4rem, 2.5vw, 2rem)" }}
                    >
                        {member.name.split(" ")[0]}
                        <br />
                        <span className="font-normal italic">{member.name.split(" ").slice(1).join(" ")}</span>
                    </h3>
                </div>

                {/* Outer gold border — subtle glow */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ boxShadow: "inset 0 0 0 1px hsl(45 66% 52% / 0.18)" }}
                />
            </div>
        );
    }

    // ── Placeholder team member card ────────────────────────────────────────────
    const glyph = palette?.glyph ?? member.role[0];
    const bg = palette?.bg ?? "#0e0c0a";
    const stripe = palette?.stripe ?? "#ffffff08";

    return (
        <div
            className="group relative w-full h-full overflow-hidden transition-all duration-500"
            style={{ background: bg }}
        >
            {/* Diagonal stripe texture */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                        -45deg,
                        ${stripe} 0px,
                        ${stripe} 1px,
                        transparent 1px,
                        transparent 18px
                    )`,
                }}
            />

            {/* Large decorative glyph — background */}
            <div
                className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
                style={{
                    fontSize: "clamp(7rem, 14vw, 11rem)",
                    fontFamily: "Georgia, serif",
                    fontStyle: "italic",
                    fontWeight: 700,
                    color: `${accent}10`,
                    lineHeight: 1,
                    userSelect: "none",
                    transform: "translateY(-8%)",
                }}
            >
                {glyph}
            </div>

            {/* Accent glow — top center */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full pointer-events-none"
                style={{
                    background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
                }}
            />

            {/* Initials circle — center */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: "20%" }}>
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-500 group-hover:scale-105"
                    style={{
                        borderColor: `${accent}30`,
                        background: `${accent}10`,
                    }}
                >
                    <span
                        className="font-heading text-xl font-bold"
                        style={{ color: `${accent}90` }}
                    >
                        {glyph}
                    </span>
                </div>
            </div>

            {/* Bottom text block */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
                {/* Thin accent rule */}
                <div
                    className="w-6 h-px mb-3 transition-all duration-500 group-hover:w-10"
                    style={{ background: accent, opacity: 0.5 }}
                />

                <p
                    className="font-sans text-[8px] font-bold uppercase tracking-[0.28em] mb-1.5"
                    style={{ color: `${accent}80` }}
                >
                    {member.role}
                </p>
                <h3
                    className="font-heading text-base font-bold leading-tight text-white/75 group-hover:text-white/90 transition-colors duration-300"
                >
                    {member.name}
                </h3>
            </div>

            {/* Border */}
            <div
                className="absolute inset-0 pointer-events-none transition-all duration-500"
                style={{ boxShadow: `inset 0 0 0 1px ${accent}18` }}
            />
        </div>
    );
}
