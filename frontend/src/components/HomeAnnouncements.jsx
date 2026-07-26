import React, { useEffect, useMemo, useState } from "react";
import Slider from "react-slick";
import { FaBullhorn } from "react-icons/fa";
import API from "../api";
import { resolveMediaUrl } from "../utils/resolveMediaUrl";
import OptimizedImage from "./OptimizedImage";

/**
 * Home announcements — website uses image_web (wide banner); falls back to app image.
 */
export default function HomeAnnouncements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await API.get("/buysellapi/home-announcements/", {
          params: { _t: Date.now() },
        });
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];
        if (cancelled) return;
        setItems(
          list
            .map((row) => ({
              id: row.id,
              title: row.title || "",
              imageUrl: resolveMediaUrl(
                row.image_web_url ||
                  row.image_web ||
                  row.image_url ||
                  row.image
              ),
              linkUrl: String(row.link_url || "").trim(),
            }))
            .filter((row) => Boolean(row.imageUrl))
        );
      } catch (err) {
        console.error("Failed to load home announcements:", err);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const settings = useMemo(
    () => ({
      dots: items.length > 1,
      arrows: false,
      infinite: items.length > 1,
      speed: 500,
      slidesToShow: 1,
      slidesToScroll: 1,
      autoplay: items.length > 1,
      autoplaySpeed: 5000,
      pauseOnHover: true,
      cssEase: "ease-out",
    }),
    [items.length]
  );

  if (loading || items.length === 0) {
    return null;
  }

  const renderCard = (item) => {
    const media = (
      <OptimizedImage
        src={item.imageUrl}
        alt={item.title || "Announcement"}
        className="h-full w-full object-cover"
      />
    );

    const card = (
      <div className="w-full overflow-hidden rounded-2xl border border-primary/20 bg-white shadow-sm dark:border-primary/30 dark:bg-gray-900 aspect-[10/3] min-h-[140px] max-h-[280px]">
        {media}
      </div>
    );

    if (item.linkUrl) {
      return (
        <a
          key={item.id}
          href={item.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full transition hover:opacity-95"
        >
          {card}
        </a>
      );
    }

    return (
      <div key={item.id} className="block w-full">
        {card}
      </div>
    );
  };

  return (
    <section className="container w-full py-8 sm:py-10">
      <div className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3.5 dark:border-primary/35 dark:bg-primary/15 sm:px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <FaBullhorn className="text-base" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="mb-0.5 flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">
              Announcements
            </p>
            <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              New
            </span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
            Don’t miss what’s new
          </h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Latest updates from BuySellClub
          </p>
        </div>
      </div>

      {items.length === 1 ? (
        renderCard(items[0])
      ) : (
        <div className="home-announcements-slider w-full overflow-hidden rounded-2xl">
          <Slider {...settings}>
            {items.map((item) => (
              <div key={item.id} className="px-0.5">
                {renderCard(item)}
              </div>
            ))}
          </Slider>
        </div>
      )}
    </section>
  );
}
