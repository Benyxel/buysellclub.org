import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  // Safely get location - return null if Router context is not available
  let location;
  try {
    location = useLocation();
  } catch (error) {
    // Router context not available yet
    console.warn('ScrollToTop: Router context not available', error);
    return null;
  }

  const prevPathname = useRef(location?.pathname);

  useEffect(() => {
    if (!location) return;
    
    // Only scroll if pathname actually changed
    if (prevPathname.current !== location.pathname) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' // Use 'instant' for immediate scroll, or 'smooth' for smooth scroll
      });
      prevPathname.current = location.pathname;
    }
  }, [location?.pathname]);

  return null;
};

export default ScrollToTop;

