import { LayoutList } from "lucide-react";
import { PaneHeader } from "./paneHeader";

export const Metadata = () => {
  const badge = (
    <div className="bg-amber-700 text-xs px-1 font-mono rounded-sm">4/10</div>
  );

  return (
    <>
      <PaneHeader
        name={"Metadata"}
        beforeDecorator={<LayoutList size={18} />}
      />
    </>
  );
};
