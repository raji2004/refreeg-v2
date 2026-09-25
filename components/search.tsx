"use client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

interface UserSearchProps {
  defaultValue?: string;
}

export function UserSearch({ defaultValue }: UserSearchProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Wait for a pause in typing before navigating: each change is a server
  // render, and a new search always starts back on the first page.
  const handleSearch = (value: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.delete("page");
      router.push(`?${params.toString()}`);
    }, 350);
  };

  return (
    <form className="relative w-full md:w-64">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        name="search"
        placeholder="Search users..."
        className="pl-8"
        defaultValue={defaultValue}
        onChange={(e) => handleSearch(e.target.value)}
      />
    </form>
  );
}
