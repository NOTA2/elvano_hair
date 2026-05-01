"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const VIEWPORT_MARGIN = 12;
const TOOLTIP_GAP = 12;
const ARROW_INSET = 18;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function ActionTooltip({ label, children }) {
  const anchorRef = useRef(null);
  const tooltipRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [tooltipLayout, setTooltipLayout] = useState(null);
  const isOpen = mounted && Boolean(label) && (isHovered || isFocused);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current || !tooltipRef.current) {
      return;
    }

    function updateTooltipLayout() {
      if (!anchorRef.current || !tooltipRef.current) {
        return;
      }

      const anchorRect = anchorRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const anchorCenterX = anchorRect.left + anchorRect.width / 2;
      const minCenterX = VIEWPORT_MARGIN + tooltipRect.width / 2;
      const maxCenterX = window.innerWidth - VIEWPORT_MARGIN - tooltipRect.width / 2;
      const centerX = clamp(anchorCenterX, minCenterX, maxCenterX);
      const preferredTop = anchorRect.top - tooltipRect.height - TOOLTIP_GAP;
      const canPlaceAbove = preferredTop >= VIEWPORT_MARGIN;
      const top = canPlaceAbove
        ? preferredTop
        : Math.min(
            window.innerHeight - VIEWPORT_MARGIN - tooltipRect.height,
            anchorRect.bottom + TOOLTIP_GAP
          );
      const placement = canPlaceAbove ? "top" : "bottom";
      const arrowOffset = clamp(
        anchorCenterX - centerX,
        -(tooltipRect.width / 2 - ARROW_INSET),
        tooltipRect.width / 2 - ARROW_INSET
      );

      setTooltipLayout({
        left: centerX,
        top,
        placement,
        arrowOffset
      });
    }

    updateTooltipLayout();

    window.addEventListener("resize", updateTooltipLayout);
    window.addEventListener("scroll", updateTooltipLayout, true);

    return () => {
      window.removeEventListener("resize", updateTooltipLayout);
      window.removeEventListener("scroll", updateTooltipLayout, true);
    };
  }, [isOpen, label]);

  return (
    <>
      <span
        ref={anchorRef}
        className="table-action-tooltip compact-action-tooltip"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsFocused(false);
          }
        }}
      >
        {children}
      </span>
      {isOpen && mounted
        ? createPortal(
            <div
              ref={tooltipRef}
              className={`action-tooltip-portal ${tooltipLayout?.placement || "top"}`}
              style={{
                left: tooltipLayout ? `${tooltipLayout.left}px` : "-9999px",
                top: tooltipLayout ? `${tooltipLayout.top}px` : "-9999px"
              }}
              role="tooltip"
            >
              <span
                className="action-tooltip-portal-arrow"
                style={{
                  left: tooltipLayout
                    ? `calc(50% + ${tooltipLayout.arrowOffset}px)`
                    : "50%"
                }}
              />
              {label}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
