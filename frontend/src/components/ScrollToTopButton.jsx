import React, { useEffect, useState } from "react";
import { FaArrowUp } from "react-icons/fa";

/**
 * Floating scroll-to-top control for all public and app routes (mounted in App.jsx).
 */
const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 380);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-24 right-6 z-[1200] flex h-12 w-12 items-center justify-center rounded-full border border-primary/35 bg-transparent text-primary shadow-md transition hover:bg-primary/10 hover:border-primary/55 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-primary/45 dark:text-primary dark:hover:bg-primary/15 dark:focus:ring-offset-gray-900 md:bottom-28"
      aria-label="Scroll to top"
    >
      <FaArrowUp className="text-lg opacity-90" />
    </button>
  );
};

export default ScrollToTopButton;
