import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center space-x-2">
      <Image
        src="/logo.svg"
        alt="RefreeG logo"
        width={100}
        height={100}
        priority
      />
    </div>
  );
}
