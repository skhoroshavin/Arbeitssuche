export function EmptyState({
  message,
  inline,
}: {
  message: string;
  inline?: boolean;
}) {
  return (
    <p
      className={
        inline
          ? "text-gray-500 dark:text-gray-400 text-sm"
          : "text-gray-500 dark:text-gray-400 text-center py-8"
      }
    >
      {message}
    </p>
  );
}
