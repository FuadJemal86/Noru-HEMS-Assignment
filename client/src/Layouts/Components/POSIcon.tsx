import posIcon from "@/assets/POS.svg";

export const POSIcon = ({ className }: { className?: string }) => {
  return (
    <img
      src={posIcon}
      alt="POS"
      className={className}
      style={{ width: "24px", height: "24px", objectFit: "contain" }}
    />
  );
};
