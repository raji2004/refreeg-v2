"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export interface MultiSelectBarProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedCount: number
  onClearSelection?: () => void
  actions?: React.ReactNode
}

/**
 * MultiSelectBar
 * Bottom-docked floating action bar for batch operations across selectable items
 * (e.g. Saved campaigns, petition signers, transaction shortlists).
 * Follows Design System interaction rules: restates selection count, provides batch actions.
 */
export function MultiSelectBar({
  selectedCount,
  onClearSelection,
  actions,
  className,
  children,
  ...props
}: MultiSelectBarProps) {
  if (selectedCount <= 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 rounded-2xl border border-ink/15 bg-ink px-5 py-3 text-sm text-ink-foreground shadow-elevated",
          "w-[calc(100%-2rem)] max-w-xl",
          className
        )}
        {...(props as any)}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lime text-xs font-bold text-ink">
            {selectedCount}
          </span>
          <span className="font-medium tracking-tight">
            {selectedCount === 1 ? "1 item selected" : `${selectedCount} items selected`}
          </span>
          {onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs text-ink-foreground/60 underline-offset-4 hover:text-ink-foreground hover:underline ml-1"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actions || children}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
