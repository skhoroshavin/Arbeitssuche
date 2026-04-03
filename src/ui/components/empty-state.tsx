export function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
      {message}
    </p>
  )
}
