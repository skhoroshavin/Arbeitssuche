export function Card({
  className = "",
  children,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      {...(onClick && {
        role: "button",
        tabIndex: 0,
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.currentTarget.click();
          }
        },
      })}
    >
      {children}
    </div>
  );
}
