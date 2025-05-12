// components/profile/ProfileTabs.tsx
import Link from "next/link";

type Tab = {
  id: string;
  label: string;
  count: number;
  content: React.ReactNode;
};

type ProfileTabsProps = {
  tabs: Tab[];
  userId: string;
  activeTab: string;
};

export default function ProfileTabs({
  tabs,
  userId,
  activeTab,
}: ProfileTabsProps) {
  return (
    <div className="border-b mt-8">
      <div className="flex justify-center">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/profile/${userId}?tab=${tab.id}`}
            className={`px-6 py-2 font-medium flex items-center gap-2 ${
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                {tab.count}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
