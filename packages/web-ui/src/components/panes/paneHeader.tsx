import { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export const PaneHeader = ({
  name,
  beforeDecorator,
  afterDecorator,
  className,
}: {
  name: string;
  beforeDecorator?: ReactNode;
  afterDecorator?: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={twMerge(
        "h-8 min-h-8 px-4 bg-neutral-200 dark:bg-neutral-900 mb-2 flex gap-2 items-center",
        className
      )}
    >
      {beforeDecorator && <div className="flex gap-2">{beforeDecorator}</div>}
      <span>{name}</span>
      {afterDecorator}
    </div>
  );
};
