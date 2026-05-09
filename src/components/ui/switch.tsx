"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type SwitchProps = {
  id?: string;
  name?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function Switch({
  id,
  name,
  defaultChecked,
  checked: controlled,
  onCheckedChange,
  disabled,
  className,
  ...rest
}: SwitchProps) {
  const [uncontrolled, setUncontrolled] = React.useState(
    Boolean(defaultChecked),
  );
  const isControlled = controlled !== undefined;
  const checked = isControlled ? controlled : uncontrolled;

  const toggle = () => {
    if (disabled) return;
    const next = !checked;
    if (!isControlled) setUncontrolled(next);
    onCheckedChange?.(next);
  };

  return (
    <>
      {name ? (
        <input type="hidden" name={name} value={checked ? "on" : ""} />
      ) : null}
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={rest["aria-label"]}
        onClick={toggle}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "brand-gradient" : "bg-input",
          className,
        )}
      >
        <span
          className={cn(
            "inline-block size-5 transform rounded-full bg-white shadow ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </>
  );
}
