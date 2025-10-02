import { useEffect, useRef, useState, useCallback } from "react";

type Item = {
  title: string;
  subtitle?: string;
  img?: string;
  circle?: boolean;
};

const rows = {
  newReleases: Array.from({ length: 12 }, (_, i) => ({
    title: `New Mix ${i + 1}`,
    subtitle: "Fresh tracks picked for you",
  })) as Item[],

  soundtrack: Array.from({ length: 12 }, (_, i) => ({
    title: `Evening Flow ${i + 1}`,
    subtitle: "Smooth picks for tonight",
  })) as Item[],

  bestOf: Array.from({ length: 12 }, (_, i) => ({
    title: `Best Of: Artist ${i + 1}`,
    subtitle: "Essential tracks",
    circle: true,
  })) as Item[],

  genres: [
    { title: "Pop", subtitle: "Feel-good hits" },
    { title: "Rock", subtitle: "Guitar energy" },
    { title: "Hip-Hop", subtitle: "Beats & rhymes" },
    { title: "Jazz", subtitle: "Smooth & classic" },
    { title: "Electronic", subtitle: "Dance & chill" },
    { title: "Classical", subtitle: "Timeless pieces" },
    { title: "Indie", subtitle: "Alt flavors" },
    { title: "R&B", subtitle: "Soulful vibes" },
    { title: "Lo-Fi", subtitle: "Cozy beats" },
    { title: "Workout", subtitle: "Push the pace" },
  ] as Item[],

  jumpBackIn: Array.from({ length: 12 }, (_, i) => ({
    title: `Jump Back ${i + 1}`,
    subtitle: "Because you listened recently",
  })) as Item[],

  recentlyPlayed: Array.from({ length: 12 }, (_, i) => ({
    title: `Recent ${i + 1}`,
    circle: true,
  })) as Item[],
};

function Card({ item }: { item: Item }) {
  return (
    <article className="min-w-[180px] max-w-[180px]" data-card>
      <div
        className={[
          "aspect-square w-[180px] overflow-hidden",
          item.circle ? "rounded-full" : "rounded-xl",
          item.img
            ? "bg-cover bg-center bg-no-repeat"
            : "bg-[radial-gradient(circle_at_30%_20%,#6d4bdc_0%,#181818_75%)]",
        ].join(" ")}
        style={item.img ? { backgroundImage: `url(${item.img})` } : undefined}
        aria-hidden
      />
      <div className="mt-3 text-white font-semibold leading-tight truncate">
        {item.title}
      </div>
      {item.subtitle && (
        <div className="text-sm text-neutral-300 mt-1 line-clamp-2">
          {item.subtitle}
        </div>
      )}
    </article>
  );
}

function ArrowBtn({
  dir,
  onClick,
  disabled,
  canScroll,
}: {
  dir: "left" | "right";
  onClick: () => void;
  disabled: boolean;
  canScroll: boolean;
}) {
  const label = dir === "left" ? "Scroll left" : "Scroll right";
  return (
    <button
      type="button"                        // ✅ explicit type
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        "absolute top-1/2 -translate-y-1/2 z-20",
        dir === "left" ? "left-2" : "right-2",
        "h-9 w-9 rounded-full bg-neutral-800/80 hover:bg-neutral-700/90",
        "text-white shadow-md backdrop-blur-sm grid place-items-center",
        "opacity-0 transition-opacity duration-150 group-hover/row:opacity-100",
        !canScroll || disabled ? "pointer-events-none opacity-0" : "",
      ].join(" ")}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        role="img"
        aria-label={label}
      >
        <title>{label}</title>            {/* ✅ accessible title */}
        {dir === "left" ? (
          <path
            d="M15 19l-7-7 7-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M9 5l7 7-7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}

function Shelf({ title, items }: { title: string; items: Item[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    update();
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => update();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollByAmount = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>("[data-card]");
    const styles = getComputedStyle(el);
    const gap = parseFloat(styles.gap || styles.columnGap || "16") || 16;
    const width = first?.clientWidth ?? 180;
    const amount = (width + gap) * 3; // scroll exactly 3 cards
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  const canScroll = canLeft || canRight;

  return (
    <section className="mb-8">
      <h2 className="text-white text-2xl font-bold px-4">{title}</h2>
      <div className="relative mt-4 px-4 group/row">
        {/* edge fades – only when hovering and scroll is possible */}
        <div
          className={[
            "pointer-events-none absolute inset-y-0 left-4 w-8 z-10",
            "bg-gradient-to-r from-black/70 to-transparent rounded-l-xl",
            "opacity-0 transition-opacity duration-150 group-hover/row:opacity-100",
            !canScroll ? "hidden" : "",
          ].join(" ")}
        />
        <div
          className={[
            "pointer-events-none absolute inset-y-0 right-4 w-8 z-10",
            "bg-gradient-to-l from-black/70 to-transparent rounded-r-xl",
            "opacity-0 transition-opacity duration-150 group-hover/row:opacity-100",
            !canScroll ? "hidden" : "",
          ].join(" ")}
        />

        <ArrowBtn
          dir="left"
          onClick={() => scrollByAmount("left")}
          disabled={!canLeft}
          canScroll={canScroll}
        />
        <ArrowBtn
          dir="right"
          onClick={() => scrollByAmount("right")}
          disabled={!canRight}
          canScroll={canScroll}
        />

        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto no-scrollbar snap-x"
          onScroll={update}
        >
          {items.map((it) => (
            <div className="snap-start" key={`${title}-${it.title}`}> {/* ✅ stable key */}
              <Card item={it} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Index() {
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(
    new Date(),
  );

  return (
    <div className="bg-black text-white min-h-[100dvh]">
      <main className="p-6 pb-[140px]">
        <Shelf title="New releases for you" items={rows.newReleases} />
        <Shelf
          title={`Soundtrack your ${weekday} evening`}
          items={rows.soundtrack}
        />
        <Shelf title="Best of artists" items={rows.bestOf} />
        <Shelf title="Browse by genre" items={rows.genres} />
        <Shelf title="Jump back in" items={rows.jumpBackIn} />
        <Shelf title="Recently played" items={rows.recentlyPlayed} />
      </main>
      {/* tiny spacer keeps background solid black past the fixed player */}
      <div aria-hidden className="h-[1px] bg-black" />
    </div>
  );
}
