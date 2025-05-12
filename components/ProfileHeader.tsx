// components/profile/ProfileHeader.tsx
import Image from "next/image";

type ProfileHeaderProps = {
  profile: any;
  causesCount: number;
  donationsCount: number;
};

export default function ProfileHeader({
  profile,
  causesCount,
  donationsCount,
}: ProfileHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200">
        <Image
          src={profile.profile_photo || "/default-avatar.png"}
          alt={`${profile.full_name}'s profile`}
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="flex-1">
        <div>
          <h1 className="text-2xl font-bold">
            {profile.full_name || "Anonymous"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1">
              📌 Individual
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4 text-sm">
          <span className="text-gray-700">
            <span className="font-semibold">{causesCount}</span>{" "}
            {causesCount === 1 ? "cause" : "causes"}
          </span>
          <span className="text-gray-700">
            <span className="font-semibold">{donationsCount}</span>{" "}
            {donationsCount === 1 ? "donation" : "donations"}
          </span>
        </div>

        {/* Bio */}
        <p className="mt-4 text-gray-700">{profile.bio || "No Bio Yet"}</p>
      </div>
    </div>
  );
}
