import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const location = useLocation();
  const prevPathname = useRef(location.pathname);

  useEffect(() => {
    // Only scroll if pathname actually changed
    if (prevPathname.current !== location.pathname) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' // Use 'instant' for immediate scroll, or 'smooth' for smooth scroll
      });
      prevPathname.current = location.pathname;
    }
  }, [location.pathname]);

  return null;
};

export default ScrollToTop;

