import { forwardRef, useEffect, useRef } from "react";

function adjustHeight(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

export const AutoExpandTextarea = forwardRef<
  HTMLTextAreaElement,
  { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function AutoExpandTextarea({ label, onInput, ...props }, ref) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (internalRef.current) adjustHeight(internalRef.current);
  });

  return (
    <label className="block text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <textarea
        ref={(node) => {
          internalRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        onInput={(e) => {
          adjustHeight(e.currentTarget);
          onInput?.(e);
        }}
        {...props}
        className="mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none overflow-hidden"
      />
    </label>
  );
});
