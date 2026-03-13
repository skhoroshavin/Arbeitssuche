import { forwardRef } from "react";

export const Checkbox = forwardRef<
  HTMLInputElement,
  { label?: string } & React.InputHTMLAttributes<HTMLInputElement>
>(function Checkbox({ label = "Offenlegen", ...props }, ref) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 cursor-pointer">
      <input ref={ref} type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
});
