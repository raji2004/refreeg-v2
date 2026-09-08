"use client";
import React from "react";
import { ArrowLeft, Sparkles, Clock } from "lucide-react";
import Link from "next/link";

interface ComingSoonPageProps {
  pageTitle?: string;
  pageDescription?: string;
  emoji?: string;
  titleColor?: string;
}

const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  pageTitle = "This Feature",
  pageDescription = "We're working hard to bring you something amazing.",
  emoji = "🚀",
  titleColor = "text-gray-700",
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors w-fit"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center">
          <div className="relative inline-block mb-6">
            <div className="text-7xl md:text-8xl animate-bounce">{emoji}</div>
            <div className="absolute -top-2 -right-2">
              <Sparkles className="text-yellow-400 animate-pulse" size={24} />
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Coming Soon
          </h1>

          <h2
            className={`text-xl md:text-2xl ${titleColor} mb-3 font-semibold`}
          >
            {pageTitle}
          </h2>

          <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">
            {pageDescription}
          </p>

          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-8">
            <Clock size={16} />
            <span className="text-sm font-medium">Under Development</span>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
              <p className="text-blue-700 font-medium">
                Don&apos;t have an account?
              </p>
              <p className="text-blue-600 text-sm mt-2">
                <Link
                  href="/auth/signup"
                  className="font-semibold hover:underline underline-offset-2"
                >
                  Sign up
                </Link>{" "}
                to be the first to access this feature when it launches!
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex justify-center items-center gap-2 text-gray-600">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse delay-150"></div>
              </div>
              <span className="text-sm">Building something amazing...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;
