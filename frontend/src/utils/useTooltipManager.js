import { useEffect, useRef } from 'react';
import * as bootstrap from 'bootstrap';

const useTooltipManager = () => {
  const activeTooltip = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (activeTooltip.current) {
        try {
          const tooltip = bootstrap.Tooltip.getInstance(activeTooltip.current);
          if (tooltip) {
            tooltip.dispose();
            activeTooltip.current = null;
          }
        } catch (e) { /* ignore */ }
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (activeTooltip.current) {
        try {
          const tooltip = bootstrap.Tooltip.getInstance(activeTooltip.current);
          if (tooltip) {
            tooltip.dispose();
          }
        } catch (e) { /* ignore */ }
      }
    };
  }, []);

  const handleTooltip = (e, content) => {
    const el = e.currentTarget;

    if (activeTooltip.current === el) {
      try {
        const existingTooltip = bootstrap.Tooltip.getInstance(el);
        if (existingTooltip) {
          existingTooltip.dispose();
          activeTooltip.current = null;
        }
      } catch (e) { /* ignore */ }
      return;
    }

    if (activeTooltip.current) {
      try {
        const oldTooltip = bootstrap.Tooltip.getInstance(activeTooltip.current);
        if (oldTooltip) {
          oldTooltip.dispose();
        }
      } catch (e) { /* ignore */ }
    }

    try {
      el.setAttribute('data-bs-original-title', content);
      const tooltip = new bootstrap.Tooltip(el, {
        trigger: 'manual',
        placement: 'top',
      });
      tooltip.show();
      activeTooltip.current = el;
    } catch (e) { /* ignore */ }
  };

  return { handleTooltip };
};

export default useTooltipManager;