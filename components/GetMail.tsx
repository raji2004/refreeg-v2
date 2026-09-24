"use client";
import { Mail } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

const GetMail = () => {
  const [message, setMessage] = useState("");
  const pathname = usePathname();

  const getButtonColor = () => {
    switch (pathname) {
      case "/non-profits":
        return "bg-purple-600 hover:bg-purple-700";
      case "/businesses":
        return "bg-[#004D40] hover:bg-[#004D40]";
      case "/healthcare":
        return "bg-red-700 hover:bg-red-800";
      case "/disaster-relief":
        return "bg-[#0A0A0B] hover:bg-[#0A0A0B]";
      default:
        return "bg-secondary hover:bg-seecondary/90";
    }
  };

  return (
    <div className="w-full">
      <form className="relative size-fit mt-2">
        <input
          type="email"
          name="email"
          className="bg-white rounded-3xl h-[45px] outline-none border-none placeholder:font-medium 
          placeholder:text-[12px] text-[12px] pl-[50px] pr-[120px] flex items-center w-full"
          placeholder="Enter your Email"
        />

        <Mail className="text-bold size-4 absolute top-[15px] left-6" />

        <Button
          className={`text-white font-medium flex items-center justify-center text-[12px] h-[80%] absolute top-1 right-2 px-5 rounded-3xl cursor-pointer ${getButtonColor()}`}
          variant="default"
        >
          Subscribe
        </Button>
      </form>

      {message && (
        <div className="mt-2 bg-green-500 text-white p-2 rounded-md text-sm">
          {message}
        </div>
      )}
    </div>
  );
};

export default GetMail;
