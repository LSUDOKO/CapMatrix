"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface InfiniteSliderProps {
  children: React.ReactNode;
  gap?: number;
  speed?: number;
  speedOnHover?: number;
  reverse?: boolean;
  className?: string;
}

export function InfiniteSlider({
  children,
  gap = 24,
  speed: _speed = 80,
  speedOnHover: _speedOnHover = 25,
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={cn("overflow-hidden", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={trackRef}
        className="flex"
        style={{
          gap,
          animation: `x-slider ${isHovered ? "15s" : "40s"} linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
          animationPlayState: "running",
          width: "fit-content",
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
