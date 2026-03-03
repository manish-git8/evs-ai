import { useEffect, useRef } from 'react';
import * as bootstrap from 'bootstrap';

const useTooltipManager = () => {
  const activeTooltip = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (activeTooltip.current) {
        const tooltip = bootstrap.Tooltip.getInstance(activeTooltip.current);
        if (tooltip) {
          tooltip.dispose();
          activeTooltip.current = null;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (activeTooltip.current) {
        const tooltip = bootstrap.Tooltip.getInstance(activeTooltip.current);
        if (tooltip) {
          tooltip.dispose();
        }
      }
    };
  }, []);

  const handleTooltip = (e, content) => {
    const el = e.currentTarget;

    if (activeTooltip.current === el) {
      const existingTooltip = bootstrap.Tooltip.getInstance(el);
      if (existingTooltip) {
        existingTooltip.dispose();
        activeTooltip.current = null;
      }
      return;
    }

    if (activeTooltip.current) {
      const oldTooltip = bootstrap.Tooltip.getInstance(activeTooltip.current);
      if (oldTooltip) {
        oldTooltip.dispose();
      }
    }

    el.setAttribute('data-bs-original-title', content);
    const tooltip = new bootstrap.Tooltip(el, {
      trigger: 'manual',
      placement: 'top',
    });
    tooltip.show();
    activeTooltip.current = el;
  };

  return { handleTooltip };
};

export default useTooltipManager;